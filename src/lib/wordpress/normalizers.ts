/**
 * Normalizers: raw WordPress REST JSON -> clean frontend-facing domain
 * types.
 *
 * This module is pure data transformation. It does not fetch anything and
 * knows nothing about HTTP — it only reads the raw shapes defined in
 * `types.ts` and produces `Post` / `Page` objects, stripping WordPress REST
 * internals (`_embedded`, `.rendered` wrappers, etc.) that the frontend
 * should never see.
 */

import type { WordPressRawAuthor, WordPressRawFeaturedMedia, WordPressRawPage, WordPressRawPost } from './types';

export interface PostAuthor {
  name: string;
  slug: string;
}

export interface FeaturedImage {
  url: string;
  alt: string;
}

export interface Post {
  id: number;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  date: string;
  featuredImage?: FeaturedImage;
  author?: PostAuthor;
}

export interface Page {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  date: string;
}

/**
 * Raised when a raw WordPress REST record is missing a field a normalizer
 * requires. Indicates a broken contract with the WordPress instance, not a
 * transport failure (see {@link WordPressRequestError} for those).
 */
export class WordPressContractError extends Error {
  constructor(entity: string, field: string) {
    super(`WordPress ${entity} is missing required field "${field}"`);
    this.name = 'WordPressContractError';
  }
}

/** Collapses runs of whitespace (including newlines) into single spaces and trims. */
function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * The named HTML entities WordPress commonly emits in `title.rendered` and
 * `excerpt.rendered` (smart quotes, dashes, ampersands, etc.). Not an
 * exhaustive HTML5 entity table — just the ones real WordPress content uses.
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

/** Decodes named and numeric (decimal/hex) HTML entities, e.g. `&#8217;` -> `'`, `&amp;` -> `&`. */
function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity[0] === '#') {
      const codePoint =
        entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}

/** Strips HTML tags, decodes entities, then collapses whitespace. */
function stripHtml(value: string): string {
  return collapseWhitespace(decodeHtmlEntities(value.replace(/<[^>]*>/g, ' ')));
}

function requireField<T>(value: T | undefined | null, entity: string, field: string): T {
  if (value === undefined || value === null) {
    throw new WordPressContractError(entity, field);
  }
  return value;
}

function normalizeFeaturedImage(media: WordPressRawFeaturedMedia[] | undefined): FeaturedImage | undefined {
  const first = media?.[0];
  if (!first) {
    return undefined;
  }
  return {
    url: first.source_url,
    alt: first.alt_text ?? '',
  };
}

function normalizeAuthor(authors: WordPressRawAuthor[] | undefined): PostAuthor | undefined {
  const first = authors?.[0];
  if (!first) {
    return undefined;
  }
  return { name: first.name, slug: first.slug };
}

function normalizeExcerpt(excerpt: { rendered: string } | undefined): string | undefined {
  const rendered = excerpt?.rendered;
  if (rendered === undefined) {
    return undefined;
  }
  const stripped = stripHtml(rendered);
  return stripped === '' ? undefined : stripped;
}

/** Converts a raw WordPress REST post (optionally `_embed`-ded) into a clean {@link Post}. */
export function normalizePost(raw: WordPressRawPost): Post {
  const id = requireField(raw.id, 'post', 'id');
  const slug = requireField(raw.slug, 'post', 'slug');
  const date = requireField(raw.date, 'post', 'date');
  const title = collapseWhitespace(decodeHtmlEntities(requireField(raw.title?.rendered, 'post', 'title.rendered')));
  const content = requireField(raw.content?.rendered, 'post', 'content.rendered');

  return {
    id,
    slug,
    title,
    content,
    date,
    excerpt: normalizeExcerpt(raw.excerpt),
    featuredImage: normalizeFeaturedImage(raw._embedded?.['wp:featuredmedia']),
    author: normalizeAuthor(raw._embedded?.author),
  };
}

/** Converts a raw WordPress REST page into a clean {@link Page}. */
export function normalizePage(raw: WordPressRawPage): Page {
  const id = requireField(raw.id, 'page', 'id');
  const slug = requireField(raw.slug, 'page', 'slug');
  const date = requireField(raw.date, 'page', 'date');
  const title = collapseWhitespace(decodeHtmlEntities(requireField(raw.title?.rendered, 'page', 'title.rendered')));
  const content = requireField(raw.content?.rendered, 'page', 'content.rendered');

  return {
    id,
    slug,
    title,
    content,
    date,
    excerpt: normalizeExcerpt(raw.excerpt),
  };
}
