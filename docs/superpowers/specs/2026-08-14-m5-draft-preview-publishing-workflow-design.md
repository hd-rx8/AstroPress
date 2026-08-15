# Milestone 5 Design Spec: Draft Preview & Publishing Workflow

**Status:** Approved  
**Date:** 2026-08-14  
**Milestone:** 5  
**Topic:** Draft Preview & Publishing Workflow

---

## 1. Executive Summary

This specification defines the architecture, data contracts, and user experience for **Milestone 5: Draft Preview & Publishing Workflow** in the Astro + WordPress Headless Starter.

Milestone 5 solves the editorial preview dilemma in headless architectures:
1. **Real-time Draft Preview:** WordPress authors can click the standard "Preview" button in the block editor (Gutenberg) or classic editor and view unpublished drafts (`draft`, `pending`, `auto-draft`, or revisions) rendered live inside the Astro design system with zero static build latency.
2. **Secure Tokenized Handshake:** Communication between Astro and WordPress uses a shared secret (`ASTROPRESS_PREVIEW_SECRET`) and a dedicated REST endpoint in the `astropress-connector` plugin, keeping draft contents private without exposing WordPress credentials.
3. **Draft Context UI:** Previewed pages feature an interactive top toolbar indicating preview status, a one-click link back to the WordPress post editor, and strict `noindex,nofollow` SEO directives to prevent crawler ingestion.
4. **Enriched Publishing Workflow & Audit:** WordPress deploy webhooks include structured metadata (post ID, slug, transition statuses), and WordPress admin records a local audit log of recent deployments with HTTP response status.

---

## 2. Architecture & Data Flow

```text
┌────────────────────────────────────────────────────────┐
│                   WordPress Admin                      │
│                                                        │
│  Editor clicks "Preview" in Gutenberg / Classic        │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│         AstroPress Connector (class-redirects.php)     │
│                                                        │
│  Rewrites preview_post_link to:                        │
│  {FRONTEND_URL}/preview?id={id}&type={type}&secret={s} │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             Astro Frontend (/pages/preview.astro)      │
│                                                        │
│  1. Validates query secret against ASTROPRESS_PREVIEW_ │
│     SECRET in environment.                             │
│  2. Calls WordPress REST endpoint:                     │
│     GET /wp-json/astropress/v1/preview                 │
│         ?id={id}&type={type}&secret={secret}           │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│     AstroPress Connector (class-preview-endpoint.php)  │
│                                                        │
│  1. Validates secret token.                            │
│  2. Resolves latest revision/draft for post/page.      │
│  3. Returns raw normalized REST payload with embeds.   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             Astro Preview Rendering                    │
│                                                        │
│  - Normalizes draft to Post/Page object.               │
│  - Renders BaseLayout + PostContent with noindex robots│
│  - Renders floating <PreviewBanner /> toolbar          │
└────────────────────────────────────────────────────────┘
```

---

## 3. WordPress Plugin Enhancements (`wordpress/plugins/astropress-connector/`)

### 3.1. Settings & Secrets Configuration (`includes/class-settings.php`)
- **New Option:** `astropress_preview_secret` (stored in `wp_options`).
- **Constant Override:** `ASTROPRESS_PREVIEW_SECRET` defined in `wp-config.php` takes precedence over database options.
- **Admin UI:**
  - Secure input field in **Settings > AstroPress Connector** with a "Generate Secret" helper button.
  - Display warning if the preview secret is not configured.
  - Deploy History widget displaying the last 5 dispatched webhook triggers (timestamp, post ID, trigger reason, HTTP code).

### 3.2. Preview URL Rewriting (`includes/class-redirects.php`)
- Filters `preview_post_link`:
  - Appends query params: `?id={$post->ID}&type={$post->post_type}&secret={$preview_secret}`.
  - Points to `{$frontend_url}/preview`.
- Handles direct public requests to WordPress URLs with `?preview=true` by redirecting to the Astro preview URL if enabled.

