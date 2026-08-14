/**
 * Central definition of every URL path this site produces.
 *
 * Path construction lives here — and only here — so a route can never drift
 * from the string that other layers (sitemap, internal links, SEO
 * canonicals) build independently.
 */

/**
 * Path for a page of the blog index. Page 1 is the blog root (`/blog/`);
 * every later page lives under the numbered pagination route.
 */
export function blogPagePath(page: number): string {
  return page <= 1 ? '/blog/' : `/blog/page/${page}/`;
}

/** Path for a single blog post. */
export function postPath(slug: string): string {
  return `/blog/${slug}/`;
}

/** Path for a generic (non-post) WordPress page. */
export function pagePath(slug: string): string {
  return `/${slug}/`;
}

/**
 * Page numbers handled by the dynamic `/blog/page/[number]/` route.
 *
 * Page 1 is intentionally excluded: it is served by the static `/blog/`
 * route (see {@link blogPagePath}), not the dynamic pagination route, so
 * `getStaticPaths` for that route should iterate this list rather than
 * `1..totalPages`.
 */
export function blogPaginationRoutePages(totalPages: number): number[] {
  const pages: number[] = [];
  for (let page = 2; page <= totalPages; page += 1) {
    pages.push(page);
  }
  return pages;
}
