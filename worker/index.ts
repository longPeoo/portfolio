/**
 * Worker của longpeoo.io.vn. Web vẫn là trang tĩnh (thư mục dist/ do Astro build ra):
 * Cloudflare phát thẳng file tĩnh mà KHÔNG chạy Worker, trừ đường dẫn /api/* (assets.run_worker_first trong wrangler.jsonc).
 *
 *   /api/live     WebSocket đếm người đang xem (Durable Object Presence)
 *   /api/message  POST lời nhắn từ trang Liên hệ (lưu vào Inbox + email báo tin)
 *   /api/play/*   các trò chơi ở trang /play (worker/play/index.ts; Secret Santa: Durable Object SantaRoom)
 */
import { handleMessage, sameOrigin } from './message';
import { handlePlay } from './play';

export { Presence } from './presence';
export { Inbox } from './inbox';
export { SantaRoom } from './play/santa';

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/live') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
      if (!sameOrigin(request)) return new Response(null, { status: 403 });
      return env.PRESENCE.get(env.PRESENCE.idFromName('site')).fetch(request);
    }

    if (pathname === '/api/message') return handleMessage(request, env, ctx);

    if (pathname.startsWith('/api/play/')) return handlePlay(request, env);

    if (pathname.startsWith('/api/')) return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
