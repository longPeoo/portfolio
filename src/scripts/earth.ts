/**
 * TRÁI ĐẤT Ở HERO — WebGL thuần (~4KB), không dùng thư viện 3D.
 * - Ảnh bề mặt: NASA Blue Marble (ngày) + Black Marble (đèn thành phố ban đêm) + LRO (Mặt Trăng), phạm vi công cộng.
 * - Giao diện sáng: Mặt Trời (SVG ở góc trên trái) chiếu sáng Trái Đất.
 * - Giao diện tối: Trái Đất nửa đêm với đèn thành phố, Mặt Trăng sáng quay quanh và bị che khi đi ra sau.
 * Canvas phủ đúng khung viewBox 600×600 của SVG quỹ đạo: Trái Đất tâm (300,300) bán kính 118.
 * Ảnh tải sau khi trang load xong; trước đó vẫn thấy hành tinh lưới SVG (cũng là bản dự phòng khi không có WebGL).
 */
import dayUrl from '@/assets/earth/day.webp?url';
import nightUrl from '@/assets/earth/night.webp?url';
import moonUrl from '@/assets/earth/moon.webp?url';

const VIEW = 600;
const EARTH = { x: 300, y: 300, r: 118 };
const MOON = { r: 24, orbit: 228, squash: 0.26, tilt: -0.21, period: 36 };
const SPIN_PERIOD = 90; // giây / vòng

// Hướng ánh sáng (x phải, y lên, z hướng về người xem)
const SUN_DAY = norm([0.62, 0.62, 0.55]); // từ Mặt Trời ở góc trên phải (SVG trong Hero.astro)
const SUN_NIGHT = norm([0.78, 0.22, -0.18]); // Mặt Trời khuất sau bên phải → nửa trái là đêm, thấy đèn thành phố

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform sampler2D uDay, uNight, uMoon;
uniform float uSpin, uNightMix, uMoonOn, uOutline, uAmbient;
uniform vec3 uSun, uMoonPos, uPin, uAtmo, uInk;
uniform float uMoonR, uTime;
const float TILT = 0.409;
const float PI = 3.14159265;
vec3 rotY(vec3 v, float a){ float c=cos(a), s=sin(a); return vec3(c*v.x+s*v.z, v.y, -s*v.x+c*v.z); }
vec3 rotZ(vec3 v, float a){ float c=cos(a), s=sin(a); return vec3(c*v.x-s*v.y, s*v.x+c*v.y, v.z); }
vec2 eq(vec3 n){ return vec2(atan(n.x, n.z)/(2.*PI)+.5, .5-asin(clamp(n.y,-1.,1.))/PI); }

vec4 earth(vec2 q, float px){
  float r = length(q);
  vec3 n = vec3(q, sqrt(max(0., 1.-r*r)));
  float d = dot(n, uSun);
  float lit = smoothstep(-.12, .22, d);
  vec3 body = rotY(rotZ(n, TILT), -uSpin);
  vec2 uv = eq(body);
  vec3 day = texture2D(uDay, uv).rgb;
  vec3 col = day * (uAmbient + 1.1*clamp(d, 0., 1.));
  float ocean = smoothstep(.04, .16, day.b - day.r);
  vec3 h = normalize(uSun + vec3(0.,0.,1.));
  col += pow(max(dot(n, h), 0.), 38.) * ocean * .45 * lit;
  vec3 night = texture2D(uNight, uv).rgb;
  col += night * night * vec3(1.6, 1.25, .8) * 1.5 * uNightMix * (1.-lit);
  float fres = pow(1.-n.z, 2.6);
  col += uAtmo * fres * (.18 + .8*lit);
  // Ghim Hà Nội: chấm cam + vòng sóng lan ra
  float a = acos(clamp(dot(body, uPin), -1., 1.));
  float ring = fract(uTime*.45);
  float pin = 1.-smoothstep(.028, .028+px*1.5, a);
  float wave = (1.-smoothstep(0., px*2., abs(a - (.03+ring*.11)))) * (1.-ring) * .9;
  col = mix(col, vec3(1., .416, .239), clamp(pin + wave, 0., 1.));
  col = mix(col, uInk, uOutline * smoothstep(1.-px*2.2, 1.-px*.6, r));
  float alpha = 1.-smoothstep(1.-px, 1., r);
  return vec4(col*alpha, alpha);
}

