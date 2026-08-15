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

/**
 * Raw WordPress REST content shapes (V1).
 *
 * These describe only the fields the normalizers in `normalizers.ts` read
 * from a `/posts` or `/pages` response — not the full WordPress REST
 * schema. Fields the frontend never needs are intentionally left untyped.
 */

interface WordPressRawRenderedField {
  rendered: string;
}

export interface WordPressRawMediaDetails {
  width?: number;
  height?: number;
}

export interface WordPressRawFeaturedMedia {
  source_url: string;
  alt_text?: string;
  media_details?: WordPressRawMediaDetails;
}

export interface WordPressRawMedia {
  id: number;
  source_url: string;
  alt_text?: string;
  media_details?: WordPressRawMediaDetails;
}


export interface WordPressRawAuthor {
  name: string;
  slug: string;
}

export interface WordPressRawTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
}

/** The `_embedded` container present when a request used `_embed`. */
export interface WordPressRawEmbedded {
  'wp:featuredmedia'?: WordPressRawFeaturedMedia[];
  author?: WordPressRawAuthor[];
  'wp:term'?: WordPressRawTerm[][];
}

export interface WordPressRawYoastOgImage {
  url?: string;
  width?: number;
  height?: number;
  type?: string;
}

export interface WordPressRawYoastHeadJson {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: {
    index?: string;
    follow?: string;
    max_snippet?: string;
    max_image_preview?: string;
    max_video_preview?: string;
  };
  og_title?: string;
  og_description?: string;
  og_url?: string;
  og_type?: string;
  og_image?: WordPressRawYoastOgImage[];
  twitter_card?: 'summary' | 'summary_large_image';
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
  schema?: Record<string, unknown>;
}

export interface WordPressRawRankMath {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string[];
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_card?: 'summary' | 'summary_large_image';
  schema?: Record<string, unknown>;
}

export interface WordPressRawPost {
  id: number;
  slug: string;
  date: string;
  title: WordPressRawRenderedField;
  content: WordPressRawRenderedField;
  excerpt?: WordPressRawRenderedField;
  _embedded?: WordPressRawEmbedded;
  yoast_head_json?: WordPressRawYoastHeadJson;
  rank_math_seo?: WordPressRawRankMath;
}

export interface WordPressRawPage {
  id: number;
  slug: string;
  date: string;
  title: WordPressRawRenderedField;
  content: WordPressRawRenderedField;
  excerpt?: WordPressRawRenderedField;
  yoast_head_json?: WordPressRawYoastHeadJson;
  rank_math_seo?: WordPressRawRankMath;
}

export interface WordPressRawCategory {
  id: number;
  slug: string;
  name: string;
  count: number;
}


