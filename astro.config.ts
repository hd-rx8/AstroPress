// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * `astro.config.ts` is loaded by Astro's own config loader, a separate,
 * earlier phase than the app's Vite pipeline — its module context never
 * populates `import.meta.env`, and env vars from a local `.env` file
 * (loaded later, only for the app build/dev server) aren't available yet
 * either. So `site` is resolved directly from real process env vars here,
 * rather than importing `../src/config/env` (whose validated singleton
 * reads `import.meta.env` and would always be unavailable in this context).
 *
 * `SITE_URL` is still required to be a valid absolute URL when present —
 * matching `src/config/env.ts`'s own validation — but falls back to a
 * placeholder so config loading (and therefore `npm run typecheck` /
 * `npm run lint`) keeps working without any env vars set at all. Any
 * command that actually builds output (`astro build`, `astro dev`) is run
 * with a real `SITE_URL` — a local `.env` (see `.env.example`, loaded by
 * Astro before the page/route build phase), or the fixture server's
 * injected env in `scripts/verify-build.mjs` (set directly on
 * `process.env` before `astro build` starts) — so `site` reflects the real
 * value whenever it matters.
 */
function resolveSiteUrl(): string {
  const raw = process.env.SITE_URL;
  if (!raw) {
    return 'https://example.com';
  }
  try {
    return new URL(raw).href;
  } catch {
    return 'https://example.com';
  }
}

// https://astro.build/config
export default defineConfig({
  site: resolveSiteUrl(),
  integrations: [sitemap()],
});
