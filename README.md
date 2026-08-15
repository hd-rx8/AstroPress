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
       │ build (SSG) / on-demand (Draft Preview)
       ▼
   Static HTML / Live Preview
```

## The content layer

Every WordPress REST call lives in `src/lib/wordpress/` and is reached
through one import: `src/lib/wordpress/index.ts`. Pages never call `fetch`
against WordPress directly.

```ts
import { getPosts, getPostBySlug, getPages, getPageBySlug, getCategories, getMedia, getDraftPreview, getSeoData } from '../lib/wordpress';

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

Edit `.env` and set the required variables:

```env
WORDPRESS_URL=https://cms.example.com
SITE_URL=https://www.example.com
ASTROPRESS_PREVIEW_SECRET=your-shared-secret
```

- `WORDPRESS_URL` — the base URL of your WordPress installation (no `/wp-json` suffix, no trailing slash). The starter derives `/wp-json/wp/v2` from it internally.
- `SITE_URL` — the public URL this Astro site will be served from. It drives canonical URLs, Open Graph/Twitter tags, JSON-LD, the sitemap, and `robots.txt`. It must be a domain or subdomain **root** (no path).
- `ASTROPRESS_PREVIEW_SECRET` — shared secret token for authenticating on-demand draft preview requests from WordPress.

Then run:

```bash
npm run dev
```

Both variables are validated on startup and on build. A missing or malformed URL fails immediately with an actionable error rather than producing a broken site.

## Optional: local WordPress with Docker

If you don't have a WordPress installation handy, an isolated `docker-compose.yml` is included purely for local demonstration. It runs **WordPress and MySQL only** — there is no Astro container, no custom WordPress image, no bundled plugin, and no seed or content-import step. Docker is never required by the Astro runtime; the frontend and its data layer have no knowledge of Docker at all.

```bash
docker compose up -d
```

This starts:

- `wordpress` on `127.0.0.1:8080`
- `mysql`, reachable only from the `wordpress` container over the Compose network (root/user/password all `wordpress`, database `wordpress`).

Then:

1. Open `http://localhost:8080` and complete the WordPress installation wizard.
2. Log in to `/wp-admin` and manually create demo posts and pages.
3. Set your `.env`:

   ```env
   WORDPRESS_URL=http://localhost:8080
   SITE_URL=http://localhost:4321
   ASTROPRESS_PREVIEW_SECRET=local-dev-secret
   ```

4. Run `npm run dev` as usual.

To stop and remove the containers:

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

### Routes

```text
/                    starter introduction and recent posts
/blog/                first page of posts
/blog/page/[number]/  subsequent post pages
/blog/[slug]/         individual post
/[slug]/              individual WordPress page
/preview              on-demand draft preview route (requires secret)
/robots.txt
```

`/blog/` is the single canonical route for page one of posts; numbered pagination starts at `/blog/page/2/`. If a WordPress page slug collides with a route the framework owns (`blog`, or the generated `robots.txt`), the build fails and names the conflicting slug rather than silently producing an ambiguous route.

## Draft Preview & Publishing Workflow

The starter provides real-time editorial preview for unpublished posts and pages:

- **WordPress Preview Button:** Editors click "Preview" in WordPress and are immediately redirected to the Astro frontend with live changes rendered.
- **Preview Banner Toolbar:** Floating indicator bar shows draft status, post ID, and provides a 1-click link back to `wp-admin` editor.
- **Search Engine Safe:** Automatically injects `<meta name="robots" content="noindex,nofollow" />` on all preview renderings.
- **Deploy Webhook Dispatcher:** Publishes trigger debounced rebuild webhooks (with structured event metadata) and logs deploy history in WordPress admin.

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
- Featured images on detail pages use `loading="eager"` and `fetchpriority="high"` for superior LCP.

## Trusted HTML and page-builder fidelity

WordPress's `content.rendered` is rendered with Astro's `set:html`. **This means the configured WordPress installation is treated as a trusted editorial source.** Do not point `WORDPRESS_URL` at a WordPress installation whose content you do not control or trust. The starter does not sanitize or transform this HTML in V1.

Gutenberg-authored content works naturally, to the degree it's returned by the REST API. **Elementor and other page-builder markup is preserved as-is, but visual fidelity is not promised**: page builders typically depend on their own frontend CSS, JavaScript, and asset pipelines.

## WordPress Connector Plugin

The starter includes an optional, lightweight WordPress plugin located in [`wordpress/plugins/astropress-connector`](wordpress/plugins/astropress-connector/README.md):

- **Real-Time Draft Previews:** Instant tokenized preview handshake with Astro.
- **Automatic Frontend Redirects:** Routes visitors accessing the WordPress domain directly to your Astro site.
- **Admin Link Rewriting:** "View Post", "View Page", and "Visit Site" in `wp-admin` open your Astro frontend.
- **Deploy Hooks & Debouncing:** Dispatches rebuild webhooks upon publishing/updating content, with a 30s debounce, deploy history table, and manual "🚀 Rebuild Site" button.
- **Health Check REST API:** `GET /wp-json/astropress/v1/health` for automated diagnostics.

## Tests, CI, and static deployment

```bash
npm test          # unit + integration tests (Vitest)
npm run typecheck # astro check
npm run lint      # eslint
npm run build:ci  # build smoke test against a local fixture WordPress server
```

`npm run build:ci` never touches a public WordPress instance — it starts an in-memory fixture REST server for the duration of the build only, so it works offline and in CI.

## Configuration reference

```env
WORDPRESS_URL=https://cms.example.com
SITE_URL=https://www.example.com
ASTROPRESS_PREVIEW_SECRET=your-shared-secret
```

See [`.env.example`](./.env.example).
