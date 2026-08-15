# Architecture

This project renders a static Astro frontend from a headless WordPress
installation. WordPress is the editorial system of record; Astro reads from
it only at build time and produces plain static HTML — there is no runtime
dependency on WordPress once a build finishes.

## Layers

```text
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
```

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

```env
WORDPRESS_URL=https://cms.example.com
SITE_URL=https://www.example.com
```

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
