/**
 * SECRET SANTA: luật + thuật toán chia cặp, dùng chung cho form (trình duyệt) và Worker (worker/play/santa.ts)
 * để hai bên không bao giờ lệch nhau. TypeScript thuần: không DOM, không API của Workers.
 *
 * Cách chia cặp (học từ DrawNames / Elfster):
 * - Chia TOÀN BỘ cặp một lần lúc tạo phòng, không bốc tuần tự từ "rổ còn lại".
 *   Bốc tuần tự có thể làm người cuối chỉ còn đúng tên mình (kẹt), và luật loại trừ càng nhiều càng dễ kẹt.
 *   Nút "Quay" chỉ mở kết quả đã chia sẵn của người đó, nên ai đã được chọn thì không ai quay trúng lần nữa.
 * - Luật: không tự tặng mình (luôn bật), các cặp loại trừ (hai chiều), tuỳ chọn không tặng chéo (A→B thì B↛A).
 * - Ưu tiên lấy mẫu ngẫu nhiên đều (xáo trộn + loại bỏ), luật khó quá thì quay lui có ngẫu nhiên.
 *   Trước đó kiểm tra ghép cặp hoàn hảo (định lý Hall) để báo "không chia được" ngay, không thử vô ích.
 *
 * Nhận diện người chơi (không cần tài khoản), người tạo phòng chọn một trong hai:
 * - open   ("Mã chung"): ai có mã phòng tự bấm chọn tên mình; ai bấm trước giữ tên. Nhanh, hợp nhóm thân.
 * - invite ("Link riêng"): mỗi người một mã cá nhân 8 ký tự (trong link riêng), dùng MỘT lần để nhận tên.
 *   Ai mở trộm trước thì chủ link thấy ngay "link đã được dùng" → không giả danh âm thầm được.
 * Nhận tên xong, máy được cấp token thiết bị + mã xem lại 8 ký tự (mở lại trên máy khác).
 */

export const SANTA_LIMITS = {
  title: 60,
  budget: 40,
  notes: 1000,
  name: 40,
  wish: 300,
  minPeople: 3,
  maxPeople: 100,
  maxExclusions: 300,
} as const;

/** Chữ cái của mã phòng / mã xem lại: bỏ 0 O 1 I L (dễ đọc nhầm khi đọc mã cho nhau) */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 6;
export const RECOVERY_LENGTH = 8;

/** Phòng tự xoá: 60 ngày sau ngày trao quà, không ghi ngày thì 90 ngày sau khi tạo */
export const DAY_MS = 86_400_000;
export const KEEP_AFTER_EXCHANGE_DAYS = 60;
export const KEEP_WITHOUT_DATE_DAYS = 90;

/** Mã người dùng gõ / dán → dạng chuẩn: chữ hoa, chỉ giữ ký tự hợp lệ ("k7q-m2x" → "K7QM2X") */
export const normalizeCode = (value: string) =>
  value
    .toUpperCase()
    .split('')
    .filter((c) => CODE_ALPHABET.includes(c))
    .join('');

export const isRoomCode = (value: unknown): value is string =>
  typeof value === 'string' && value.length === ROOM_CODE_LENGTH && normalizeCode(value) === value;

export const isRecoveryCode = (value: unknown): value is string =>
  typeof value === 'string' && value.length === RECOVERY_LENGTH && normalizeCode(value) === value;

/** Hiển thị mã cho dễ đọc: K7QM2X → K7Q-M2X, ABCD2345 → ABCD-2345 */
export const formatCode = (code: string) => {
  const half = Math.ceil(code.length / 2);
  return `${code.slice(0, half)}-${code.slice(half)}`;
};

/* ---------------------------------------------------------------
   Kiểm tra dữ liệu
   --------------------------------------------------------------- */

