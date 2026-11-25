/**
 * SECRET SANTA ở /api/play/santa/*
 *
 * Lưu trữ: MỖI PHÒNG LÀ MỘT DURABLE OBJECT (SantaRoom, tên = mã phòng) với SQLite riêng.
 * - Phòng này đông không làm chậm phòng khác; không có bảng chung nào phình to theo thời gian.
 * - Durable Object xử lý từng yêu cầu một → "nhận tên" / "quay" không bao giờ tranh chấp
 *   (mọi bước kiểm tra + ghi chạy liền một mạch SAU các await băm/mã hoá, không có await xen giữa).
 * - Tra mã sai không tạo dữ liệu rác: bảng chỉ được tạo trong create(), các lệnh khác chỉ đọc.
 * - Tự xoá bằng alarm (src/lib/play/santa.ts > expiryOf), người tạo xoá được bất cứ lúc nào.
 *
 * Nhận diện người chơi (src/lib/play/santa.ts > JoinMode):
 * - open:   POST claim { id }  → ai có mã phòng tự chọn tên, mỗi tên một lần.
 * - invite: POST enter { key } với mã cá nhân trong link riêng → dùng một lần để nhận tên.
 * - Cả hai: nhận tên xong được token thiết bị + mã xem lại; POST enter { key = mã xem lại } để mở trên máy khác.
 *
 * Bí mật:
 * - Cặp tặng (people.receiver) chỉ rời khỏi object này cho đúng người tặng, sau khi người đó bấm Quay.
 * - Trang phòng chỉ cho biết AI ĐÃ QUAY, không bao giờ cho biết AI ĐÃ BỊ CHỌN
 *   (nếu không, nhìn "rổ" vơi đi ngay sau lượt của Lan là đoán được Lan tặng ai).
 * - Token thiết bị, token quản lý, mã xem lại, mã cá nhân chỉ lưu dạng SHA-256.
 *   Mã cá nhân có thêm bản mã hoá AES-GCM bằng token quản lý để người tạo phòng xem lại link (không có token → không đọc được).
 * - Không lưu IP, user agent, email. Dò mã bị chặn bởi giới hạn tần suất (PLAY_LIMIT) + không gian mã 31^8 ≈ 8,5·10^11.
 *
 * Xem dữ liệu thô: Cloudflare → Workers & Pages → Durable Objects → SantaRoom → Data Studio, nhập mã phòng.
 */
import { DurableObject } from 'cloudflare:workers';
import {
  cryptoRand,
  drawPairs,
  expiryOf,
  isRecoveryCode,
  isRoomCode,
  normalizeCode,
  parseRoom,
  parseWish,
  randomCode,
  RECOVERY_LENGTH,
  type AdminView,
  type ApiErrorCode,
  type JoinMode,
  type MeView,
  type Pair,
  type PublicRoom,
  type RoomInput,
} from '../../src/lib/play/santa';
import { bearer, clientIp, fail, randomToken, readJson, reply, sealer, sha256 } from './http';

const SCHEMA_VERSION = 1;
const INVITE_PURPOSE = 'santa-invite';

type Err = { ok: false; error: ApiErrorCode };
const err = (error: ApiErrorCode): Err => ({ ok: false, error });

type RoomRow = {
  code: string;
  title: string;
  budget: string;
  exchange_date: string;
  notes: string;
  no_mutual: number;
  join_mode: JoinMode;
  admin_hash: string;
  created_at: number;
  expires_at: number;
};

type PersonRow = {
  id: number;
  name: string;
  receiver: number;
  wish: string;
  claimed_at: number | null;
  drawn_at: number | null;
  recovery_hash: string | null;
  invite_hash: string | null;
  invite_box: string | null;
};

/** Băm có "muối" theo phòng + mục đích, để cùng một chuỗi ở hai phòng / hai vai trò cho ra hai giá trị khác nhau */
const hashKey = (code: string, purpose: 'invite' | 'recovery', key: string) => sha256(`${code}:${purpose}:${key}`);

export class SantaRoom extends DurableObject<Env> {
  private get sql() {
    return this.ctx.storage.sql;
  }

  /* ---------------- Đọc ---------------- */

