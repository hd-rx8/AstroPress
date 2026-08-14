// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from './src/config/env';

/**
 * `astro.config.ts` is loaded by Astro's own config loader, a separate,
 * earlier phase than the app's Vite pipeline — its module context never
 * populates `import.meta.env`, and env vars from a local `.env` file
 * (loaded later, only for the app build/dev server) aren't available yet
 * either. `site` is resolved here by calling `../src/config/env`'s
 * `loadEnv(source)` directly against `process.env` — the exact same
 * absolute-HTTP(S)/trailing-slash validation the rest of the app uses for
 * `SITE_URL` — rather than hand-rolling a second, independent URL check
 * that could drift from it over time.
 *
 * (`loadEnv` — the plain, non-eager function — is safe to import here even
 * though it lives alongside the eagerly-exported `env` singleton: `env` is
 * now a lazily-computed Proxy that only validates on first property
 * access, so merely importing this module has no side effect. See
 * `src/config/env.ts` for why that matters.)
 *
 * `loadEnv` requires both `WORDPRESS_URL` and `SITE_URL`, but only
 * `siteUrl` is used here, so a placeholder `WORDPRESS_URL` is substituted
 * when it isn't set yet (config-load time doesn't need it) purely to
 * satisfy `loadEnv`'s contract.
 *
 * Falls back to a placeholder `site` when `SITE_URL` is missing/invalid so
 * config loading (and therefore `npm run typecheck` / `npm run lint`) keeps
 * working with zero env vars set. Any command that actually builds output
 * (`astro build`, `astro dev`) is run with a real `SITE_URL` — a local
 * `.env` (see `.env.example`), or the fixture server's injected env in
 * `scripts/verify-build.mjs` (set directly on `process.env` before `astro
 * build` starts) — so `site` reflects the real, validated value whenever it
 * matters.
 */
function resolveSiteUrl(): string {
  try {
    const resolved = loadEnv({
      WORDPRESS_URL: process.env.WORDPRESS_URL ?? 'https://placeholder.invalid',
      SITE_URL: process.env.SITE_URL,
    });
    return resolved.siteUrl.href;
  } catch {
    return 'https://example.com';
  }
}

// https://astro.build/config
export default defineConfig({
  site: resolveSiteUrl(),
  integrations: [sitemap()],
});
