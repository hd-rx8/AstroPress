# WordPress Content Layer Evolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing WordPress content layer (`src/lib/wordpress/`) with categories, standalone media lookup, a robots-aware SEO facade, and one public barrel API — then document the architecture — without rewriting the already-solid V1 client, normalizers, posts, or pages modules.

**Architecture:** V1 (already shipped, see `docs/superpowers/plans/2026-08-14-wordpress-astro-headless-starter.md`) established a typed REST client, pure normalizers, and memoized post/page aggregation. This milestone adds two new, independent aggregation modules (`categories.ts`, `media.ts`) that reuse the same client/error/pagination primitives, enriches the existing `FeaturedImage` type additively (width/height, no breaking change), adds a `robots` field to shared metadata, and introduces `src/lib/wordpress/index.ts` as the one import surface Astro pages should depend on. Existing pages migrate to that barrel; `getAllPosts`/`getAllPages` internals are untouched.

**Tech Stack:** Astro, TypeScript strict, native fetch, Vitest — no new dependencies.

## Global Constraints

- Do not modify the behavior or public signatures of `client.ts`, `errors.ts`, `normalizePost`, `normalizePage`, `getAllPosts`, `getAllPages`, `paginatePosts`, `assertNoReservedPageSlugs`, `buildMetadata`, or `buildPostJsonLd` — only additive changes (new optional fields, new exports) are allowed on these.
- New collections (`categories`) follow the exact aggregation pattern already used by `pages.ts`: fetch page 1, require a valid `X-WP-TotalPages` via `isValidTotalPages`/`WordPressPaginationError`, fetch remaining pages sequentially, normalize once, memoize behind a module-level cached `Promise`.
- No new npm dependencies. No SSR, GraphQL, auth, preview, search, WooCommerce, or external image pipeline — same exclusions as the V1 plan.
- No client-side JavaScript. All new data flows through Astro frontmatter at build time.
- `getSeoData` must be a thin wrapper over the existing `buildMetadata`, not a parallel implementation — it exists purely to give the content layer a stable, Yoast/Rank-Math-ready name without duplicating logic.
- Every new/changed module gets Vitest coverage in the same style as its siblings (`vi.hoisted` + `vi.mock('.../client')`, `vi.resetModules()` per test, fixtures added to `tests/fixtures/wordpress.ts`).
- Run `npm run typecheck && npm run lint && npm test` after every task; run `npm run build:ci` at the end of Task 4 and again in Task 6.

---

## Target file structure (new/changed only)

```text
src/lib/wordpress/
  types.ts          + WordPressRawCategory, WordPressRawMedia, WordPressRawMediaDetails; WordPressRawFeaturedMedia gains media_details
  normalizers.ts     + Category, Media, normalizeCategory, normalizeMedia; FeaturedImage gains width/height
  categories.ts      NEW — getAllCategories()
  media.ts           NEW — getMediaById(id)
  posts.ts           + getPosts(options), getPostBySlug(slug)
  pages.ts           + getPageBySlug(slug)
  seo.ts             NEW — getSeoData(), re-exports buildPostJsonLd
  index.ts           NEW — public barrel
src/lib/seo/metadata.ts   + robots field on Metadata/BuildMetadataInput
src/layouts/BaseLayout.astro   + <meta name="robots">
src/components/PostCard.astro  + width/height/decoding on <img>
src/pages/index.astro, src/pages/[slug].astro, src/pages/blog/index.astro,
src/pages/blog/[slug].astro, src/pages/blog/page/[number].astro   import from ../lib/wordpress barrel
tests/fixtures/wordpress.ts   + category/media fixtures
tests/lib/wordpress/{categories,media,seo}.test.ts   NEW
tests/lib/wordpress/{posts,pages}.test.ts   + new describe blocks
tests/lib/seo/metadata.test.ts   + robots tests
docs/architecture.md   NEW
README.md   repositioned intro + content-layer API section
```

### Task 1: Add the categories collection

**Files:**
- Modify: `src/lib/wordpress/types.ts`
- Modify: `src/lib/wordpress/normalizers.ts`
- Create: `src/lib/wordpress/categories.ts`
- Modify: `tests/fixtures/wordpress.ts`
- Create: `tests/lib/wordpress/categories.test.ts`

**Interfaces:**
- Consumes: `createWordPressClient` (`client.ts`), `WordPressPaginationError` (`errors.ts`), `isValidTotalPages`/`WORDPRESS_API_PAGE_SIZE` (`pagination.ts`).
- Produces: `Category = { id: number; slug: string; name: string; count: number }`, `normalizeCategory(raw): Category`, `getAllCategories(): Promise<Category[]>`.

- [ ] **Step 1: Add the raw category type, fixture, and failing tests**

Append to `src/lib/wordpress/types.ts`:

```ts
export interface WordPressRawCategory {
  id: number;
  slug: string;
  name: string;
  count: number;
}
```

Add to `tests/fixtures/wordpress.ts` (add `WordPressRawCategory` to the existing type-only import from `'../../src/lib/wordpress/types'`):

