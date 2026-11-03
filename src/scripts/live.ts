/**
 * Số người đang xem web (Durable Object Presence, worker/presence.ts), hiện ở mọi phần tử [data-live]:
 *   <span data-live><span data-live-count>--</span> đang xem</span>
 *
 * - Một kết nối WebSocket cho cả phiên: script module chỉ chạy một lần nên chuyển trang (View Transitions) không mở lại.
 * - Mở sau sự kiện `load` + lúc rảnh, không tranh băng thông với nội dung chính.
 * - Ping 30 giây/lần (Cloudflare tự trả lời, không đánh thức Durable Object).
 * - Tab ẩn quá 60 giây thì ngắt (không tính người để tab nằm đó), quay lại thì nối lại.
 * - Mất kết nối: thử lại lùi dần 1 → 30 giây; 5 lần liền không vào được (vd. `astro dev` không có API) thì ẩn bộ đếm.
 */
const PING_MS = 30_000;
const HIDDEN_MS = 60_000;
const MAX_FAILS = 5;
const ID_KEY = 'orbi-visitor';

let ws: WebSocket | undefined;
let count: number | undefined;
let fails = 0;
let off = false;
let pingTimer: number | undefined;
let retryTimer: number | undefined;
let hiddenTimer: number | undefined;
const fmt = new Intl.NumberFormat(document.documentElement.lang || 'vi');

/** Mã ngẫu nhiên cho trình duyệt này: nhiều tab chỉ tính là một người. Không chứa thông tin cá nhân. */
function visitorId() {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) localStorage.setItem(ID_KEY, (id = crypto.randomUUID()));
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function render(changed = false) {
  document.querySelectorAll<HTMLElement>('[data-live]').forEach((el) => {
    el.toggleAttribute('data-off', off);
    el.toggleAttribute('data-ready', count !== undefined);
    const n = el.querySelector<HTMLElement>('[data-live-count]');
    if (!n) return;
    n.textContent = count === undefined ? '--' : fmt.format(count);
    if (changed) {
      // Số mới "nảy" nhẹ (CSS: [data-live-count].is-tick)
      n.classList.remove('is-tick');
      void n.offsetWidth;
      n.classList.add('is-tick');
    }
  });
}

function connect() {
  if (off || ws || document.visibilityState === 'hidden') return;
  window.clearTimeout(retryTimer);
  const url = new URL('/api/live', location.href);
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('v', visitorId());

  const socket = new WebSocket(url);
  ws = socket;
  let opened = false;

  socket.addEventListener('open', () => {
    opened = true;
    fails = 0;
    window.clearInterval(pingTimer);
    pingTimer = window.setInterval(() => socket.readyState === WebSocket.OPEN && socket.send('ping'), PING_MS);
  });

  socket.addEventListener('message', (e) => {
    if (e.data === 'pong') return;
    try {
      const n = (JSON.parse(e.data as string) as { n?: unknown }).n;
      if (typeof n === 'number' && Number.isFinite(n)) {
        const changed = count !== undefined && n !== count;
        count = Math.max(1, n); // ít nhất là chính mình
        render(changed);
      }
    } catch {
      // Bỏ qua gói lạ
    }
  });

  socket.addEventListener('close', (e) => {
    window.clearInterval(pingTimer);
    if (ws === socket) ws = undefined;
    if (e.code === 1000 && e.reason === 'hidden') return; // tự ngắt vì tab ẩn
    if (!opened && ++fails >= MAX_FAILS) {
      off = true;
      render();
      return;
    }
    const delay = Math.min(30_000, 1000 * 2 ** fails) * (0.7 + Math.random() * 0.6);
    retryTimer = window.setTimeout(connect, delay);
  });
}

function onVisibility() {
  window.clearTimeout(hiddenTimer);
  if (document.visibilityState === 'hidden') {
    hiddenTimer = window.setTimeout(() => ws?.close(1000, 'hidden'), HIDDEN_MS);
  } else {
    connect();
  }
}

let started = false;
/** Gọi ở mỗi `astro:page-load`: lần đầu thì mở kết nối, các lần sau chỉ vẽ lại số lên trang mới */
export function initLive() {
  render();
  if (started || !document.querySelector('[data-live]')) return;
  started = true;
  const start = () => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    idle(connect);
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
  document.addEventListener('visibilitychange', onVisibility);
}
