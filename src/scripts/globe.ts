/**
 * Địa cầu các chuyến đi (MissionsGlobe.tsx): quả cầu WebGL dùng ảnh vệ tinh NASA (cùng ảnh với Trái Đất ở hero),
 * ánh sáng mềm, viền khí quyển, đêm có đèn thành phố (giao diện tối). Đường bay vẽ trên một canvas 2D phủ lên trên.
 *
 * Toạ độ: vector thân địa cầu b = (cos φ sin λ, sin φ, cos φ cos λ) (λ kinh độ, φ vĩ độ).
 * Camera nhìn thẳng vào điểm (λc, φc): b = M·n với M = Ry(λc)·Rx(−φc), n là pháp tuyến phía người xem.
 */
import dayUrl from '@/assets/earth/day.webp?url';
import nightUrl from '@/assets/earth/night.webp?url';

/** Bán kính quả cầu so với nửa khung (chừa chỗ cho quầng khí quyển) */
export const GLOBE_R = 0.86;

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform mat3 uRot;
uniform vec3 uLight;
uniform float uNight;
uniform sampler2D uDay, uNightTex;
const float PI = 3.14159265;
const float R = ${GLOBE_R};
const vec3 ATMO = vec3(.35, .62, 1.);

void main() {
  vec2 q = (gl_FragCoord.xy / uRes) * 2. - 1.;
  float r = length(q) / R;
  float aa = 2.5 / (uRes.x * R);
  // Quầng khí quyển bên ngoài
  // (tắt hẳn trước mép canvas ở r = 1/R ≈ 1.16, nếu không sẽ lộ một ô vuông mờ quanh địa cầu)
  float halo = exp(-max(r - 1., 0.) * 16.) * .55 * smoothstep(1. - aa, 1. + aa, r) * (1. - smoothstep(1.05, 1.15, r));
  vec4 o = vec4(ATMO * halo, halo);
  if (r < 1. + aa) {
    vec3 n = vec3(q / R, sqrt(max(0., 1. - r * r)));
    vec3 b = uRot * n;
    vec2 uv = vec2(atan(b.x, b.z) / (2. * PI) + .5, .5 - asin(clamp(b.y, -1., 1.)) / PI);
    vec3 day = texture2D(uDay, uv).rgb;
    float d = dot(n, uLight);
    // Sáng: chiếu gần như chính diện để mọi điểm đến đều rõ. Tối: phía khuất sáng hiện đèn thành phố.
    vec3 col = day * mix(.42 + .7 * max(d, 0.), .12 + .9 * smoothstep(-.15, .6, d), uNight);
    col += texture2D(uNightTex, uv).rgb * vec3(1., .8, .52) * smoothstep(.2, -.25, d) * 1.4 * uNight;
    col += ATMO * pow(1. - n.z, 2.6) * (.55 - .2 * uNight);
    float a = 1. - smoothstep(1. - aa, 1. + aa, r);
    o = vec4(col * a, a) + o * (1. - a);
  }
  gl_FragColor = o;
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
  gl.uniform1i(u('uNightTex'), 1);
  // Ánh sáng từ phía trên bên trái người xem
  const L = [-0.45, 0.4, 0.8];
  const ll = Math.hypot(...L);
  gl.uniform3f(u('uLight'), L[0] / ll, L[1] / ll, L[2] / ll);

  let rot = rotation(0, 0);

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
      gl.uniform2f(u('uRes'), canvas.width, canvas.height);
      gl.uniformMatrix3fv(u('uRot'), false, rot);
      gl.uniform1f(u('uNight'), view.night);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    /** Điểm trên địa cầu (đã nhân độ cao h) → toạ độ khung [0..1] + độ sâu (z > 0: mặt trước) */
    project(v: Vec3, h = 1) {
      // n = Mᵀ·b (M trực giao)
      const n0 = rot[0] * v[0] + rot[1] * v[1] + rot[2] * v[2];
      const n1 = rot[3] * v[0] + rot[4] * v[1] + rot[5] * v[2];
      const n2 = rot[6] * v[0] + rot[7] * v[1] + rot[8] * v[2];
      return { x: 0.5 + (n0 * h * GLOBE_R) / 2, y: 0.5 - (n1 * h * GLOBE_R) / 2, z: n2, r: Math.hypot(n0, n1) * h };
    },
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
