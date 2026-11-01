import { getIconData, iconToSVG, iconToHTML } from '@iconify/utils';
import circleFlags from '@iconify-json/circle-flags/icons.json';
import { intl } from '@/lib/i18n';

/**
 * Cờ tròn (bộ circle-flags), render thành chuỗi SVG lúc build: mỗi lá 200–800 byte, không tải thêm file, không cần JS.
 * Mã quốc gia ISO 3166 hai chữ: VN, FR, JP…
 */
const regionNames = new Intl.DisplayNames([intl], { type: 'region' });

/** Tên nước theo ngôn ngữ đang phát: FR → "Pháp" (vi) / "France" (en) */
export const countryName = (code: string) => regionNames.of(code.toUpperCase()) ?? code.toUpperCase();

/**
 * SVG cờ. Bỏ lớp mask hình tròn của bộ icon (mọi lá dùng chung một id → trùng id khi nhiều cờ trên một trang),
 * thay bằng clip-path: circle() trong CSS (class .flag ở global.css).
 * label: tên nước cho trình đọc màn hình; bỏ trống = ảnh trang trí (đã có chữ tên nước bên cạnh).
 */
export function flagSvg(code: string, label?: string): string {
  const data = getIconData(circleFlags, code.toLowerCase());
  if (!data) return '';
  const { attributes, body } = iconToSVG(data, { height: '1em' });
  const plain = body.replace(/^<mask id="([^"]+)">.*?<\/mask><g mask="url\(#\1\)">(.*)<\/g>$/s, '$2');
  const a11y: Record<string, string> = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' };
  return iconToHTML(plain, { ...attributes, class: 'flag', ...a11y } as Record<string, string>);
}

/** Danh sách nước (không trùng), giữ thứ tự xuất hiện; tên lấy từ dữ liệu chuyến đi (đã có tên tự động hoặc tên tự đặt) */
export function uniqueCountries(items: { countryCode: string; country: string }[]) {
  const seen = new Map<string, string>();
  for (const it of items) if (!seen.has(it.countryCode)) seen.set(it.countryCode, it.country);
  return [...seen].map(([code, name]) => ({ code, name }));
}
