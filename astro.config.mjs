// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://longpeoo.io.vn',
  integrations: [sitemap()],
  prefetch: { prefetchAll: true },
});