```ts
export const wordpressCategoryFixture: WordPressRawCategory = {
  id: 5,
  slug: 'news',
  name: 'News &amp; Updates',
  count: 12,
};
```

Add to `tests/lib/wordpress/normalizers.test.ts` (new `describe` block; also add `normalizeCategory` to the existing `import { normalizePage, normalizePost } from '../../../src/lib/wordpress/normalizers'` line and `wordpressCategoryFixture` to the fixtures import):

```ts
describe('normalizeCategory', () => {
  it('normalizes a category, decoding entities in the name', () => {
    expect(normalizeCategory(wordpressCategoryFixture)).toEqual({
      id: 5,
      slug: 'news',
      name: 'News & Updates',
      count: 12,
    });
  });

  it('throws a contextual error when a required field is missing', () => {
    const invalid = { ...wordpressCategoryFixture, slug: undefined } as never;
    expect(() => normalizeCategory(invalid)).toThrow(/slug/i);
  });
});
```

Create `tests/lib/wordpress/categories.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeCategory } from '../../../src/lib/wordpress/normalizers';
import { WORDPRESS_API_PAGE_SIZE } from '../../../src/lib/wordpress/pagination';
import { wordpressCategoryFixture } from '../../fixtures/wordpress';

const clientGetMock = vi.hoisted(() => vi.fn());

vi.mock('../../../src/lib/wordpress/client', () => ({
  createWordPressClient: () => ({ get: clientGetMock }),
}));

describe('getAllCategories', () => {
  beforeEach(() => {
    clientGetMock.mockReset();
    vi.resetModules();
  });

  it('fetches all REST pages after reading page one total pages', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressCategoryFixture], totalPages: 2 });
    clientGetMock.mockResolvedValueOnce({ data: [{ id: 6, slug: 'guides', name: 'Guides', count: 3 }] });

    const { getAllCategories } = await import('../../../src/lib/wordpress/categories');

    await expect(getAllCategories()).resolves.toHaveLength(2);
    expect(clientGetMock).toHaveBeenNthCalledWith(1, 'categories', {
      query: { per_page: WORDPRESS_API_PAGE_SIZE, page: 1 },
    });
    expect(clientGetMock).toHaveBeenNthCalledWith(2, 'categories', {
      query: { per_page: WORDPRESS_API_PAGE_SIZE, page: 2 },
    });
  });

  it('normalizes every raw record', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressCategoryFixture], totalPages: 1 });

    const { getAllCategories } = await import('../../../src/lib/wordpress/categories');
    const categories = await getAllCategories();

    expect(categories).toEqual([normalizeCategory(wordpressCategoryFixture)]);
  });

  it('rejects when REST page one is missing X-WP-TotalPages', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressCategoryFixture] });

    const { getAllCategories } = await import('../../../src/lib/wordpress/categories');
    await expect(getAllCategories()).rejects.toThrow(/X-WP-TotalPages/);
  });

  it('memoizes so repeated and concurrent calls only fetch once', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressCategoryFixture], totalPages: 1 });

    const { getAllCategories } = await import('../../../src/lib/wordpress/categories');

    const [first, second] = await Promise.all([getAllCategories(), getAllCategories()]);
    expect(first).toBe(second);
    expect(clientGetMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- tests/lib/wordpress/normalizers.test.ts tests/lib/wordpress/categories.test.ts
```

Expected: FAIL — `normalizeCategory` and `categories.ts` don't exist yet.

- [ ] **Step 3: Implement the normalizer and the aggregation module**

Append to `src/lib/wordpress/normalizers.ts`:

```ts
export interface Category {
  id: number;
  slug: string;
  name: string;
  count: number;
}

/** Converts a raw WordPress REST category into a clean {@link Category}. */
export function normalizeCategory(raw: WordPressRawCategory): Category {
  const id = requireField(raw.id, 'category', 'id');
  const slug = requireField(raw.slug, 'category', 'slug');
  const name = collapseWhitespace(decodeHtmlEntities(requireField(raw.name, 'category', 'name')));
  const count = requireField(raw.count, 'category', 'count');
  return { id, slug, name, count };
}
```

Add `WordPressRawCategory` to the existing `import type { ... } from './types'` line at the top of `normalizers.ts`.

Create `src/lib/wordpress/categories.ts`:

```ts
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
```

- [ ] **Step 4: Verify and commit**

```bash
npm test -- tests/lib/wordpress/normalizers.test.ts tests/lib/wordpress/categories.test.ts
npm run typecheck
npm run lint
git add src/lib/wordpress/types.ts src/lib/wordpress/normalizers.ts src/lib/wordpress/categories.ts tests/fixtures/wordpress.ts tests/lib/wordpress/categories.test.ts tests/lib/wordpress/normalizers.test.ts
git commit -m "feat: add WordPress categories collection"
```

Expected: all pass.

### Task 2: Add standalone media lookup and enrich featured images with dimensions

**Files:**
- Modify: `src/lib/wordpress/types.ts`
- Modify: `src/lib/wordpress/normalizers.ts`
- Create: `src/lib/wordpress/media.ts`
- Modify: `src/components/PostCard.astro`
- Create: `tests/lib/wordpress/media.test.ts`

