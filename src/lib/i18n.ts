/**
 * CHỮ TRÊN GIAO DIỆN — đọc src/i18n/<ngôn ngữ>.yaml, kiểm tra bằng zod lúc build.
 * Hiện web chỉ có tiếng Việt (`t`). Khi làm song ngữ (P6): thêm route /en và dùng `ui('en')`.
 */
import { parse } from 'yaml';
import { z } from 'astro/zod';
import viRaw from '@/i18n/vi.yaml?raw';
import enRaw from '@/i18n/en.yaml?raw';

const s = z.string();
const group = <K extends string>(keys: readonly K[]) => z.object(Object.fromEntries(keys.map((k) => [k, s])) as Record<K, typeof s>);

const schema = z.object({
  common: group(['contact', 'seeAll', 'backHome', 'assembling', 'updating', 'skipLink', 'homeLabel'] as const).extend({
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
  about: group(['code', 'title', 'intro', 'cv', 'trajectoryCode', 'trajectoryTitle', 'skillsCode', 'skillsTitle'] as const),
  space: group(['code', 'title', 'intro', 'back', 'payload', 'role', 'time', 'systems'] as const),
  journeys: group(['code', 'title', 'intro', 'stats', 'back', 'log', 'video', 'albumCode', 'albumTitle', 'next', 'globeLabel', 'globeHint'] as const),
  videos: group(['code', 'title', 'intro', 'subscribe', 'all', 'new', 'views', 'play', 'openYoutube', 'close'] as const),
  gallery: group(['code', 'title', 'intro', 'count', 'open', 'prev', 'next', 'seeJourney'] as const),
  contact: group(['code', 'title', 'titleEm', 'intro', 'metaTitle', 'metaDescription'] as const),
  notFound: group(['metaTitle', 'code', 'title', 'text', 'back'] as const),
});

export type UI = z.infer<typeof schema>;
export type Locale = 'vi' | 'en';

const dictionaries: Record<Locale, UI> = {
  vi: schema.parse(parse(viRaw)),
  en: schema.parse(parse(enRaw)),
};

export const ui = (locale: Locale = 'vi') => dictionaries[locale];

/** Chữ tiếng Việt đang dùng trên web */
export const t = ui('vi');

/** Điền giá trị vào chỗ trống: fmt('{n} ảnh', { n: 3 }) → '3 ảnh' */
export const fmt = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
