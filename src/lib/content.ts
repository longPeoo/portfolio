import type { ImageMetadata } from 'astro';
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { intl } from '@/lib/i18n';
import { flagSvg, uniqueCountries } from '@/lib/flags';

/** Bài nháp (draft: true) chỉ hiện khi chạy `npm run dev` */
const visible = <T extends { data: { draft: boolean } }>(e: T) => import.meta.env.DEV || !e.data.draft;
const newestFirst = (a: { data: { date: Date } }, b: { data: { date: Date } }) => b.data.date.valueOf() - a.data.date.valueOf();

export type Journey = CollectionEntry<'journeys'>;
/** Chuyến đi đã có ảnh bìa → có thẻ và trang riêng */
export type Story = Journey & { data: Journey['data'] & { cover: ImageMetadata } };
export const hasStory = (j: Journey): j is Story => !!j.data.cover;

export async function getProjects(): Promise<CollectionEntry<'projects'>[]> {
  return (await getCollection('projects', visible)).sort(newestFirst);
}

/**
 * Mọi nơi đã đến (ghim + cờ trên địa cầu): có ngày thì mới nhất trước, chưa có ngày xếp cuối theo tên.
 * Số hiệu M-xx = vị trí trong danh sách này (missionNumber).
 */
export async function getJourneys(): Promise<Journey[]> {
  return (await getCollection('journeys', visible)).sort(
    (a, b) => (b.data.date?.valueOf() ?? -Infinity) - (a.data.date?.valueOf() ?? -Infinity) || a.data.place.localeCompare(b.data.place, intl),
  );
}

/** Chỉ các chuyến đã có ảnh bìa (thẻ ở trang Hành trình, trang riêng, ảnh ở trang Ảnh) */
export async function getStories(): Promise<Story[]> {
  return (await getJourneys()).filter(hasStory);
}

/** M-xx: chuyến cũ nhất là M-01 */
export const missionNumber = (all: Journey[], id: string) => all.length - all.findIndex((j) => j.id === id);

export async function getPage(id: string): Promise<CollectionEntry<'pages'> | undefined> {
  const page = await getEntry('pages', id);
  return page && visible(page) ? page : undefined;
}

/**
 * Tất cả ảnh của mọi chuyến đi (ảnh bìa + album) — dùng cho trang Ảnh.
 * Chú thích hiện dưới ảnh: ô "Chú thích" trong CMS; để trống thì dùng mô tả ảnh (ảnh bìa: tên chuyến đi).
 * CMS lưu ô trống thành chuỗi rỗng '' nên phải dùng || (không dùng ??).
 */
export async function getPhotos() {
  const journeys = await getStories();
  return journeys.flatMap((j) => [
    { src: j.data.cover, alt: j.data.coverAlt, caption: j.data.title, journey: j },
    ...j.data.gallery.map((g) => ({ src: g.src, alt: g.alt, caption: g.caption?.trim() || g.alt || j.data.title, journey: j })),
  ]);
}

const dateFmt = new Intl.DateTimeFormat(intl, { month: 'long', year: 'numeric' });
export const formatMonth = (d: Date) => dateFmt.format(d);

const monthFmt = new Intl.DateTimeFormat(intl, { month: 'long' });

/** "tháng 3 năm 2026", "tháng 3 – tháng 4 năm 2026" hoặc "tháng 12 năm 2025 – tháng 1 năm 2026" */
export function formatRange(start: Date, end?: Date) {
  if (!end || (end.getFullYear() === start.getFullYear() && end.getMonth() === start.getMonth())) return formatMonth(start);
  if (end.getFullYear() === start.getFullYear()) return `${monthFmt.format(start)} – ${formatMonth(end)}`;
  return `${formatMonth(start)} – ${formatMonth(end)}`;
}

/**
 * Dữ liệu cho địa cầu (MissionsGlobe): mọi nơi đã đến + cờ (mỗi nước một lần, không lặp trong props của island).
 * href chỉ có khi chuyến đi có trang riêng (đã có ảnh bìa).
 */
export function toGlobe(journeys: Journey[]) {
  const points = journeys.map((j) => ({
    id: j.id,
    title: j.data.title,
    place: j.data.place,
    country: j.data.country,
    code: j.data.countryCode,
    lat: j.data.lat,
    lng: j.data.lng,
    date: j.data.date?.toISOString(),
    href: hasStory(j) ? `/journeys/${j.id}` : undefined,
  }));
  const flags = Object.fromEntries(uniqueCountries(journeys.map((j) => j.data)).map((c) => [c.code, flagSvg(c.code)]));
  return { points, flags };
}
