/**
 * Luật cho hộp thư ở trang Liên hệ, dùng chung cho form (trình duyệt) và Worker (worker/message.ts)
 * để hai bên không bao giờ lệch nhau. File này chỉ là TypeScript thuần: không DOM, không API của Workers.
 *
 * Hai chế độ:
 * - anonymous: chỉ có lời nhắn (+ email nếu muốn được trả lời). Tên và số điện thoại bị bỏ ngay ở đây,
 *   kể cả khi có ai cố gửi lên, nên câu hỏi ẩn danh không bao giờ chứa danh tính.
 * - named: tên + lời nhắn, cần ít nhất email hoặc số điện thoại để mình liên hệ lại.
 */

export const MESSAGE_MODES = ['anonymous', 'named'] as const;
export type MessageMode = (typeof MESSAGE_MODES)[number];

export const MESSAGE_LIMITS = {
  name: 80,
  email: 254,
  phone: 20,
  messageMin: 5,
  messageMax: 4000,
} as const;

/** Trường bị lỗi; `contact` = chế độ named nhưng thiếu cả email lẫn số điện thoại */
export type MessageField = 'message' | 'name' | 'email' | 'phone' | 'contact';

export interface Message {
  mode: MessageMode;
  message: string;
  email?: string;
  name?: string;
  phone?: string;
}

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const PHONE = /^\+?[0-9 ().-]+$/;

/** Gộp khoảng trắng thừa, bỏ ký tự điều khiển (trừ xuống dòng trong lời nhắn) */
const clean = (v: unknown, multiline = false) =>
  typeof v === 'string'
    ? (multiline
        ? v.replace(/\r\n?/g, '\n').replace(/[^\P{Cc}\n\t]/gu, '').replace(/\n{4,}/g, '\n\n\n')
        : v.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ')
      ).trim()
    : '';

export function parseMessage(raw: Record<string, unknown>): { ok: true; data: Message } | { ok: false; field: MessageField } {
  const mode: MessageMode = raw.mode === 'named' ? 'named' : 'anonymous';
  const message = clean(raw.message, true);
  const email = clean(raw.email).toLowerCase();
  const name = mode === 'named' ? clean(raw.name) : '';
  const phone = mode === 'named' ? clean(raw.phone) : '';

  if ([...message].length < MESSAGE_LIMITS.messageMin || [...message].length > MESSAGE_LIMITS.messageMax) return { ok: false, field: 'message' };
  if (email && (email.length > MESSAGE_LIMITS.email || !EMAIL.test(email))) return { ok: false, field: 'email' };
  if (mode === 'named') {
    if (!name || name.length > MESSAGE_LIMITS.name) return { ok: false, field: 'name' };
    const digits = phone.replace(/\D/g, '').length;
    if (phone && (phone.length > MESSAGE_LIMITS.phone || !PHONE.test(phone) || digits < 8 || digits > 15)) return { ok: false, field: 'phone' };
    if (!email && !phone) return { ok: false, field: 'contact' };
  }

  return {
    ok: true,
    data: { mode, message, email: email || undefined, name: name || undefined, phone: phone || undefined },
  };
}
