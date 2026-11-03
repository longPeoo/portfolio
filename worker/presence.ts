/**
 * Đếm số người đang xem web theo thời gian thực.
 *
 * Mỗi tab mở web giữ một WebSocket tới đúng MỘT Durable Object (tên "site").
 * Dùng WebSocket Hibernation API: khi không có ai vào/ra, object "ngủ" và không tốn thời gian chạy;
 * gói "ping" định kỳ của trình duyệt được Cloudflare tự trả "pong" mà không đánh thức object.
 *
 * Một người mở nhiều tab vẫn tính là 1: mỗi trình duyệt gửi kèm mã ngẫu nhiên (?v=, lưu ở localStorage),
 * mã này chỉ nằm trong bộ nhớ khi đang kết nối, không lưu lại và không gắn với IP hay danh tính.
 *
 * Có người vào/ra → hẹn báo số mới sau 0,5 giây (gom nhiều thay đổi liên tiếp thành một lần gửi).
 * Khi còn người xem, cứ 60 giây object thức dậy một lần để dọn kết nối "chết" (không ping quá 75 giây).
 */
import { DurableObject } from 'cloudflare:workers';

const PING = 'ping';
const BATCH_MS = 500;
const SWEEP_MS = 60_000;
const STALE_MS = 75_000;
const VISITOR_ID = /^[A-Za-z0-9-]{8,64}$/;

interface Attachment {
  /** Lúc kết nối (ms), dùng khi trình duyệt chưa kịp ping lần nào */
  t: number;
}

export class Presence extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, 'pong'));
  }

  async fetch(request: Request): Promise<Response> {
    const v = new URL(request.url).searchParams.get('v') ?? '';
    const visitor = VISITOR_ID.test(v) ? v : crypto.randomUUID();

    const [client, server] = Object.values(new WebSocketPair());
    // Tag = mã trình duyệt → đếm số người (không phải số tab)
    this.ctx.acceptWebSocket(server, [visitor]);
    server.serializeAttachment({ t: Date.now() } satisfies Attachment);
    await this.schedule(BATCH_MS);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage() {
    // Trình duyệt không gửi gì ngoài "ping" (đã tự trả lời ở trên)
  }

  async webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code === 1005 ? 1000 : code, 'bye');
    } catch {
      // Đã đóng từ trước
    }
    await this.schedule(BATCH_MS);
  }

  async webSocketError() {
    await this.schedule(BATCH_MS);
  }

  async alarm() {
    const now = Date.now();
    const open: WebSocket[] = [];
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      const lastPing = this.ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime();
      const since = lastPing ?? (ws.deserializeAttachment() as Attachment | null)?.t ?? now;
      if (now - since > STALE_MS) {
        ws.close(4000, 'stale');
        continue;
      }
      open.push(ws);
    }

    const count = new Set(open.map((ws) => this.ctx.getTags(ws)[0])).size;
    const payload = JSON.stringify({ n: count });
    for (const ws of open) {
      try {
        ws.send(payload);
      } catch {
        // Kết nối vừa rớt, lượt dọn sau sẽ tính lại
      }
    }

    if (open.length > 0) await this.schedule(SWEEP_MS);
  }

  /** Hẹn alarm sau `ms`, trừ khi đã có alarm sớm hơn */
  private async schedule(ms: number) {
    const at = Date.now() + ms;
    const current = await this.ctx.storage.getAlarm();
    if (current === null || current > at) await this.ctx.storage.setAlarm(at);
  }
}
