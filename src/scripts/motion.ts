/**
 * CHUYỂN ĐỘNG TOÀN TRANG (P3) — xem SKILLS.md mục 3.
 * Chạy lại sau mỗi lần chuyển trang (astro:page-load), dọn dẹp trước khi đổi trang (astro:before-swap).
 * Mọi hiệu ứng tắt khi người dùng bật "giảm chuyển động" trong hệ điều hành.
 */
import Lenis from 'lenis';

// GSAP chỉ được tải khi trang có phần tử cần hiệu ứng cuộn (tiết kiệm ~50KB cho trang không cần)
type Gsap = typeof import('gsap').gsap;
type ScrollTriggerType = typeof import('gsap/ScrollTrigger').ScrollTrigger;
let gsapLib: { gsap: Gsap; ScrollTrigger: ScrollTriggerType } | undefined;
async function loadGsap() {
  if (gsapLib) return gsapLib;
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
  gsap.registerPlugin(ScrollTrigger);
  lenis?.on('scroll', ScrollTrigger.update);
  return (gsapLib = { gsap, ScrollTrigger });
}

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => matchMedia('(pointer: fine)').matches;

/* ------------------------------------------------------------------
   1. Cuộn mượt (Lenis) — một thể hiện cho cả phiên, đồng bộ với ScrollTrigger
   ------------------------------------------------------------------ */
let lenis: Lenis | undefined;
function initSmoothScroll() {
  if (lenis || reduce() || !finePointer()) return;
  lenis = new Lenis({
    lerp: 0.12,
    autoRaf: true,
    // Không cuộn trang khi đang mở menu/lightbox (Radix khoá cuộn bằng data-scroll-locked)
    prevent: () => document.body.hasAttribute('data-scroll-locked'),
  });
  if (gsapLib) lenis.on('scroll', gsapLib.ScrollTrigger.update);
}

/* ------------------------------------------------------------------
   2. Màn đếm ngược T-3 … 1 → cất cánh (chỉ lần đầu trong phiên)
   ------------------------------------------------------------------ */
function initPreloader() {
  const root = document.documentElement;
  const el = document.querySelector<HTMLElement>('[data-preloader]');
  if (!el || root.dataset.boot !== 'pending') return;
  const digit = el.querySelector<HTMLElement>('[data-count]');
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    try {
      sessionStorage.setItem('boot', '1');
    } catch {}
    el.classList.add('is-launch');
    window.setTimeout(() => {
      root.removeAttribute('data-boot');
    }, 650);
  };
  el.addEventListener('click', finish, { once: true });
  window.addEventListener('keydown', finish, { once: true });
  [3, 2, 1].forEach((n, i) => window.setTimeout(() => !done && digit && (digit.textContent = String(n)), i * 320));
  window.setTimeout(finish, 3 * 320 + 120);
}

/* ------------------------------------------------------------------
   3. Bảng lật chữ (split-flap) — luân phiên các nghề ở hero
   ------------------------------------------------------------------ */
const FLAP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ·-';
let flapTimer: number | undefined;
function initSplitFlap() {
  window.clearInterval(flapTimer);
  cosmosAbort?.abort();
  const board = document.querySelector<HTMLElement>('[data-flap]');
  if (!board) return;
  const words: string[] = JSON.parse(board.dataset.flap ?? '[]').map((w: string) => w.toUpperCase());
  if (words.length < 2) return;
  const width = Math.max(...words.map((w) => w.length));
  board.innerHTML = '';
  const cells = Array.from({ length: width }, () => {
    const c = document.createElement('span');
    c.className = 'flap__cell';
    board.appendChild(c);
    return c;
  });
  const show = (word: string, animate: boolean) => {
    const padded = word.padEnd(width, ' ');
    cells.forEach((cell, i) => {
      const target = padded[i];
      if (!animate || reduce()) return void (cell.textContent = target);
      let ticks = 4 + Math.floor(Math.random() * 6) + i * 0.4;
      const spin = () => {
        if (ticks-- <= 0) {
          cell.textContent = target;
          cell.classList.remove('is-flipping');
          return;
        }
        cell.classList.add('is-flipping');
        cell.textContent = FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
        window.setTimeout(spin, 45);
      };
      window.setTimeout(spin, i * 28);
    });
  };
  let n = 0;
  show(words[0], false);
  board.setAttribute('aria-label', words.join(', '));
  flapTimer = window.setInterval(() => show(words[(n = (n + 1) % words.length)], true), 3400);
}

/* ------------------------------------------------------------------
   4. Đồng hồ độ cao — cuộn trang = tên lửa leo từ 0 lên 408 km (độ cao trạm ISS)
   ------------------------------------------------------------------ */
