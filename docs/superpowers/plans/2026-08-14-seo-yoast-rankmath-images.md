# Milestone 3: SEO, Yoast/RankMath & Image Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement advanced SEO cascade extraction (Yoast SEO > Rank Math > Native WordPress > Site Defaults), structured Schema.org JSON-LD graph support, and modern build-time image optimization with `astro:assets` (`<Image />`) and dynamic `remotePatterns`.

**Architecture:** Extend `src/lib/wordpress/types.ts` with Yoast and Rank Math REST shapes; evolve `src/lib/wordpress/seo.ts` and `src/lib/seo/metadata.ts` into a cascade normalizer that extracts metadata and JSON-LD graphs with pure fallback functions; configure `astro.config.ts` with `image.remotePatterns` derived from `WORDPRESS_URL`; and update UI templates (`PostCard.astro`, `blog/[slug].astro`) to use `astro:assets` `<Image />` without any runtime client-side JavaScript.

**Tech Stack:** Astro 5, TypeScript strict, `astro:assets` (Sharp/Squoosh built-in), Vitest.

## Global Constraints

- Do not break backward compatibility of `buildMetadata` or existing `getSeoData` interfaces.
- Zero client-side JavaScript for editorial content and SEO tags.
- Decode all HTML entities in SEO titles, descriptions, and OpenGraph values.
- Gracefully handle corrupt or partial plugin metadata (fallback to native WP values without throwing).
- Run `npm test && npm run typecheck && npm run lint` after every task, and `npm run build:ci` at Task 4 and Task 5.

---

## Target File Structure

```text
src/
  config/
    env.ts                  (existing environment validation)
    site.ts                 (existing site constants)
  lib/
    seo/
      metadata.ts           + cascade types, JSON-LD Schema graph builder, BreadcrumbList, WebSite schema
    wordpress/
      types.ts              + WordPressRawYoastHeadJson, WordPressRawRankMath
      seo.ts                + extractCascadeMetadata, extractSchemaGraph, getSeoData
      index.ts              + exports for new SEO and Schema functions
  components/
    PostCard.astro          + astro:assets <Image /> with responsive widths/sizes
  pages/
    blog/[slug].astro       + featured image with <Image /> (loading="eager", fetchpriority="high")
astro.config.ts             + image.remotePatterns configured dynamically from env.wordpressUrl
tests/
  fixtures/wordpress.ts     + postWithYoastSeoFixture, postWithRankMathFixture, postWithPartialSeoFixture
  lib/seo/metadata.test.ts  + tests for schema builders, breadcrumbs, and fallbacks
  lib/wordpress/seo.test.ts + tests for Yoast and Rank Math cascade extraction
docs/
  architecture.md           + SEO cascade and image pipeline documentation
  superpowers/specs/2026-08-14-seo-yoast-rankmath-images-design.md (committed spec)
```

---

### Task 1: Add Raw REST Types and Fixtures for Yoast and Rank Math

**Files:**
- Modify: `src/lib/wordpress/types.ts`
- Modify: `tests/fixtures/wordpress.ts`

**Interfaces:**
- Produces: `WordPressRawYoastHeadJson`, `WordPressRawRankMath`, `postWithYoastSeoFixture`, `postWithRankMathFixture`, `postWithPartialSeoFixture`.

- [ ] **Step 1: Add raw Yoast and Rank Math interfaces to `src/lib/wordpress/types.ts`**

Add to `src/lib/wordpress/types.ts`:

```ts
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
```

Update `WordPressRawPost` and `WordPressRawPage` in `src/lib/wordpress/types.ts` to include optional `yoast_head_json?: WordPressRawYoastHeadJson` and `rank_math_seo?: WordPressRawRankMath`.

- [ ] **Step 2: Add test fixtures to `tests/fixtures/wordpress.ts`**

Add to `tests/fixtures/wordpress.ts`:

```ts
export const postWithYoastSeoFixture: WordPressRawPost = {
  ...wordpressPostFixture,
  id: 401,
  slug: 'yoast-post',
  yoast_head_json: {
    title: 'Custom Yoast Title &amp; Insights',
    description: 'Custom Yoast Meta Description with &quot;quotes&quot;.',
    canonical: 'https://www.example.com/blog/yoast-post/',
    robots: {
      index: 'index',
      follow: 'follow',
    },
    og_title: 'Yoast OG Title',
    og_description: 'Yoast OG Description',
    og_image: [{ url: 'https://cms.example.com/uploads/yoast-og.jpg' }],
    twitter_card: 'summary_large_image',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'Article', headline: 'Yoast Article' }],
    },
  },
};

export const postWithRankMathFixture: WordPressRawPost = {
  ...wordpressPostFixture,
  id: 402,
  slug: 'rank-math-post',
  rank_math_seo: {
    title: 'Rank Math Custom Title',
    description: 'Rank Math Meta Description.',
    canonical: 'https://www.example.com/blog/rank-math-post/',
    robots: ['index', 'follow'],
    og_title: 'Rank Math OG Title',
    og_description: 'Rank Math OG Description',
    og_image: 'https://cms.example.com/uploads/rankmath-og.jpg',
    twitter_card: 'summary_large_image',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'NewsArticle', headline: 'Rank Math News' }],
    },
  },
};

export const postWithPartialSeoFixture: WordPressRawPost = {
  ...wordpressPostFixture,
  id: 403,
  slug: 'partial-seo',
  yoast_head_json: {
    title: '',
    description: '',
  },
};
```