### 3.3. Secure Preview Endpoint (`includes/class-preview-endpoint.php`)
- **REST Route:** `GET /wp-json/astropress/v1/preview`
- **Parameters:**
  - `id` (integer, required): Post or page ID.
  - `type` (string, optional, default: `'post'`): `'post'` or `'page'`.
  - `secret` (string, required): Shared secret token.
- **Behavior:**
  - Validates `secret` against `ASTROPRESS_PREVIEW_SECRET` using `hash_equals()`.
  - Checks if a revision exists for the post/page; if so, pulls the latest autosave or revision content; otherwise, pulls the post object directly.
  - Resolves featured media (`_embedded['wp:featuredmedia']`), author (`_embedded['author']`), and categories.
  - Returns JSON with `200 OK` on success, `401 Unauthorized` for bad secrets, or `404 Not Found` if the post does not exist.

### 3.4. Enriched Deploy Webhook (`includes/class-deploy-hook.php`)
- Dispatches JSON payload in `wp_remote_post`:
  ```json
  {
    "event": "post_updated",
    "post_id": 42,
    "post_type": "post",
    "slug": "sample-draft",
    "status": "publish",
    "previous_status": "draft",
    "triggered_at": "2026-08-14T23:00:00Z"
  }
  ```
- Stores recent dispatch history in transient or option `astropress_deploy_history` (capped at 5 entries).

---

## 4. Astro Frontend Implementation

### 4.1. Configuration (`src/config/env.ts`)
- Optional variable: `ASTROPRESS_PREVIEW_SECRET` (string, optional in static builds, required for preview requests).
- Validates that preview secret contains no whitespace if provided.

### 4.2. Preview Data Client (`src/lib/wordpress/preview.ts`)
- **Function:** `getDraftPreview(id: number, type: 'post' | 'page', secret: string): Promise<Post | Page>`
  - Dispatches GET request to `${env.wordpressUrl}/wp-json/astropress/v1/preview?id=${id}&type=${type}&secret=${secret}`.
  - Throws `WordPressRequestError` on HTTP failures or invalid secrets.
  - Passes raw data through `normalizePost` or `normalizePage`.
  - Exported through the barrel `src/lib/wordpress/index.ts`.

### 4.3. Preview Page Route (`src/pages/preview.astro`)
- **Mode:** `export const prerender = false;` (rendered on-demand via SSR / Astro dynamic route).
- **Security & Error Handling:**
  - Reads `id`, `type`, and `secret` from `Astro.url.searchParams`.
  - Compares `secret` with `ASTROPRESS_PREVIEW_SECRET`. Returns `401 Unauthorized` error screen if invalid or missing.
  - Fetches draft via `getDraftPreview(id, type, secret)`.
  - Returns `404 Not Found` error screen if the item is missing.
- **Rendering:**
  - Wraps output in `BaseLayout` with `robots: 'noindex,nofollow'`.
  - Renders `<PreviewBanner />` fixed at the top of the viewport.
  - Renders `<PostContent html={draft.content} />` and post header/featured image.

### 4.4. Preview Banner Component (`src/components/PreviewBanner.astro`)
- Visual styling:
  - Dark floating pill with yellow draft indicator badge (`🟡 RASCUNHO / DRAFT PREVIEW`).
  - Info: Title and last modified date.
  - Action buttons:
    - **"✏️ Editar no WordPress"** linking to `${WORDPRESS_URL}/wp-admin/post.php?post=${id}&action=edit`.
    - **"✖️ Sair do Preview"** linking to `/blog` or `/`.

---

## 5. Testing & Verification

1. **Unit Tests:**
   - `tests/lib/wordpress/preview.test.ts`: tests `getDraftPreview` with valid fixtures, 401 unauthenticated responses, and 404 missing item responses.
   - `tests/lib/wordpress/plugin-preview-endpoint.test.ts`: tests mock responses from `/wp-json/astropress/v1/preview`.
2. **Quality Checks:**
   - `npm run typecheck` (`astro check`)
   - `npm run lint` (`eslint .`)
   - `npm test` (`vitest`)
   - `npm run build:ci` (`verify-build.mjs` ensuring SSG static builds are untouched by the preview route).
