/**
 * CONTENT COLLECTIONS — mỗi dự án / chuyến đi là một thư mục chứa index.md + ảnh.
 * Thêm nội dung mới: tạo thư mục mới (tên thư mục = đường dẫn URL), hoặc dùng trang /admin.
 * draft: true → chỉ hiện khi chạy `npm run dev`, không lên web thật.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { countryName } from '@/lib/flags';

const link = z.object({ label: z.string(), url: z.string() });
/** CMS lưu ô trống thành '' → coi như chưa điền */
const blank = (v: unknown) => (v === '' || v === null ? undefined : v);

const projects = defineCollection({
  // <tên>/index.md = tiếng Việt; bản tiếng Anh index.en.md nạp ở projectsEn
  loader: glob({ pattern: '*/index.md', base: './src/content/projects', generateId: ({ entry }) => entry.split('/')[0] }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      date: z.coerce.date(),
      /** Để trống = dự án/sự kiện diễn ra trong một tháng; Nominal (đang chạy) thì hiện "… – nay" */
      endDate: z.preprocess(blank, z.coerce.date().optional()),
      role: z.string(),
      /** Tình trạng dự án, hiện như đèn trạng thái: Nominal (đang chạy), Complete (đã xong), Research */
      status: z.enum(['Nominal', 'Complete', 'Research']).default('Complete'),
      tags: z.array(z.string()).default([]),
      /** Để trống = thẻ hiện nền trống, trang chi tiết không có ảnh bìa */
      cover: z.preprocess(blank, image().optional()),
      coverAlt: z.string().default(''),
      /** Ảnh sự kiện / sản phẩm, đặt cùng thư mục với index.md (giống album chuyến đi) */
      gallery: z.array(z.object({ src: image(), alt: z.string(), caption: z.string().optional() })).default([]),
      links: z.array(link).default([]),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

/**
 * Chuyến đi. Tối thiểu chỉ cần place + countryCode + lat/lng → hiện ghim và cờ trên địa cầu.
 * Có ảnh bìa (cover) → thêm thẻ ở trang Hành trình và trang riêng /journeys/<thư-mục>.
 */
const journeys = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/journeys', generateId: ({ entry }) => entry.split('/')[0] }),
  schema: ({ image }) =>
    z
      .object({
        /** Để trống = dùng tên địa điểm */
        title: z.string().default(''),
        summary: z.string().default(''),
        date: z.preprocess(blank, z.coerce.date().optional()),
        endDate: z.preprocess(blank, z.coerce.date().optional()),
        /** Hành trình chưa kết thúc (vd. Việt Nam): hiện "… – nay" và số ngày T+n, tự tăng mỗi lần build lại */
        ongoing: z.boolean().default(false),
        place: z.string(),
        /** Mã quốc gia ISO 2 chữ (VN, FR, JP…) → cờ + tên nước tự động */
        countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Mã quốc gia gồm 2 chữ cái, ví dụ VN, FR, JP'),
        /** Tên nước hiển thị; để trống = tự lấy theo mã (FR → Pháp) */
        country: z.string().default(''),
        /** Toạ độ để chấm lên quả địa cầu (tra trên Google Maps: chuột phải → copy toạ độ) */
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        cover: z.preprocess(blank, image().optional()),
        coverAlt: z.string().default(''),
        gallery: z
          .array(z.object({ src: image(), alt: z.string(), caption: z.string().optional() }))
          .default([]),
        /** Link hoặc ID video YouTube kể về chuyến đi */
        youtube: z.string().optional(),
        tags: z.array(z.string()).default([]),
        draft: z.boolean().default(false),
      })
      .transform((d) => ({ ...d, title: d.title.trim() || d.place, country: d.country.trim() || countryName(d.countryCode, 'vi') })),
});

const pages = defineCollection({
  // about.md = tiếng Việt; bản tiếng Anh about.en.md nạp ở pagesEn
  loader: glob({ pattern: ['*.md', '!*.*.md'], base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    intro: z.string(),
    /** Các mốc trên "quỹ đạo phóng" ở trang Về tôi */
    timeline: z.array(z.object({ year: z.string(), title: z.string(), text: z.string() })).default([]),
    /* Kỹ năng đã chuyển sang trang Vũ trụ: src/data/skills.yaml (src/lib/skills.ts) */
    draft: z.boolean().default(false),
  }),
});

/* ---------------------------------------------------------------
   BẢN TIẾNG ANH (index.en.md / about.en.md cạnh file tiếng Việt, CMS ghi ra theo i18n multiple_files)
   Chỉ đọc các trường cần dịch; ngày, toạ độ, ảnh… luôn lấy từ bản tiếng Việt.
   Trường nào trống / thiếu (hoặc cả file chưa có) thì dùng bản tiếng Việt: xem localize() trong src/lib/content.ts.
   --------------------------------------------------------------- */
const text = z.preprocess(blank, z.string().optional());
const photoText = z.array(z.object({ alt: text, caption: text }).partial().nullable()).optional();
const enOnly = (folder: string) =>
  glob({ pattern: '*/index.en.md', base: `./src/content/${folder}`, generateId: ({ entry }) => entry.split('/')[0] });

const projectsEn = defineCollection({
  loader: enOnly('projects'),
  schema: z.object({
    title: text,
    summary: text,
    role: text,
    tags: z.array(z.string()).optional(),
    coverAlt: text,
    gallery: photoText,
    links: z.array(z.object({ label: text })).optional(),
  }),
});

const journeysEn = defineCollection({
  loader: enOnly('journeys'),
  schema: z.object({
    title: text,
    summary: text,
    place: text,
    country: text,
    coverAlt: text,
    gallery: photoText,
    tags: z.array(z.string()).optional(),
  }),
});

const pagesEn = defineCollection({
  loader: glob({ pattern: '*.en.md', base: './src/content/pages', generateId: ({ entry }) => entry.replace(/\.en\.md$/, '') }),
  schema: z.object({
    title: text,
    intro: text,
    timeline: z.array(z.object({ year: text, title: text, text: text }).partial().nullable()).optional(),
  }),
});

export const collections = { projects, journeys, pages, projectsEn, journeysEn, pagesEn };
