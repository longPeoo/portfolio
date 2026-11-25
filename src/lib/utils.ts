export { cn } from "cn"

/** Đường dẫn chuẩn của trang: bỏ ".html", "/index" và "/" cuối (build.format = 'file') */
export const cleanPath = (pathname: string) =>
  pathname.replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/$/, '') || '/'

/** Điền giá trị vào chỗ trống: fmt('{n} ảnh', { n: 3 }) → '3 ảnh' */
export const fmt = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