**Interfaces:**
- Consumes: `createWordPressClient` (`client.ts`), `readEmbeddedString` (private helper already in `normalizers.ts`).
- Produces: `Media = { id: number; url: string; alt: string; width?: number; height?: number }`, `normalizeMedia(raw): Media`, `getMediaById(id): Promise<Media>`. `FeaturedImage` gains optional `width`/`height`.

- [ ] **Step 1: Add raw media types, extend the raw featured-media type, and write failing tests**

In `src/lib/wordpress/types.ts`, add:

```ts
export interface WordPressRawMediaDetails {
  width?: number;
  height?: number;
}

export interface WordPressRawMedia {
  id: number;
  source_url: string;
  alt_text?: string;
  media_details?: WordPressRawMediaDetails;
}
```

Change the existing `WordPressRawFeaturedMedia` interface to:

```ts
export interface WordPressRawFeaturedMedia {
  source_url: string;
  alt_text?: string;
  media_details?: WordPressRawMediaDetails;
}
```

Add to `tests/lib/wordpress/normalizers.test.ts` (add `normalizeMedia` to the existing normalizers import):

```ts
describe('normalizeMedia', () => {
  it('normalizes a media record with known dimensions', () => {
    expect(
      normalizeMedia({
        id: 55,
        source_url: 'https://cms.example.com/uploads/banner.jpg',
        alt_text: 'Banner',
        media_details: { width: 1200, height: 630 },
      }),
    ).toEqual({
      id: 55,
      url: 'https://cms.example.com/uploads/banner.jpg',
      alt: 'Banner',
      width: 1200,
      height: 630,
    });
  });

  it('omits width and height when media_details is absent', () => {
    const media = normalizeMedia({ id: 56, source_url: 'https://cms.example.com/uploads/plain.jpg' });
    expect(media).not.toHaveProperty('width');
    expect(media).not.toHaveProperty('height');
    expect(media.alt).toBe('');
  });
});
```

Add this `it` block inside the existing `describe('normalizePost', ...)` block:

```ts
it('includes featured image width and height when the embed reports them', () => {
  const withDimensions = {
    ...wordpressPostFixture,
    _embedded: {
      ...wordpressPostFixture._embedded,
      'wp:featuredmedia': [
        {
          source_url: 'https://cms.example.com/uploads/hero.jpg',
          alt_text: 'Hero image',
          media_details: { width: 1600, height: 900 },
        },
      ],
    },
  };
  expect(normalizePost(withDimensions).featuredImage).toEqual({
    url: 'https://cms.example.com/uploads/hero.jpg',
    alt: 'Hero image',
    width: 1600,
    height: 900,
  });
});
```

Create `tests/lib/wordpress/media.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const clientGetMock = vi.hoisted(() => vi.fn());

vi.mock('../../../src/lib/wordpress/client', () => ({
  createWordPressClient: () => ({ get: clientGetMock }),
}));

describe('getMediaById', () => {
  beforeEach(() => {
    clientGetMock.mockReset();
    vi.resetModules();
  });

  it('fetches and normalizes a single media record', async () => {
    clientGetMock.mockResolvedValueOnce({
      data: {
        id: 55,
        source_url: 'https://cms.example.com/uploads/banner.jpg',
        alt_text: 'Banner',
        media_details: { width: 1200, height: 630 },
      },
    });

    const { getMediaById } = await import('../../../src/lib/wordpress/media');

    await expect(getMediaById(55)).resolves.toEqual({
      id: 55,
      url: 'https://cms.example.com/uploads/banner.jpg',
      alt: 'Banner',
      width: 1200,
      height: 630,
    });
    expect(clientGetMock).toHaveBeenCalledWith('media/55');
  });

  it('omits width and height when media_details is absent', async () => {
    clientGetMock.mockResolvedValueOnce({
      data: { id: 56, source_url: 'https://cms.example.com/uploads/plain.jpg' },
    });

    const { getMediaById } = await import('../../../src/lib/wordpress/media');
    const media = await getMediaById(56);

    expect(media).not.toHaveProperty('width');
    expect(media).not.toHaveProperty('height');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- tests/lib/wordpress/normalizers.test.ts tests/lib/wordpress/media.test.ts
```

Expected: FAIL — `normalizeMedia`/`media.ts` don't exist; the featured-image dimensions test fails against the current `normalizeFeaturedImage`.

- [ ] **Step 3: Implement `normalizeMedia`, extend `normalizeFeaturedImage`, and add `media.ts`**

In `src/lib/wordpress/normalizers.ts`, change `FeaturedImage` to:

```ts
export interface FeaturedImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}
```

Add `Media` alongside it:

```ts
export interface Media {
  id: number;
  url: string;
  alt: string;
  width?: number;
  height?: number;
}
```

Replace `normalizeFeaturedImage` with:

```ts
/** Returns `undefined` for an absent, empty, or error-stub featured-media embed. */
function normalizeFeaturedImage(media: WordPressRawFeaturedMedia[] | undefined): FeaturedImage | undefined {
  const first = media?.[0];
  const url = readEmbeddedString(first?.source_url);
  if (url === undefined) {
    return undefined;
  }
  const width = first?.media_details?.width;
  const height = first?.media_details?.height;
  return {
    url,
    alt: readEmbeddedString(first?.alt_text) ?? '',
    ...(typeof width === 'number' ? { width } : {}),
    ...(typeof height === 'number' ? { height } : {}),
  };
}
```

Add, near the other normalizers:

```ts
/** Converts a raw WordPress REST media (attachment) record into a clean {@link Media}. */
export function normalizeMedia(raw: WordPressRawMedia): Media {
  const id = requireField(raw.id, 'media', 'id');
  const url = requireField(raw.source_url, 'media', 'source_url');
  const width = raw.media_details?.width;
  const height = raw.media_details?.height;
  return {
    id,
    url,
    alt: readEmbeddedString(raw.alt_text) ?? '',
    ...(typeof width === 'number' ? { width } : {}),
    ...(typeof height === 'number' ? { height } : {}),
  };
}
```

Add `WordPressRawMedia` to the existing `import type { ... } from './types'` line.

Create `src/lib/wordpress/media.ts`:

```ts
/**
 * Fetches a single WordPress media (attachment) record by ID.
 *
 * Unlike posts/pages/categories, media is not aggregated as a full
 * collection — callers request only the specific attachment they need
 * (e.g. an image referenced by ID from outside a post's embedded featured
 * media). No memoization: each ID is a distinct, cheap single-record fetch.
 */

import { createWordPressClient } from './client';
import { normalizeMedia } from './normalizers';
import type { Media } from './normalizers';
import type { WordPressRawMedia } from './types';

const client = createWordPressClient();

/** Fetches and normalizes a single media (attachment) record by its WordPress ID. */
export async function getMediaById(id: number): Promise<Media> {
  const { data } = await client.get<WordPressRawMedia>(`media/${id}`);
  return normalizeMedia(data);
}
```

- [ ] **Step 4: Render width/height/decoding on the one existing `<img>` site**

In `src/components/PostCard.astro`, replace the `<img>` element with:

```astro
<img
  class="card__image"
  src={post.featuredImage.url}
  alt={post.featuredImage.alt}
  width={post.featuredImage.width}
  height={post.featuredImage.height}
  loading="lazy"
  decoding="async"
/>
```

(Astro omits `width`/`height` attributes entirely when the value is `undefined`, so this degrades cleanly for images without known dimensions.)

- [ ] **Step 5: Verify and commit**

```bash
npm test -- tests/lib/wordpress/normalizers.test.ts tests/lib/wordpress/media.test.ts
npm run typecheck
npm run lint
git add src/lib/wordpress/types.ts src/lib/wordpress/normalizers.ts src/lib/wordpress/media.ts src/components/PostCard.astro tests/lib/wordpress/media.test.ts tests/lib/wordpress/normalizers.test.ts
git commit -m "feat: add media lookup and featured-image dimensions"
```

Expected: all pass.

### Task 3: Add a robots-aware SEO facade

**Files:**
- Modify: `src/lib/seo/metadata.ts`
- Modify: `src/layouts/BaseLayout.astro`
- Create: `src/lib/wordpress/seo.ts`
- Modify: `tests/lib/seo/metadata.test.ts`
- Create: `tests/lib/wordpress/seo.test.ts`

**Interfaces:**
- Consumes: `buildMetadata`, `buildPostJsonLd` (`src/lib/seo/metadata.ts`).
- Produces: `Metadata.robots: string`, `BuildMetadataInput.robots?: 'index,follow' | 'noindex,follow'`, `getSeoData(input): Metadata` (re-exported from `src/lib/wordpress/seo.ts`).

- [ ] **Step 1: Write failing robots tests**

Add to `tests/lib/seo/metadata.test.ts`, inside `describe('buildMetadata', ...)`:

```ts
it('defaults robots to index,follow', () => {
  const metadata = buildMetadata({ title: 'About', path: '/about/' });
  expect(metadata.robots).toBe('index,follow');
});

it('honors an explicit noindex robots directive', () => {
  const metadata = buildMetadata({ title: 'Draft', path: '/draft/', robots: 'noindex,follow' });
  expect(metadata.robots).toBe('noindex,follow');
});
```

Create `tests/lib/wordpress/seo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildMetadata } from '../../../src/lib/seo/metadata';
import { getSeoData } from '../../../src/lib/wordpress/seo';

describe('getSeoData', () => {
  it('builds metadata identical to buildMetadata for the same input', () => {
    const input = { title: 'Hello', path: '/blog/hello/' };
    expect(getSeoData(input)).toEqual(buildMetadata(input));
  });

  it('defaults robots to index,follow', () => {
    expect(getSeoData({ title: 'About', path: '/about/' }).robots).toBe('index,follow');
  });

  it('honors an explicit noindex robots directive', () => {
    expect(getSeoData({ title: 'Draft', path: '/draft/', robots: 'noindex,follow' }).robots).toBe('noindex,follow');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- tests/lib/seo/metadata.test.ts tests/lib/wordpress/seo.test.ts
```