  private exists() {
    return this.sql.exec("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'room'").toArray().length > 0;
  }

  private room(): RoomRow | undefined {
    if (!this.exists()) return undefined;
    return this.sql.exec<RoomRow>('SELECT * FROM room WHERE id = 1').toArray()[0];
  }

  private people() {
    return this.sql.exec<PersonRow>('SELECT * FROM people ORDER BY id').toArray();
  }

  private person(id: number) {
    return this.sql.exec<PersonRow>('SELECT * FROM people WHERE id = ?', id).toArray()[0];
  }

  private personWhere(column: 'invite_hash' | 'recovery_hash', hash: string) {
    return this.sql.exec<PersonRow>(`SELECT * FROM people WHERE ${column} = ?`, hash).toArray()[0];
  }

  private exclusions() {
    return this.sql.exec<{ a: number; b: number }>('SELECT a, b FROM exclusions').toArray().map((r): Pair => [r.a, r.b]);
  }

  private async personByToken(token: string | undefined) {
    if (!token || !this.exists()) return undefined;
    const hash = await sha256(token);
    return this.sql
      .exec<PersonRow>('SELECT p.* FROM sessions s JOIN people p ON p.id = s.person WHERE s.token_hash = ?', hash)
      .toArray()[0];
  }

  private async isAdmin(token: string | undefined) {
    const room = this.room();
    if (!room || !token) return false;
    return (await sha256(token)) === room.admin_hash;
  }

  private meOf(p: PersonRow): MeView {
    const me: MeView = { id: p.id, name: p.name, wish: p.wish };
    if (p.drawn_at) {
      const r = this.person(p.receiver);
      if (r) me.receiver = { id: r.id, name: r.name, wish: r.wish };
    }
    return me;
  }

  private missing(): Err {
    return err(this.exists() ? 'unauthorized' : 'not_found');
  }

  /* ---------------- Tạo phòng ---------------- */

  async create(code: string, input: RoomInput, adminToken: string): Promise<'created' | 'taken' | 'impossible'> {
    if (this.exists()) return 'taken';
    const pairs = drawPairs(input.people.length, input.exclusions, input.noMutual, cryptoRand);
    if (!pairs) return 'impossible';

    const adminHash = await sha256(adminToken);
    // Chế độ "Link riêng": mỗi người một mã cá nhân; lưu bản băm (để kiểm tra) + bản mã hoá bằng token quản lý (để xem lại link)
    const invites =
      input.joinMode === 'invite'
        ? await (async () => {
            const box = await sealer(adminToken, INVITE_PURPOSE);
            return Promise.all(
              input.people.map(async () => {
                const key = randomCode(RECOVERY_LENGTH);
                return { hash: await hashKey(code, 'invite', key), box: await box.seal(key) };
              }),
            );
          })()
        : undefined;

    const now = Date.now();
    const expiresAt = expiryOf(now, input.date);
    this.ctx.storage.transactionSync(() => {
      this.sql.exec(`
        CREATE TABLE room (
          id            INTEGER PRIMARY KEY CHECK (id = 1),
          code          TEXT NOT NULL,
          title         TEXT NOT NULL,
          budget        TEXT NOT NULL,
          exchange_date TEXT NOT NULL,
          notes         TEXT NOT NULL,
          no_mutual     INTEGER NOT NULL,
          join_mode     TEXT NOT NULL CHECK (join_mode IN ('open', 'invite')),
          admin_hash    TEXT NOT NULL,
          created_at    INTEGER NOT NULL,
          expires_at    INTEGER NOT NULL,
          schema        INTEGER NOT NULL
        );
        CREATE TABLE people (
          id            INTEGER PRIMARY KEY,
          name          TEXT NOT NULL,
          receiver      INTEGER NOT NULL,
          wish          TEXT NOT NULL DEFAULT '',
          claimed_at    INTEGER,
          drawn_at      INTEGER,
          recovery_hash TEXT UNIQUE,
          invite_hash   TEXT UNIQUE,
          invite_box    TEXT
        );
        CREATE TABLE sessions (
          token_hash TEXT PRIMARY KEY,
          person     INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX sessions_person ON sessions (person);
        CREATE TABLE exclusions (
          a INTEGER NOT NULL,
          b INTEGER NOT NULL,
          PRIMARY KEY (a, b)
        );
      `);
      this.sql.exec(
        'INSERT INTO room (id, code, title, budget, exchange_date, notes, no_mutual, join_mode, admin_hash, created_at, expires_at, schema) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        code, input.title, input.budget, input.date, input.notes, input.noMutual ? 1 : 0, input.joinMode, adminHash, now, expiresAt, SCHEMA_VERSION,
      );
      input.people.forEach((name, i) =>
        this.sql.exec(
          'INSERT INTO people (id, name, receiver, invite_hash, invite_box) VALUES (?, ?, ?, ?, ?)',
          i, name, pairs[i]!, invites?.[i]?.hash ?? null, invites?.[i]?.box ?? null,
        ),
      );
      for (const [a, b] of input.exclusions) this.sql.exec('INSERT INTO exclusions (a, b) VALUES (?, ?)', a, b);
    });
    await this.ctx.storage.setAlarm(expiresAt);
    return 'created';
  }

