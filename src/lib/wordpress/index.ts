/**
 * Public entry point for the WordPress content layer.
 *
 * Astro pages and components should import from here — `'../lib/wordpress'`
 * (or the appropriate relative depth) — rather than reaching into
 * individual modules. This is the one surface safe to depend on across
 * future internal reorganizations of this directory.
 */

export { BLOG_PAGE_SIZE, getAllPosts, getPosts, getPostBySlug, paginatePosts } from './posts';
export type { PaginatedPosts, PostsQueryOptions, PostsQueryResult } from './posts';

export { assertNoReservedPageSlugs, getAllPages, getAllPages as getPages, getPageBySlug, ReservedPageSlugError } from './pages';

export { getAllCategories, getAllCategories as getCategories } from './categories';

export { getMediaById, getMediaById as getMedia } from './media';


export { buildPostJsonLd, getSeoData } from './seo';
export type { Metadata } from './seo';

export type { Category, FeaturedImage, Media, Page, Post, PostAuthor } from './normalizers';
export { WordPressContractError } from './normalizers';

export { WordPressPaginationError, WordPressRequestError } from './errors';
