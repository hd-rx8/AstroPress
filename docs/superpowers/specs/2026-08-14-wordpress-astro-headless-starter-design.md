# WordPress Astro Headless Starter — Design Specification

## Purpose

`wordpress-astro-headless-starter` is a small open-source starter that demonstrates WordPress as a decoupled editorial CMS and Astro as its public frontend. It is intended for WordPress and frontend developers who want a clear, locally runnable example of a modern headless WordPress architecture.

The project is deliberately not a CMS framework, an abstraction over multiple CMSs, or an enterprise platform. Its success criterion is that a developer can clone it, install dependencies, configure a WordPress URL and a public site URL, run Astro, and see real WordPress content rendered as a static site.

## Scope and rendering model

Version 1 uses static site generation (SSG). Astro fetches WordPress content at build time and emits static HTML.

```text
WordPress CMS
  ↓ REST API
Astro build
  ↓
Static HTML
```

SSG is the default because it is fast, inexpensive to host, easy to understand, and avoids runtime infrastructure. Publishing new WordPress content requires an Astro rebuild and deploy. Webhook-triggered rebuilds, SSR, and hybrid rendering are roadmap items.

The WordPress integration must not be coupled to SSG. It exposes data functions and normalized models; Astro pages call those functions during static generation. A later SSR or hybrid mode can call the same functions at request time without rewriting the REST client, normalizers, or UI components.

## Configuration

The V1 environment contract has exactly two required variables:

```env
WORDPRESS_URL=https://cms.example.com
SITE_URL=https://www.example.com
```

`WORDPRESS_URL` is the base URL of the WordPress installation. A configuration module validates that it is an absolute HTTP or HTTPS URL, removes a trailing slash, rejects a value that already contains `/wp-json`, and derives `/wp-json/wp/v2` internally.

`SITE_URL` is the public Astro URL. It has the same absolute-URL and trailing-slash validation. It supplies canonical URLs, Open Graph/Twitter URLs, JSON-LD URLs, sitemap generation, and `robots.txt`.

Missing or invalid variables fail early with actionable errors during development and build. No component reads `import.meta.env` directly. No alternate REST URL, SEO, social-handle, default-image, or site-name variables are included in V1. Stable display text such as the starter name and default description lives in a small project configuration module.

## Architecture

```text
.env
  ↓
config validation
  ↓
WordPress REST client
  ↓
posts/pages query modules
  ↓
normalizers
  ↓
Astro routes, layouts, and SEO
  ↓
static HTML
```

Conceptual source layout:

```text
src/
  config/
    env
    site
  lib/
    wordpress/
      client
      posts
      pages
      normalizers
      types
    seo/
      metadata
  layouts/
    BaseLayout
  components/
    PostCard
    PostContent
    Pagination
  pages/
    index
    blog/index
    blog/page/[number]
    blog/[slug]
    [slug]
    robots.txt
```

The REST client is the only unit that knows about request URLs, `fetch`, timeouts, HTTP responses, JSON parsing, and contextual errors. `posts` and `pages` are thin endpoint-specific modules, not generic repository abstractions. Normalizers are pure functions that turn the minimal required WordPress REST shapes into frontend models. Astro pages and visual components receive only normalized data.

V1 exposes only `Post` and `Page` frontend models. A `Post` contains its identity, slug, title, excerpt, HTML content, date, optional featured image, and optional author. The internal REST types cover only fields needed for current normalization. There are no public category, author, or media models and no generic CMS-provider interface.

## WordPress REST API and normalization

Posts use the native REST API with `_embed`:

```text
/wp-json/wp/v2/posts?_embed=1&per_page=100&page=1
```

The query layer uses `_embed` on post queries to avoid extra media or user requests. It sets `per_page=100` explicitly rather than relying on the WordPress default. The first response's `X-WP-TotalPages` header is authoritative: the module fetches pages 2 through N with the same query shape, aggregates every raw post, and normalizes the complete collection. This collection supplies blog pagination, individual post static paths, and recent posts; individual routes do not fetch posts by slug during generation. Normalizers extract only the featured image and author data needed by the frontend. The raw `_embedded` shape never reaches layouts or components. A dedicated media client and per-item follow-up requests are out of scope.

Pages use only the native pages endpoint needed to discover and retrieve pages by slug. Category and author endpoints are not used in V1.

## Routes and data generation

Public routes are:

```text
/                    short starter introduction and recent posts
/blog/                first page of posts
/blog/page/[number]/  subsequent post pages
/blog/[slug]/         individual post
/[slug]/              individual WordPress page
/robots.txt
```

Pagination uses WordPress `X-WP-Total` and `X-WP-TotalPages` headers. `/blog/` is the single canonical route for page one; pagination starts at page two. Pagination is generated at build time and has no client-side JavaScript dependency.

The homepage receives the newest six posts from the complete collection (`HOME_POST_LIMIT = 6`) and is not a semantic reuse of the first paginated blog page. Post static paths reuse the complete fetched collection rather than fetching every post by slug again. Pages are fetched separately to generate their routes. Before generating paths, the build detects collisions between WordPress page slugs and framework-owned root routes. `blog` is reserved for the blog index and post routes; `robots.txt` is reserved for the generated SEO endpoint. A collision fails the build and names the conflicting slug rather than producing an ambiguous route.

