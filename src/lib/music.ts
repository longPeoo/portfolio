import { parse } from 'yaml';
import { z } from 'astro/zod';
import raw from '@/data/music.yaml?raw';

const schema = z.object({
  /** Âm lượng 0–1 khi bắt đầu phát (iPhone bỏ qua, luôn theo nút âm lượng của máy) */
  volume: z.number().min(0).max(1).default(0.5),
  tracks: z
    .array(
      z.object({
        // CMS lưu '' khi để trống → dùng tên file làm tên bài
        title: z.string().default(''),
        artist: z.string().default(''),
        file: z.string().min(1),
      }),
    )
    .nullish()
    .transform((list) => list ?? []),
});

const data = schema.parse(parse(raw) ?? {});

/** Danh sách phát nhạc nền (src/data/music.yaml) */
export const music = {
  volume: data.volume,
  tracks: data.tracks.map((t) => ({
    ...t,
    title: t.title.trim() || decodeURIComponent(t.file.split('/').pop() ?? '').replace(/\.[^.]+$/, ''),
  })),
};

export type Track = (typeof music.tracks)[number];
