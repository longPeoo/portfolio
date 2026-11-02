/**
 * Nền vũ trụ của trang Về tôi (CosmosBackdrop.astro), kiểu "Powers of Ten".
 * Cuộn trang thì camera lùi dần, thang đo thật (km, gốc toạ độ = Trái Đất):
 *   Hà Nội → Trái Đất – Mặt Trăng → các hành tinh đá → Hệ Mặt Trời → sao lân cận → Dải Ngân Hà.
 * Canvas 2D phủ kín màn hình, không thư viện. Ảnh Trái Đất/Mặt Trăng dùng lại ảnh NASA của hero (chiếu lên quả cầu bằng CPU).
 * Giao diện tối: vũ trụ thật. Giao diện sáng: bản đồ sao in mực trên giấy.
 * Tải động từ initCosmos() trong motion.ts. Giảm chuyển động: camera nhảy thẳng tới từng bậc, mọi thứ đứng yên.
 */
import dayUrl from '@/assets/earth/day.webp?url';
import nightUrl from '@/assets/earth/night.webp?url';
import moonUrl from '@/assets/earth/moon.webp?url';

const AU = 1.496e8;
const LY = 9.461e12;
const R_EARTH = 6371;
const R_MOON = 1737;
const R_SUN = 696000;
const MOON_ORBIT = 384400;

/** Các bậc dừng của camera: nửa bề rộng khung nhìn (km) */
const STOPS = [1.3e4, 5.4e5, 2.2 * AU, 34 * AU, 13 * LY, 66000 * LY].map(Math.log10);

/** Chu kỳ hiển thị (giây): đủ chậm để nhìn thấy chuyển động mà không rối mắt */
const YEAR = 150;
const MOON_PERIOD = 30;
const DAY = 90;

// a (AU), bán kính (km), màu, chu kỳ (năm Trái Đất)
const PLANETS: [number, number, string, number][] = [
  [0.387, 2440, '#a8a29a', 0.24],
  [0.723, 6052, '#e9d2a0', 0.62],
  [1, R_EARTH, '#5b9cf0', 1],
  [1.524, 3390, '#d9673c', 1.88],
  [5.2, 69911, '#dcb88f', 11.86],
  [9.58, 58232, '#e6d29c', 29.4],
  [19.2, 25362, '#a3dbe3', 84],
  [30.07, 24622, '#6286e6', 165],
];
const EARTH_INDEX = 2;
const SATURN_INDEX = 5;

// Sao gần Mặt Trời: tên, khoảng cách (năm ánh sáng), kinh độ thiên hà (độ), màu, có ghi tên không
const NEAR: [string, number, number, string, boolean][] = [
  ['Alpha Centauri', 4.37, 315.7, '#fff1d6', true],
  ["Barnard's Star", 5.96, 31, '#ffb08a', false],
  ['Wolf 359', 7.86, 244, '#ff9a7a', false],
  ['Lalande 21185', 8.31, 185, '#ffb890', false],
  ['Sirius', 8.6, 227, '#d6e4ff', true],
  ['Luyten 726-8', 8.7, 176, '#ffa184', false],
  ['Ross 154', 9.7, 11, '#ffab88', false],
  ['Epsilon Eridani', 10.5, 196, '#ffd9b0', false],
  ['Procyon', 11.4, 214, '#f4f2ff', true],
  ['61 Cygni', 11.4, 82, '#ffc79a', false],
  ['Tau Ceti', 11.9, 173, '#fff0d8', false],
];

/** Tâm Ngân Hà nằm về phía trên bên trái Mặt Trời, cách 26.000 năm ánh sáng */
const GC_ANGLE = -2.25;
const GC_DIST = 26000 * LY;
const GALAXY_R = 62000 * LY;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const x = clamp((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const toRad = (deg: number) => (deg * Math.PI) / 180;
const coord = (s: string) => (parseFloat(s) || 0) * (/[SW]/i.test(s) ? -1 : 1);

/** Số ngẫu nhiên có hạt giống: hình vẽ giống nhau ở mọi lần tải */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r: () => number) => (r() + r() + r() - 1.5) / 1.5;

type Tex = { w: number; h: number; d: Uint8ClampedArray };

async function loadTex(url: string, w: number): Promise<Tex | null> {
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const h = Math.round((w * img.naturalHeight) / img.naturalWidth);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, 0, 0, w, h);
    return { w, h, d: g.getImageData(0, 0, w, h).data };
  } catch {
    return null;
  }
}

/**
 * Quả cầu dựng sẵn hình học (kinh/vĩ độ, pháp tuyến của từng điểm ảnh) một lần;
 * mỗi lần vẽ lại chỉ tra màu ảnh + tính ánh sáng, nên rẻ.
 */
class Globe {
  canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private img: ImageData;
  private px: Int32Array;
  private lon: Float32Array;
  private v: Float32Array;
  private n: Float32Array;
  private edge: Float32Array;

