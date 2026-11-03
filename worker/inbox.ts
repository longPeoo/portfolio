/**
 * Hộp thư lưu trữ: mọi lời nhắn gửi từ trang Liên hệ được lưu vào SQLite của MỘT Durable Object (tên "inbox"),
 * để không mất thư nếu email báo tin gửi lỗi.
 * Xem / xoá trong Cloudflare: Workers & Pages → Durable Objects → Inbox → Data Studio → nhập tên "inbox".
 *
 * Không lưu IP, user agent hay vị trí. Câu hỏi ẩn danh chỉ có lời nhắn (+ email nếu người gửi tự điền).
 */
import { DurableObject } from 'cloudflare:workers';
import type { Message } from '../src/lib/message';

export class Inbox extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id         TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        mode       TEXT NOT NULL CHECK (mode IN ('anonymous', 'named')),
        name       TEXT,
        email      TEXT,
        phone      TEXT,
        message    TEXT NOT NULL,
        mailed     INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS messages_created_at ON messages (created_at);
    `);
  }

  save(id: string, m: Message) {
    this.ctx.storage.sql.exec(
      'INSERT INTO messages (id, created_at, mode, name, email, phone, message) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id,
      new Date().toISOString(),
      m.mode,
      m.name ?? null,
      m.email ?? null,
      m.phone ?? null,
      m.message,
    );
  }

  /** Đánh dấu đã gửi email báo tin thành công (cột mailed = 0 nghĩa là cần xem trong Data Studio) */
  markMailed(id: string) {
    this.ctx.storage.sql.exec('UPDATE messages SET mailed = 1 WHERE id = ?', id);
  }
}
