/**
 * Static `robots.txt` endpoint, built from the shared sitemap index path
 * constant and `env.siteUrl` so it never drifts from what
 * `@astrojs/sitemap` actually emits.
 */
import type { APIRoute } from 'astro';
import { env } from '../config/env';
import { buildRobotsTxt, SITEMAP_INDEX_PATH } from '../lib/seo/robots';

export const GET: APIRoute = () => {
  return new Response(buildRobotsTxt(env.siteUrl, SITEMAP_INDEX_PATH), {
    headers: { 'Content-Type': 'text/plain' },
  });
};
