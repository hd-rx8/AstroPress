# Architecture

This project renders a static Astro frontend from a headless WordPress
installation. WordPress is the editorial system of record; Astro reads from
it only at build time and produces plain static HTML — there is no runtime
dependency on WordPress once a build finishes.

## Layers

```text
WordPress (CMS)
    |  REST API (/wp-json/wp/v2/* and /wp-json/astropress/v1/*)
    v
WordPress Client            src/lib/wordpress/client.ts
    |  raw JSON + X-WP-Total / X-WP-TotalPages
    v
Content Layer                src/lib/wordpress/{posts,pages,categories,media,preview,seo,normalizers,errors,pagination}.ts
    |  typed, normalized Post / Page / Category / Media + Metadata
    v
Astro routes & components     src/pages/**, src/components/**, src/layouts/**
    |  build (SSG) / on-demand (Draft Preview)
    v
Static HTML / On-Demand Preview   dist/ / /preview
```

### WordPress's responsibility

- Owns all editorial content: posts, pages, categories, media, authors.
- Exposes it over the standard WordPress REST API and the `astropress-connector` plugin endpoints.
- Is never queried at request time by a deployed static build — only during
  `astro build` / `astro dev` and on-demand draft preview requests.

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
- `preview.ts` — `getDraftPreview(id, type, secret)` fetches an unpublished
  draft post/page from the secure AstroPress Connector preview endpoint.
- `seo.ts` — `getSeoData(...)`, the public entry point for building page
  metadata (title, description, canonical, robots, Open Graph, Twitter) with
  a 4-tier cascade (Yoast SEO > Rank Math > Native WordPress fields > Site Defaults).
  Also exposes `getJsonLdGraph(...)` for Schema.org JSON-LD ingestion (Yoast/RankMath
  graph with fallbacks to `buildPostJsonLd`, `buildBreadcrumbsJsonLd`, `buildWebsiteJsonLd`).
- `errors.ts` — `WordPressRequestError` (transport failures: network,
  timeout, non-2xx, malformed JSON), `WordPressPaginationError` (a
  collection's page 1 didn't report a usable `X-WP-TotalPages`), and
  `WordPressContractError` (a normalizer's required field was missing) —
  three distinct, greppable failure modes instead of one generic error.
- `index.ts` — the one import surface Astro code should use:
  `getPosts`, `getPostBySlug`, `getPages`, `getPageBySlug`, `getCategories`,
  `getMedia`, `getDraftPreview`, `getSeoData`, `getJsonLdGraph`, `buildBreadcrumbsJsonLd`, `buildWebsiteJsonLd`, plus every domain type.


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

1. `.env` supplies `WORDPRESS_URL`, `SITE_URL`, and optional `ASTROPRESS_PREVIEW_SECRET`.
2. `src/config/env.ts` validates configuration (absolute http(s), root-only path)
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

Validated at the single boundary (`src/config/env.ts`):

```env
WORDPRESS_URL=https://cms.example.com
SITE_URL=https://www.example.com
ASTROPRESS_PREVIEW_SECRET=your-shared-secret # Optional in SSG, required for /preview
```

No WordPress domain is hardcoded anywhere in the source tree. Swapping to a
different WordPress installation requires changing only these values.

## Rendering strategy

Static site generation (SSG) for all public pages (`src/pages/`), with on-demand
rendering (`export const prerender = false`) specifically for the draft preview
route (`src/pages/preview.astro`).

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

## SEO Cascade & Image Pipeline (Milestone 3)

### SEO Ingestion Hierarchy
Metadata extraction in `src/lib/wordpress/seo.ts` executes a 4-tier cascade:
1. **Yoast SEO (`yoast_head_json`)**: reads custom titles, descriptions, canonicals, robots, Open Graph, Twitter cards, and JSON-LD schema graphs.
2. **Rank Math SEO (`rank_math_seo`)**: reads titles, descriptions, canonicals, robots arrays, Open Graph, and schema graphs.
3. **Native WordPress REST Fields**: decodes `title.rendered`, strips HTML from `excerpt.rendered`, and resolves featured media attachments.
4. **Site Defaults (`SITE.name`, `SITE.description`)**: ensures all pages have complete, valid metadata.

All HTML entities (named, decimal, hex) are decoded into clean strings.

### Image Optimization Pipeline
- `astro.config.ts` dynamically configures `image.remotePatterns` derived from `WORDPRESS_URL`.
- Listing cards (`PostCard.astro`) and post headers (`blog/[slug].astro`) render remote images via Astro's `<Image />` component from `astro:assets`.
- Generates responsive WebP/AVIF variants at build time with modern `srcset` / `sizes` attributes and zero client-side JavaScript.

## WordPress Connector Plugin (Milestone 4)

Located in `wordpress/plugins/astropress-connector/`:
- **Template Redirection:** Automatically routes public hits on the WordPress domain to the Astro frontend (`/`, `/blog/:slug/`, `/:slug/`), while protecting `/wp-admin`, `/wp-login.php`, `/wp-json/*`, and `/wp-cron.php`.
- **Admin Link Rewriting:** Rewrites "View Post", "View Page", and Admin Bar "Visit Site" links to point directly to the Astro frontend URL.
- **Deploy Webhook Dispatcher:** Automatically dispatches non-blocking POST requests to Vercel/Netlify/GitHub Actions on post/page lifecycle transitions with a 30s debounce. Adds a manual "🚀 Rebuild Site" button in the admin bar.
- **Health REST Endpoint:** Exposes `GET /wp-json/astropress/v1/health` providing automated diagnostics on permalinks, active SEO plugins, frontend URL status, and core REST endpoints.

## Draft Preview & Publishing Workflow (Milestone 5)

- **Secure Preview Handshake:** Gutenberg/Classic editor preview buttons generate tokenized links to `/preview?id={id}&type={type}&secret={secret}`.
- **Plugin REST Endpoint:** `GET /wp-json/astropress/v1/preview` safely pulls autosaves/revisions when given a valid `ASTROPRESS_PREVIEW_SECRET` (`hash_equals`).
- **Astro Preview Route:** `src/pages/preview.astro` renders drafts live with `noindex,nofollow` robots protection, responsive header, and floating `<PreviewBanner />` toolbar linking back to `wp-admin`.
- **Enriched Publishing Webhooks:** Dispatches structured JSON (`post_id`, `slug`, `status`, `previous_status`) with a local 5-entry deploy history log in WP admin.