Expected: FAIL — `metadata.robots` is `undefined`, and `src/lib/wordpress/seo.ts` doesn't exist.

- [ ] **Step 3: Implement `robots` on `Metadata` and the `getSeoData` facade**

In `src/lib/seo/metadata.ts`, change `Metadata` and `BuildMetadataInput` to:

```ts
export interface Metadata {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  openGraph: OpenGraphMetadata;
  twitter: TwitterMetadata;
}

export interface BuildMetadataInput {
  title: string;
  description?: string;
  path: string;
  imageUrl?: string;
  /**
   * Defaults to `'index,follow'`. Pass `'noindex,follow'` to keep a page out
   * of search results while still letting crawlers follow its links.
   */
  robots?: 'index,follow' | 'noindex,follow';
}
```

Change the `buildMetadata` function signature and return to:

```ts
export function buildMetadata({ title, description, path, imageUrl, robots }: BuildMetadataInput): Metadata {
  const canonical = new URL(path, env.siteUrl).toString();
  const resolvedDescription = description && description.trim() !== '' ? description : SITE.description;

  return {
    title,
    description: resolvedDescription,
    canonical,
    robots: robots ?? 'index,follow',
    openGraph: {
      title,
      description: resolvedDescription,
      url: canonical,
      ...(imageUrl ? { image: imageUrl } : {}),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
    },
  };
}
```

Create `src/lib/wordpress/seo.ts`:

```ts
/**
 * Public SEO entry point for the content layer.
 *
 * Wraps the shared metadata builder so pages call one stable name
 * (`getSeoData`) regardless of where the underlying data comes from. Today
 * that's plain WordPress fields; a later milestone can swap the
 * implementation to prefer Yoast/Rank Math SEO data (when present on a
 * post/page) without changing this function's signature or any call site.
 */

import { buildMetadata, buildPostJsonLd } from '../seo/metadata';
import type { BuildMetadataInput, Metadata } from '../seo/metadata';

export type { Metadata } from '../seo/metadata';

/** Builds the shared SEO metadata (title, description, canonical, robots, Open Graph, Twitter) for one page. */
export function getSeoData(input: BuildMetadataInput): Metadata {
  return buildMetadata(input);
}

export { buildPostJsonLd };
```

- [ ] **Step 4: Render the robots meta tag**

In `src/layouts/BaseLayout.astro`, add this line directly after `<link rel="canonical" href={metadata.canonical} />`:

```astro
<meta name="robots" content={metadata.robots} />
```

- [ ] **Step 5: Verify and commit**

```bash
npm test -- tests/lib/seo/metadata.test.ts tests/lib/wordpress/seo.test.ts
npm run typecheck
npm run lint
git add src/lib/seo/metadata.ts src/lib/wordpress/seo.ts src/layouts/BaseLayout.astro tests/lib/seo/metadata.test.ts tests/lib/wordpress/seo.test.ts
git commit -m "feat: add robots directive and getSeoData facade"
```

Expected: all pass.

### Task 4: Add the public content-layer barrel and paginated `getPosts`

**Files:**
- Modify: `src/lib/wordpress/posts.ts`
- Modify: `src/lib/wordpress/pages.ts`
- Create: `src/lib/wordpress/index.ts`
- Modify: `tests/lib/wordpress/posts.test.ts`
- Modify: `tests/lib/wordpress/pages.test.ts`
- Modify: `src/pages/index.astro`, `src/pages/[slug].astro`, `src/pages/blog/index.astro`, `src/pages/blog/[slug].astro`, `src/pages/blog/page/[number].astro`

**Interfaces:**
- Consumes: `getAllPosts`, `paginatePosts`, `BLOG_PAGE_SIZE` (`posts.ts`); `getAllPages` (`pages.ts`).
- Produces: `getPosts(options?): Promise<{ posts: Post[]; pagination: { page: number; totalPages: number; totalItems: number } }>`, `getPostBySlug(slug): Promise<Post | undefined>`, `getPageBySlug(slug): Promise<Page | undefined>`, and the `src/lib/wordpress/index.ts` barrel re-exporting `getPosts`, `getPostBySlug`, `getPages`, `getPageBySlug`, `getCategories`, `getMedia`, `getSeoData`, plus all domain types.

- [ ] **Step 1: Write failing tests for `getPosts`, `getPostBySlug`, `getPageBySlug`**

Add to `tests/lib/wordpress/posts.test.ts` (new `describe` blocks, after the existing `paginatePosts` block):

