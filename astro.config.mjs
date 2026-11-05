// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://longpeoo.io.vn',
  // URL gọn không có dấu "/" cuối: /journeys/ha-giang (Cloudflare phục vụ ha-giang.html)
  trailingSlash: 'never',
  build: { format: 'file' },
  // Song ngữ: tiếng Việt ở gốc (/about), tiếng Anh dưới /en (/en/about). Trang nằm trong src/pages/[...locale]/
  i18n: {
    locales: ['vi', 'en'],
    defaultLocale: 'vi',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    // Sitemap ghi kèm hreflang cho từng cặp trang vi/en; bỏ trang 404
    sitemap({
      i18n: { defaultLocale: 'vi', locales: { vi: 'vi', en: 'en' } },
      filter: (page) => !/\/404\/?$/.test(page),
    }),
    react(),
  ],
  prefetch: { prefetchAll: true },
  image: {
    // Ảnh đầu ra mặc định WebP, chất lượng vừa đủ cho ảnh du lịch
    responsiveStyles: true,
  },
  vite: {
    plugins: [tailwindcss()],
    // `npm run dev` không chạy Worker: /api/* (đếm người xem, hộp thư) chuyển sang `npm run dev:api` (cổng 8787) nếu đang bật
    server: {
      proxy: { '/api': { target: 'http://localhost:8787', ws: true } },
    },
  },
});