  constructor(readonly size: number, readonly tilt: number) {
    this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d')!;
    this.img = this.ctx.createImageData(size, size);
    const px: number[] = [], lon: number[] = [], v: number[] = [], n: number[] = [], edge: number[] = [];
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = ((x + 0.5) / size) * 2 - 1;
        const ny = 1 - ((y + 0.5) / size) * 2;
        const r = Math.hypot(nx, ny);
        if (r > 1 + 1 / size) continue;
        const nz = Math.sqrt(Math.max(0, 1 - r * r));
        // Nghiêng trục: bắc cực ngả về phía người xem một góc tilt
        const by = ny * ct + nz * st;
        const bz = -ny * st + nz * ct;
        px.push(y * size + x);
        lon.push(Math.atan2(nx, bz));
        v.push(0.5 - Math.asin(clamp(by, -1, 1)) / Math.PI);
        n.push(nx, ny, nz);
        edge.push(clamp((1 - r) * size * 0.5));
      }
    }
    this.px = Int32Array.from(px);
    this.lon = Float32Array.from(lon);
    this.v = Float32Array.from(v);
    this.n = Float32Array.from(n);
    this.edge = Float32Array.from(edge);
  }

  /** Toạ độ trên ảnh (-1..1) và độ sâu của một điểm kinh/vĩ độ; z < 0 là mặt sau */
  project(lat: number, lon: number, lon0: number) {
    const bx = Math.cos(lat) * Math.sin(lon - lon0);
    const by = Math.sin(lat);
    const bz = Math.cos(lat) * Math.cos(lon - lon0);
    const ct = Math.cos(this.tilt), st = Math.sin(this.tilt);
    return { x: bx, y: -(by * ct - bz * st), z: by * st + bz * ct };
  }

  render(day: Tex, night: Tex | null, lon0: number, light: number[], atmo: boolean) {
    const { px, lon, v, n, edge } = this;
    const out = this.img.data;
    const [lx, ly, lz] = light;
    const TAU = Math.PI * 2;
    for (let k = 0; k < px.length; k++) {
      let u = (lon[k] + lon0) / TAU + 0.5;
      u -= Math.floor(u);
      const tx = Math.min(day.w - 1, (u * day.w) | 0);
      const ty = Math.min(day.h - 1, (v[k] * day.h) | 0);
      const ti = (ty * day.w + tx) * 4;
      const nx = n[k * 3], ny = n[k * 3 + 1], nz = n[k * 3 + 2];
      const d = nx * lx + ny * ly + nz * lz;
      let r: number, g: number, b: number;
      if (atmo) {
        const lit = smooth(-0.12, 0.45, d) * (0.4 + 0.6 * clamp(d));
        r = day.d[ti] * lit;
        g = day.d[ti + 1] * lit;
        b = day.d[ti + 2] * lit;
        if (night) {
          const ni = (Math.min(night.h - 1, (v[k] * night.h) | 0) * night.w + Math.min(night.w - 1, (u * night.w) | 0)) * 4;
          const dark = smooth(0.08, -0.25, d) * 1.5;
          r += night.d[ni] * dark;
          g += night.d[ni + 1] * dark * 0.82;
          b += night.d[ni + 2] * dark * 0.55;
        }
        // Viền khí quyển xanh ở rìa phía được chiếu sáng
        const rim = (1 - nz) ** 2.4 * smooth(-0.35, 0.4, d);
        r += 70 * rim;
        g += 140 * rim;
        b += 255 * rim;
      } else {
        const lit = clamp(d * 1.05 + 0.02) ** 0.85;
        r = day.d[ti] * lit;
        g = day.d[ti + 1] * lit;
        b = day.d[ti + 2] * lit;
      }
      const o = px[k] * 4;
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = edge[k] * 255;
    }
    this.ctx.putImageData(this.img, 0, 0);
  }
}

/** Nhường luồng chính giữa các bước nặng để không gây khựng khi cuộn */
const pause = () => new Promise<void>((done) => setTimeout(done, 0));

/**
 * Dải Ngân Hà: xoắn ốc có thanh chắn, 4 nhánh (2 nhánh chính), vẽ sẵn một lần (chia nhiều lượt nhỏ).
 * Có ink: bản in mực cho giao diện sáng (cùng hình dạng, sao là chấm mực trên giấy, không có quầng sáng).
 */