/** Gộp khoảng trắng, bỏ ký tự điều khiển (multiline: giữ xuống dòng) */
export const clean = (v: unknown, multiline = false) =>
  typeof v === 'string'
    ? (multiline
        ? v.replace(/\r\n?/g, '\n').replace(/[^\P{Cc}\n\t]/gu, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
        : v.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ')
      ).trim()
    : '';

const len = (s: string) => [...s].length;

/** Khoá so trùng tên: "  Lan " = "lan" = "LAN" */
export const nameKey = (name: string) => clean(name).normalize('NFKC').toLocaleLowerCase('vi');

/** Danh sách dán vào ô (mỗi dòng một tên, chấp nhận cả dấu ";") → mảng tên đã làm sạch, bỏ dòng trống */
export const splitPeople = (text: string) => text.split(/[\n;]+/).map((s) => clean(s)).filter(Boolean);

export type Pair = [number, number];

export const JOIN_MODES = ['open', 'invite'] as const;
export type JoinMode = (typeof JOIN_MODES)[number];

export interface RoomInput {
  title: string;
  budget: string;
  /** YYYY-MM-DD hoặc '' */
  date: string;
  notes: string;
  people: string[];
  /** Cặp chỉ số (theo `people`) không được bốc trúng nhau, áp dụng cả hai chiều */
  exclusions: Pair[];
  noMutual: boolean;
  joinMode: JoinMode;
}

export type RoomIssue =
  | { field: 'title' | 'budget' | 'date' | 'notes' | 'exclusions' }
  | { field: 'people'; reason: 'min' | 'max' }
  | { field: 'people'; reason: 'long' | 'dup'; name: string }
  | { field: 'rules' };

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDate(value: string) {
  const m = DATE.exec(value);
  if (!m) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value) && Number(m[1]) >= 2000 && Number(m[1]) <= 2200;
}

/** Kiểm tra phòng mới. Không kiểm tra luật chia được hay không (việc đó của drawPairs) */
export function parseRoom(raw: Record<string, unknown>): { ok: true; data: RoomInput } | { ok: false; issue: RoomIssue } {
  const L = SANTA_LIMITS;
  const title = clean(raw.title);
  const budget = clean(raw.budget);
  const date = clean(raw.date);
  const notes = clean(raw.notes, true);
  const people = Array.isArray(raw.people) ? raw.people.map((p) => clean(p)).filter(Boolean) : [];
  const noMutual = raw.noMutual === true;
  const joinMode: JoinMode = raw.joinMode === 'invite' ? 'invite' : 'open';

  if (!title || len(title) > L.title) return { ok: false, issue: { field: 'title' } };
  if (len(budget) > L.budget) return { ok: false, issue: { field: 'budget' } };
  if (date && !isValidDate(date)) return { ok: false, issue: { field: 'date' } };
  if (len(notes) > L.notes) return { ok: false, issue: { field: 'notes' } };

  if (people.length < L.minPeople) return { ok: false, issue: { field: 'people', reason: 'min' } };
  if (people.length > L.maxPeople) return { ok: false, issue: { field: 'people', reason: 'max' } };
  const seen = new Set<string>();
  for (const name of people) {
    if (len(name) > L.name) return { ok: false, issue: { field: 'people', reason: 'long', name } };
    const key = nameKey(name);
    if (seen.has(key)) return { ok: false, issue: { field: 'people', reason: 'dup', name } };
    seen.add(key);
  }

  const rawPairs = Array.isArray(raw.exclusions) ? raw.exclusions : [];
  if (rawPairs.length > L.maxExclusions) return { ok: false, issue: { field: 'exclusions' } };
  const pairs = new Map<string, Pair>();
  for (const p of rawPairs) {
    if (!Array.isArray(p) || p.length !== 2) return { ok: false, issue: { field: 'exclusions' } };
    const [a, b] = p as unknown[];
    if (!Number.isInteger(a) || !Number.isInteger(b)) return { ok: false, issue: { field: 'exclusions' } };
    const [x, y] = [a as number, b as number].sort((m, n) => m - n) as Pair;
    if (x < 0 || y >= people.length || x === y) return { ok: false, issue: { field: 'exclusions' } };
    pairs.set(`${x}:${y}`, [x, y]);
  }

  return { ok: true, data: { title, budget, date, notes, people, exclusions: [...pairs.values()], noMutual, joinMode } };
}

