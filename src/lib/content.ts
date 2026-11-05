import type { ImageMetadata } from 'astro';
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { LOCALES, defaultLocale, localizePath, ui, fmt, type Locale } from '@/lib/i18n';
import { countryName, flagSvg, uniqueCountries } from '@/lib/flags';

/**
 * NỘI DUNG THEO NGÔN NGỮ
 * Bản tiếng Việt (index.md) là gốc: ngày, toạ độ, ảnh, trạng thái… luôn lấy từ đây.
 * Bản tiếng Anh (index.en.md, collection *En) chỉ đè các trường chữ; ô trống hoặc chưa có file thì giữ tiếng Việt.
 * `source` = bài dùng để render nội dung Markdown (bản dịch nếu có nội dung, không thì bản gốc).
 */

/** Bài nháp (draft: true) chỉ hiện khi chạy `npm run dev` */
const visible = <T extends { data: { draft: boolean } }>(e: T) => import.meta.env.DEV || !e.data.draft;
const newestFirst = (a: { data: { date: Date } }, b: { data: { date: Date } }) => b.data.date.valueOf() - a.data.date.valueOf();

type Base = 'projects' | 'journeys' | 'pages';
type Translated<C extends Base> = `${C}En`;
export type Localized<C extends Base> = CollectionEntry<C> & {
  /** Bài để render() nội dung Markdown */
  source: CollectionEntry<C> | CollectionEntry<Translated<C>>;
};

/** Chữ đã dịch: chuỗi trống / chỉ có khoảng trắng coi như chưa dịch */
const pick = (over: string | undefined, base: string) => over?.trim() || base;
const hasBody = (e?: { body?: string }) => !!e?.body?.trim();

/** Ảnh: ghép bản dịch theo thứ tự. Có bản dịch của ảnh đó thì chú thích theo bản dịch (trống = dùng mô tả ảnh đã dịch) */
function localizePhotos<P extends { alt: string; caption?: string }>(
  photos: P[],
  over?: ({ alt?: string; caption?: string } | null)[],
): P[] {
  return photos.map((p, i) => {
    const t = over?.[i];
    if (!t) return p;
    return { ...p, alt: pick(t.alt, p.alt), caption: t.caption?.trim() || (t.alt?.trim() ? undefined : p.caption) };
  });
}

async function translations<C extends Translated<Base>>(collection: C, locale: Locale) {
  if (locale === defaultLocale) return new Map<string, CollectionEntry<C>>();
  const list = (await getCollection(collection)) as CollectionEntry<C>[];
  return new Map(list.map((e) => [e.id, e]));
}

/* ---------------------------------------------------------------
   Dự án
   --------------------------------------------------------------- */
export type Project = Localized<'projects'>;

export async function getProjects(locale: Locale = defaultLocale): Promise<Project[]> {
  const list = (await getCollection('projects', visible)).sort(newestFirst);
  const en = await translations('projectsEn', locale);
  return list.map((p) => {
    const t = en.get(p.id);
    if (!t) return { ...p, source: p };
    const d = t.data;
    return {
      ...p,
      source: hasBody(t) ? t : p,
      data: {
        ...p.data,
        title: pick(d.title, p.data.title),
        summary: pick(d.summary, p.data.summary),
        role: pick(d.role, p.data.role),
        tags: d.tags?.length ? d.tags : p.data.tags,
        coverAlt: pick(d.coverAlt, p.data.coverAlt),
        gallery: localizePhotos(p.data.gallery, d.gallery),
        links: p.data.links.map((l, i) => ({ ...l, label: pick(d.links?.[i]?.label, l.label) })),
      },
    };
  });
}

/* ---------------------------------------------------------------
   Chuyến đi
   --------------------------------------------------------------- */
export type Journey = Localized<'journeys'>;
/** Chuyến đi đã có ảnh bìa → có thẻ và trang riêng */
export type Story = Journey & { data: Journey['data'] & { cover: ImageMetadata } };
export const hasStory = (j: Journey): j is Story => !!j.data.cover;

/**
 * Mọi nơi đã đến (ghim + cờ trên địa cầu): có ngày thì mới nhất trước, chưa có ngày xếp cuối theo tên.
 * Số hiệu M-xx = vị trí trong danh sách này (missionNumber).
 */
export async function getJourneys(locale: Locale = defaultLocale): Promise<Journey[]> {
  const list = await getCollection('journeys', visible);
  const en = await translations('journeysEn', locale);
  const localized: Journey[] = list.map((j) => {
    const t = en.get(j.id);
    if (locale === defaultLocale) return { ...j, source: j };
    const d = t?.data;
    const place = pick(d?.place, j.data.place);
    return {
      ...j,
      source: hasBody(t) ? t! : j,
      data: {
        ...j.data,
        place,
        title: pick(d?.title, d?.place?.trim() ? place : j.data.title),
        summary: pick(d?.summary, j.data.summary),
        // Tên nước tự đặt ở bản dịch, không thì tên tự động theo ngôn ngữ (FR → France)
        country: pick(d?.country, countryName(j.data.countryCode, locale)),
        coverAlt: pick(d?.coverAlt, j.data.coverAlt),
        gallery: localizePhotos(j.data.gallery, d?.gallery),
        tags: d?.tags?.length ? d.tags : j.data.tags,
      },
    };
  });
  const intl = LOCALES[locale].intl;
  return localized.sort(
    (a, b) => (b.data.date?.valueOf() ?? -Infinity) - (a.data.date?.valueOf() ?? -Infinity) || a.data.place.localeCompare(b.data.place, intl),
  );
}

