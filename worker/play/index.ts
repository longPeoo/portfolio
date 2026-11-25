/**
 * /api/play/<trò>/…: định tuyến chung cho các trò chơi ở trang /play.
 *
 * Thêm trò mới:
 * 1. worker/play/<trò>.ts: Durable Object riêng (mỗi phòng một object) + hàm handle<Trò>(request, env, path).
 * 2. Khai báo binding + class trong wrangler.jsonc, export class ở worker/index.ts, chạy `npm run cf-typegen`.
 * 3. Thêm một dòng vào GAMES bên dưới và vào src/lib/play/games.ts (thẻ ở trang /play).
 *
 * Kiểm tra chung cho mọi trò (rẻ trước, đắt sau): đúng nguồn với lệnh ghi → giới hạn tần suất theo IP (PLAY_LIMIT).
 */
import { handleSanta } from './santa';
import { clientIp, fail, sameOrigin } from './http';

type GameHandler = (request: Request, env: Env, path: string[]) => Promise<Response>;

const GAMES: Record<string, GameHandler> = {
  santa: handleSanta,
};

export async function handlePlay(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  const [game = '', ...path] = pathname.slice('/api/play/'.length).split('/').filter(Boolean);
  const handler = GAMES[game];
  if (!handler) return fail('not_found');

  const reading = request.method === 'GET' || request.method === 'HEAD';
  if (!reading && !sameOrigin(request)) return fail('origin');

  const { success } = await env.PLAY_LIMIT.limit({ key: clientIp(request) });
  if (!success) return fail('rate', { retryAfter: 60 });

  try {
    return await handler(request, env, path);
  } catch (error) {
    console.error(`[play/${game}]`, error);
    return fail('server');
  }
}