  /* ---------------- Ai cũng xem được (có mã phòng) ---------------- */

  view(): PublicRoom | undefined {
    const room = this.room();
    if (!room) return undefined;
    return {
      code: room.code,
      title: room.title,
      budget: room.budget,
      date: room.exchange_date,
      notes: room.notes,
      noMutual: room.no_mutual === 1,
      joinMode: room.join_mode,
      exclusions: this.exclusions().length,
      createdAt: room.created_at,
      expiresAt: room.expires_at,
      people: this.people().map((p) => ({ id: p.id, name: p.name, claimed: p.claimed_at !== null, drawn: p.drawn_at !== null })),
    };
  }

  /* ---------------- Người chơi ---------------- */

  /** Ghi nhận tên cho thiết bị (gọi sau khi đã kiểm tra quyền). Trả token + mã xem lại mới */
  private seat(p: PersonRow, tokenHash: string, recoveryHash: string) {
    const now = Date.now();
    this.ctx.storage.transactionSync(() => {
      this.sql.exec('UPDATE people SET claimed_at = ?, recovery_hash = ? WHERE id = ?', now, recoveryHash, p.id);
      this.sql.exec('INSERT INTO sessions (token_hash, person, created_at) VALUES (?, ?, ?)', tokenHash, p.id, now);
    });
    return this.meOf({ ...p, claimed_at: now });
  }

  /** Băm sẵn token + mã xem lại mới (làm TRƯỚC phần kiểm tra-rồi-ghi để phần đó không có await) */
  private async freshSeat(code: string) {
    const token = randomToken();
    const recovery = randomCode(RECOVERY_LENGTH);
    const [tokenHash, recoveryHash] = await Promise.all([sha256(token), hashKey(code, 'recovery', recovery)]);
    return { token, recovery, tokenHash, recoveryHash };
  }

  /** Chế độ "Mã chung": tự chọn tên. Mỗi tên chỉ một lần, hai người bấm cùng lúc thì chỉ một người được */
  async claim(id: number) {
    const room = this.room();
    if (!room) return err('not_found');
    if (room.join_mode !== 'open') return err('mode');
    const fresh = await this.freshSeat(room.code);

    const p = this.person(id);
    if (!p) return err('invalid');
    if (p.claimed_at !== null) return err('claimed');
    return { ok: true as const, token: fresh.token, recovery: fresh.recovery, me: this.seat(p, fresh.tokenHash, fresh.recoveryHash) };
  }

