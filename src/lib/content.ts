import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { intl } from '@/lib/i18n';

/** Bài nháp (draft: true) chỉ hiện khi chạy `npm run dev` */
const visible = <T extends { data: { draft: boolean } }>(e: T) => import.meta.env.DEV || !e.data.draft;
const newestFirst = (a: { data: { date: Date } }, b: { data: { date: Date } }) => b.data.date.valueOf() - a.data.date.valueOf();

export async function getProjects(): Promise<CollectionEntry<'projects'>[]> {
  return (await getCollection('projects', visible)).sort(newestFirst);
}

export async function getJourneys(): Promise<CollectionEntry<'journeys'>[]> {
  return (await getCollection('journeys', visible)).sort(newestFirst);
}

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
  const journeys = await getJourneys();
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
