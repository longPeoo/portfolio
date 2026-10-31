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
  integrations: [sitemap(), react()],
  prefetch: { prefetchAll: true },
  image: {
    // Ảnh đầu ra mặc định WebP, chất lượng vừa đủ cho ảnh du lịch
    responsiveStyles: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