vec4 moon(vec2 q, float px){
  float r = length(q);
  vec3 n = vec3(q, sqrt(max(0., 1.-r*r)));
  vec3 tex = texture2D(uMoon, eq(n)).rgb;
  // Ánh sáng lệch về phía người xem → trăng gần tròn, sáng rõ trên nền trời tối
  float d = dot(n, normalize(uSun + vec3(0., 0., 1.3)));
  vec3 col = tex * (.1 + 1.25*smoothstep(-.05, .6, d)) * vec3(1., .98, .93);
  float alpha = (1.-smoothstep(1.-px, 1., r)) * uMoonOn;
  return vec4(col*alpha, alpha);
}

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes * ${VIEW}.;
  float pxE = ${VIEW}. / uRes.x / ${EARTH.r}.;
  vec2 qe = (p - vec2(${EARTH.x}., ${EARTH.y}.)) / ${EARTH.r}.; qe.y = -qe.y;
  vec2 qm = (p - uMoonPos.xy) / uMoonR; qm.y = -qm.y;
  float pxM = ${VIEW}. / uRes.x / uMoonR;
  float re = length(qe), rm = length(qm);
  vec4 o = vec4(0.);
  // Quầng khí quyển ngoài viền
  if (re > 1. && re < 1.18) {
    vec2 dir = normalize(qe);
    float side = .35 + .65*smoothstep(-.6, .8, dot(dir, normalize(uSun.xy + 1e-4)));
    float g = pow(1.-(re-1.)/.18, 2.4) * .55 * side;
    o = vec4(uAtmo*g, g);
  }
  // Quầng sáng Mặt Trăng
  if (rm > 1. && rm < 2.2 && uMoonOn > 0.) {
    float g = pow(1.-(rm-1.)/1.2, 2.) * .28 * uMoonOn;
    vec4 halo = vec4(vec3(.9,.92,1.)*g, g);
    o = halo + o*(1.-halo.a);
  }
  vec4 E = re < 1. ? earth(qe, pxE) : vec4(0.);
  vec4 M = rm < 1. ? moon(qm, pxM) : vec4(0.);
  if (uMoonPos.z < 0.) { o = M + o*(1.-M.a); o = E + o*(1.-E.a); }
  else { o = E + o*(1.-E.a); o = M + o*(1.-M.a); }
  gl_FragColor = o;
}`;

function norm(v: number[]): [number, number, number] {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const toRad = (deg: number) => (deg * Math.PI) / 180;
/** "21.03°N" → 21.03, "105.85°E" → 105.85 (Nam/Tây thành số âm) */
const coord = (s: string) => (parseFloat(s) || 0) * (/[SW]/i.test(s) ? -1 : 1);

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function mountEarth(canvas: HTMLCanvasElement, signal: AbortSignal) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return;
  const images = await Promise.all([dayUrl, nightUrl, moonUrl].map(loadImage)).catch(() => null);
  if (!images || signal.aborted) return;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  images.forEach((img, i) => {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  });
  const u = (name: string) => gl.getUniformLocation(prog, name);
  gl.uniform1i(u('uDay'), 0);
  gl.uniform1i(u('uNight'), 1);
  gl.uniform1i(u('uMoon'), 2);

  // Ghim Hà Nội (toạ độ lấy từ site.yaml qua data-*), quay sao cho lúc đầu Việt Nam ở gần giữa
  const lat = toRad(coord(canvas.dataset.lat ?? '21.03'));
  const lon = toRad(coord(canvas.dataset.lon ?? '105.85'));
  gl.uniform3f(u('uPin'), Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
  const spin0 = -lon - toRad(25);

  const isDark = () => document.documentElement.classList.contains('dark');
  let mix = isDark() ? 1 : 0; // 0 = ngày, 1 = đêm — chuyển mượt khi đổi giao diện

  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = Math.round(canvas.clientWidth * dpr);
    if (size && canvas.width !== size) {
      canvas.width = canvas.height = size;
      gl.viewport(0, 0, size, size);
    }
  };

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  let raf = 0;
  let visible = true;

  const draw = (now: number) => {
    const t = reduce ? 6 : (now - t0) / 1000;
    mix += ((isDark() ? 1 : 0) - mix) * (reduce ? 1 : 0.06);
    const sun = SUN_DAY.map((v, i) => lerp(v, SUN_NIGHT[i], mix));
    const sl = Math.hypot(...sun);

    // Mặt Trăng: quỹ đạo tròn nhìn nghiêng → elip; z < 0 là phía sau Trái Đất
    const a = -(t / MOON.period) * Math.PI * 2 + 2.2;
    const ox = Math.cos(a) * MOON.orbit;
    const oy = -Math.sin(a) * MOON.orbit * MOON.squash;
    const depth = Math.sin(a);
    const mx = EARTH.x + ox * Math.cos(MOON.tilt) - oy * Math.sin(MOON.tilt);
    const my = EARTH.y - (ox * Math.sin(MOON.tilt) + oy * Math.cos(MOON.tilt));

    resize();
    gl.uniform2f(u('uRes'), canvas.width, canvas.height);
    gl.uniform1f(u('uTime'), t);
    gl.uniform1f(u('uSpin'), spin0 + (t / SPIN_PERIOD) * Math.PI * 2);
    gl.uniform3f(u('uSun'), sun[0] / sl, sun[1] / sl, sun[2] / sl);
    gl.uniform1f(u('uNightMix'), mix);
    gl.uniform1f(u('uAmbient'), lerp(0.2, 0.04, mix));
    gl.uniform1f(u('uMoonOn'), mix);
    gl.uniform1f(u('uOutline'), (1 - mix) * 0.85);
    gl.uniform3f(u('uMoonPos'), mx, my, depth);
    gl.uniform1f(u('uMoonR'), MOON.r * (1 + depth * 0.08));
    gl.uniform3f(u('uAtmo'), lerp(0.35, 0.3, mix), lerp(0.62, 0.55, mix), 1);
    gl.uniform3f(u('uInk'), 0.106, 0.106, 0.184);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Giảm chuyển động: chỉ vẽ lại khi đổi giao diện
    if (visible && !reduce) raf = requestAnimationFrame(draw);
  };

  const io = new IntersectionObserver(([e]) => {
    const was = visible;
    visible = e.isIntersecting;
    if (visible && !was && !reduce) raf = requestAnimationFrame(draw);
  });
  io.observe(canvas);
  const mo = new MutationObserver(() => reduce && requestAnimationFrame(draw));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  raf = requestAnimationFrame(draw);
  canvas.closest('[data-earth-root]')?.classList.add('has-earth');

  signal.addEventListener('abort', () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    mo.disconnect();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  });
}