- [ ] **Step 3: Run baseline verification and commit**

```bash
npm test
npm run typecheck
git add src/lib/wordpress/types.ts tests/fixtures/wordpress.ts
git commit -m "feat(seo): add Yoast and Rank Math REST types and test fixtures"
```

---

### Task 2: Cascade SEO Metadata Normalization & HTML Entity Decoding

**Files:**
- Modify: `src/lib/seo/metadata.ts`
- Modify: `src/lib/wordpress/seo.ts`
- Modify: `src/lib/wordpress/normalizers.ts`
- Modify: `tests/lib/seo/metadata.test.ts`
- Modify: `tests/lib/wordpress/seo.test.ts`

**Interfaces:**
- Consumes: `WordPressRawYoastHeadJson`, `WordPressRawRankMath`, `WordPressRawPost`, `WordPressRawPage`.
- Produces: `extractCascadeMetadata(raw, fallbackPath)`, `decodeHtmlEntities(string)`, extended `getSeoData(input | raw)`.

- [ ] **Step 1: Write failing tests for cascade metadata extraction**

Add tests to `tests/lib/wordpress/seo.test.ts`:

```ts
describe('getSeoData with SEO plugins', () => {
  it('extracts Yoast SEO metadata when yoast_head_json is present', () => {
    const seo = getSeoData({ raw: postWithYoastSeoFixture, path: '/blog/yoast-post/' });
    expect(seo.title).toBe('Custom Yoast Title & Insights');
    expect(seo.description).toBe('Custom Yoast Meta Description with "quotes".');
    expect(seo.canonical).toBe('https://www.example.com/blog/yoast-post/');
    expect(seo.robots).toBe('index,follow');
    expect(seo.openGraph.image).toBe('https://cms.example.com/uploads/yoast-og.jpg');
    expect(seo.twitter.card).toBe('summary_large_image');
  });

  it('extracts Rank Math metadata when rank_math_seo is present', () => {
    const seo = getSeoData({ raw: postWithRankMathFixture, path: '/blog/rank-math-post/' });
    expect(seo.title).toBe('Rank Math Custom Title');
    expect(seo.description).toBe('Rank Math Meta Description.');
    expect(seo.canonical).toBe('https://www.example.com/blog/rank-math-post/');
    expect(seo.robots).toBe('index,follow');
    expect(seo.openGraph.image).toBe('https://cms.example.com/uploads/rankmath-og.jpg');
  });

  it('falls back to native WordPress fields when plugin fields are empty or partial', () => {
    const seo = getSeoData({ raw: postWithPartialSeoFixture, path: '/blog/partial-seo/' });
    expect(seo.title).toBe('Hello world');
    expect(seo.description).toBe('A short excerpt.');
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -- tests/lib/wordpress/seo.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement cascade metadata extractor in `src/lib/wordpress/seo.ts` and `src/lib/seo/metadata.ts`**

Export `decodeHtmlEntities` and `collapseWhitespace` or reuse them from `normalizers.ts`.
In `src/lib/wordpress/seo.ts`, accept an object that can be `BuildMetadataInput` OR `{ raw?: WordPressRawPost | WordPressRawPage; path: string }`.
Implement cascade logic:
1. Yoast `title`, `description`, `canonical`, `robots` formatted, `og_image[0]?.url`, `twitter_card`.
2. Rank Math `title`, `description`, `canonical`, `robots.join(',')`, `og_image`, `twitter_card`.
3. Native WordPress `title.rendered`, `excerpt.rendered`, `_embedded['wp:featuredmedia'][0].source_url`.
4. Site default `SITE.name`, `SITE.description`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/wordpress/seo.test.ts tests/lib/seo/metadata.test.ts
npm run typecheck
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo/metadata.ts src/lib/wordpress/seo.ts src/lib/wordpress/normalizers.ts tests/lib/seo/metadata.test.ts tests/lib/wordpress/seo.test.ts
git commit -m "feat(seo): implement cascade metadata extraction for Yoast and Rank Math"
```

---

### Task 3: Schema.org Structured Data (JSON-LD) Ingestion & Fallbacks

**Files:**
- Modify: `src/lib/seo/metadata.ts`
- Modify: `src/lib/wordpress/seo.ts`
- Modify: `src/lib/wordpress/index.ts`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `tests/lib/seo/metadata.test.ts`
- Modify: `tests/lib/wordpress/seo.test.ts`