The homepage stays intentionally small: a brief explanation of the starter and recent posts. There are no category, author, or marketing sections.

## Editorial HTML and page builders

WordPress `content.rendered` is rendered with Astro `set:html`. The configured WordPress installation is treated as a trusted editorial source. The starter does not sanitize or transform this HTML in V1, but preparing editorial content remains an isolated responsibility so a later sanitization strategy can be introduced without changing route templates.

The documentation must state that untrusted content must not be rendered this way. Gutenberg HTML works naturally to the degree that it is returned by WordPress. Elementor and other page-builder markup is preserved, but visual fidelity is not promised: their frontend CSS, JavaScript, and assets are not automatically carried into the Astro frontend. There is no custom Gutenberg renderer, Elementor support layer, or page-builder asset pipeline.

The content component provides restrained editorial styles for common semantic HTML. Its purpose is readable default content, not emulation of WordPress themes or page builders.

## SEO

A central metadata module avoids duplicated SEO logic. For posts it derives:

- document title from the WordPress title;
- description from the normalized, HTML-free excerpt, with the site description as the fallback for an empty excerpt;
- canonical URL from `SITE_URL` and the route;
- Open Graph and Twitter fields from title, description, canonical URL, and featured image when available;
- `BlogPosting` JSON-LD from known post data only.

Absent optional data is omitted. For example, missing featured image omits Open Graph image and JSON-LD image fields; missing author omits the JSON-LD author. The design does not fabricate Schema.org values merely to expand the object.

Pages use the shared metadata base but no mandatory schema type in V1. `WebPage` is deferred until there is a concrete use case. Astro's sitemap integration generates the sitemap using `SITE_URL`; implementation selects the integration configuration and consumes its generated sitemap URL. `robots.txt` permits indexing and references that generated URL, without the design assuming a particular sitemap filename. Every generated indexable page receives its own canonical URL.

## Error policy

The starter distinguishes integration failures from optional editorial omissions.

| Condition | V1 behavior |
| --- | --- |
| Missing or invalid required URL | Fail development/build early |
| WordPress unreachable or timeout | Fail build |
| Unexpected REST HTTP status | Fail build |
| Invalid JSON or incompatible required payload | Fail build |
| Failure fetching data needed to generate static paths | Fail build |
| Missing featured image, author, excerpt, or embedded optional field | Generate page and omit/fallback |
| URL outside generated static paths | Static 404 |

Errors include the failed operation, request URL, and HTTP status or underlying reason when available. Example: `Failed to fetch WordPress posts`, the request URL, and `500 Internal Server Error`. The build must not silently publish incomplete content when the CMS integration or its essential contract is broken.

## Local WordPress

The primary path targets any existing WordPress installation:

```text
npm install
copy .env.example .env
npm run dev
```

An optional, isolated Docker Compose setup provides WordPress and MySQL for local demonstration:

```text
docker compose up -d
npm run dev
```

Docker is not required by the Astro runtime and must not leak into the core architecture. V1 includes no WordPress seed, import, custom plugin, or complex content setup. Documentation asks users to create a small number of posts and pages manually for local demonstration.

## Testing and CI

The test suite remains focused on the integration boundary:

- unit tests for environment validation, URL construction, normalizers, optional embedded data, pagination helpers, metadata, and JSON-LD;
- small realistic REST fixtures for posts, pages, and invalid responses;
- client integration tests with mocked `fetch`, covering success, 404, unexpected status, and malformed payload;
- a static-build smoke test.

No E2E or browser suite is part of V1. CI runs type checking, linting, tests, and the smoke build on `push` and `pull_request`. The smoke build must not rely on a public WordPress service: it starts a fixture REST server only for the CI/test process and provides local values for the two required URLs. This is test infrastructure only, not a runtime mock mode.

## Documentation

The README documents:

1. the headless WordPress concept and purpose of the starter;
2. the WordPress REST API → Astro SSG architecture, including a simple diagram;
3. quick start with an existing WordPress installation;
4. optional local Docker setup;
5. the two-variable configuration contract;
6. route structure, REST `_embed`, and normalized data flow;
7. SSG behavior and the rebuild requirement;
8. SEO behavior;
9. trusted HTML and page-builder limitations;
10. tests, CI, static deployment, and V1 limitations.

## Explicitly out of scope for V1

- SSR, hybrid rendering, and rebuild webhooks;
- public category and author routes;
- media client, rich media handling, or additional REST calls;
- HTML sanitization, custom Gutenberg rendering, Elementor support, or page-builder asset transport;
- GraphQL, WPGraphQL, authentication, editorial preview, comments, search, multilingual content, WooCommerce, analytics, dashboards, and a custom WordPress plugin;
- seeds, imports, complex Docker orchestration, databases beyond optional WordPress/MySQL, and browser E2E tests;
- a generic CMS abstraction, multi-CMS provider system, framework, or monorepo.

## Future roadmap candidates

Future additions need a concrete user need and a separate design cycle: deploy webhooks, SSR/hybrid rendering, a sanitization strategy, category/author archives, richer media, previews, and page-builder compatibility work.



