export interface AppEnv {
  wordpressUrl: URL;
  wordpressApiUrl: URL;
  siteUrl: URL;
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

function trimTrailingSlash(url: URL): URL {
  const normalized = new URL(url.toString());
  if (normalized.pathname.length > 1 && normalized.pathname.endsWith('/')) {
    normalized.pathname = normalized.pathname.replace(/\/+$/, '');
  }
  return normalized;
}

export function loadEnv(source: Record<string, string | undefined>): AppEnv {
  const wordpressUrlRaw = parseAbsoluteHttpUrl('WORDPRESS_URL', source.WORDPRESS_URL);

  const wordpressPathname = wordpressUrlRaw.pathname;
  if (wordpressPathname !== '/' && wordpressPathname !== '') {
    throw new Error(
      `WORDPRESS_URL must be the site root (no path), received "${source.WORDPRESS_URL}".`,
    );
  }

  const siteUrlRaw = parseAbsoluteHttpUrl('SITE_URL', source.SITE_URL);

  const wordpressUrl = normalizeRootUrl(wordpressUrlRaw);
  const siteUrl = trimTrailingSlash(siteUrlRaw);

  const wordpressApiUrl = new URL(
    `${wordpressUrl.origin}/wp-json/wp/v2`,
  );

  return { wordpressUrl, wordpressApiUrl, siteUrl };
}

export const env = loadEnv(import.meta.env);