export const parseWish = (v: unknown): string | undefined => {
  const wish = clean(v, true);
  return len(wish) <= SANTA_LIMITS.wish ? wish : undefined;
};

/* ---------------------------------------------------------------
   Chia cặp
   --------------------------------------------------------------- */

/** Số nguyên ngẫu nhiên trong [0, max) */
export type Rand = (max: number) => number;

/** Ngẫu nhiên mật mã, không lệch (loại các giá trị rơi vào phần dư). Dùng ở Worker và để sinh mã */
export const cryptoRand: Rand = (max) => {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < limit) return buf[0]! % max;
  }
};

export const randomCode = (length: number, rand: Rand = cryptoRand) =>
  Array.from({ length }, () => CODE_ALPHABET[rand(CODE_ALPHABET.length)]).join('');

function shuffle<T>(items: T[], rand: Rand) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

/** allowed[g][r]: người g được phép tặng người r */
export function buildAllowed(n: number, exclusions: Pair[]) {
  const allowed = Array.from({ length: n }, (_, g) => Array.from({ length: n }, (_, r) => g !== r));
  for (const [a, b] of exclusions) {
    allowed[a]![b] = false;
    allowed[b]![a] = false;
  }
  return allowed;
}

/** Có cách ghép mỗi người tặng đúng một người, mỗi người nhận đúng một quà không (thuật toán Kuhn, O(n³)) */
export function hasPerfectMatching(allowed: boolean[][]) {
  const n = allowed.length;
  const owner = new Array<number>(n).fill(-1);
  const tryGiver = (g: number, seen: boolean[]): boolean => {
    for (let r = 0; r < n; r++) {
      if (!allowed[g]![r] || seen[r]) continue;
      seen[r] = true;
      if (owner[r] === -1 || tryGiver(owner[r]!, seen)) {
        owner[r] = g;
        return true;
      }
    }
    return false;
  };
  for (let g = 0; g < n; g++) if (!tryGiver(g, new Array<boolean>(n).fill(false))) return false;
  return true;
}

export function isValidPairs(pairs: number[], allowed: boolean[][], noMutual: boolean) {
  const n = allowed.length;
  if (pairs.length !== n || new Set(pairs).size !== n) return false;
  return pairs.every((r, g) => r >= 0 && r < n && allowed[g]![r] && !(noMutual && pairs[r] === g));
}

const SAMPLE_TRIES = 4000;
const SEARCH_RESTARTS = 12;
const SEARCH_BUDGET = 40_000;

/**
 * Chia cặp: kết quả[g] = người g sẽ tặng quà. null = không có cách chia nào thoả luật.
 * 1. Kiểm tra ghép cặp hoàn hảo (bỏ qua luật không tặng chéo) → sai thì chắc chắn không chia được.
 * 2. Xáo trộn ngẫu nhiên đến khi hợp lệ: mọi cách chia hợp lệ có xác suất như nhau.
 *    Không luật thêm: ~37% lần xáo hợp lệ; 100 người + không tặng chéo vẫn ~22%.
 * 3. Luật quá chặt (hiếm): quay lui, mỗi bước chọn người còn ít lựa chọn nhất, thứ tự thử ngẫu nhiên.
 */