  /**
   * Vào bằng mã 8 ký tự:
   * - mã cá nhân (chế độ "Link riêng") chưa dùng → nhận tên, cấp mã xem lại;
   * - mã cá nhân đã dùng → báo "used" (chủ link biết có người mở trước);
   * - mã xem lại → mở lại trên thiết bị này (giữ nguyên mã xem lại cũ).
   */
  async enter(key: string) {
    const room = this.room();
    if (!room) return err('not_found');
    const [inviteHash, recoveryHash, fresh] = await Promise.all([
      hashKey(room.code, 'invite', key),
      hashKey(room.code, 'recovery', key),
      this.freshSeat(room.code),
    ]);

    const invited = room.join_mode === 'invite' ? this.personWhere('invite_hash', inviteHash) : undefined;
    if (invited) {
      if (invited.claimed_at !== null) return err('used');
      return { ok: true as const, token: fresh.token, recovery: fresh.recovery, me: this.seat(invited, fresh.tokenHash, fresh.recoveryHash) };
    }

    const back = this.personWhere('recovery_hash', recoveryHash);
    if (!back) return err('recovery');
    this.sql.exec('INSERT INTO sessions (token_hash, person, created_at) VALUES (?, ?, ?)', fresh.tokenHash, back.id, Date.now());
    return { ok: true as const, token: fresh.token, recovery: key, me: this.meOf(back) };
  }

  async me(token: string | undefined) {
    const p = await this.personByToken(token);
    return p ? { ok: true as const, me: this.meOf(p) } : this.missing();
  }

  /** Quay: mở kết quả đã chia sẵn. Bấm lại vẫn ra đúng người cũ */
  async draw(token: string | undefined) {
    const found = await this.personByToken(token);
    if (!found) return this.missing();
    const p = this.person(found.id)!;
    const drawnAt = p.drawn_at ?? Date.now();
    if (p.drawn_at === null) this.sql.exec('UPDATE people SET drawn_at = ? WHERE id = ?', drawnAt, p.id);
    return { ok: true as const, me: this.meOf({ ...p, drawn_at: drawnAt }) };
  }

  /** Gợi ý quà: Santa của người này đọc được, nhưng người này không biết Santa là ai */
  async wish(token: string | undefined, wish: string) {
    const p = await this.personByToken(token);
    if (!p) return this.missing();
    this.sql.exec('UPDATE people SET wish = ? WHERE id = ?', wish, p.id);
    return { ok: true as const, me: this.meOf({ ...p, wish }) };
  }

  /* ---------------- Người tạo phòng ---------------- */

  /** Tiến độ: ai đã nhận tên, ai đã quay (+ link riêng nếu có). Không có cách nào xem ai tặng ai */
  async admin(token: string | undefined) {
    if (!(await this.isAdmin(token))) return this.missing();
    const room = this.room()!;
    const people = this.people();
    const view: AdminView = {
      canRedraw: people.every((p) => p.drawn_at === null),
      people: people.map((p) => ({
        id: p.id,
        name: p.name,
        claimed: p.claimed_at !== null,
        drawn: p.drawn_at !== null,
        claimedAt: p.claimed_at,
        drawnAt: p.drawn_at,
      })),
    };
    if (room.join_mode === 'invite') {
      const box = await sealer(token!, INVITE_PURPOSE);
      const keys = await Promise.all(people.map((p) => (p.invite_box ? box.open(p.invite_box) : undefined)));
      view.invites = people.flatMap((p, i) => (keys[i] ? [{ id: p.id, key: keys[i]! }] : []));
    }
    return { ok: true as const, admin: view };
  }

  /**
   * Gỡ nhận tên (người chơi mất máy + quên mã xem lại): xoá phiên + mã xem lại.
   * Chế độ "Link riêng": link cũ dùng lại được. Kết quả đã quay giữ nguyên cho người nhận lại tên.
   */
  async release(token: string | undefined, id: number) {
    if (!(await this.isAdmin(token))) return this.missing();
    if (!this.person(id)) return err('invalid');
    this.ctx.storage.transactionSync(() => {
      this.sql.exec('UPDATE people SET claimed_at = NULL, recovery_hash = NULL WHERE id = ?', id);
      this.sql.exec('DELETE FROM sessions WHERE person = ?', id);
    });
    return this.admin(token);
  }

  /** Chia lại toàn bộ cặp: chỉ khi chưa ai quay (chưa ai thấy kết quả cũ) */
  async redraw(token: string | undefined) {
    if (!(await this.isAdmin(token))) return this.missing();
    const room = this.room()!;
    const people = this.people();
    if (people.some((p) => p.drawn_at !== null)) return err('drawn');
    const pairs = drawPairs(people.length, this.exclusions(), room.no_mutual === 1, cryptoRand);
    if (!pairs) return err('impossible');
    this.ctx.storage.transactionSync(() => {
      pairs.forEach((r, g) => this.sql.exec('UPDATE people SET receiver = ? WHERE id = ?', r, g));
    });
    return this.admin(token);
  }

