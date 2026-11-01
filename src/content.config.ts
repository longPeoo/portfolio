/**
 * CONTENT COLLECTIONS — mỗi dự án / chuyến đi là một thư mục chứa index.md + ảnh.
 * Thêm nội dung mới: tạo thư mục mới (tên thư mục = đường dẫn URL), hoặc dùng trang /admin.
 * draft: true → chỉ hiện khi chạy `npm run dev`, không lên web thật.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const link = z.object({ label: z.string(), url: z.string() });

const projects = defineCollection({
  // <tên>/index.md = tiếng Việt; index.en.md (bản dịch từ CMS, P6) không nạp vào đây
  loader: glob({ pattern: '*/index.md', base: './src/content/projects', generateId: ({ entry }) => entry.split('/')[0] }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      date: z.coerce.date(),
      role: z.string(),
      /** Tình trạng dự án, hiện như đèn trạng thái: Nominal (đang chạy), Complete (đã xong), Research */
      status: z.enum(['Nominal', 'Complete', 'Research']).default('Complete'),
      tags: z.array(z.string()).default([]),
      cover: image().optional(),
      coverAlt: z.string().default(''),
      links: z.array(link).default([]),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

const journeys = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/journeys', generateId: ({ entry }) => entry.split('/')[0] }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      date: z.coerce.date(),
      endDate: z.coerce.date().optional(),
      place: z.string(),
      country: z.string(),
      /** Toạ độ để chấm lên quả địa cầu (tra trên Google Maps: chuột phải → copy toạ độ) */
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      cover: image(),
      coverAlt: z.string(),
      gallery: z
        .array(z.object({ src: image(), alt: z.string(), caption: z.string().optional() }))
        .default([]),
      /** Link hoặc ID video YouTube kể về chuyến đi */
      youtube: z.string().optional(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
    }),
});

const pages = defineCollection({
  // about.md = tiếng Việt; about.en.md (bản dịch, P6) không nạp vào đây
  loader: glob({ pattern: ['*.md', '!*.*.md'], base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    intro: z.string(),
    /** Các mốc trên "quỹ đạo phóng" ở trang Về tôi */
    timeline: z.array(z.object({ year: z.string(), title: z.string(), text: z.string() })).default([]),
    /** Kỹ năng trình bày như các "subsystem" của tàu, level 0–100 */
    subsystems: z
      .array(z.object({ code: z.string(), name: z.string(), level: z.number().min(0).max(100), items: z.array(z.string()) }))
      .default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, journeys, pages };
