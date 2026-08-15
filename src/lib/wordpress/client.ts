import { env } from '../../config/env';
import { WordPressRequestError } from './errors';
import type { WordPressClient, WordPressGetOptions, WordPressGetResult, WordPressQueryParams } from './types';

export type { WordPressClient, WordPressGetOptions, WordPressGetResult, WordPressQueryParams } from './types';
export { WordPressRequestError } from './errors';

const DEFAULT_TIMEOUT_MS = 10_000;

export interface CreateWordPressClientOptions {
  /** Defaults to `env.wordpressApiUrl`. */
  baseUrl?: URL;
  /** Defaults to the global `fetch`. Overridable for tests. */
  fetchFn?: typeof fetch;
  /** Defaults to 10 seconds. */
  timeoutMs?: number;
}

function buildRequestUrl(baseUrl: URL, path: string, query: WordPressQueryParams | undefined): URL {
  const basePath = baseUrl.pathname.replace(/\/+$/, '');
  const trimmedPath = path.replace(/^\/+/, '');
  const url = new URL(`${basePath}/${trimmedPath}`, baseUrl.origin);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

function parsePaginationHeader(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Creates a minimal transport client for the WordPress REST API.
 *
 * This client only fetches and returns raw JSON plus pagination header
 * info — it does not normalize content or choose which endpoint/path to
 * call. Callers pass the full path (relative to the API base) to `get`.
 */
export function createWordPressClient(options: CreateWordPressClientOptions = {}): WordPressClient {
  const baseUrl = options.baseUrl ?? env.wordpressApiUrl;
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async get<T>(path: string, getOptions?: WordPressGetOptions): Promise<WordPressGetResult<T>> {
      const url = buildRequestUrl(baseUrl, path, getOptions?.query);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      // The timer stays armed until the body has been fully read, not just
      // until headers arrive: a server that responds promptly and then stalls
      // mid-body would otherwise hang the build forever. Aborting the signal
      // rejects an in-flight `response.json()` too, so both phases are covered
      // by the same deadline.
      try {
        let response: Response;
        try {
          response = await fetchFn(url, { signal: controller.signal });
        } catch (cause) {
          throw new WordPressRequestError({
            operation: path,
            url: url.toString(),
            cause,
          });
        }

        if (!response.ok) {
          throw new WordPressRequestError({
            operation: path,
            url: url.toString(),
            status: `${response.status} ${response.statusText}`,
          });
        }

        let data: T;
        try {
          data = (await response.json()) as T;
        } catch (cause) {
          throw new WordPressRequestError({
            operation: path,
            url: url.toString(),
            cause,
          });
        }

        const total = parsePaginationHeader(response.headers.get('X-WP-Total'));
        const totalPages = parsePaginationHeader(response.headers.get('X-WP-TotalPages'));

        const result: WordPressGetResult<T> = { data };
        if (total !== undefined) {
          result.total = total;
        }
        if (totalPages !== undefined) {
          result.totalPages = totalPages;
        }
        return result;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