```ts
describe('getPosts', () => {
  it('returns a page of posts with pagination metadata', async () => {
    clientGetMock.mockResolvedValueOnce({
      data: [wordpressPostFixture, postWithoutEmbeddedData, postWithEmptyEmbeds],
      totalPages: 1,
    });

    const { getPosts } = await import('../../../src/lib/wordpress/posts');
    const result = await getPosts({ page: 1, perPage: 2 });

    expect(result.posts).toHaveLength(2);
    expect(result.pagination).toEqual({ page: 1, totalPages: 2, totalItems: 3 });
  });

  it('defaults to page 1 and BLOG_PAGE_SIZE when no options are given', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPostFixture], totalPages: 1 });

    const { getPosts } = await import('../../../src/lib/wordpress/posts');
    const result = await getPosts();

    expect(result.pagination.page).toBe(1);
    expect(result.posts).toHaveLength(1);
  });
});

describe('getPostBySlug', () => {
  it('finds a post by slug within the cached collection', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPostFixture], totalPages: 1 });

    const { getPostBySlug } = await import('../../../src/lib/wordpress/posts');
    const post = await getPostBySlug('hello-world');

    expect(post?.slug).toBe('hello-world');
  });

  it('returns undefined for an unknown slug', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPostFixture], totalPages: 1 });

    const { getPostBySlug } = await import('../../../src/lib/wordpress/posts');
    await expect(getPostBySlug('does-not-exist')).resolves.toBeUndefined();
  });
});
```

Add to `tests/lib/wordpress/pages.test.ts` (new `describe` block, after `assertNoReservedPageSlugs`):

```ts
describe('getPageBySlug', () => {
  it('finds a page by slug within the cached collection', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPageFixture], totalPages: 1 });

    const { getPageBySlug } = await importPagesModule();
    const page = await getPageBySlug('about');

    expect(page?.slug).toBe('about');
  });

  it('returns undefined for an unknown slug', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPageFixture], totalPages: 1 });

    const { getPageBySlug } = await importPagesModule();
    await expect(getPageBySlug('missing')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- tests/lib/wordpress/posts.test.ts tests/lib/wordpress/pages.test.ts
```

Expected: FAIL — `getPosts`, `getPostBySlug`, `getPageBySlug` don't exist yet.

- [ ] **Step 3: Implement the new exports**

Append to `src/lib/wordpress/posts.ts`:

```ts
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
```

Append to `src/lib/wordpress/pages.ts`:

```ts
/** Looks up one page by slug within the already-fetched, cached collection. Never issues a per-slug fetch. */
export async function getPageBySlug(slug: string): Promise<Page | undefined> {
  const all = await getAllPages();
  return all.find((page) => page.slug === slug);
}
```

Create `src/lib/wordpress/index.ts`:

```ts
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

export { assertNoReservedPageSlugs, getAllPages as getPages, getPageBySlug, ReservedPageSlugError } from './pages';

export { getAllCategories as getCategories } from './categories';

export { getMediaById as getMedia } from './media';

export { buildPostJsonLd, getSeoData } from './seo';
export type { Metadata } from './seo';

export type { Category, FeaturedImage, Media, Page, Post, PostAuthor } from './normalizers';
export { WordPressContractError } from './normalizers';

export { WordPressPaginationError, WordPressRequestError } from './errors';
```

- [ ] **Step 4: Migrate pages to import from the barrel**

In `src/pages/index.astro`, replace:

```ts
import { getAllPosts } from '../lib/wordpress/posts';
```

with:

```ts
import { getAllPosts } from '../lib/wordpress';
```

In `src/pages/[slug].astro`, replace:

```ts
import { getAllPages } from '../lib/wordpress/pages';
import type { Page } from '../lib/wordpress/normalizers';
```

with:

```ts
import { getAllPages } from '../lib/wordpress';
import type { Page } from '../lib/wordpress';
```

In `src/pages/blog/[slug].astro`, replace:

```ts
import { getAllPosts } from '../../lib/wordpress/posts';
import type { Post } from '../../lib/wordpress/normalizers';
```

with:

```ts
import { getAllPosts } from '../../lib/wordpress';
import type { Post } from '../../lib/wordpress';
```

Replace the full frontmatter of `src/pages/blog/index.astro` with:

```astro
---
/**
 * Blog index: page 1 of the paginated post listing (served at `/blog/`).
 * Later pages live at `/blog/page/N/` — see `blog/page/[number].astro`.
 */
import Pagination from '../../components/Pagination.astro';
import PostCard from '../../components/PostCard.astro';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { buildMetadata } from '../../lib/seo/metadata';
import { BLOG_PAGE_SIZE, getPosts } from '../../lib/wordpress';

const { posts, pagination } = await getPosts({ page: 1, perPage: BLOG_PAGE_SIZE });

const metadata = buildMetadata({
  title: 'Blog',
  path: '/blog/',
});
---

<BaseLayout metadata={metadata}>
  <h1>Blog</h1>
  <ul class="card-grid">
    {posts.map((post) => <PostCard post={post} />)}
  </ul>
  <Pagination page={pagination.page} totalPages={pagination.totalPages} />
</BaseLayout>
```

Replace the full frontmatter of `src/pages/blog/page/[number].astro` with:

