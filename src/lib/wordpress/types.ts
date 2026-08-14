/**
 * Raw transport-level types for the WordPress REST client (V1).
 *
 * These describe the shape of a request/response at the HTTP boundary only.
 * They intentionally know nothing about WordPress content shapes (posts,
 * pages, media, ...) — that normalization happens in a later layer.
 */

/** Query parameter values accepted by {@link WordPressClient.get}. */
export type WordPressQueryParams = Record<string, string | number>;

export interface WordPressGetOptions {
  query?: WordPressQueryParams;
}

/**
 * Result of a successful `get` call: the raw parsed JSON body, plus
 * WordPress's `X-WP-Total` / `X-WP-TotalPages` pagination headers when the
 * response included them.
 */
export interface WordPressGetResult<T> {
  data: T;
  total?: number;
  totalPages?: number;
}

export interface WordPressClient {
  get<T>(path: string, options?: WordPressGetOptions): Promise<WordPressGetResult<T>>;
}
