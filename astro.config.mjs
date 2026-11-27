// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://cv.lnit.id.vn',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [sitemap({ filter: (page) => !/\/admin(\/|$)/.test(new URL(page).pathname) })],
  // Old URLs. With format 'file' each key becomes <key>.html, which GitHub Pages also serves at /<key>.
  redirects: {
    '/cv': '/academic-cv',
    '/research': '/nghien-cuu',
    '/publications': '/nghien-cuu',
    '/achievements': '/',
    '/ho-so-di-lam': '/',
  },
});