async function makeGalaxy(size: number, ink?: [number, number, number]) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const R = size / 2;
  const r = rng(7);
  const dots = document.createElement('canvas');
  dots.width = dots.height = size;
  const d = dots.getContext('2d')!;
  d.translate(R, R);
  d.globalCompositeOperation = ink ? 'source-over' : 'lighter';
  const bar = 0.45;
  const scale = size / 1024;
  /** Màu một chấm sao: bản thường giữ màu thật, bản mực đổi sang màu mực, giữ độ đậm */
  const col = (cr: number, cg: number, cb: number, a: number) =>
    ink ? `rgba(${ink[0]},${ink[1]},${ink[2]},${Math.min(1, a * 1.3)})` : `rgba(${cr},${cg},${cb},${a})`;

  // Thanh chắn ở lõi
  for (let i = 0; i < 1600; i++) {
    const along = gauss(r) * R * 0.2;
    const across = gauss(r) * R * 0.05;
    d.fillStyle = col(255, 200 + ((r() * 40) | 0), 150, 0.05 + r() * 0.12);
    d.fillRect(along * Math.cos(bar) - across * Math.sin(bar), along * Math.sin(bar) + across * Math.cos(bar), 1.6 * scale, 1.6 * scale);
  }
  // Các nhánh xoắn ốc logarit (góc xoắn ~13°): nhánh dày, toả rộng dần ra ngoài, có cụm sao sáng
  const pitch = Math.tan(toRad(13));
  const armPoint = (base: number, tt: number, off: number) => {
    const rad = R * (0.16 + 0.78 * tt);
    const theta = base + Math.log(rad / (R * 0.16)) / pitch;
    return [Math.cos(theta) * rad - Math.sin(theta) * off, Math.sin(theta) * rad + Math.cos(theta) * off];
  };
  const dust: number[][] = [];
  for (let arm = 0; arm < 4; arm++) {
    const major = arm % 2 === 0;
    const base = bar + (arm * Math.PI) / 2;
    const count = major ? 11000 : 6000;
    for (let i = 0; i < count; i++) {
      const tt = r() ** 0.8;
      // 40% số sao toả rộng ra hai bên: nhánh mềm, không thành một sợi chỉ
      const spread = R * (0.045 + 0.085 * tt) * (major ? 1 : 1.5) * (r() < 0.4 ? 2.4 : 1);
      const [x, y] = armPoint(base, tt, gauss(r) * spread);
      const a = (0.035 + r() * 0.1) * (1 - tt * 0.45) * (major ? 1 : 0.65);
      d.fillStyle = col(185 + ((r() * 60) | 0), 205 + ((r() * 40) | 0), 255, a);
      const s = (0.8 + r() * 1.2) * scale;
      d.fillRect(x, y, s, s);
    }
    // Cụm sao trẻ (xanh trắng) và vùng khí H-II (hồng) dọc nhánh
    for (let c = 0; c < (major ? 45 : 18); c++) {
      const tt = 0.1 + r() * 0.85;
      const [cx, cy] = armPoint(base, tt, gauss(r) * R * 0.03);
      const pink = r() < 0.35;
      for (let j = 0; j < 14; j++) {
        d.fillStyle = pink ? (ink ? `rgba(${ink},${0.1 + r() * 0.16})` : `rgba(255,130,180,${0.08 + r() * 0.14})`) : col(215, 230, 255, 0.08 + r() * 0.16);
        d.fillRect(cx + gauss(r) * R * 0.016, cy + gauss(r) * R * 0.016, 1.4 * scale, 1.4 * scale);
      }
    }
    // Dải bụi tối chạy dọc mép trong của nhánh
    for (let i = 0; i < (major ? 2600 : 1200); i++) {
      const tt = r() * 0.75;
      dust.push(armPoint(base, tt, -R * (0.02 + 0.03 * tt) + gauss(r) * R * 0.012));
    }
    await pause();
  }
  // Đĩa sao nền giữa các nhánh, dày ở trong, thưa dần ra ngoài
  for (let i = 0; i < 9000; i++) {
    const rad = R * 0.95 * Math.min(1, -Math.log(1 - r() * 0.98) * 0.3);
    const th = r() * Math.PI * 2;
    d.fillStyle = col(235, 228, 255, (0.04 + r() * 0.08) * (1 - rad / R));
    d.fillRect(Math.cos(th) * rad, Math.sin(th) * rad, scale, scale);
  }

  await pause();
  // Quầng đĩa mờ (chỉ bản thường: bản mực mà có quầng thì giấy trông bạc màu) + thanh chắn ở lõi
  if (!ink) {
    const halo = g.createRadialGradient(R, R, 0, R, R, R);
    halo.addColorStop(0, 'rgba(255,226,170,0.5)');
    halo.addColorStop(0.15, 'rgba(255,205,150,0.2)');
    halo.addColorStop(0.5, 'rgba(150,170,255,0.08)');
    halo.addColorStop(1, 'rgba(120,140,255,0)');
    g.fillStyle = halo;
    g.fillRect(0, 0, size, size);
  }
  g.save();
  g.translate(R, R);
  g.rotate(bar);
  g.scale(1, 0.38);
  const barGlow = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.3);
  barGlow.addColorStop(0, ink ? `rgba(${ink},0.55)` : 'rgba(255,225,170,0.5)');
  barGlow.addColorStop(1, ink ? `rgba(${ink},0)` : 'rgba(255,200,140,0)');
  g.fillStyle = barGlow;
  g.fillRect(-R, -R, size, size);
  g.restore();

  // Nhánh: một lớp nhoè rộng (ánh sáng khuếch tán) + một lớp nét (từng ngôi sao)
  g.globalCompositeOperation = ink ? 'source-over' : 'lighter';
  g.filter = `blur(${12 * scale}px)`;
  g.drawImage(dots, 0, 0);
  if (!ink) g.drawImage(dots, 0, 0);
  await pause();
  g.filter = `blur(${2 * scale}px)`;
  g.drawImage(dots, 0, 0);
  g.filter = 'none';
  g.globalAlpha = 0.8;
  g.drawImage(dots, 0, 0);
  g.globalAlpha = 1;

  await pause();
  // Bụi che bớt ánh sáng
  const lanes = document.createElement('canvas');
  lanes.width = lanes.height = size;
  const l = lanes.getContext('2d')!;
  l.translate(R, R);
  for (const [x, y] of dust) {
    l.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.15})`;
    l.fillRect(x, y, 3 * scale, 3 * scale);
  }
  g.globalCompositeOperation = 'destination-out';
  g.filter = `blur(${2.5 * scale}px)`;
  g.drawImage(lanes, 0, 0);
  g.filter = 'none';
  g.globalCompositeOperation = ink ? 'source-over' : 'lighter';
  const core = g.createRadialGradient(R, R, 0, R, R, R * 0.12);
  core.addColorStop(0, ink ? `rgba(${ink},0.75)` : 'rgba(255,248,225,0.85)');
  core.addColorStop(1, ink ? `rgba(${ink},0)` : 'rgba(255,215,150,0)');
  g.fillStyle = core;
  g.fillRect(0, 0, size, size);
  return c;
}

/** "#1B1B2F" → [27, 27, 47] */
const hexRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export function mountCosmos(root: HTMLElement, track: HTMLElement, signal: AbortSignal) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-cosmos-canvas]');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  const labels = JSON.parse(root.dataset.labels ?? '{}') as {
    levels: string[];
    earth: string;
    moon: string;
    sun: string;
    here: string;
    city: string;
  };
  const lat = toRad(coord(root.dataset.lat ?? '21.03'));
  const lon = toRad(coord(root.dataset.lon ?? '105.85'));
  const el = (k: string) => root.querySelector<HTMLElement>(`[data-cosmos-${k}]`);
  const out = { lv: el('lv'), level: el('level'), fov: el('fov'), unit: el('unit'), zoom: el('zoom') };
  const hint = el('hint');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const num = (digits: number) => new Intl.NumberFormat(document.documentElement.lang || undefined, { maximumFractionDigits: digits });

  // Màu lấy từ token CSS (global.css). Tối: vũ trụ thật. Sáng: bản đồ sao in mực trên giấy.
  let css: Record<string, string> = {};
  let dark = true;
  let fg = '';
  let inkGalaxy: HTMLCanvasElement | null = null;
  const building = new Set<string>();
  const readColors = () => {
    const s = getComputedStyle(document.documentElement);
    css = Object.fromEntries(
      ['signal', 'sun', 'paper', 'ink', 'space', 'space-2', 'aurora', 'aurora-deep'].map((k) => [k, s.getPropertyValue(`--c-${k}`).trim()]),
    );
    css.signalInk = s.getPropertyValue('--signal-ink').trim() || css.signal;
    css.mono = s.getPropertyValue('--font-mono').trim();
    dark = document.documentElement.classList.contains('dark');
    fg = dark ? css.paper : css.ink;
    // Chỉ dựng bản Ngân Hà của giao diện đang dùng; đổi giao diện thì dựng thêm bản kia
    const key = dark ? 'color' : 'ink';
    if (building.has(key)) return;
    building.add(key);
    const ink = dark ? undefined : hexRgb(css.ink);
    idle(() => {
      if (signal.aborted) return;
      makeGalaxy(1024, ink).then((g) => {
        if (ink) inkGalaxy = g;
        else galaxy = g;
        wake();
      });
    });
  };

  // Dữ liệu tĩnh
  const r = rng(42);
  const ambient = Array.from({ length: 260 }, () => [r(), r(), 0.3 + r() * 0.9, r() * 6, 0.6 + r() * 1.6]);
  const tints = ['#fff4e8', '#ffd9b0', '#cfdcff', '#ffb890', '#ffffff'];
  type Dot = [number, number, number, string];
  const scatter = (count: number, rad: (u: number) => number, tint: () => string): Dot[] =>
    Array.from({ length: count }, () => {
      const d = rad(r());
      const a = r() * Math.PI * 2;
      return [Math.cos(a) * d, Math.sin(a) * d, 0.4 + r() * 1.1, tint()];
    });
  const starTint = () => tints[(r() * tints.length) | 0];
  // Sao quanh Mặt Trời theo từng tầng (30 / 300 / 3.000 năm ánh sáng), mỗi tầng rải trong một đĩa mép mờ:
  // khung nào cũng có sao mà không dồn cục ở giữa
  const layers = [30, 300, 3000].map((ly) => ({
    log: Math.log10(ly * LY),
    dots: scatter(260, (u) => Math.sqrt(-Math.log(1 - u * 0.96)) * 0.6 * ly * LY, starTint),
  }));
  // Vành đai Kuiper (30–50 AU) và đám mây Oort (2.000–80.000 AU)
  const kuiper = scatter(520, (u) => (30 + u * 20 + gauss(r) * 3) * AU, () => '#c9c2b4');
  const oort = scatter(1000, (u) => 2000 * 40 ** u * AU, () => '#b9cbe8');
  const VOYAGER = { dist: 167 * AU, angle: -0.95 };
  const phases = PLANETS.map(() => r() * Math.PI * 2);

  let earthGlobe: Globe | null = null;
  const moonGlobe = new Globe(160, 0);
  let day: Tex | null = null;
  let night: Tex | null = null;
  let moonTex: Tex | null = null;
  let galaxy: HTMLCanvasElement | null = null;
  const idle = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 300));
  Promise.all([loadTex(dayUrl, 2048), loadTex(nightUrl, 2048), loadTex(moonUrl, 512)]).then(([a, b, c]) => {
    day = a;
    night = b;
    moonTex = c;
    lastSprite = -1e9;
    wake();
  });
  readColors();

  // ---- Tiến độ cuộn → bậc thang đo: đầu trang = Trái Đất, hết câu chuyện + timeline = Dải Ngân Hà ----
  let target = STOPS[0];
  let current = STOPS[0];
  const fromProgress = (p: number) => {
    const s = p * (STOPS.length - 1);
    const i = Math.min(STOPS.length - 2, Math.floor(s));
    const f = s - i;
    // Dừng lâu ở mỗi bậc, chuyển nhanh ở giữa: dễ đọc từng thang đo
    const e = f * f * f * (f * (f * 6 - 15) + 10);
    return lerp(STOPS[i], STOPS[i + 1], e);
  };
  // Mép phải của cột chữ (đo lại khi đổi cỡ cửa sổ): bỏ qua khối rộng gần hết khung như lưới kỹ năng.
  // Ngưỡng lấy theo cả màn hình lẫn khung nội dung (.container, tối đa 1320px): màn rất rộng thì khung hẹp hơn 85% màn hình,
  // nếu chỉ so với màn hình thì khối rộng hết khung (vd. dòng nhãn PHÍM 01) bị tính là chữ → Trái Đất bị đẩy ra sát mép.
  let textRight = 0;
  const measure = () => {
    textRight = 0;
    const box = document.querySelector('main .container');
    const boxRight = box ? box.getBoundingClientRect().right - parseFloat(getComputedStyle(box).paddingRight) : Infinity;
    const limit = Math.min(window.innerWidth * 0.85, boxRight * 0.92);
    document.querySelectorAll('main :is(p, h1, h2, h3)').forEach((node) => {
      const right = node.getBoundingClientRect().right;
      if (right < limit) textRight = Math.max(textRight, right);
    });
  };
  const onScroll = () => {
    const vh = window.innerHeight;
    const end = track.getBoundingClientRect().bottom + window.scrollY - vh * 0.75;
    const p = clamp(window.scrollY / Math.max(1, end));
    // Giảm chuyển động: nhảy thẳng tới bậc gần nhất, không phóng to liên tục
    target = reduce ? STOPS[Math.round(p * (STOPS.length - 1))] : fromProgress(p);
    hint?.toggleAttribute('hidden', p > 0.02);
    wake();
  };

  // ---- Vẽ ----
  const t0 = performance.now();
  let W = 0, H = 0, dpr = 1;
  let lastSprite = -1e9;
  let lastFrame = 0;
  let raf = 0;
  const text: Record<string, string> = {};
  const put = (k: keyof typeof out, v: string) => {
    const node = out[k];
    if (!node || text[k] === v) return;
    text[k] = v;
    node.textContent = v;
  };

  const label = (s: string, x: number, y: number, alpha: number, color = fg) => {
    if (alpha < 0.02) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.font = `500 10.5px ${css.mono}`;
    const str = s.toUpperCase();
    // Sát mép phải thì đưa nhãn sang trái điểm
    const w = ctx.measureText(str).width;
    ctx.fillText(str, x + w > W - 12 ? x - w - 18 : x, y);
    ctx.globalAlpha = 1;
  };
  const disc = (x: number, y: number, rad: number, color: string, alpha = 1, outline = false) => {
    if (alpha < 0.02) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
    if (outline) {
      ctx.strokeStyle = css.ink;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  const glow = (x: number, y: number, rad: number, color: string, alpha: number) => {
    if (alpha < 0.02 || rad < 0.5) return;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, color);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gr;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    ctx.globalAlpha = 1;
  };

  const draw = (now: number) => {
    raf = 0;
    const settled = reduce || Math.abs(current - target) < 1e-4;
    // Camera đứng yên thì chỉ cần ~30 khung/giây cho các chuyển động chậm (quỹ đạo, sao lấp lánh)
    if (settled && !reduce && now - lastFrame < 32) {
      raf = requestAnimationFrame(draw);
      return;
    }
    lastFrame = now;
    const t = reduce ? 20 : (now - t0) / 1000;
    // Camera lướt tới bậc đích (giảm chuyển động: tới ngay)
    current = settled ? target : lerp(current, target, 0.09);
    const L = current;

    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return;
    if (cw !== W || ch !== H || canvas.width !== Math.round(cw * dpr)) {
      W = cw;
      H = ch;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Tâm khung cảnh: màn hình rộng đặt ngay sau mép phải cột chữ (lấn ra ngoài mép màn hình nếu chật), hẹp thì ở giữa
    const wide = W >= 1100;
    const headerH = 68;
    const R = Math.min(W * (wide ? 0.24 : 0.46), (H - headerH) * 0.44);
    const earth0 = R * (R_EARTH / 10 ** STOPS[0]);
    const fx = wide ? clamp(textRight + earth0 + 40, W * 0.7, W - earth0 * 0.4) : W / 2;
    const fy = (H + headerH) / 2;
    const half = 10 ** L;
    const s = R / half; // px trên mỗi km
    // Mặt phẳng quỹ đạo nhìn nghiêng ở gần, nhìn thẳng từ trên xuống khi ra tới Ngân Hà
    const k = lerp(0.42, 1, smooth(13, 16.8, L));

    // Vị trí (km, gốc = Trái Đất)
    const orbitAngle = (i: number) => phases[i] + (t / (YEAR * PLANETS[i][3])) * Math.PI * 2;
    const ea = orbitAngle(EARTH_INDEX);
    const sunX = -Math.cos(ea) * AU, sunY = -Math.sin(ea) * AU;
    const gcX = sunX + Math.cos(GC_ANGLE) * GC_DIST, gcY = sunY + Math.sin(GC_ANGLE) * GC_DIST;
    // Tâm camera: Trái Đất → Mặt Trời → (gần) tâm Ngân Hà
    const wSun = smooth(7.6, 8.5, L);
    const wGal = smooth(16.2, 17.6, L) * 0.78;
    const cx = lerp(0, sunX, wSun) + (gcX - sunX) * wGal;
    const cy = lerp(0, sunY, wSun) + (gcY - sunY) * wGal;
    const X = (x: number) => fx + (x - cx) * s;
    const Y = (y: number) => fy + (y - cy) * s * k;

    // Nền: tối = vũ trụ; sáng = trong suốt (giấy của trang hiện ra)
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (dark) {
      ctx.fillStyle = css.space;
      ctx.fillRect(0, 0, W, H);
      const vign = ctx.createRadialGradient(fx, fy, 0, fx, fy, Math.max(W, H) * 0.7);
      vign.addColorStop(0, css['space-2']);
      vign.addColorStop(1, css.space);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = vign;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    const galA = smooth(15.2, 16.7, L);
    const sysA = 1 - smooth(12.2, 13.2, L);
    const starColor = (c: string) => (dark ? c : fg);

    // Sao nền (không gian màn hình): luôn có một chút để nền không trống
    ctx.fillStyle = fg;
    for (const [x, y, a, ph, sp] of ambient) {
      ctx.globalAlpha = a * (0.45 + 0.35 * Math.sin(t * sp + ph)) * (1 - galA * 0.7) * (dark ? 0.6 : 0.3);
      ctx.fillRect(x * W, y * H, 1.2, 1.2);
    }
    ctx.globalAlpha = 1;

    // Dải Ngân Hà
    const galSprite = dark ? galaxy : inkGalaxy;
    if (galSprite && galA > 0.01) {
      const gr = GALAXY_R * s;
      ctx.globalAlpha = galA * (dark ? 1 : 0.85);
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      ctx.drawImage(galSprite, X(gcX) - gr, Y(gcY) - gr * k, gr * 2, gr * 2 * k);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    const dots = (list: Dot[], alpha: number, scale = 0.8) => {
      if (alpha < 0.01) return;
      for (const [x, y, size, color] of list) {
        const px = X(sunX + x), py = Y(sunY + y);
        if (px < -4 || px > W + 4 || py < -4 || py > H + 4) continue;
        disc(px, py, size * scale, starColor(color), alpha * (dark ? 1 : 0.6));
      }
    };
    // Các vì sao quanh Mặt Trời: mỗi tầng hiện khi đĩa của nó vừa khung, mờ đi khi đã quá dày
    for (const layer of layers) dots(layer.dots, 0.9 * smooth(layer.log - 1.4, layer.log - 0.9, L) * (1 - smooth(layer.log - 0.1, layer.log + 0.45, L)));
    // Vành đai Kuiper, đám mây Oort
    const kpx = 40 * AU * s;
    dots(kuiper, 0.55 * smooth(10, 30, kpx) * (1 - smooth(W * 0.8, W * 2, kpx)) * sysA, 0.6);
    dots(oort, 0.5 * smooth(10.6, 11.4, L) * (1 - smooth(13.4, 14.2, L)), 0.55);
    // Voyager 1: vật thể nhân tạo xa nhất, đã ra khỏi nhật quyển
    {
      const vA = smooth(9.7, 10.1, L) * (1 - smooth(11.4, 11.9, L));
      if (vA > 0.02) {
        const vColor = dark ? css.aurora : css['aurora-deep'];
        const px = X(sunX + Math.cos(VOYAGER.angle) * VOYAGER.dist), py = Y(sunY + Math.sin(VOYAGER.angle) * VOYAGER.dist);
        ctx.globalAlpha = vA * 0.6;
        ctx.strokeStyle = fg;
        ctx.lineWidth = 1;
        ctx.setLineDash([1, 3]);
        ctx.beginPath();
        ctx.moveTo(X(sunX), Y(sunY));
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        disc(px, py, 2.2, vColor, vA);
        label('Voyager 1', px + 7, py + 4, vA * 0.9, vColor);
      }
    }
    const nearA = smooth(12.6, 13.6, L) * (1 - smooth(15.2, 16.2, L));
    if (nearA > 0.01) {
      const labelA = nearA * (1 - smooth(14.3, 14.9, L));
      for (const [name, dist, gl, color, named] of NEAR) {
        const a = GC_ANGLE - toRad(gl);
        const px = X(sunX + Math.cos(a) * dist * LY), py = Y(sunY + Math.sin(a) * dist * LY);
        if (dark) glow(px, py, 8, color, nearA * 0.5);
        disc(px, py, 1.8, starColor(color), nearA);
        if (named) label(name, px + 7, py + 4, labelA * 0.75);
      }
    }

    // Hệ Mặt Trời: quỹ đạo, hành tinh
    if (sysA > 0.01) {
      ctx.lineWidth = 1;
      PLANETS.forEach(([a], i) => {
        const rpx = a * AU * s;
        const oa = smooth(5, 16, rpx) * (1 - smooth(W * 1.4, W * 3.5, rpx)) * sysA;
        if (oa < 0.02) return;
        ctx.globalAlpha = oa * (i === EARTH_INDEX ? 0.9 : dark ? 0.32 : 0.4);
        ctx.strokeStyle = i === EARTH_INDEX ? css.signal : fg;
        ctx.setLineDash(i === EARTH_INDEX ? [] : [2, 4]);
        ctx.beginPath();
        ctx.ellipse(X(sunX), Y(sunY), rpx, rpx * k, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      PLANETS.forEach(([a, rad, color], i) => {
        if (i === EARTH_INDEX) return;
        const ang = orbitAngle(i);
        const px = X(sunX + Math.cos(ang) * a * AU), py = Y(sunY + Math.sin(ang) * a * AU);
        const rpx = Math.max(rad * s, i >= 4 ? 2.8 : 1.8);
        const vis = smooth(3, 10, a * AU * s) * sysA;
        if (i === SATURN_INDEX && vis > 0.02) {
          ctx.globalAlpha = vis * 0.8;
          ctx.strokeStyle = dark ? color : fg;
          ctx.beginPath();
          ctx.ellipse(px, py, rpx * 2.2, rpx * 2.2 * 0.38, -0.35, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        disc(px, py, rpx, color, vis, !dark);
      });
    }

    // Mặt Trời: đĩa + quầng; ra xa thì thành một ngôi sao
    {
      const px = X(sunX), py = Y(sunY);
      const rs = Math.max(R_SUN * s, 3);
      if (px > -300 && px < W + 300 && py > -300 && py < H + 300) {
        glow(px, py, Math.max(rs * 4, 18), css.sun, (dark ? 0.55 : 0.7) * (1 - galA * 0.6));
        disc(px, py, rs, dark ? '#fff3c4' : css.sun, 1 - galA * 0.5, !dark);
        label(labels.sun, px + rs + 7, py - rs - 5, smooth(7.9, 8.4, L) * (1 - smooth(14.6, 15.4, L)) * 0.9, dark ? css.sun : css.signalInk);
      }
    }

    // Trái Đất – Mặt Trăng
    const re = R_EARTH * s;
    const ex = X(0), ey = Y(0);
    const ma = -(t / MOON_PERIOD) * Math.PI * 2 + 0.6;
    const mx = X(Math.cos(ma) * MOON_ORBIT), my = Y(Math.sin(ma) * MOON_ORBIT);
    const moonBehind = Math.sin(ma) < 0;
    const lightAngle = -0.45 + (t / DAY) * Math.PI * 2;
    const light = [Math.sin(lightAngle) * 0.97, 0.22, Math.cos(lightAngle) * 0.97];
    const moonA = 1 - smooth(8.4, 9.2, L);
    const moonOrbitPx = MOON_ORBIT * s;

    // Ảnh quả cầu đủ nét cho cỡ lớn nhất trên màn hình này (dựng lại khi đổi cỡ cửa sổ nhiều)
    const want = Math.min(640, Math.max(256, Math.round((R * (R_EARTH / 10 ** STOPS[0]) * 2 * dpr) / 32) * 32));
    if (!earthGlobe || Math.abs(earthGlobe.size - want) > want * 0.3) {
      earthGlobe = new Globe(want, toRad(17));
      lastSprite = -1e9;
    }
    // Vẽ lại ảnh quả cầu ~5 lần/giây (ánh sáng đổi rất chậm)
    if (day && (now - lastSprite > 200 || reduce) && (re > 3 || moonOrbitPx < W * 3)) {
      lastSprite = now;
      if (re > 3) earthGlobe.render(day, night, lon - 0.18, light, true);
      if (moonTex) moonGlobe.render(moonTex, null, 0, light, false);
    }

    const drawMoon = () => {
      if (moonA < 0.02) return;
      const rm = Math.max(R_MOON * s, 1.8);
      ctx.globalAlpha = moonA;
      if (moonTex && rm > 3) ctx.drawImage(moonGlobe.canvas, mx - rm, my - rm, rm * 2, rm * 2);
      else disc(mx, my, rm, dark ? '#d8d4cc' : '#8d877c', moonA);
      ctx.globalAlpha = 1;
      label(labels.moon, mx + rm + 6, my + 4, smooth(40, 70, moonOrbitPx) * (1 - smooth(W * 0.9, W * 2, moonOrbitPx)) * moonA * 0.8);
    };

    if (moonA > 0.02) {
      const oa = smooth(12, 30, moonOrbitPx) * (1 - smooth(W * 1.2, W * 3, moonOrbitPx)) * moonA;
      if (oa > 0.02) {
        ctx.globalAlpha = oa * (dark ? 0.35 : 0.45);
        ctx.strokeStyle = fg;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.ellipse(ex, ey, moonOrbitPx, moonOrbitPx * k, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      if (moonBehind) drawMoon();
    }

    if (re > 3 && day) {
      glow(ex, ey, re * 1.22, 'rgba(90,160,255,0.55)', smooth(-0.4, 0.3, light[2]) * (dark ? 0.8 : 0.5));
      ctx.drawImage(earthGlobe.canvas, ex - re, ey - re, re * 2, re * 2);
      // Ghim Hà Nội
      const pin = earthGlobe.project(lat, lon, lon - 0.18);
      const pinA = smooth(40, 80, re) * smooth(0, 0.25, pin.z);
      if (pinA > 0.02) {
        const px = ex + pin.x * re, py = ey + pin.y * re;
        const pulse = reduce ? 0 : (t % 2.4) / 2.4;
        ctx.globalAlpha = pinA * (1 - pulse);
        ctx.strokeStyle = css.signal;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 4 + pulse * 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        disc(px, py, 3.6, css.signal, pinA);
        label(labels.city, px + 10, py + 4, pinA, css.paper);
      }
    } else {
      disc(ex, ey, Math.max(re, 2.4), PLANETS[EARTH_INDEX][2], sysA, !dark);
    }
    if (!moonBehind) drawMoon();

    // Đánh dấu Trái Đất khi đã nhỏ thành một chấm (ẩn khi đã sát Mặt Trời trên màn hình)
    const markA = smooth(7, 3, re) * smooth(34, 54, AU * s);
    if (markA > 0.02) {
      ctx.globalAlpha = markA;
      ctx.strokeStyle = css.signal;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ex, ey, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      label(labels.earth, ex + 12, ey - 9, markA, dark ? css.signal : css.signalInk);
    }

    // "Bạn ở đây" trên bản đồ Ngân Hà
    const hereA = smooth(16.4, 17.3, L);
    if (hereA > 0.02) {
      const px = X(sunX), py = Y(sunY);
      const pulse = reduce ? 0.3 : (t % 2.4) / 2.4;
      ctx.globalAlpha = hereA * (1 - pulse);
      ctx.strokeStyle = css.signal;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 6 + pulse * 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = hereA;
      ctx.beginPath();
      ctx.moveTo(px + 5, py - 5);
      ctx.lineTo(px + 22, py - 22);
      ctx.stroke();
      ctx.globalAlpha = 1;
      disc(px, py, 3, css.signal, hereA);
      label(labels.here, px + 25, py - 23, hereA, dark ? css.signal : css.signalInk);
    }

    // Số đo
    const stop = STOPS.reduce((best, v, i) => (Math.abs(v - L) < Math.abs(STOPS[best] - L) ? i : best), 0);
    put('lv', `L${stop}`);
    put('level', labels.levels[stop] ?? '');
    // Bề rộng màn hình quy ra khoảng cách thật, làm tròn 2–3 chữ số có nghĩa
    const fov = W / s;
    const [value, unit] = fov < 0.1 * AU ? [fov, 'km'] : fov < 0.3 * LY ? [fov / AU, 'AU'] : [fov / LY, 'ly'];
    const round = (v: number) => {
      const p = 10 ** Math.max(0, Math.floor(Math.log10(v)) - 2);
      return Math.round(v / p) * p;
    };
    put('fov', num(value < 10 ? 1 : 0).format(value < 10 ? value : round(value)));
    put('unit', unit);
    put('zoom', String(Math.round(L - STOPS[0])));

    // Tiếp tục vẽ (trình duyệt tự dừng khi tab ẩn); giảm chuyển động chỉ vẽ khi camera đổi bậc
    if (!reduce) raf = requestAnimationFrame(draw);
  };

  const wake = () => {
    if (!raf) raf = requestAnimationFrame(draw);
  };

  const mo = new MutationObserver(() => {
    readColors();
    wake();
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  let ticking = false;
  const throttled = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      onScroll();
    });
  };
  window.addEventListener('scroll', throttled, { passive: true, signal });
  window.addEventListener('resize', () => {
    measure();
    throttled();
  }, { passive: true, signal });
  measure();
  onScroll();
  current = target;
  wake();

  signal.addEventListener('abort', () => {
    cancelAnimationFrame(raf);
    mo.disconnect();
  });
}
