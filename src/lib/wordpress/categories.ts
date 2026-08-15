/**
 * Aggregates the WordPress `/categories` REST collection into a single,
 * fully normalized array. Independent of posts: it does not attach
 * categories to `Post` — it is a standalone lookup for pages/components
 * that want the taxonomy itself (e.g. a future category listing or filter).
 */

import { createWordPressClient } from './client';
import { WordPressPaginationError } from './errors';
import { normalizeCategory } from './normalizers';
import type { Category } from './normalizers';
import { isValidTotalPages, WORDPRESS_API_PAGE_SIZE } from './pagination';
import type { WordPressRawCategory } from './types';

const client = createWordPressClient();

async function fetchAllRawCategories(): Promise<WordPressRawCategory[]> {
  const first = await client.get<WordPressRawCategory[]>('categories', {
    query: { per_page: WORDPRESS_API_PAGE_SIZE, page: 1 },
  });

  const { totalPages } = first;
  if (!isValidTotalPages(totalPages)) {
    throw new WordPressPaginationError('categories', totalPages);
  }

  const raw: WordPressRawCategory[] = [...first.data];
  for (let page = 2; page <= totalPages; page += 1) {
    const result = await client.get<WordPressRawCategory[]>('categories', {
      query: { per_page: WORDPRESS_API_PAGE_SIZE, page },
    });
    raw.push(...result.data);
  }

  return raw;
}

let cache: Promise<Category[]> | undefined;

/**
 * Fetches and normalizes every WordPress category across every REST page.
 * Memoized the same way as {@link getAllPosts}/{@link getAllPages}: one
 * cached promise per build process.
 */
export function getAllCategories(): Promise<Category[]> {
  if (!cache) {
    cache = fetchAllRawCategories().then((raw) => raw.map(normalizeCategory));
  }
  return cache;
}
