/**
 * Aggregates the WordPress `/posts` REST collection into a single, fully
 * normalized, newest-first array — and slices that array into UI-facing
 * pages.
 *
 * This module owns exactly one thing: turning "however many REST pages the
 * WordPress `/posts` endpoint has" into one complete `Post[]`. It fetches
 * REST page 1 to learn `X-WP-TotalPages`, then fetches the remaining REST
 * pages sequentially, normalizes every raw record exactly once, and sorts
 * the result newest first. `paginatePosts` is a pure slicer over that
 * already-complete collection — it never talks to the network.
 */

import { createWordPressClient } from './client';
import { WordPressPaginationError } from './errors';
import { normalizePost } from './normalizers';
import type { Post } from './normalizers';
import { isValidTotalPages, WORDPRESS_API_PAGE_SIZE } from './pagination';
import type { WordPressRawPost } from './types';

export { WORDPRESS_API_PAGE_SIZE } from './pagination';

/** Number of posts shown per page on the frontend blog index. */
export const BLOG_PAGE_SIZE = 12;

const client = createWordPressClient();

async function fetchAllRawPosts(): Promise<WordPressRawPost[]> {
  const first = await client.get<WordPressRawPost[]>('posts', {
    query: { _embed: 1, per_page: WORDPRESS_API_PAGE_SIZE, page: 1 },
  });

  const { totalPages } = first;
  if (!isValidTotalPages(totalPages)) {
    throw new WordPressPaginationError('posts', totalPages);
  }

  const raw: WordPressRawPost[] = [...first.data];
  for (let page = 2; page <= totalPages; page += 1) {
    const result = await client.get<WordPressRawPost[]>('posts', {
      query: { _embed: 1, per_page: WORDPRESS_API_PAGE_SIZE, page },
    });
    raw.push(...result.data);
  }

  return raw;
}

/** Newest-first by publish date. */
function byDateDescending(a: Post, b: Post): number {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

let cache: Promise<Post[]> | undefined;

/**
 * Fetches and normalizes every WordPress post across every REST page.
 *
 * Memoized behind a module-level cached promise: the first call performs
 * the full fetch sequence, and every subsequent call — including concurrent
 * calls made before the first resolves — receives that same promise instead
 * of re-querying the REST API. This dedupes work within a single build
 * process only; it is not a persistent or cross-process cache.
 */
export function getAllPosts(): Promise<Post[]> {
  if (!cache) {
    cache = fetchAllRawPosts().then((raw) => raw.map(normalizePost).sort(byDateDescending));
  }
  return cache;
}

export interface PaginatedPosts {
  items: Post[];
  page: number;
  totalPages: number;
}

/** Pure slice of an already-complete, normalized post collection. Never fetches. */
export function paginatePosts(posts: Post[], page: number, pageSize: number): PaginatedPosts {
  const totalPages = Math.max(1, Math.ceil(posts.length / pageSize));
  const start = (page - 1) * pageSize;
  const items = posts.slice(start, start + pageSize);
  return { items, page, totalPages };
}

export interface PostsQueryOptions {
  page?: number;
  perPage?: number;
}

export interface PostsQueryResult {
  posts: Post[];
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
  };
}

/**
 * Public, paginated entry point over the complete post collection.
 * `getAllPosts()` still performs the one real (memoized) fetch — this only
 * slices and reshapes it for callers that want one page plus pagination
 * info in a single call.
 */
export async function getPosts(options: PostsQueryOptions = {}): Promise<PostsQueryResult> {
  const { page = 1, perPage = BLOG_PAGE_SIZE } = options;
  const all = await getAllPosts();
  const { items, totalPages } = paginatePosts(all, page, perPage);
  return {
    posts: items,
    pagination: { page, totalPages, totalItems: all.length },
  };
}

/** Looks up one post by slug within the already-fetched, cached collection. Never issues a per-slug fetch. */
export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const all = await getAllPosts();
  return all.find((post) => post.slug === slug);
}