/** Chỉ các chuyến đã có ảnh bìa (thẻ ở trang Hành trình, trang riêng, ảnh ở trang Ảnh) */
export async function getStories(locale: Locale = defaultLocale): Promise<Story[]> {
  return (await getJourneys(locale)).filter(hasStory);
}

/** M-xx: chuyến cũ nhất là M-01 */
export const missionNumber = (all: Journey[], id: string) => all.length - all.findIndex((j) => j.id === id);

/* ---------------------------------------------------------------
   Trang tĩnh (Về tôi)
   --------------------------------------------------------------- */
export type Page = Localized<'pages'>;

export async function getPage(id: string, locale: Locale = defaultLocale): Promise<Page | undefined> {
  const page = await getEntry('pages', id);
  if (!page || !visible(page)) return undefined;
  if (locale === defaultLocale) return { ...page, source: page };
  const t = await getEntry('pagesEn', id);
  if (!t) return { ...page, source: page };
  const d = t.data;
  return {
    ...page,
    source: hasBody(t) ? t : page,
    data: {
      ...page.data,
      title: pick(d.title, page.data.title),
      intro: pick(d.intro, page.data.intro),
      timeline: page.data.timeline.map((m, i) => {
        const o = d.timeline?.[i];
        return { year: pick(o?.year, m.year), title: pick(o?.title, m.title), text: pick(o?.text, m.text) };
      }),
    },
  };
}

/**
 * Tất cả ảnh của mọi chuyến đi (ảnh bìa + album) — dùng cho trang Ảnh.
 * Chú thích hiện dưới ảnh: ô "Chú thích" trong CMS; để trống thì dùng mô tả ảnh (ảnh bìa: tên chuyến đi).
 * CMS lưu ô trống thành chuỗi rỗng '' nên phải dùng || (không dùng ??).
 */
export async function getPhotos(locale: Locale = defaultLocale) {
  const journeys = await getStories(locale);
  return journeys.flatMap((j) => [
    { src: j.data.cover, alt: j.data.coverAlt, caption: j.data.title, journey: j },
    ...j.data.gallery.map((g) => ({ src: g.src, alt: g.alt, caption: g.caption?.trim() || g.alt || j.data.title, journey: j })),
  ]);
}

/* ---------------------------------------------------------------
   Định dạng ngày theo ngôn ngữ
   --------------------------------------------------------------- */
const formatters = new Map<Locale, { month: Intl.DateTimeFormat; monthYear: Intl.DateTimeFormat; number: Intl.NumberFormat }>();
function dates(locale: Locale) {
  let f = formatters.get(locale);
  if (!f) {
    const intl = LOCALES[locale].intl;
    f = {
      monthYear: new Intl.DateTimeFormat(intl, { month: 'long', year: 'numeric' }),
      month: new Intl.DateTimeFormat(intl, { month: 'long' }),
      number: new Intl.NumberFormat(intl),
    };
    formatters.set(locale, f);
  }
  return f;
}

/** "tháng 3 năm 2026" / "March 2026" */
export const formatMonth = (d: Date, locale: Locale = defaultLocale) => dates(locale).monthYear.format(d);

/**
 * "tháng 3 năm 2026", "tháng 3 – tháng 4 năm 2026" hoặc "tháng 12 năm 2025 – tháng 1 năm 2026".
 * ongoing: hành trình chưa kết thúc → "tháng 3 năm 2000 – nay".
 */
export function formatRange(start: Date, end: Date | undefined, ongoing: boolean, locale: Locale = defaultLocale) {
  const f = dates(locale);
  if (ongoing) return `${f.monthYear.format(start)} – ${ui(locale).journeys.ongoing}`;
  if (!end || (end.getFullYear() === start.getFullYear() && end.getMonth() === start.getMonth())) return f.monthYear.format(start);
  if (end.getFullYear() === start.getFullYear()) return `${f.month.format(start)} – ${f.monthYear.format(end)}`;
  return `${f.monthYear.format(start)} – ${f.monthYear.format(end)}`;
}

/** Số ngày từ ngày bắt đầu tới lúc build ("T+9.731 ngày"); web build lại mỗi 6 giờ nên số này tăng mỗi ngày */
export const formatElapsed = (start: Date, locale: Locale = defaultLocale) =>
  fmt(ui(locale).journeys.elapsed, { n: dates(locale).number.format(Math.floor((Date.now() - start.valueOf()) / 86_400_000)) });

/**
 * Dữ liệu cho địa cầu (MissionsGlobe): mọi nơi đã đến + cờ (mỗi nước một lần, không lặp trong props của island).
 * href chỉ có khi chuyến đi có trang riêng (đã có ảnh bìa).
 */
export function toGlobe(journeys: Journey[], locale: Locale = defaultLocale) {
  const points = journeys.map((j) => ({
    id: j.id,
    title: j.data.title,
    place: j.data.place,
    country: j.data.country,
    code: j.data.countryCode,
    lat: j.data.lat,
    lng: j.data.lng,
    date: j.data.date?.toISOString(),
    href: hasStory(j) ? localizePath(`/journeys/${j.id}`, locale) : undefined,
  }));
  const flags = Object.fromEntries(uniqueCountries(journeys.map((j) => j.data)).map((c) => [c.code, flagSvg(c.code)]));
  return { points, flags };
}
