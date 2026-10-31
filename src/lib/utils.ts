export { cn } from "cn"

/** Đường dẫn chuẩn của trang: bỏ ".html", "/index" và "/" cuối (build.format = 'file') */
export const cleanPath = (pathname: string) =>
  pathname.replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/$/, '') || '/'
