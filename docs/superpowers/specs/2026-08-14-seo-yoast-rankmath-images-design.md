# Milestone 3 Design Spec: Advanced SEO, Yoast/RankMath Integration & Image Pipeline

## Goal

Extend the decoupled WordPress Content Layer with advanced SEO capabilities (automatic cascade extraction: Yoast SEO > Rank Math > Native WordPress > Site Defaults), structured data graphs (Schema.org JSON-LD), and a production-grade image optimization pipeline powered by `astro:assets` (`<Image />`) with dynamic remote domain authorization.

---

## 1. Architecture & Cascade SEO Extraction

### 1.1 Ingestion Hierarchy
When building page metadata, the Content Layer applies a 4-tier cascade:

```text
┌─────────────────────────────────────────────────────────┐
│ 1. Yoast SEO (`raw.yoast_head_json`)                   │
│    - Title, Description, Canonical, Robots, OG, Twitter │
└───────────────────────────┬─────────────────────────────┘
                            │ (if absent or invalid)
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Rank Math (`raw.rank_math_seo` / `raw.head`)         │
│    - Title, Description, Canonical, Robots, OG, Twitter │
└───────────────────────────┬─────────────────────────────┘
                            │ (if absent or invalid)
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Native WordPress REST Fields                         │
│    - `raw.title.rendered`, `raw.excerpt.rendered`,      │
│    - `_embedded['wp:featuredmedia']`, `raw.date`        │
└───────────────────────────┬─────────────────────────────┘
                            │ (if absent)
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Site Defaults (`src/config/site.ts`)                │
│    - `SITE.name`, `SITE.description`, site canonical   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Data Normalization & Types
- Add `WordPressRawYoastHeadJson` and `WordPressRawRankMath` interfaces to `src/lib/wordpress/types.ts`.
- Expand `getSeoData` in `src/lib/wordpress/seo.ts` to accept either an explicit `BuildMetadataInput` or a normalized `Post` / `Page` with optional raw SEO payload.
- Automatically decode all HTML entities (e.g. `&amp;`, `&#8211;`, `&#8217;`) in SEO titles, descriptions, and OpenGraph labels.
- Enforce strict robots directives (`index,follow`, `noindex,follow`, `noarchive`, etc.) matching the CMS configuration.

---

## 2. Image Optimization Pipeline (`astro:assets`)

### 2.1 Dynamic Remote Patterns Configuration
In `astro.config.ts`, automatically derive `image.remotePatterns` from `env.wordpressUrl` (and `WORDPRESS_URL` in `.env`):

```ts
// astro.config.ts
import { defineConfig } from 'astro/config';
import { env } from './src/config/env';

const wpUrl = new URL(env.wordpressUrl);

export default defineConfig({
  // ...
  image: {
    remotePatterns: [
      {
        protocol: wpUrl.protocol.replace(':', '') as 'http' | 'https',
        hostname: wpUrl.hostname,
        port: wpUrl.port || undefined,
      },
    ],
  },
});
```

### 2.2 Component Updates
- **`src/components/PostCard.astro`**:
  - Replace raw `<img>` with Astro's `<Image />` component from `astro:assets`.
  - Pass original dimensions (`width={post.featuredImage.width}` and `height={post.featuredImage.height}`).
  - Provide responsive `widths={[360, 540, 720, 1080]}` and layout sizes `sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"`.
  - Output optimized modern WebP/AVIF formats at build time with zero runtime JavaScript.
- **Single Post & Page Templates (`src/pages/blog/[slug].astro`, `src/pages/[slug].astro`)**:
  - Featured images on detail pages use `<Image />` with `loading="eager"` and `fetchpriority="high"` for superior LCP (Largest Contentful Paint).

---

## 3. Schema.org / Structured Data (JSON-LD)

### 3.1 Graph Ingestion & Fallback
- If Yoast `yoast_head_json.schema` exists: render the Yoast `@graph` JSON-LD payload verbatim.
- If Rank Math schema graph is present: render the Rank Math JSON-LD graph.
- Fallback Built-in Generators:
  - `buildPostJsonLd(post, canonicalUrl)`: Emits Schema.org `BlogPosting` with `headline`, `datePublished`, `dateModified`, `author`, `publisher`, `image`, and `mainEntityOfPage`.
  - `buildBreadcrumbsJsonLd(breadcrumbs)`: Emits Schema.org `BreadcrumbList`.
  - `buildWebsiteJsonLd()`: Emits Schema.org `WebSite` and `Organization`.

---

## 4. Error Handling & Resiliency

1. **Broken / Incomplete SEO Payloads**: If a plugin emits partial metadata (e.g. empty title or missing canonical), the parser gracefully falls back to native WordPress values without throwing an exception.
2. **Missing Image Dimensions**: If a WordPress media item lacks `width`/`height` in `media_details`, fallback to an unconstrained standard image render with default aspect ratios to prevent build failures.
3. **Strict Validation**: Invalid URLs or schema syntax errors are caught at build/test time.

---

## 5. Testing & Verification Strategy

- **Fixtures (`tests/fixtures/wordpress.ts`)**:
  - `postWithYoastSeoFixture`: Post containing realistic `yoast_head_json`.
  - `postWithRankMathFixture`: Post containing realistic `rank_math_seo`.
  - `postWithPartialSeoFixture`: Post with malformed/missing plugin fields.
- **Unit Tests**:
  - `tests/lib/wordpress/seo.test.ts`: Verify cascade precedence (Yoast > Rank Math > Native > Site Default).
  - `tests/lib/seo/metadata.test.ts`: Test HTML entity decoding, robots variations, and JSON-LD structured data generators.
- **Build Verification**:
  - `npm run typecheck && npm run lint && npm test && npm run build:ci`
  - Verify static output in `dist/` confirming WebP/AVIF generation and accurate `<meta>` / `<script type="application/ld+json">` tags.
