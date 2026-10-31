/**
 * YOUTUBE — lấy video mới nhất của kênh LÚC BUILD.
 * Nguồn chính: YouTube Data API v3 (cần biến môi trường YOUTUBE_API_KEY).
 * Dự phòng: RSS công khai của YouTube (không cần key, nhưng có thể không khả dụng).
 * Cấu hình kênh, video nổi bật, ghim, ẩn, nhóm: src/data/videos.yaml.
 * Web tự build lại mỗi 6 giờ (.github/workflows/refresh.yml) nên video mới sẽ tự xuất hiện.
 */
import { parse } from 'yaml';
import { XMLParser } from 'fast-xml-parser';
import { z } from 'astro/zod';
import raw from '@/data/videos.yaml?raw';

const config = z
  .object({
    channelId: z.string().default(''),
    channelUrl: z.string().default(''),
    featured: z.string().default(''),
    pinned: z.array(z.string()).default([]),
    hidden: z.array(z.string()).default([]),
    includeShorts: z.boolean().default(false),
    categories: z.array(z.object({ name: z.string(), videos: z.array(z.string()).default([]) })).default([]),
  })
  .parse(parse(raw) ?? {});

const API_KEY: string | undefined = import.meta.env.YOUTUBE_API_KEY ?? process.env.YOUTUBE_API_KEY;
const API = 'https://www.googleapis.com/youtube/v3';

export interface Video {
  id: string;
  title: string;
  published: Date;
  description: string;
  views: number;
  url: string;
  isShort: boolean;
  categories: string[];
}

/** Lấy ID từ link YouTube (watch, youtu.be, shorts, embed, live) hoặc trả lại chính chuỗi nếu đã là ID */
export function youtubeId(input?: string): string | undefined {
  if (!input) return undefined;
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  return s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/)?.[1];
}

const handleOf = (url: string) => url.match(/youtube\.com\/(@[\w.-]+)/)?.[1];
const categoriesOf = (id: string) =>
  config.categories.filter((c) => c.videos.map(youtubeId).includes(id)).map((c) => c.name);

async function api<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, key: API_KEY! });
  const res = await fetch(`${API}/${path}?${qs}`);
  if (!res.ok) throw new Error(`YouTube API ${path} trả về ${res.status}`);
  return res.json() as Promise<T>;
}

/** ISO 8601 (PT1M5S) → giây; dùng để nhận diện Shorts (≤ 3 phút và có #shorts hoặc dọc) */
const seconds = (d = '') => {
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
};

async function fromApi(): Promise<Video[]> {
  const handle = handleOf(config.channelUrl);
  const ch = await api<any>('channels', {
    part: 'contentDetails',
    ...(config.channelId ? { id: config.channelId } : handle ? { forHandle: handle } : {}),
  });
  const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error('Không tìm thấy kênh — kiểm tra channelUrl/channelId trong videos.yaml');

  const list = await api<any>('playlistItems', { part: 'contentDetails', playlistId: uploads, maxResults: '30' });
  const ids: string[] = list.items.map((i: any) => i.contentDetails.videoId);
  if (!ids.length) return [];
  const details = await api<any>('videos', { part: 'snippet,statistics,contentDetails', id: ids.join(',') });

  return details.items.map((v: any): Video => {
    const title: string = v.snippet.title;
    const isShort = seconds(v.contentDetails.duration) <= 180 && /#shorts?/i.test(`${title} ${v.snippet.description}`);
    return {
      id: v.id,
      title,
      published: new Date(v.snippet.publishedAt),
      description: v.snippet.description ?? '',
      views: Number(v.statistics?.viewCount ?? 0),
      url: isShort ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`,
      isShort,
      categories: categoriesOf(v.id),
    };
  });
}

async function fromRss(): Promise<Video[]> {
  if (!config.channelId) return [];
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${config.channelId}`);
  if (!res.ok) throw new Error(`RSS trả về ${res.status}`);
  const feed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' }).parse(await res.text()).feed;
  return [feed?.entry ?? []].flat().map((e: any): Video => {
    const id = e['yt:videoId'];
    const link: string = [e.link].flat()[0]?.href ?? '';
    const group = e['media:group'] ?? {};
    return {
      id,
      title: e.title,
      published: new Date(e.published),
      description: String(group['media:description'] ?? ''),
      views: Number(group['media:community']?.['media:statistics']?.views ?? 0),
      url: link || `https://www.youtube.com/watch?v=${id}`,
      isShort: link.includes('/shorts/'),
      categories: categoriesOf(id),
    };
  });
}

let cache: Promise<Video[]> | undefined;

async function fetchVideos(): Promise<Video[]> {
  if (!config.channelUrl && !config.channelId) return [];
  try {
    if (API_KEY) return await fromApi();
    return await fromRss();
  } catch (err) {
    console.warn(`[youtube] Không lấy được danh sách video: ${(err as Error).message}`);
    return [];
  }
}

/** Danh sách video đã lọc: bỏ video ẩn, (tuỳ chọn) bỏ Shorts, video ghim lên đầu, mới nhất trước */
export async function getVideos(): Promise<Video[]> {
  cache ??= fetchVideos();
  const all = (await cache).sort((a, b) => b.published.valueOf() - a.published.valueOf());
  const hidden = new Set(config.hidden.map(youtubeId));
  const pinned = config.pinned.map(youtubeId);
  const list = all.filter((v) => !hidden.has(v.id) && (config.includeShorts || !v.isShort));
  return [
    ...pinned.map((id) => list.find((v) => v.id === id)).filter((v): v is Video => !!v),
    ...list.filter((v) => !pinned.includes(v.id)),
  ];
}

/** Video nổi bật ở trang chủ: video chỉ định trong videos.yaml, nếu không có thì video mới nhất */
export async function getFeaturedVideo(): Promise<{ id: string; title: string; published?: Date } | undefined> {
  const videos = await getVideos();
  const featuredId = youtubeId(config.featured);
  if (featuredId) return videos.find((x) => x.id === featuredId) ?? { id: featuredId, title: 'Video nổi bật' };
  return videos[0];
}

export const videoCategories = config.categories.map((c) => c.name);
export const channelUrl =
  config.channelUrl || (config.channelId ? `https://www.youtube.com/channel/${config.channelId}` : '');
