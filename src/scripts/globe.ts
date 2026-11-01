/**
 * Địa cầu các chuyến đi (MissionsGlobe.tsx): quả cầu WebGL dùng ảnh vệ tinh NASA (cùng ảnh với Trái Đất ở hero),
 * ánh sáng mềm, viền khí quyển, đêm có đèn thành phố (giao diện tối). Đường bay vẽ trên một canvas 2D phủ lên trên.
 *
 * Toạ độ: vector thân địa cầu b = (cos φ sin λ, sin φ, cos φ cos λ) (λ kinh độ, φ vĩ độ).
 * Camera nhìn thẳng vào điểm (λc, φc): b = M·n với M = Ry(λc)·Rx(−φc), n là pháp tuyến phía người xem.
 * Phóng to (zoom): bán kính quả cầu = GLOBE_R × zoom; mọi thứ bị cắt trong vòng tròn nội tiếp khung (như ống kính).
 * Ảnh nét (NASA Blue Marble 07/2004, đã chỉnh màu khớp day.webp): chỉ tải khi phóng to (loadDetail), hiện dần lên.
 * Máy tính: 8192 px (1,2 MB); điện thoại / GPU yếu: 4096 px (0,4 MB) để không tốn quá nhiều bộ nhớ đồ hoạ.
 */
import dayUrl from '@/assets/earth/day.webp?url';
import nightUrl from '@/assets/earth/night.webp?url';
import day8kUrl from '@/assets/earth/day-8k.webp?url';
import day4kUrl from '@/assets/earth/day-4k.webp?url';

/** Bán kính quả cầu so với nửa khung khi zoom = 1 (chừa chỗ cho quầng khí quyển) */
export const GLOBE_R = 0.86;
export const MAX_ZOOM = 8;

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform mat3 uRot;
uniform vec3 uLight;
uniform float uNight;
uniform float uZoom;
uniform float uHi;
uniform sampler2D uDay, uNightTex, uDayHi;
const float PI = 3.14159265;
const vec3 ATMO = vec3(.35, .62, 1.);

