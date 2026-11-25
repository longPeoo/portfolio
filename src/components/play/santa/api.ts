/**
 * Gọi API /api/play/santa/* + lưu trên trình duyệt (localStorage) cho trò Secret Santa.
 *
 * Trình duyệt giữ:
 *   play:santa:<MÃ>        { id, token, recovery? }  người chơi của phòng đó (token thiết bị + mã xem lại)
 *   play:santa:admin:<MÃ>  token quản lý
 *   play:recent            phòng gần đây [{ game, code, title, role, at }] (dùng chung cho mọi trò về sau)
 * Mọi thao tác localStorage bọc try/catch: chế độ ẩn danh / chặn lưu trữ thì trò chơi vẫn chạy, chỉ không nhớ được.
 */
import type { AdminView, ApiErrorCode, MeView, PublicRoom, RoomIssue } from '@/lib/play/santa';
import type { UI } from '@/lib/i18n';
import { SANTA_LIMITS } from '@/lib/play/santa';
import { fmt } from '@/lib/utils';

export type Labels = UI['santa'];
export type ClientError = ApiErrorCode | 'network';
export type Result<T> = ({ ok: true } & T) | { ok: false; error: ClientError; issue?: RoomIssue; retryAfter?: number };

const BASE = '/api/play/santa/rooms';

async function call<T>(method: string, path: string, opts: { body?: unknown; token?: string } = {}): Promise<Result<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const data = (await res.json().catch(() => null)) as Result<T> | null;
    if (data && typeof data.ok === 'boolean') return data;
    return { ok: false, error: res.status === 429 ? 'rate' : res.status === 404 ? 'not_found' : 'server' };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export const api = {
  create: (body: unknown) => call<{ code: string; adminToken: string }>('POST', '', { body }),
  room: (code: string) => call<{ room: PublicRoom }>('GET', `/${code}`),
  claim: (code: string, id: number) => call<{ token: string; recovery: string; me: MeView }>('POST', `/${code}/claim`, { body: { id } }),
  /** Mã cá nhân (link riêng) hoặc mã xem lại */
  enter: (code: string, key: string) => call<{ token: string; recovery: string; me: MeView }>('POST', `/${code}/enter`, { body: { key } }),
  me: (code: string, token: string) => call<{ me: MeView }>('GET', `/${code}/me`, { token }),
  draw: (code: string, token: string) => call<{ me: MeView }>('POST', `/${code}/draw`, { token }),
  wish: (code: string, token: string, wish: string) => call<{ me: MeView }>('PUT', `/${code}/wish`, { token, body: { wish } }),
  admin: (code: string, token: string) => call<{ admin: AdminView }>('GET', `/${code}/admin`, { token }),
  release: (code: string, token: string, id: number) =>
    call<{ admin: AdminView }>('POST', `/${code}/admin/release`, { token, body: { id } }),
  redraw: (code: string, token: string) => call<{ admin: AdminView }>('POST', `/${code}/admin/redraw`, { token }),
  remove: (code: string, token: string) => call<object>('DELETE', `/${code}`, { token }),
};

/** Câu báo lỗi cho người xem (chữ lấy từ ui.yaml > santa) */
export function errorText(L: Labels, error: ClientError, extra: { code?: string } = {}) {
  switch (error) {
    case 'rate':
      return L.errRate;
    case 'network':
      return L.errNetwork;
    case 'not_found':
      return fmt(L.errNotFound, { code: extra.code ?? '' });
    case 'claimed':
      return L.errClaimed;
    case 'recovery':
      return L.errRecovery;
    case 'used':
      return L.errUsed;
    case 'mode':
      return L.errMode;
    case 'unauthorized':
      return L.errSession;
    case 'impossible':
    case 'drawn':
      return L.errImpossible;
    default:
      return L.errServer;
  }
}

/** Lỗi kiểm tra form → câu báo lỗi */
export function issueText(L: Labels, issue: RoomIssue) {
  const M = SANTA_LIMITS;
  switch (issue.field) {
    case 'title':
      return fmt(L.errTitle, { max: M.title });
    case 'budget':
      return fmt(L.errBudget, { max: M.budget });
    case 'date':
      return L.errDate;
    case 'notes':
      return fmt(L.errNotes, { max: M.notes });
    case 'exclusions':
      return L.errExclusions;
    case 'rules':
      return L.errImpossible;
    case 'people':
      if ('name' in issue) return fmt(issue.reason === 'long' ? L.errPeopleLong : L.errPeopleDup, { max: M.name, name: issue.name });
      return issue.reason === 'min' ? fmt(L.errPeopleMin, { min: M.minPeople }) : fmt(L.errPeopleMax, { max: M.maxPeople });
  }
}

/* ---------------- localStorage ---------------- */

const read = <T,>(key: string): T | undefined => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
};
const write = (key: string, value: unknown) => {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Không lưu được (chế độ riêng tư / bị chặn): vẫn chơi được trong phiên này
  }
};

export interface Seat {
  id: number;
  token: string;
  recovery?: string;
}

export const store = {
  seat: (code: string) => read<Seat>(`play:santa:${code}`),
  setSeat: (code: string, seat: Seat | undefined) => write(`play:santa:${code}`, seat),
  admin: (code: string) => read<string>(`play:santa:admin:${code}`),
  setAdmin: (code: string, token: string | undefined) => write(`play:santa:admin:${code}`, token),
  recent: () => (read<Recent[]>('play:recent') ?? []).filter((r) => r.game === 'santa'),
  remember(entry: Omit<Recent, 'game' | 'at'>) {
    const all = read<Recent[]>('play:recent') ?? [];
    const prev = all.find((r) => r.game === 'santa' && r.code === entry.code);
    const role = prev?.role === 'admin' ? 'admin' : entry.role;
    const next = [{ ...entry, role, game: 'santa', at: Date.now() }, ...all.filter((r) => !(r.game === 'santa' && r.code === entry.code))];
    write('play:recent', next.slice(0, 12));
  },
  forget(code: string) {
    write('play:recent', (read<Recent[]>('play:recent') ?? []).filter((r) => !(r.game === 'santa' && r.code === code)));
    write(`play:santa:${code}`, undefined);
    write(`play:santa:admin:${code}`, undefined);
  },
};

export interface Recent {
  game: string;
  code: string;
  title: string;
  role: 'admin' | 'member';
  at: number;
}

/**
 * Link của phòng. Phần bí mật luôn nằm sau # (không bao giờ gửi lên máy chủ, không lọt vào log / Referer):
 *   ?code=K7QM2X                 link mời chung
 *   ?code=K7QM2X#join=ABCD2345   link riêng của một người (chế độ Link riêng)
 *   ?code=K7QM2X#admin=<token>   link quản lý
 */
export function roomUrl(code: string, secret?: { admin?: string; join?: string }) {
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set('code', code);
  if (secret?.admin) url.hash = `admin=${secret.admin}`;
  else if (secret?.join) url.hash = `join=${secret.join}`;
  return url.href;
}

/** Đọc rồi XOÁ phần bí mật trên thanh địa chỉ (tránh lộ khi chia sẻ màn hình / chụp ảnh) */
export function takeSecret(): { admin?: string; join?: string } {
  const params = new URLSearchParams(location.hash.slice(1));
  const admin = params.get('admin') ?? undefined;
  const join = params.get('join') ?? undefined;
  if (admin || join) history.replaceState(history.state, '', location.pathname + location.search);
  return { admin, join };
}
