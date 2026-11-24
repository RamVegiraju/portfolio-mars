import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.SITE_URL || 'https://ram-vegiraju-journal.fancy-clove-6795.chatgpt.site',
  integrations: [sitemap()],
  output: 'static',
  trailingSlash: 'always',
  redirects: { '/about/': '/' },
});