void main() {
  float R = ${GLOBE_R} * uZoom;
  vec2 q = (gl_FragCoord.xy / uRes) * 2. - 1.;
  float r = length(q) / R;
  float aa = 2.5 / (uRes.x * R);
  // Quầng khí quyển bên ngoài
  // (tắt hẳn ở r = 1.15, trong vòng tròn nội tiếp khung khi zoom = 1, nếu không sẽ lộ một ô vuông mờ quanh địa cầu)
  float halo = exp(-max(r - 1., 0.) * 16.) * .55 * smoothstep(1. - aa, 1. + aa, r) * (1. - smoothstep(1.05, 1.15, r));
  vec4 o = vec4(ATMO * halo, halo);
  if (r < 1. + aa) {
    vec3 n = vec3(q / R, sqrt(max(0., 1. - r * r)));
    vec3 b = uRot * n;
    vec2 uv = vec2(atan(b.x, b.z) / (2. * PI) + .5, .5 - asin(clamp(b.y, -1., 1.)) / PI);
    vec3 day = texture2D(uDay, uv).rgb;
    if (uHi > 0.) day = mix(day, texture2D(uDayHi, uv).rgb, uHi);
    float d = dot(n, uLight);
    // Sáng: chiếu gần như chính diện để mọi điểm đến đều rõ. Tối: phía khuất sáng hiện đèn thành phố.
    vec3 col = day * mix(.42 + .7 * max(d, 0.), .12 + .9 * smoothstep(-.15, .6, d), uNight);
    col += texture2D(uNightTex, uv).rgb * vec3(1., .8, .52) * smoothstep(.2, -.25, d) * 1.4 * uNight;
    col += ATMO * pow(1. - n.z, 2.6) * (.55 - .2 * uNight);
    float a = 1. - smoothstep(1. - aa, 1. + aa, r);
    o = vec4(col * a, a) + o * (1. - a);
  }
  // Ống kính tròn: khi phóng to, bề mặt bị cắt theo vòng tròn nội tiếp khung (không lộ góc vuông)
  gl_FragColor = o * (1. - smoothstep(1. - 3. / uRes.x, 1., length(q)));
}`;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export type Vec3 = [number, number, number];
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Kinh/vĩ độ (độ) → vector đơn vị trên địa cầu */
export const toVec = (lat: number, lng: number): Vec3 => {
  const la = toRad(lat), lo = toRad(lng);
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
};

/** Ma trận M = Ry(λc)·Rx(−φc) (cột chính, đúng thứ tự của uniformMatrix3fv) */
function rotation(lon: number, lat: number) {
  const cy = Math.cos(lon), sy = Math.sin(lon), cx = Math.cos(-lat), sx = Math.sin(-lat);
  return new Float32Array([
    cy, 0, -sy, // cột 0 = M·(1,0,0)
    sy * sx, cx, cy * sx, // cột 1 = M·(0,1,0)
    sy * cx, -sx, cy * cx, // cột 2 = M·(0,0,1): điểm ở giữa khung
  ]);
}

export interface GlobeView {
  /** Kinh độ, vĩ độ (radian) của điểm ở giữa khung */
  lon: number;
  lat: number;
  /** 0 = giao diện sáng, 1 = tối (chuyển mượt) */
  night: number;
  /** 1 = cả quả cầu trong khung, tối đa MAX_ZOOM */
  zoom?: number;
}

export async function createGlobe(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;
  const images = await Promise.all([dayUrl, nightUrl].map(loadImage)).catch(() => null);
  if (!images) return null;

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
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  // Lọc dị hướng: bề mặt gần viền quả cầu (nhìn nghiêng) đỡ nhoè
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  const upload = (unit: number, img: TexImageSource) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  };
  images.forEach((img, i) => upload(i, img));
  const u = (name: string) => gl.getUniformLocation(prog, name);
  gl.uniform1i(u('uDay'), 0);
  gl.uniform1i(u('uNightTex'), 1);
  gl.uniform1i(u('uDayHi'), 2);
  // Ánh sáng từ phía trên bên trái người xem
  const L = [-0.45, 0.4, 0.8];
  const ll = Math.hypot(...L);
  gl.uniform3f(u('uLight'), L[0] / ll, L[1] / ll, L[2] / ll);

  let rot = rotation(0, 0);
  let zoom = 1;
  /** Ảnh nét: 0 = chưa có, tăng dần lên 1 khi vừa tải xong (hiện dần, không giật) */
  let hi = 0;
  let hiReady = false;
  let hiRequested = false;

  return {
    /** Vẽ một khung với góc nhìn hiện tại */
    draw(view: GlobeView) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const size = Math.round(canvas.clientWidth * dpr);
      if (size && canvas.width !== size) {
        canvas.width = canvas.height = size;
        gl.viewport(0, 0, size, size);
      }
      rot = rotation(view.lon, view.lat);
      zoom = view.zoom ?? 1;
      gl.uniform2f(u('uRes'), canvas.width, canvas.height);
      gl.uniformMatrix3fv(u('uRot'), false, rot);
      gl.uniform1f(u('uNight'), view.night);
      gl.uniform1f(u('uZoom'), zoom);
      if (hiReady && hi < 1) hi = Math.min(1, hi + 0.06);
      gl.uniform1f(u('uHi'), hi);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    /** Điểm trên địa cầu (đã nhân độ cao h) → toạ độ khung [0..1] + độ sâu (z > 0: mặt trước); r tính theo bán kính quả cầu */
    project(v: Vec3, h = 1) {
      // n = Mᵀ·b (M trực giao)
      const n0 = rot[0] * v[0] + rot[1] * v[1] + rot[2] * v[2];
      const n1 = rot[3] * v[0] + rot[4] * v[1] + rot[5] * v[2];
      const n2 = rot[6] * v[0] + rot[7] * v[1] + rot[8] * v[2];
      const k = (h * GLOBE_R * zoom) / 2;
      return { x: 0.5 + n0 * k, y: 0.5 - n1 * k, z: n2, r: Math.hypot(n0, n1) * h };
    },
    /** Tải ảnh nét (gọi khi người xem bắt đầu phóng to; gọi nhiều lần cũng chỉ tải một lần) */
    loadDetail() {
      if (hiRequested) return;
      hiRequested = true;
      const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
      const desktop = maxTex >= 16384 && !matchMedia('(pointer: coarse)').matches;
      if (maxTex < 4096) return;
      fetch(desktop ? day8kUrl : day4kUrl)
        .then((r) => r.blob())
        // Giải mã ảnh ngoài luồng chính để trang không khựng
        .then((blob) => createImageBitmap(blob))
        .then((bitmap) => {
          if (gl.isContextLost()) return;
          upload(2, bitmap);
          bitmap.close();
          hiReady = true;
        })
        .catch(() => {});
    },
    /** Điểm trên khung [0..1] → kinh độ, vĩ độ (radian) trên địa cầu; null nếu nằm ngoài quả cầu */
    pick(x: number, y: number): [number, number] | null {
      const k = GLOBE_R * zoom;
      const n0 = (x * 2 - 1) / k, n1 = (1 - y * 2) / k;
      const rr = n0 * n0 + n1 * n1;
      if (rr > 1) return null;
      const n2 = Math.sqrt(1 - rr);
      // b = M·n
      const bx = rot[0] * n0 + rot[3] * n1 + rot[6] * n2;
      const by = rot[1] * n0 + rot[4] * n1 + rot[7] * n2;
      const bz = rot[2] * n0 + rot[5] * n1 + rot[8] * n2;
      return [Math.atan2(bx, bz), Math.asin(Math.max(-1, Math.min(1, by)))];
    },
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