```astro
---
/**
 * Numbered blog pagination pages (`/blog/page/2/`, `/blog/page/3/`, ...).
 * Page 1 is intentionally excluded — it is served by `/blog/` (see
 * `blog/index.astro`) — so `getStaticPaths` iterates
 * `blogPaginationRoutePages`, not `1..totalPages`.
 */
import Pagination from '../../../components/Pagination.astro';
import PostCard from '../../../components/PostCard.astro';
import BaseLayout from '../../../layouts/BaseLayout.astro';
import { buildMetadata } from '../../../lib/seo/metadata';
import { blogPaginationRoutePages, blogPagePath } from '../../../lib/routes';
import { BLOG_PAGE_SIZE, getPosts } from '../../../lib/wordpress';
import type { PostsQueryResult } from '../../../lib/wordpress';

export async function getStaticPaths() {
  const first = await getPosts({ page: 1, perPage: BLOG_PAGE_SIZE });

  return Promise.all(
    blogPaginationRoutePages(first.pagination.totalPages).map(async (page) => ({
      params: { number: String(page) },
      props: { result: await getPosts({ page, perPage: BLOG_PAGE_SIZE }) },
    })),
  );
}

export interface Props {
  result: PostsQueryResult;
}

const { result } = Astro.props;
const { posts, pagination } = result;

const metadata = buildMetadata({
  title: `Blog — Page ${pagination.page}`,
  path: blogPagePath(pagination.page),
});
---

<BaseLayout metadata={metadata}>
  <h1>Blog</h1>
  <ul class="card-grid">
    {posts.map((post) => <PostCard post={post} />)}
  </ul>
  <Pagination page={pagination.page} totalPages={pagination.totalPages} />
</BaseLayout>
```

(Each `getPosts()` call still resolves against the single memoized `getAllPosts()` promise, so this migration adds no extra network calls — see the `Global Constraints` memoization rule.)

- [ ] **Step 5: Verify and commit**

```bash
npm test
npm run typecheck
npm run lint
npm run build:ci
git add src/lib/wordpress src/pages/index.astro src/pages/[slug].astro src/pages/blog tests/lib/wordpress/posts.test.ts tests/lib/wordpress/pages.test.ts
git commit -m "feat: add public content-layer barrel and paginated getPosts"
```

Expected: all pass, including a real static build via the fixture server.

### Task 5: Write `docs/architecture.md`

**Files:**
- Create: `docs/architecture.md`

**Interfaces:**
- None (documentation only).

- [ ] **Step 1: Write the architecture document**

Create `docs/architecture.md`:

```markdown
# Architecture

This project renders a static Astro frontend from a headless WordPress
installation. WordPress is the editorial system of record; Astro reads from
it only at build time and produces plain static HTML — there is no runtime
dependency on WordPress once a build finishes.

## Layers

\`\`\`text
WordPress (CMS)
    |  REST API (/wp-json/wp/v2/*)
    v
WordPress Client            src/lib/wordpress/client.ts
    |  raw JSON + X-WP-Total / X-WP-TotalPages
    v
Content Layer                src/lib/wordpress/{posts,pages,categories,media,seo,normalizers,errors,pagination}.ts
    |  typed, normalized Post / Page / Category / Media + Metadata
    v
Astro routes & components     src/pages/**, src/components/**, src/layouts/**
    |  build
    v
Static HTML / Islands         dist/
\`\`\`

### WordPress's responsibility

- Owns all editorial content: posts, pages, categories, media, authors.
- Exposes it over the standard WordPress REST API. No custom plugin, no
  GraphQL, no bespoke endpoints are required.
- Is never queried at request time by a deployed build — only during
  `astro build` / `astro dev`.

### The WordPress Client's responsibility (`client.ts`)

- The single place that calls `fetch` against the WordPress REST API.
- Builds request URLs, applies a request timeout, reads the
  `X-WP-Total`/`X-WP-TotalPages` pagination headers, and turns network
  failures, non-2xx responses, and malformed JSON into a typed
  `WordPressRequestError` (see `errors.ts`). It does not know what a "post"
  or "page" is — it only understands paths, query params, and raw JSON.

### The Content Layer's responsibility (`src/lib/wordpress/`)

- `types.ts` — raw REST response shapes, scoped to only the fields this
  frontend actually reads.
- `normalizers.ts` — pure functions that turn raw REST records into the
  frontend's own domain types (`Post`, `Page`, `Category`, `Media`),
  stripping WordPress internals (`.rendered` wrappers, `_embedded`,
  taxonomy/error-stub edge cases) so nothing downstream ever sees them.
- `posts.ts` / `pages.ts` / `categories.ts` — aggregate a REST collection
  across every paginated REST page into one complete, normalized,
  in-memory array, memoized behind a module-level cached `Promise` for the
  duration of one build process. `posts.ts` additionally exposes
  `getPosts({ page, perPage })`, a pure slice-and-shape convenience over
  that same cached collection.
- `media.ts` — the one non-aggregated lookup: `getMediaById(id)` fetches a
  single attachment record on demand.
- `seo.ts` — `getSeoData(...)`, the stable public name for building page
  metadata (title, description, canonical, robots, Open Graph, Twitter).
  It wraps `src/lib/seo/metadata.ts` today; a later milestone can make it
  prefer Yoast/Rank Math fields when present without changing its
  signature or any call site.
- `errors.ts` — `WordPressRequestError` (transport failures: network,
  timeout, non-2xx, malformed JSON), `WordPressPaginationError` (a
  collection's page 1 didn't report a usable `X-WP-TotalPages`), and
  `WordPressContractError` (a normalizer's required field was missing) —
  three distinct, greppable failure modes instead of one generic error.
- `index.ts` — the one import surface Astro code should use:
  `getPosts`, `getPostBySlug`, `getPages`, `getPageBySlug`, `getCategories`,
  `getMedia`, `getSeoData`, plus every domain type.

### Astro's responsibility

- Calls the content layer's public API (`src/lib/wordpress/index.ts`) from
  page frontmatter and `getStaticPaths`, never `fetch` directly.
- Renders normalized data into static HTML via `.astro` components. The one
  exception is `PostContent.astro`, the sole `set:html` boundary, which
  renders trusted WordPress editorial HTML verbatim.
- Owns routing (`src/lib/routes.ts`), layout (`BaseLayout.astro`), and the
  sitemap/robots.txt integration — none of which the content layer knows
  about.

## Data flow

1. `.env` supplies `WORDPRESS_URL` and `SITE_URL`.
2. `src/config/env.ts` validates both (absolute http(s), root-only path)
   and derives `wordpressApiUrl` (`<WORDPRESS_URL>/wp-json/wp/v2`). A
   missing or malformed value throws immediately, naming the offending
   variable, rather than deferring to an obscure downstream fetch failure.
3. A page (or `getStaticPaths`) calls a content-layer function, e.g.
   `getPosts({ page: 1, perPage: 12 })` or `getPageBySlug('about')`.
4. The content layer's aggregation module fetches every REST page for that
   collection through the client, normalizes every raw record exactly
   once, and caches the result for the rest of the build.
5. Astro renders the normalized data into static HTML/CSS with zero
   client-side JavaScript for editorial content.

## Configuration

Exactly two environment variables, validated at the same boundary
(`src/config/env.ts`) the app and `astro.config.ts` both read from:

\`\`\`env
WORDPRESS_URL=https://cms.example.com
SITE_URL=https://www.example.com
\`\`\`

No WordPress domain is hardcoded anywhere in the source tree. Swapping to a
different WordPress installation requires changing only these two values.

## Rendering strategy

Static site generation (SSG) only — every route in `src/pages/` is
pre-rendered at build time from the content layer's already-fetched,
already-normalized collections. New WordPress content requires a fresh
`astro build` and redeploy; there is no SSR, ISR, or webhook-triggered
rebuild in this milestone.

## Where JavaScript can and cannot be introduced

- **Cannot:** editorial rendering (posts, pages, listings, pagination,
  SEO tags) — these must stay static HTML produced at build time. Don't
  add a client-side fetch, a global store, or hydration for content that
  is already fully known at build time.
- **Can (later, when a feature genuinely needs interactivity):** an Astro
  island (`client:*` directive) scoped narrowly to that one interactive
  piece — e.g. a search box or a comment widget — never applied to the
  editorial content tree itself. No such island exists yet in this
  codebase; this section documents the boundary for when one is needed.
```

- [ ] **Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: add architecture overview"
```

### Task 6: Reposition the README and run final acceptance checks

**Files:**
- Modify: `README.md`

**Interfaces:**
- None (documentation only).

- [ ] **Step 1: Add a performance-first tagline and content-layer API section**

Immediately after the `# WordPress + Astro Headless Starter` heading in `README.md`, insert this line as its own paragraph (before the existing "A small, opinionated starter..." paragraph):

```markdown
**Performance-first WordPress Headless starter for Astro.** Static-first, TypeScript-strict, zero client-side JavaScript by default, with a decoupled content layer that keeps WordPress REST API details out of your pages and components.
```

Add a new section, placed after the existing "How it works" section and before "Quick start (existing WordPress installation)":

```markdown
## The content layer

Every WordPress REST call lives in `src/lib/wordpress/` and is reached
through one import: `src/lib/wordpress/index.ts`. Pages never call `fetch`
against WordPress directly.

\`\`\`ts
import { getPosts, getPostBySlug, getPages, getPageBySlug, getCategories, getMedia, getSeoData } from '../lib/wordpress';

const { posts, pagination } = await getPosts({ page: 1, perPage: 12 });
const post = await getPostBySlug('hello-world');
const categories = await getCategories();
\`\`\`

Raw WordPress REST fields (`title.rendered`, `_embedded`, taxonomy IDs, ...)
never reach a component — the content layer normalizes everything into
plain `Post` / `Page` / `Category` / `Media` types first. See
[`docs/architecture.md`](docs/architecture.md) for the full layer
breakdown, data flow, and where client-side JavaScript is (and isn't)
allowed.
```

- [ ] **Step 2: Run the full verification suite**

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build:ci
```

Expected: all pass. Additionally inspect `dist/` after `npm run build` (with real or fixture env values) to confirm no editorial page emitted a `<script>` tag other than the pre-existing JSON-LD block on post pages.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: reposition README around the content layer"
```

Expected: working tree clean, all checks green.