  /** Xoá vĩnh viễn phòng và mọi kết quả */
  async destroy(token: string | undefined) {
    if (!(await this.isAdmin(token))) return this.missing();
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
    return { ok: true as const };
  }

  /** Hết hạn → xoá sạch */
  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}

/* ---------------------------------------------------------------
   Định tuyến HTTP → Durable Object
   POST   rooms                     tạo phòng (giới hạn PLAY_CREATE)       → { code, adminToken }
   GET    rooms/:code               thông tin công khai
   POST   rooms/:code/claim         { id }   (chế độ Mã chung)            → token + mã xem lại
   POST   rooms/:code/enter         { key }  mã cá nhân hoặc mã xem lại   → token (+ mã xem lại)
   GET    rooms/:code/me            (Bearer)
   POST   rooms/:code/draw          (Bearer)
   PUT    rooms/:code/wish          (Bearer) { wish }
   GET    rooms/:code/admin         (Bearer quản lý)
   POST   rooms/:code/admin/release (Bearer quản lý) { id }
   POST   rooms/:code/admin/redraw  (Bearer quản lý)
   DELETE rooms/:code               (Bearer quản lý)
   --------------------------------------------------------------- */

const roomOf = (env: Env, code: string) => env.SANTA.get(env.SANTA.idFromName(code));

const asId = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < 1000 ? (v as number) : undefined);

export async function handleSanta(request: Request, env: Env, path: string[]): Promise<Response> {
  const method = request.method;
  const [section, rawCode, action, sub] = path;
  if (section !== 'rooms') return fail('not_found');

  if (!rawCode) {
    if (method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    return create(request, env);
  }

  const code = normalizeCode(rawCode);
  if (!isRoomCode(code)) return fail('not_found');
  const room = roomOf(env, code);
  const token = bearer(request);
  const route = `${method} ${action ?? ''}${sub ? `/${sub}` : ''}`;

  switch (route) {
    case 'GET ': {
      const view = await room.view();
      return view ? reply({ ok: true, room: view }) : fail('not_found');
    }
    case 'DELETE ':
      return reply(await room.destroy(token));
    case 'GET me':
      return reply(await room.me(token));
    case 'POST draw':
      return reply(await room.draw(token));
    case 'GET admin':
      return reply(await room.admin(token));
    case 'POST admin/redraw':
      return reply(await room.redraw(token));
  }

  const body = await readJson(request, 4 * 1024);
  if (!body) return fail('payload');
  switch (route) {
    case 'POST claim': {
      const id = asId(body.id);
      return id === undefined ? fail('invalid') : reply(await room.claim(id));
    }
    case 'POST enter': {
      const key = normalizeCode(typeof body.key === 'string' ? body.key : '');
      return isRecoveryCode(key) ? reply(await room.enter(key)) : fail('recovery');
    }
    case 'PUT wish': {
      const wish = parseWish(body.wish);
      return wish === undefined ? fail('invalid') : reply(await room.wish(token, wish));
    }
    case 'POST admin/release': {
      const id = asId(body.id);
      return id === undefined ? fail('invalid') : reply(await room.release(token, id));
    }
  }
  return fail('not_found');
}

async function create(request: Request, env: Env) {
  const { success } = await env.PLAY_CREATE.limit({ key: clientIp(request) });
  if (!success) return fail('rate', { retryAfter: 60 });

  const body = await readJson(request);
  if (!body) return fail('payload');
  const parsed = parseRoom(body);
  if (!parsed.ok) return reply({ ok: false, error: 'invalid', issue: parsed.issue });

  const adminToken = randomToken();
  // Mã 6 ký tự từ 31 chữ ≈ 887 triệu mã: trùng gần như không xảy ra, vẫn thử lại cho chắc
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(6);
    const result = await roomOf(env, code).create(code, parsed.data, adminToken);
    if (result === 'created') return reply({ ok: true, code, adminToken }, 201);
    if (result === 'impossible') return fail('impossible');
  }
  return fail('server');
}
