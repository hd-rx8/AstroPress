/**
 * Aggregates the WordPress `/pages` REST collection into a single, fully
 * normalized array, and guards against page slugs that would collide with
 * a reserved root route on the frontend (e.g. a WordPress page slugged
 * "blog" would otherwise shadow the generated blog index).
 */

import { createWordPressClient } from './client';
import { WordPressPaginationError } from './errors';
import { normalizePage } from './normalizers';
import type { Page } from './normalizers';
import { isValidTotalPages, WORDPRESS_API_PAGE_SIZE } from './pagination';
import type { WordPressRawPage } from './types';

const client = createWordPressClient();

/** Root routes the frontend generates itself; a WordPress page cannot reuse these slugs. */
const RESERVED_PAGE_SLUGS: readonly string[] = ['blog', 'robots.txt'];

/** Raised when a WordPress page's slug collides with a reserved root route. */
export class ReservedPageSlugError extends Error {
  constructor(slug: string) {
    super(`WordPress page slug "${slug}" collides with the reserved "/${slug}" route`);
    this.name = 'ReservedPageSlugError';
  }
}

/** Throws {@link ReservedPageSlugError} naming the first page slug that collides with a reserved root route. */
export function assertNoReservedPageSlugs(pages: Page[]): void {
  for (const page of pages) {
    if (RESERVED_PAGE_SLUGS.includes(page.slug)) {
      throw new ReservedPageSlugError(page.slug);
    }
  }
}

async function fetchAllRawPages(): Promise<WordPressRawPage[]> {
  const first = await client.get<WordPressRawPage[]>('pages', {
    query: { per_page: WORDPRESS_API_PAGE_SIZE, page: 1 },
  });

  const { totalPages } = first;
  if (!isValidTotalPages(totalPages)) {
    throw new WordPressPaginationError('pages', totalPages);
  }

  const raw: WordPressRawPage[] = [...first.data];
  for (let page = 2; page <= totalPages; page += 1) {
    const result = await client.get<WordPressRawPage[]>('pages', {
      query: { per_page: WORDPRESS_API_PAGE_SIZE, page },
    });
    raw.push(...result.data);
  }

  return raw;
}

let cache: Promise<Page[]> | undefined;

/**
 * Fetches and normalizes every WordPress page across every REST page, then
 * asserts none of their slugs collide with a reserved root route.
 *
 * Memoized behind a module-level cached promise: the first call performs
 * the full fetch sequence, and every subsequent call — including concurrent
 * calls made before the first resolves — receives that same promise instead
 * of re-querying the REST API. This dedupes work within a single build
 * process only; it is not a persistent or cross-process cache.
 */
export function getAllPages(): Promise<Page[]> {
  if (!cache) {
    cache = fetchAllRawPages().then((raw) => {
      const pages = raw.map(normalizePage);
      assertNoReservedPageSlugs(pages);
      return pages;
    });
  }
  return cache;
}
