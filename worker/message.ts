/**
 * POST /api/message: nhận lời nhắn từ form ở trang Liên hệ.
 *
 * Thứ tự kiểm tra (rẻ trước, đắt sau):
 * 1. Đúng nguồn (Origin), đúng kiểu dữ liệu, không quá 16 KB.
 * 2. Ô bẫy (honeypot) "website": bot điền vào → trả "ok" nhưng bỏ thư.
 * 3. Giới hạn tần suất theo IP (binding MESSAGE_LIMIT; IP chỉ dùng để đếm, không lưu).
 * 4. Cloudflare Turnstile (chống bot, không bắt giải đố) nếu đã đặt secret TURNSTILE_SECRET.
 * 5. Kiểm tra nội dung bằng đúng luật của form (src/lib/message.ts).
 * Sau đó lưu vào Inbox (Durable Object) và gửi email báo tin, có Reply-To là email người gửi
 * → mở mail bấm "Trả lời" là trả lời thẳng cho họ.
 */
import { parseMessage, type Message, type MessageField } from '../src/lib/message';

const MAX_BODY = 16 * 1024;

type Result =
  | { ok: true }
  | { ok: false; error: 'origin' | 'payload' | 'rate' | 'captcha' | 'server' }
  | { ok: false; error: 'invalid'; field: MessageField };

const json = (body: Result, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function handleMessage(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);

  const raw = await readBody(request);
  if (!raw) return json({ ok: false, error: 'payload' }, 400);
  if (typeof raw.website === 'string' && raw.website.trim()) return json({ ok: true });

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  const { success } = await env.MESSAGE_LIMIT.limit({ key: ip || 'unknown' });
  if (!success) return json({ ok: false, error: 'rate' }, 429);

  if (env.TURNSTILE_SECRET) {
    const passed = await verifyTurnstile(env.TURNSTILE_SECRET, raw['cf-turnstile-response'], ip);
    if (!passed) return json({ ok: false, error: 'captcha' }, 403);
  } else {
    console.warn('[message] Chưa đặt TURNSTILE_SECRET: bỏ qua bước chống bot');
  }

  const parsed = parseMessage(raw);
  if (!parsed.ok) return json({ ok: false, error: 'invalid', field: parsed.field }, 422);
  const message = parsed.data;
  const id = crypto.randomUUID();
  const inbox = env.INBOX.get(env.INBOX.idFromName('inbox'));

  // Lưu và gửi mail song song: chỉ báo lỗi cho người gửi khi cả hai đều hỏng (một trong hai được là thư không mất)
  const [saved, mailed] = await Promise.allSettled([inbox.save(id, message), notify(env, id, message)]);
  if (saved.status === 'rejected') console.error('[message] Lưu thất bại', saved.reason);
  if (mailed.status === 'rejected') console.error('[message] Gửi email thất bại', mailed.reason);
  if (saved.status === 'rejected' && mailed.status === 'rejected') return json({ ok: false, error: 'server' }, 500);
  if (saved.status === 'fulfilled' && mailed.status === 'fulfilled') ctx.waitUntil(inbox.markMailed(id));

  return json({ ok: true });
}

/** Chỉ nhận form gửi từ chính web này (chặn trang khác / script ngoài gửi hộ) */
export function sameOrigin(request: Request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function readBody(request: Request): Promise<Record<string, unknown> | undefined> {
  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (length > MAX_BODY) return undefined;
  const type = request.headers.get('Content-Type') ?? '';
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return undefined;
    if (type.includes('application/json')) {
      const data: unknown = JSON.parse(text);
      return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : undefined;
    }
    if (type.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(text));
  } catch {
    // JSON hỏng
  }
  return undefined;
}

async function verifyTurnstile(secret: string, token: unknown, ip: string) {
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const data = (await res.json()) as { success?: boolean; hostname?: string };
    return data.success === true;
  } catch (err) {
    console.error('[message] Không gọi được Turnstile', err);
    return false;
  }
}

/** Email báo tin gửi về hộp thư của chủ web (secret CONTACT_INBOX, phải là địa chỉ đã xác minh trong Email Routing) */
async function notify(env: Env, id: string, m: Message) {
  if (!env.CONTACT_INBOX) throw new Error('Chưa đặt CONTACT_INBOX');
  const who = m.mode === 'anonymous' ? 'Câu hỏi ẩn danh' : `Lời nhắn từ ${m.name}`;
  const rows: [string, string | undefined][] = [
    ['Chế độ', m.mode === 'anonymous' ? 'Ẩn danh' : 'Có tên'],
    ['Tên', m.name],
    ['Email', m.email],
    ['Điện thoại', m.phone],
  ];
  const meta = rows.filter((r): r is [string, string] => Boolean(r[1]));
  const footer = m.email
    ? 'Bấm "Trả lời" để trả lời thẳng cho người gửi.'
    : 'Người gửi không để lại email, thư này không trả lời được.';

  // Trình đọc mail không hiểu biến CSS của web → màu viết thẳng (lấy từ bảng màu trong global.css)
  const text = [...meta.map(([k, v]) => `${k}: ${v}`), '', m.message, '', '—', footer, `Mã thư: ${id}`].join('\n');
  const html = `<div style="font:15px/1.6 system-ui,sans-serif;color:#1B1B2F;max-width:600px">
<p style="font:12px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#C2410C;margin:0 0 12px">MSN-99 · ${esc(who)}</p>
<table style="border-collapse:collapse;margin:0 0 16px">${meta
    .map(([k, v]) => `<tr><td style="padding:2px 16px 2px 0;color:#666">${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join('')}</table>
<div style="white-space:pre-wrap;padding:16px;border-left:3px solid #FF6A3D;background:#F4EEE1">${esc(m.message)}</div>
<p style="color:#666;font-size:13px">${esc(footer)}<br>Mã thư: ${id}</p></div>`;

  await env.MAILER.send({
    from: { email: env.MAIL_FROM, name: 'Orbi · Longpeoo' },
    to: env.CONTACT_INBOX,
    replyTo: m.email,
    subject: `[Longpeoo] ${who}`,
    text,
    html,
  });
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