export function drawPairs(n: number, exclusions: Pair[], noMutual: boolean, rand: Rand): number[] | null {
  const allowed = buildAllowed(n, exclusions);
  if (!hasPerfectMatching(allowed)) return null;

  const perm = Array.from({ length: n }, (_, i) => i);
  for (let t = 0; t < SAMPLE_TRIES; t++) {
    shuffle(perm, rand);
    if (isValidPairs(perm, allowed, noMutual)) return [...perm];
  }

  for (let t = 0; t < SEARCH_RESTARTS; t++) {
    const found = search(allowed, noMutual, rand);
    if (found) return found;
  }
  return null;
}

function search(allowed: boolean[][], noMutual: boolean, rand: Rand): number[] | null {
  const n = allowed.length;
  const to = new Array<number>(n).fill(-1);
  const taken = new Array<boolean>(n).fill(false);
  let steps = 0;

  const options = (g: number) => {
    const out: number[] = [];
    for (let r = 0; r < n; r++) if (allowed[g]![r] && !taken[r] && !(noMutual && to[r] === g)) out.push(r);
    return out;
  };

  const step = (depth: number): boolean => {
    if (depth === n) return true;
    if (++steps > SEARCH_BUDGET) return false;
    let giver = -1;
    let best: number[] = [];
    for (let g = 0; g < n; g++) {
      if (to[g] !== -1) continue;
      const opts = options(g);
      if (opts.length === 0) return false;
      if (giver === -1 || opts.length < best.length) [giver, best] = [g, opts];
    }
    for (const r of shuffle(best, rand)) {
      to[giver] = r;
      taken[r] = true;
      if (step(depth + 1)) return true;
      to[giver] = -1;
      taken[r] = false;
      if (steps > SEARCH_BUDGET) return false;
    }
    return false;
  };

  return step(0) ? to : null;
}

/** Hạn tự xoá phòng (ms) */
export function expiryOf(createdAt: number, date: string) {
  if (!date) return createdAt + KEEP_WITHOUT_DATE_DAYS * DAY_MS;
  const exchange = new Date(`${date}T23:59:59Z`).getTime();
  // Ngày trao quà đã qua → vẫn giữ tối thiểu 60 ngày kể từ lúc tạo; quá xa → tối đa ~2 năm
  return Math.min(Math.max(exchange, createdAt) + KEEP_AFTER_EXCHANGE_DAYS * DAY_MS, createdAt + 730 * DAY_MS);
}

/* ---------------------------------------------------------------
   Dữ liệu trao đổi giữa trình duyệt và Worker
   --------------------------------------------------------------- */

export interface PublicPerson {
  id: number;
  name: string;
  /** Đã có người nhận tên này (gắn với một thiết bị) */
  claimed: boolean;
  /** Người này đã quay. KHÔNG bao giờ có thông tin ai đã bị chọn */
  drawn: boolean;
}

export interface PublicRoom {
  code: string;
  title: string;
  budget: string;
  date: string;
  notes: string;
  noMutual: boolean;
  joinMode: JoinMode;
  exclusions: number;
  createdAt: number;
  expiresAt: number;
  people: PublicPerson[];
}

export interface MeView {
  id: number;
  name: string;
  wish: string;
  /** Chỉ có sau khi đã quay */
  receiver?: { id: number; name: string; wish: string };
}

export interface AdminPerson extends PublicPerson {
  claimedAt: number | null;
  drawnAt: number | null;
}

export interface AdminView {
  people: AdminPerson[];
  /** Chưa ai quay → còn chia lại cặp được */
  canRedraw: boolean;
  /** Chế độ "Link riêng": mã cá nhân của từng người (giải mã bằng token quản lý) */
  invites?: { id: number; key: string }[];
}

export type ApiErrorCode =
  | 'origin'
  | 'payload'
  | 'rate'
  | 'invalid'
  | 'impossible'
  | 'not_found'
  | 'unauthorized'
  | 'claimed'
  | 'recovery'
  | 'used'
  | 'mode'
  | 'drawn'
  | 'server';

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: ApiErrorCode; issue?: RoomIssue; retryAfter?: number };