**Interfaces:**
- Produces: `getJsonLdGraph(raw | post, canonicalUrl)`, `buildBreadcrumbsJsonLd(items)`, `buildWebsiteJsonLd()`.

- [ ] **Step 1: Write failing tests for JSON-LD graph extraction and schema generators**

Add to `tests/lib/wordpress/seo.test.ts` and `tests/lib/seo/metadata.test.ts`:
- Test Yoast `@graph` ingestion when `raw.yoast_head_json.schema` exists.
- Test Rank Math schema graph ingestion when `raw.rank_math_seo.schema` exists.
- Test fallback `buildPostJsonLd` returning valid Schema.org `BlogPosting`.
- Test `buildBreadcrumbsJsonLd([{ name: 'Home', url: '/' }, { name: 'Blog', url: '/blog/' }])` returning `BreadcrumbList`.

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- tests/lib/wordpress/seo.test.ts tests/lib/seo/metadata.test.ts
```

- [ ] **Step 3: Implement `getJsonLdGraph`, `buildBreadcrumbsJsonLd`, and `buildWebsiteJsonLd`**

In `src/lib/seo/metadata.ts` & `src/lib/wordpress/seo.ts`:
- Implement `getJsonLdGraph`: if plugin schema exists, return it; otherwise fallback to `buildPostJsonLd(post, canonicalUrl)`.
- Implement `buildBreadcrumbsJsonLd(items: Array<{ name: string; url: string }>): Record<string, unknown>`.
- Implement `buildWebsiteJsonLd(): Record<string, unknown>`.
- Export them from `src/lib/wordpress/index.ts`.

- [ ] **Step 4: Run tests to verify pass**

```bash
npm test -- tests/lib/wordpress/seo.test.ts tests/lib/seo/metadata.test.ts
npm run typecheck
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo/metadata.ts src/lib/wordpress/seo.ts src/lib/wordpress/index.ts tests/lib/seo/metadata.test.ts tests/lib/wordpress/seo.test.ts
git commit -m "feat(seo): add JSON-LD Schema graph ingestion and breadcrumb generators"
```

---

### Task 4: Dynamic Remote Patterns & `astro:assets` `<Image />` Optimization

**Files:**
- Modify: `astro.config.ts`
- Modify: `src/components/PostCard.astro`
- Modify: `src/pages/blog/[slug].astro`
- Modify: `src/pages/[slug].astro`

**Interfaces:**
- Consumes: `FeaturedImage` (`url`, `alt`, `width`, `height`), `astro:assets` `<Image />`.
- Configures: `image.remotePatterns` in `astro.config.ts`.

- [ ] **Step 1: Update `astro.config.ts` with dynamic `remotePatterns`**

Configure `image.remotePatterns` using `WORDPRESS_URL` / `env.wordpressUrl` or fallback placeholder host.

- [ ] **Step 2: Update `src/components/PostCard.astro` to use `<Image />`**

```astro
---
import { Image } from 'astro:assets';
// ...
---
{post.featuredImage && (
  <a href={href} tabindex="-1" aria-hidden="true">
    {post.featuredImage.width && post.featuredImage.height ? (
      <Image
        class="card__image"
        src={post.featuredImage.url}
        alt={post.featuredImage.alt}
        width={post.featuredImage.width}
        height={post.featuredImage.height}
        widths={[360, 540, 720, 1080]}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        loading="lazy"
        decoding="async"
      />
    ) : (
      <img
        class="card__image"
        src={post.featuredImage.url}
        alt={post.featuredImage.alt}
        loading="lazy"
        decoding="async"
      />
    )}
  </a>
)}
```

- [ ] **Step 3: Update `src/pages/blog/[slug].astro` to render featured image with `<Image />`**

Render the featured image when present with `loading="eager"` and `fetchpriority="high"`.

- [ ] **Step 4: Verify build and image optimization**

```bash
npm test
npm run typecheck
npm run lint
npm run build:ci
```

- [ ] **Step 5: Commit**

```bash
git add astro.config.ts src/components/PostCard.astro src/pages/blog/[slug].astro src/pages/[slug].astro
git commit -m "feat(images): enable astro:assets image optimization with remotePatterns"
```

---

### Task 5: Update Documentation & Final Acceptance Checks

**Files:**
- Modify: `docs/architecture.md`
- Modify: `README.md`

- [ ] **Step 1: Update `docs/architecture.md` and `README.md`**

Document:
- The 4-tier SEO cascade (Yoast > Rank Math > Native WP > Defaults).
- Schema.org JSON-LD graph generation and fallback.
- `astro:assets` image processing with automatic WebP/AVIF generation at build time.

- [ ] **Step 2: Run full verification suite**

```bash
npm test
npm run typecheck
npm run lint
npm run build:ci
```

- [ ] **Step 3: Commit and Push**

```bash
git add docs/architecture.md README.md
git commit -m "docs: document Milestone 3 SEO cascade and image pipeline"
git push origin main
```
