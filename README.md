# WordPress + Astro Headless Starter

**Performance-first WordPress Headless starter for Astro.** Static-first, TypeScript-strict, zero client-side JavaScript by default, with a decoupled content layer that keeps WordPress REST API details out of your pages and components.

A small, opinionated starter that pairs **WordPress** as a decoupled editorial CMS with **Astro** as its public, statically generated frontend. It targets developers who want a clear, locally runnable example of headless WordPress — not a CMS framework, not an abstraction over multiple CMSs, and not an enterprise platform.

Clone it, install dependencies, point it at a WordPress REST API and a public site URL, and build a static site from real WordPress content.

## How it works

WordPress stays the editorial system of record. Astro reads content from the WordPress REST API **at build time** and emits static HTML — there is no runtime dependency on WordPress once the site is built.

```text
┌─────────────┐
│  WordPress  │
│     CMS     │
└──────┬──────┘
       │ REST API
       ▼
┌─────────────┐
│    Astro    │
│  Frontend   │
└──────┬──────┘
       │ build
       ▼
   Static HTML
```

This is version 1: **static site generation (SSG) only.** There is no server-side rendering, no hybrid rendering, and no webhook-triggered rebuilds. Publishing new WordPress content requires re-running the Astro build and redeploying the output. See [SSG and the rebuild limitation](#ssg-and-the-rebuild-limitation) below.

## The content layer

Every WordPress REST call lives in `src/lib/wordpress/` and is reached
through one import: `src/lib/wordpress/index.ts`. Pages never call `fetch`
against WordPress directly.

```ts
import { getPosts, getPostBySlug, getPages, getPageBySlug, getCategories, getMedia, getSeoData } from '../lib/wordpress';

const { posts, pagination } = await getPosts({ page: 1, perPage: 12 });
const post = await getPostBySlug('hello-world');
const categories = await getCategories();
```

Raw WordPress REST fields (`title.rendered`, `_embedded`, taxonomy IDs, ...)
never reach a component — the content layer normalizes everything into
plain `Post` / `Page` / `Category` / `Media` types first. See
[`docs/architecture.md`](docs/architecture.md) for the full layer
breakdown, data flow, and where client-side JavaScript is (and isn't)
allowed.

## Quick start (existing WordPress installation)


If you already have a WordPress site — self-hosted or managed — with the REST API reachable, this is all you need:

```bash
npm install
cp .env.example .env
```

Edit `.env` and set the two required variables:

```env
WORDPRESS_URL=https://cms.example.com
SITE_URL=https://www.example.com
```

- `WORDPRESS_URL` — the base URL of your WordPress installation (no `/wp-json` suffix, no trailing slash). The starter derives `/wp-json/wp/v2` from it internally.
- `SITE_URL` — the public URL this Astro site will be served from. It drives canonical URLs, Open Graph/Twitter tags, JSON-LD, the sitemap, and `robots.txt`. It must be a domain or subdomain **root** (no path): V1 does not support serving the site from a subpath such as `https://example.com/blog`, and rejects such a value with an explicit error rather than silently generating URLs that drop the subpath.

Then run:

```bash
npm run dev
```

Both variables are validated on startup and on build. A missing or malformed URL fails immediately with an actionable error rather than producing a broken site.

These two variables are the entire V1 configuration contract — there is no alternate REST base URL, SEO override, social-handle, default-image, or site-name environment variable.

## Optional: local WordPress with Docker

If you don't have a WordPress installation handy, an isolated `docker-compose.yml` is included purely for local demonstration. It runs **WordPress and MySQL only** — there is no Astro container, no custom WordPress image, no bundled plugin, and no seed or content-import step. Docker is never required by the Astro runtime; the frontend and its data layer have no knowledge of Docker at all.

```bash
docker compose up -d
```

This starts:

- `wordpress` on `127.0.0.1:8080`
- `mysql`, reachable only from the `wordpress` container over the Compose network (root/user/password all `wordpress`, database `wordpress`). It deliberately publishes no host port, so it cannot collide with a MySQL you already run locally.

Then:

1. Open `http://localhost:8080` and complete the WordPress installation wizard (site title, admin user, admin password).
2. Log in to `/wp-admin` and manually create a small number of demo posts and at least one page. There is no automated seed data — V1 deliberately ships no import script, fixture content, or complex Docker orchestration.
3. Set your `.env`:

   ```env
   WORDPRESS_URL=http://localhost:8080
   SITE_URL=http://localhost:4321
   ```

4. Run `npm run dev` as usual.

To stop and remove the containers (data persists in named volumes until you also remove them):

```bash
docker compose down
```

## REST API usage and data flow

Posts are fetched from the native WordPress REST API with `_embed` so featured images and author data come back in the same request, avoiding extra media/user round-trips:

```text
/wp-json/wp/v2/posts?_embed=1&per_page=100&page=1
```

`per_page=100` is set explicitly rather than relying on WordPress's smaller default. The first response's `X-WP-TotalPages` header is authoritative: the query layer fetches every remaining page with the same shape, aggregates the complete raw post collection, and normalizes it once. This single collection supplies:

- blog pagination (`X-WP-Total` / `X-WP-TotalPages` drive page counts),
- every individual post's static path,
- the homepage's recent-posts list.

Individual post routes do **not** re-fetch a single post by slug at build time — they're served from the already-aggregated collection.

Pages use only the native `pages` endpoint needed to discover and retrieve pages by slug. Category and author REST endpoints are not used in V1.

Normalizers extract only the fields the frontend needs (identity, slug, title, excerpt, HTML content, date, optional featured image, optional author) and turn the raw, deeply-nested `_embedded` REST shape into plain `Post`/`Page` models. That raw shape never reaches layouts or components.

### Routes

```text
/                    starter introduction and recent posts
/blog/                first page of posts
/blog/page/[number]/  subsequent post pages
/blog/[slug]/         individual post
/[slug]/              individual WordPress page
/robots.txt
```

`/blog/` is the single canonical route for page one of posts; numbered pagination starts at `/blog/page/2/`. If a WordPress page slug collides with a route the framework owns (`blog`, or the generated `robots.txt`), the build fails and names the conflicting slug rather than silently producing an ambiguous route.

## SSG and the rebuild limitation

This starter renders content **once, at build time**. If you publish, edit, or delete something in WordPress, the live static site does not change until you rebuild and redeploy Astro. There is no webhook, polling, or incremental revalidation in V1 — a rebuild is the only way to reflect new WordPress content. Automated rebuild triggers (e.g. a WordPress webhook calling your CI) are a roadmap idea, not something this starter provides.

## SEO & Structured Data

A central SEO module (`getSeoData`) derives metadata and structured data via an automatic 4-tier cascade:

1. **Yoast SEO (`yoast_head_json`)** — uses Yoast custom titles, descriptions, canonicals, robots, and OpenGraph/Twitter tags if active.
2. **Rank Math SEO (`rank_math_seo`)** — uses Rank Math titles, descriptions, canonicals, robots, and social tags if active.
3. **Native WordPress REST fields** — decodes `title.rendered`, extracts plain text from `excerpt.rendered`, and resolves featured media attachments.
4. **Site defaults** — falls back to `SITE.name` and `SITE.description` from `src/config/site.ts`.

JSON-LD Schema graphs from Yoast or Rank Math are ingested directly. When absent, native generators emit standard Schema.org `BlogPosting`, `BreadcrumbList`, and `WebSite` structured data. A sitemap is generated automatically via Astro's `@astrojs/sitemap` integration from `SITE_URL`, and `robots.txt` permits indexing.

## Image Optimization

Remote WordPress images are processed at build time using Astro's `<Image />` component (`astro:assets`):

- Dynamic `remotePatterns` in `astro.config.ts` authorize remote WordPress uploads from `WORDPRESS_URL`.
- Responsive `widths` and `sizes` generate optimized modern WebP/AVIF formats at build time with zero client runtime overhead.
- Featured images on detail pages use `loading="eager"` and `fetchpriority="high"` for superior LCP (Largest Contentful Paint).


## Trusted HTML and page-builder fidelity

WordPress's `content.rendered` is rendered with Astro's `set:html`. **This means the configured WordPress installation is treated as a trusted editorial source.** Do not point `WORDPRESS_URL` at a WordPress installation whose content you do not control or trust — arbitrary HTML from an untrusted source rendered this way is a cross-site-scripting risk. The starter does not sanitize or transform this HTML in V1.

Gutenberg-authored content works naturally, to the degree it's returned by the REST API. **Elementor and other page-builder markup is preserved as-is, but visual fidelity is not promised**: page builders typically depend on their own frontend CSS, JavaScript, and asset pipelines that are not automatically carried into the Astro frontend. There is no custom Gutenberg renderer, no Elementor support layer, and no page-builder asset pipeline. The bundled content styles provide restrained, readable defaults for common semantic HTML — they are not an emulation of any WordPress theme or page builder.

## Tests, CI, and static deployment

```bash
npm test          # unit + integration tests (Vitest)
npm run typecheck # astro check
npm run lint      # eslint
npm run build:ci  # build smoke test against a local fixture WordPress server
```

`npm run build:ci` never touches a public WordPress instance — it starts an in-memory fixture REST server for the duration of the build only, so it works offline and in CI. This is test infrastructure, not a runtime mock mode; it plays no role in `npm run dev` or `npm run build` against real WordPress.

CI runs type checking, linting, tests, and the smoke build on `push` and `pull_request`.

Because the output of `npm run build` is a static `dist/` directory, the site can be deployed to any static host or CDN (Netlify, Vercel static hosting, Cloudflare Pages, GitHub Pages, S3 + CloudFront, etc.) with no Node.js server required at runtime.

## What this starter is not (V1 scope)

This is a deliberately small starter. The following are explicitly **out of scope for V1** and are not partially implemented anywhere in the codebase:

- **Rendering modes:** no SSR, no hybrid rendering, no rebuild webhooks or any other automated rebuild trigger.
- **Content types and routes:** no public category or author archive routes; no comments; no search; no multilingual content.
- **Media:** no dedicated media client, no rich media handling, and no REST calls beyond what post/page normalization needs.
- **Editorial HTML:** no HTML sanitization, no custom Gutenberg block renderer, no Elementor (or other page-builder) support layer, no page-builder asset transport.
- **APIs and integrations:** no GraphQL or WPGraphQL, no authentication, no editorial preview mode, no WooCommerce, no analytics, no dashboards, no custom WordPress plugin.
- **Local infrastructure:** no seed data, no content import script, no complex Docker orchestration, no databases beyond the optional local WordPress/MySQL pair, no browser/E2E test suite.
- **Abstraction:** no generic CMS abstraction, no multi-CMS provider system, and this is not a framework or a monorepo.

## Roadmap candidates

These are future ideas, not commitments, and each needs a concrete user need and its own design cycle before it happens: deploy webhooks, SSR/hybrid rendering, an HTML sanitization strategy, category/author archives, richer media handling, editorial preview, and page-builder compatibility work.

## Configuration reference

```env
WORDPRESS_URL=https://cms.example.com
SITE_URL=https://www.example.com
```

See [`.env.example`](./.env.example).
