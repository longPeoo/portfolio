/**
 * Island React của trò Secret Santa (/play/secret-santa). Chữ nhận qua prop `labels` (ui.yaml > santa),
 * linh vật Orbi nhận qua slot "orbi" của Astro.
 *
 * Màn hình theo URL (trang tĩnh, mọi thứ đọc ở trình duyệt):
 *   (không có ?code)            Home: vào phòng bằng mã / tạo phòng mới
 *   ?code=XXXXXX                Room
 *   ?code=XXXXXX#admin=…        Room + lưu token quản lý vào máy này rồi xoá khỏi thanh địa chỉ
 *   ?code=XXXXXX#join=…         Room + vào bằng mã cá nhân (chế độ Link riêng), cũng xoá khỏi thanh địa chỉ
 * Đổi màn dùng history.replaceState (không đẩy thêm lịch sử, không đụng router của Astro).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { isRoomCode, normalizeCode } from '@/lib/play/santa';
import { store, takeSecret, type Labels } from './api';
import { Created } from './Created';
import type { Created as CreatedRoom } from './CreateForm';
import { Home } from './Home';
import { OrbiContext } from './parts';
import { Room } from './Room';
import './santa.css';

type View =
  | { kind: 'boot' }
  | { kind: 'home' }
  | { kind: 'created'; room: CreatedRoom }
  | { kind: 'room'; code: string; join?: string };

export default function SantaApp({ labels, intl, orbi }: { labels: Labels; intl: string; orbi?: ReactNode }) {
  const [view, setView] = useState<View>({ kind: 'boot' });
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const code = normalizeCode(new URLSearchParams(location.search).get('code') ?? '');
    const secret = takeSecret();
    if (isRoomCode(code)) {
      if (secret.admin) store.setAdmin(code, secret.admin);
      setView({ kind: 'room', code, join: secret.join });
    } else setView({ kind: 'home' });
  }, []);

  const go = (next: View, query: string) => {
    history.replaceState(history.state, '', location.pathname + query);
    setView(next);
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => root.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }));
  };
  const openRoom = (code: string) => go({ kind: 'room', code }, `?code=${code}`);
  const home = () => go({ kind: 'home' }, '');

  return (
    <OrbiContext.Provider value={orbi}>
      <div ref={root} className="santa-app">
        {view.kind === 'boot' && (
          <div className="flex flex-col items-center gap-6">
            <Skeleton className="h-11 w-full max-w-md rounded-lg" />
            <Skeleton className="h-72 w-full max-w-xl rounded-2xl" />
          </div>
        )}
        {view.kind === 'home' && <Home labels={labels} onOpen={openRoom} onCreated={(room) => go({ kind: 'created', room }, `?code=${room.code}`)} />}
        {view.kind === 'created' && <Created room={view.room} labels={labels} onEnter={() => openRoom(view.room.code)} />}
        {view.kind === 'room' && <Room key={view.code} code={view.code} join={view.join} labels={labels} intl={intl} onLeave={home} />}
      </div>
    </OrbiContext.Provider>
  );
}
