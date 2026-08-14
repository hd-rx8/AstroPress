/**
 * Builds `robots.txt` content.
 *
 * The sitemap index path is held in one shared constant so `robots.txt` and
 * any future reference to it stay in sync. It matches the default output of
 * the installed `@astrojs/sitemap` integration (`filenameBase: "sitemap"`,
 * emitting `sitemap-index.xml` at the site root) — not an invented path.
 */

/** Default sitemap index path emitted by `@astrojs/sitemap` (its `filenameBase` default is `"sitemap"`). */
export const SITEMAP_INDEX_PATH = '/sitemap-index.xml';

/** Builds `robots.txt` content allowing all crawling and pointing to the sitemap index. */
export function buildRobotsTxt(site: URL, sitemapPath: string): string {
  const sitemapUrl = new URL(sitemapPath, site).toString();
  return `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`;
}
