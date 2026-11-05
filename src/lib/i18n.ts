/**
 * NGÔN NGỮ & CHỮ TRÊN GIAO DIỆN
 * - Song ngữ: tiếng Việt ở gốc (/about), tiếng Anh dưới /en (/en/about). Mỗi trang trong src/pages/[...locale]/
 *   tạo cả hai bản (getStaticPaths = localeParams()); ngôn ngữ của trang suy ra từ URL (getI18n(Astro.url)).
 * - Chữ giao diện: src/i18n/ui.yaml (vi, mặc định) + ui.<locale>.yaml (các ngôn ngữ khác), kiểm tra bằng zod lúc build.
 * - Bản dịch thiếu khoá nào thì tự dùng bản tiếng Việt (không vỡ build khi chưa dịch xong).
 */
import { parse } from 'yaml';
import { z } from 'astro/zod';
import viRaw from '@/i18n/ui.yaml?raw';
import enRaw from '@/i18n/ui.en.yaml?raw';

/** Thông tin từng ngôn ngữ: mã HTML, định dạng ngày/số (Intl), og:locale */
export const LOCALES = {
  vi: { lang: 'vi', intl: 'vi-VN', og: 'vi_VN', label: 'Tiếng Việt', short: 'VI' },
  en: { lang: 'en', intl: 'en-GB', og: 'en_GB', label: 'English', short: 'EN' },
} as const;
export type Locale = keyof typeof LOCALES;
export const defaultLocale: Locale = 'vi';
export const locales = Object.keys(LOCALES) as Locale[];

export const isLocale = (value: unknown): value is Locale => typeof value === 'string' && value in LOCALES;

const s = z.string();
const group = <K extends string>(keys: readonly K[]) => z.object(Object.fromEntries(keys.map((k) => [k, s])) as Record<K, typeof s>);

const schema = z.object({
  common: group(['contact', 'seeAll', 'backHome', 'assembling', 'updating', 'skipLink', 'homeLabel', 'orbi'] as const).extend({
    status: group(['nominal', 'active', 'queued'] as const),
    projectStatus: group(['Nominal', 'Complete', 'Research'] as const),
  }),
  chrome: group(['countdown', 'skipIntro', 'language', 'mainMenu', 'openMenu', 'closeMenu', 'theme', 'footerCode', 'footerNav', 'footerTagline', 'toTop', 'musicPlay', 'musicPause', 'live'] as const),
  home: group([
    'heroCode', 'live', 'heroNow', 'hello', 'rolesLabel', 'ctaJourneys', 'ctaYoutube',
    'videoCode', 'videoTitle', 'videoNew', 'videoAll',
    'projectsCode', 'projectsTitle', 'journeysCode', 'journeysTitle',
    'photosCode', 'photosTitle', 'photosLink',
  ] as const),
  about: group(['code', 'title', 'intro', 'trajectoryCode', 'trajectoryTitle', 'cosmosCode', 'cosmosHint', 'cosmosEarth', 'cosmosMoon', 'cosmosInner', 'cosmosSolar', 'cosmosStars', 'cosmosGalaxy', 'cosmosSun', 'cosmosMoonName', 'cosmosHere'] as const),
  space: group(['code', 'title', 'intro', 'back', 'cv', 'payload', 'role', 'time', 'systems', 'skillsCode', 'skillsTitle', 'projectsCode', 'projectsTitle'] as const),
  journeys: group(['code', 'title', 'intro', 'stats', 'back', 'log', 'video', 'albumCode', 'albumTitle', 'next', 'stampMonth', 'globeLabel', 'globeHint', 'flagsLabel', 'flagsFrom', 'flagsTo', 'zoomIn', 'zoomOut', 'zoomReset', 'ongoing', 'elapsed', 'sortLabel', 'sortNewest', 'sortOldest', 'sortAz', 'sortZa', 'sortCount'] as const),
  videos: group(['code', 'title', 'intro', 'subscribe', 'all', 'new', 'views', 'play', 'openYoutube', 'close'] as const),
  gallery: group(['code', 'title', 'intro', 'count', 'open', 'prev', 'next', 'seeJourney'] as const),
  contact: group(['code', 'title', 'titleEm', 'intro', 'metaTitle', 'metaDescription'] as const),
  /** Form hỏi ẩn danh / để lại lời nhắn ở trang Liên hệ */
  inbox: group([
    'code', 'title', 'intro', 'modeLabel', 'modeAnonymous', 'modeNamed',
    'name', 'email', 'phone', 'optional', 'emailHintAnonymous', 'contactHint',
    'message', 'messagePlaceholder', 'submit', 'sending', 'privacy', 'successTitle',
    'successText', 'again', 'errorMessage', 'errorName', 'errorEmail', 'errorPhone',
    'errorContact', 'errorRate', 'errorCaptcha', 'errorSend', 'noscript',
  ] as const),
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

/* ---------------------------------------------------------------
   Đường dẫn theo ngôn ngữ (vi ở gốc, ngôn ngữ khác có tiền tố /<mã>)
   --------------------------------------------------------------- */

/** Ngôn ngữ của một đường dẫn: /en/about → 'en', /about → 'vi' */
export function localeFromPath(pathname: string): Locale {
  const first = pathname.split('/')[1]?.replace(/\.html$/, '');
  return isLocale(first) && first !== defaultLocale ? first : defaultLocale;
}

/** Bỏ tiền tố ngôn ngữ: /en/journeys/paris → /journeys/paris, /en → / */
export function stripLocale(pathname: string): string {
  const locale = localeFromPath(pathname);
  if (locale === defaultLocale) return pathname || '/';
  return pathname.slice(locale.length + 1) || '/';
}

/**
 * Đường dẫn nội bộ theo ngôn ngữ: localizePath('/journeys', 'en') → '/en/journeys'.
 * Link ngoài (http…, mailto:), link neo (#) và file (/uploads/cv.pdf, /music/…) giữ nguyên.
 */
export function localizePath(path: string, locale: Locale): string {
  if (!path.startsWith('/') || path.startsWith('//') || /^\/(uploads|music|brand|_astro|api)\//.test(path)) return path;
  const clean = stripLocale(path);
  if (locale === defaultLocale) return clean;
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}

/** getStaticPaths cho trang song ngữ: { locale: undefined } = tiếng Việt ở gốc, { locale: 'en' } = /en */
export const localeParams = () => locales.map((l) => ({ params: { locale: l === defaultLocale ? undefined : l } }));

/**
 * Mọi thứ một component cần để hiện đúng ngôn ngữ của trang đang dựng:
 *   const { t, locale, intl, path } = getI18n(Astro.url);
 */
export function getI18n(url: URL) {
  const locale = localeFromPath(url.pathname);
  return {
    locale,
    t: ui(locale),
    /** Mã Intl để định dạng ngày/số, ví dụ 'vi-VN' */
    intl: LOCALES[locale].intl,
    /** Đường dẫn nội bộ đúng ngôn ngữ: path('/journeys') */
    path: (p: string) => localizePath(p, locale),
  };
}

/** Điền giá trị vào chỗ trống: fmt('{n} ảnh', { n: 3 }) → '3 ảnh' */
export const fmt = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