let altAbort: AbortController | undefined;
function initAltimeter() {
  altAbort?.abort();
  const el = document.querySelector<HTMLElement>('[data-altimeter]');
  if (!el) return;
  const readout = el.querySelector<HTMLElement>('[data-alt]');
  altAbort = new AbortController();
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    el.style.setProperty('--alt', String(p));
    // Trang Về tôi đã có nền vũ trụ kèm số đo riêng → ẩn đồng hồ chung
    const cosmos = !!document.querySelector('[data-cosmos]');
    el.toggleAttribute('data-hidden', max < window.innerHeight * 0.6 || cosmos);
    if (readout) readout.textContent = String(Math.round(p * 408)).padStart(3, '0');
  };
  update();
  window.addEventListener('scroll', update, { passive: true, signal: altAbort.signal });
  window.addEventListener('resize', update, { passive: true, signal: altAbort.signal });
}

/* ------------------------------------------------------------------
   4b. Nền vũ trụ (trang Về tôi, CosmosBackdrop.astro): tải cosmos.ts khi trang có [data-cosmos]
   ------------------------------------------------------------------ */
let cosmosAbort: AbortController | undefined;
function initCosmos() {
  cosmosAbort?.abort();
  const root = document.querySelector<HTMLElement>('[data-cosmos]');
  const track = document.querySelector<HTMLElement>('[data-cosmos-track]');
  if (!root || !track) return;
  const abort = (cosmosAbort = new AbortController());
  import('./cosmos').then(({ mountCosmos }) => {
    if (!abort.signal.aborted) mountCosmos(root, track, abort.signal);
  });
}

/* ------------------------------------------------------------------
   5. Hiệu ứng khi cuộn tới (GSAP ScrollTrigger)
   ------------------------------------------------------------------ */
const SCROLL_TARGETS = '[data-reveal], [data-trajectory], [data-gauge]';

async function initScrollEffects() {
  if (reduce() || !document.querySelector(SCROLL_TARGETS)) return;
  const { gsap, ScrollTrigger } = await loadGsap();

  // Khối nội dung hiện dần — chỉ áp cho khối nằm dưới màn hình đầu tiên để không bị nháy
  const below = gsap.utils
    .toArray<HTMLElement>('[data-reveal]')
    .filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.9);
  if (below.length) {
    gsap.set(below, { autoAlpha: 0, y: 28 });
    ScrollTrigger.batch(below, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 }),
    });
  }

  // Quỹ đạo phóng (trang Về tôi): đường tự vẽ theo cuộn, mỗi mốc "tách tầng" khi đường chạm tới
  document.querySelectorAll<HTMLElement>('[data-trajectory]').forEach((section) => {
    const line = section.querySelector<HTMLElement>('[data-trajectory-line]');
    if (line) {
      gsap.fromTo(line, { scaleY: 0 }, {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top 70%', end: 'bottom 60%', scrub: true },
      });
    }
    section.querySelectorAll<HTMLElement>('[data-stage]').forEach((stage) => {
      gsap.from(stage, {
        autoAlpha: 0,
        x: -24,
        duration: 0.6,
        ease: 'back.out(1.6)',
        scrollTrigger: { trigger: stage, start: 'top 75%', once: true },
      });
    });
  });

  // Thanh kỹ năng đầy dần
  gsap.utils.toArray<HTMLElement>('[data-gauge]').forEach((g) => {
    gsap.from(g, { scaleX: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: g, start: 'top 90%', once: true } });
  });
}

/* ------------------------------------------------------------------
   6. Trứng phục sinh: gõ "launch" ở bất kỳ đâu → mưa sao băng
   ------------------------------------------------------------------ */
let typed = '';
function onSecretKey(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  if (t?.closest('input, textarea, [contenteditable]')) return;
  typed = (typed + e.key.toLowerCase()).slice(-6);
  if (typed !== 'launch' || reduce()) return;
  typed = '';
  for (let i = 0; i < 14; i++) {
    const star = document.createElement('span');
    star.className = 'shooting-star';
    star.style.top = `${Math.random() * 60}vh`;
    star.style.left = `${40 + Math.random() * 70}vw`;
    star.style.animationDelay = `${i * 90}ms`;
    document.body.appendChild(star);
    star.addEventListener('animationend', () => star.remove());
  }
}

/* ------------------------------------------------------------------ */
document.addEventListener('astro:before-swap', () => {
  gsapLib?.ScrollTrigger.getAll().forEach((t) => t.kill());
  window.clearInterval(flapTimer);
  cosmosAbort?.abort();
});

document.addEventListener('astro:page-load', async () => {
  initSmoothScroll();
  initPreloader();
  initSplitFlap();
  initAltimeter();
  initCosmos();
  lenis?.resize(); // trang mới có chiều cao khác
  await initScrollEffects();
  gsapLib?.ScrollTrigger.refresh();
});

window.addEventListener('keydown', onSecretKey);
console.info('%c🛰  Orbi: gõ "launch" ở bất kỳ đâu để phóng tên lửa.', 'color:#ff6a3d;font-weight:600');
