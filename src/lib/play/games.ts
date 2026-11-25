/**
 * DANH MỤC TRÒ CHƠI ở trang /play. Thêm trò mới = thêm một dòng ở đây (+ trang, chữ, Worker: xem SKILLS.md mục 10).
 * Chữ của từng trò nằm trong nhóm i18n riêng (ui.yaml > santa, …); file này chỉ ghép lại cho thẻ.
 */
import { GiftIcon, type LucideIcon } from 'lucide-react';
import type { UI } from '@/lib/i18n';

export interface Game {
  /** Đường dẫn /play/<slug> */
  slug: string;
  /** Mã telemetry trên thẻ, giữ nguyên ở mọi ngôn ngữ */
  code: string;
  icon: LucideIcon;
  text: (t: UI) => { title: string; description: string; players: string; season?: string };
}

export const GAMES: Game[] = [
  {
    slug: 'secret-santa',
    code: 'G-01',
    icon: GiftIcon,
    text: (t) => ({ title: t.santa.title, description: t.santa.cardText, players: t.santa.cardPlayers, season: t.santa.season }),
  },
];
