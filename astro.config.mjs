// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://longpeoo.io.vn',
  integrations: [sitemap(), react()],
  prefetch: { prefetchAll: true },

  vite: {
    plugins: [tailwindcss()],
  },
});