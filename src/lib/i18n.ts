/**
 * NGÔN NGỮ & CHỮ TRÊN GIAO DIỆN
 * - Chữ giao diện: src/i18n/ui.yaml (vi, mặc định) + ui.<locale>.yaml (các ngôn ngữ khác), kiểm tra bằng zod lúc build.
 * - Bản dịch thiếu khoá nào thì tự dùng bản tiếng Việt (không vỡ build khi chưa dịch xong).
 * - Hiện web chỉ phát tiếng Việt. Khi làm song ngữ (P6): thêm trang dưới /en, lấy chữ bằng `ui('en')`,
 *   định dạng bằng `LOCALES.en.intl` (cấu hình định tuyến đã có trong astro.config.mjs).
 */
import { parse } from 'yaml';
import { z } from 'astro/zod';
import viRaw from '@/i18n/ui.yaml?raw';
import enRaw from '@/i18n/ui.en.yaml?raw';

/** Thông tin từng ngôn ngữ: mã HTML, định dạng ngày/số (Intl), og:locale */
export const LOCALES = {
  vi: { lang: 'vi', intl: 'vi-VN', og: 'vi_VN', label: 'Tiếng Việt' },
  en: { lang: 'en', intl: 'en-GB', og: 'en_GB', label: 'English' },
} as const;
export type Locale = keyof typeof LOCALES;
export const defaultLocale: Locale = 'vi';

const s = z.string();
const group = <K extends string>(keys: readonly K[]) => z.object(Object.fromEntries(keys.map((k) => [k, s])) as Record<K, typeof s>);

const schema = z.object({
  common: group(['contact', 'seeAll', 'backHome', 'assembling', 'updating', 'skipLink', 'homeLabel', 'orbi'] as const).extend({
    status: group(['nominal', 'active', 'queued'] as const),
    projectStatus: group(['Nominal', 'Complete', 'Research'] as const),
  }),
  chrome: group(['countdown', 'skipIntro', 'clock', 'mainMenu', 'openMenu', 'closeMenu', 'theme', 'footerCode', 'footerNav', 'footerTagline', 'toTop'] as const),
  home: group([
    'heroCode', 'heroNow', 'hello', 'rolesLabel', 'ctaJourneys', 'ctaYoutube',
    'videoCode', 'videoTitle', 'videoNew', 'videoAll',
    'projectsCode', 'projectsTitle', 'journeysCode', 'journeysTitle',
    'photosCode', 'photosTitle', 'photosLink', 'statusCode', 'statusTitle',
  ] as const).extend({
    phases: z.array(z.object({ code: s, name: s, state: z.enum(['nominal', 'active', 'queued']) })),
  }),
  about: group(['code', 'title', 'intro', 'trajectoryCode', 'trajectoryTitle', 'skillsCode', 'skillsTitle', 'cosmosCode', 'cosmosHint', 'cosmosEarth', 'cosmosMoon', 'cosmosInner', 'cosmosSolar', 'cosmosStars', 'cosmosGalaxy', 'cosmosSun', 'cosmosMoonName', 'cosmosHere'] as const),
  space: group(['code', 'title', 'intro', 'back', 'cv', 'payload', 'role', 'time', 'systems'] as const),
  journeys: group(['code', 'title', 'intro', 'stats', 'back', 'log', 'video', 'albumCode', 'albumTitle', 'next', 'stampMonth', 'globeLabel', 'globeHint'] as const),
  videos: group(['code', 'title', 'intro', 'subscribe', 'all', 'new', 'views', 'play', 'openYoutube', 'close'] as const),
  gallery: group(['code', 'title', 'intro', 'count', 'open', 'prev', 'next', 'seeJourney'] as const),
  contact: group(['code', 'title', 'titleEm', 'intro', 'metaTitle', 'metaDescription'] as const),
  notFound: group(['metaTitle', 'code', 'title', 'text', 'back'] as const),
});

export type UI = z.infer<typeof schema>;

/**
 * Ghép bản dịch lên bản gốc: giá trị trống/thiếu thì giữ bản gốc.
 * Mảng: dùng bản dịch nếu có phần tử, không thì giữ bản gốc.
 */
export function withFallback<T>(base: T, over: unknown): T {
  if (over === undefined || over === null || over === '') return base;
  if (Array.isArray(base)) return (Array.isArray(over) && over.length ? over : base) as T;
  if (base && typeof base === 'object' && over && typeof over === 'object') {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(over)) out[k] = withFallback(out[k], v);
    return out as T;
  }
  return over as T;
}

const vi = schema.parse(parse(viRaw));
const dictionaries: Record<Locale, UI> = {
  vi,
  en: schema.parse(withFallback(vi, parse(enRaw) ?? {})),
};

export const ui = (locale: Locale = defaultLocale) => dictionaries[locale];

/** Ngôn ngữ đang phát trên web (P6 sẽ lấy theo trang hiện tại) */
export const locale: Locale = defaultLocale;
/** Chữ giao diện của ngôn ngữ đang phát */
export const t = ui(locale);
/** Mã Intl để định dạng ngày/số, ví dụ 'vi-VN' */
export const intl = LOCALES[locale].intl;

/** Điền giá trị vào chỗ trống: fmt('{n} ảnh', { n: 3 }) → '3 ảnh' */
export const fmt = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
