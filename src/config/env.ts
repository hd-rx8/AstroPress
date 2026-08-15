export interface AppEnv {
  wordpressUrl: URL;
  wordpressApiUrl: URL;
  siteUrl: URL;
  previewSecret?: string;
}

function parseAbsoluteHttpUrl(name: string, value: string | undefined): URL {
  if (!value) {
    throw new Error(`${name} is required and must be an absolute http(s) URL.`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute http(s) URL, received "${value}".`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must use the http or https protocol, received "${value}".`);
  }

  return url;
}

function normalizeRootUrl(url: URL): URL {
  const normalized = new URL(url.toString());
  normalized.pathname = '/';
  normalized.search = '';
  normalized.hash = '';
  return normalized;
}

/** True for a URL that addresses the host root, e.g. `https://example.com` or `https://example.com/`. */
function hasRootPath(url: URL): boolean {
  return url.pathname === '/' || url.pathname === '';
}

export function loadEnv(source: Record<string, string | undefined>): AppEnv {
  const wordpressUrlRaw = parseAbsoluteHttpUrl('WORDPRESS_URL', source.WORDPRESS_URL);

  if (!hasRootPath(wordpressUrlRaw)) {
    throw new Error(
      `WORDPRESS_URL must be the site root (no path), received "${source.WORDPRESS_URL}". ` +
        'Drop the path (including any "/wp-json" suffix) — the REST base is derived automatically.',
    );
  }

  const siteUrlRaw = parseAbsoluteHttpUrl('SITE_URL', source.SITE_URL);

  // V1 deploys to a domain root only. A subpath here would be silently dropped
  // when route paths are resolved against it (`new URL('/blog/', siteUrl)`),
  // producing canonical URLs, JSON-LD and a sitemap reference that all point at
  // the wrong location — so reject it up front instead of half-supporting it.
  if (!hasRootPath(siteUrlRaw)) {
    throw new Error(
      `SITE_URL must be the site root (no path), received "${source.SITE_URL}". ` +
        'Subpath deployments (e.g. "https://example.com/blog") are not supported in V1 — ' +
        'serve the site from a domain or subdomain root instead.',
    );
  }

  const wordpressUrl = normalizeRootUrl(wordpressUrlRaw);
  const siteUrl = normalizeRootUrl(siteUrlRaw);

  const wordpressApiUrl = new URL(
    `${wordpressUrl.origin}/wp-json/wp/v2`,
  );

  const rawSecret = source.ASTROPRESS_PREVIEW_SECRET ?? source.PREVIEW_SECRET;
  const previewSecret = rawSecret && rawSecret.trim() !== '' ? rawSecret.trim() : undefined;

  return { wordpressUrl, wordpressApiUrl, siteUrl, previewSecret };
}

/**
 * Picks a configuration value from the two sources available during Astro's
 * config-load phase, with real `process.env` winning over values read from
 * `.env` files — the same precedence Vite/Astro apply to the app itself.
 *
 * This exists because `astro.config.ts` runs before Astro loads `.env` for
 * the app, so it must read the `.env` files itself. Consulting only
 * `process.env` there meant a `SITE_URL` set solely in `.env` (the documented
 * quick start) was invisible during config load, and `site` silently fell back
 * to a placeholder — emitting a sitemap full of placeholder URLs while the
 * app's own canonical tags used the real host. Kept here, beside the rest of
 * the environment boundary, so it is unit-testable rather than buried in the
 * config file.
 *
 * An empty string is treated as unset, matching {@link loadEnv}.
 */
export function pickEnvValue(
  name: string,
  processEnv: Record<string, string | undefined>,
  fileEnv: Record<string, string | undefined>,
): string | undefined {
  const value = processEnv[name] ?? fileEnv[name];
  return value === undefined || value === '' ? undefined : value;
}

let cachedEnv: AppEnv | undefined;

/**
 * Lazily validates and caches `import.meta.env` on first property access,
 * instead of eagerly at module import time.
 *
 * This makes merely *importing* this module side-effect-free: validation
 * (and the fail-fast throw on a missing/invalid `WORDPRESS_URL`/`SITE_URL`)
 * only happens the first time some code actually reads a property off
 * `env`. Every real consumer (`client.ts`, `metadata.ts`,
 * `robots.txt.ts`, ...) already only reads `env.<property>` when actually
 * invoked, never at their own module's top level, so this is
 * behavior-equivalent for the app itself — it still fails fast the moment
 * any code needs a value.
 *
 * The reason this matters: `astro.config.ts` needs to reuse {@link loadEnv}
 * (rather than hand-rolling its own `SITE_URL` validation) but is loaded by
 * a separate, earlier Astro/Vite phase whose `import.meta.env` is never
 * populated. An eagerly-computed `env` would make importing *anything* from
 * this module — even just the `loadEnv` function — throw unconditionally in
 * that context, regardless of real env vars actually being set. Deferring
 * the computation until first property access avoids that entirely.
 */
export const env: AppEnv = new Proxy({} as AppEnv, {
  get(_target, prop, receiver) {
    cachedEnv ??= loadEnv(import.meta.env);
    return Reflect.get(cachedEnv, prop, receiver);
  },
});
