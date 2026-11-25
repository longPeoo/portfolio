/**
 * Đồ dùng chung cho mọi trò ở /api/play/*: trả JSON, đọc body, token, băm, kiểm tra nguồn.
 * Trò mới chỉ cần import từ đây, không viết lại.
 */
import type { ApiErrorCode, RoomIssue } from '../../src/lib/play/santa';
export { sameOrigin } from '../message';

const STATUS: Record<ApiErrorCode, number> = {
  origin: 403,
  payload: 400,
  rate: 429,
  invalid: 422,
  impossible: 422,
  not_found: 404,
  unauthorized: 401,
  claimed: 409,
  recovery: 403,
  used: 409,
  mode: 409,
  drawn: 409,
  server: 500,
};

type Body =
  | { ok: true }
  | { ok: false; error: ApiErrorCode; retryAfter?: number; issue?: RoomIssue };

/** Mọi phản hồi của trò chơi đều riêng tư theo người xem: không cache ở trình duyệt lẫn CDN */
export function reply<B extends Body>(body: B, status?: number): Response {
  const b: Body = body;
  const code = status ?? (b.ok ? 200 : STATUS[b.error]);
  const headers: Record<string, string> = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (!b.ok && b.retryAfter) headers['Retry-After'] = String(b.retryAfter);
  return Response.json(body, { status: code, headers });
}

export const fail = (error: ApiErrorCode, extra: Partial<{ retryAfter: number }> = {}) =>
  reply({ ok: false, error, ...extra });

/** Đọc body JSON (object), tối đa `max` byte. Sai kiểu / quá lớn → undefined */
export async function readJson(request: Request, max = 32 * 1024): Promise<Record<string, unknown> | undefined> {
  if (Number(request.headers.get('Content-Length') ?? 0) > max) return undefined;
  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) return undefined;
  try {
    const text = await request.text();
    if (text.length > max) return undefined;
    const data: unknown = JSON.parse(text);
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** Token ngẫu nhiên 256-bit, base64url (43 ký tự) */
export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Token trong header "Authorization: Bearer …" (đúng định dạng) hoặc undefined */
export function bearer(request: Request) {
  const value = request.headers.get('Authorization') ?? '';
  const token = value.startsWith('Bearer ') ? value.slice(7).trim() : '';
  return TOKEN.test(token) ? token : undefined;
}

/** SHA-256 dạng hex. Token / mã xem lại chỉ được lưu ở dạng băm */
export async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const clientIp = (request: Request) => request.headers.get('CF-Connecting-IP') ?? 'unknown';

/* ---------------------------------------------------------------
   Mã hoá đối xứng bằng một token (AES-GCM, khoá = SHA-256 của token).
   Dùng để lưu thứ mà chỉ người cầm token được đọc lại (vd. mã cá nhân của từng người chơi,
   chỉ người tạo phòng có token quản lý mới xem lại được). Không có token → dữ liệu thô vô nghĩa.
   --------------------------------------------------------------- */

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function keyFrom(token: string, purpose: string) {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${purpose}:${token}`));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function sealer(token: string, purpose: string) {
  const key = await keyFrom(token, purpose);
  return {
    async seal(text: string) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)));
      const out = new Uint8Array(iv.length + data.length);
      out.set(iv);
      out.set(data, iv.length);
      return b64(out);
    },
    async open(box: string) {
      try {
        const bytes = unb64(box);
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
        return new TextDecoder().decode(plain);
      } catch {
        return undefined;
      }
    },
  };
}
