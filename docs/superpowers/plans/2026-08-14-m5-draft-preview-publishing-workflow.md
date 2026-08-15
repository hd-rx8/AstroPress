# Milestone 5: Draft Preview & Publishing Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real-time draft previews for unpublished WordPress posts/pages with secure token handshake, floating toolbar UI, and an enriched webhook publishing workflow with deploy history.

**Architecture:** A dedicated WordPress REST endpoint (`GET /wp-json/astropress/v1/preview`) validates a shared secret (`ASTROPRESS_PREVIEW_SECRET`) and returns the latest draft/revision with embeds. Astro provides an on-demand route (`src/pages/preview.astro`) that normalizes the draft, enforces `noindex,nofollow` SEO directives, and renders the content with a `<PreviewBanner />` toolbar linking back to the WP editor.

**Tech Stack:** Astro, TypeScript strict, PHP (WordPress Plugin API), Vitest, Vanilla CSS.

---

## Global Constraints

- Never expose unpublished content without valid `ASTROPRESS_PREVIEW_SECRET` validation (`hash_equals`).
- Keep static SSG builds 100% unaffected (`export const prerender = false` on `preview.astro` only).
- Enforce `<meta name="robots" content="noindex,nofollow" />` on all preview renderings.
- Escape all admin outputs in PHP with `esc_html`, `esc_url`, `esc_attr`.
- Verify full test suite passing at every step (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build:ci`).

---

## Target File Structure

```text
wordpress/
  plugins/
    astropress-connector/
      astropress-connector.php
      includes/
        class-settings.php             (Deploy history log & preview secret field)
        class-redirects.php            (Preview link filter & redirect)
        class-deploy-hook.php          (Enriched webhook payload & history tracking)
        class-health-endpoint.php
        class-preview-endpoint.php     (NEW: /wp-json/astropress/v1/preview endpoint)
      README.md
src/
  config/
    env.ts                             (Optional ASTROPRESS_PREVIEW_SECRET validation)
  lib/
    wordpress/
      preview.ts                       (NEW: getDraftPreview client)
      index.ts                         (Re-export getDraftPreview)
  components/
    PreviewBanner.astro                (NEW: Floating draft preview toolbar)
  pages/
    preview.astro                      (NEW: On-demand draft preview route)
  styles/
    global.css                         (Preview banner styling)
tests/
  lib/
    wordpress/
      preview.test.ts                  (NEW: Preview client unit tests)
      plugin-preview.test.ts           (NEW: Plugin preview endpoint integration tests)
```

---

### Task 1: Add Secure Preview REST Endpoint & Settings Option in WordPress Plugin

**Files:**
- Create: `wordpress/plugins/astropress-connector/includes/class-preview-endpoint.php`
- Modify: `wordpress/plugins/astropress-connector/includes/class-settings.php`
- Modify: `wordpress/plugins/astropress-connector/astropress-connector.php`

**Interfaces:**
- Produces: `AstroPress_Preview_Endpoint` registering `GET /wp-json/astropress/v1/preview?id={id}&type={type}&secret={secret}`.
- Produces: `astropress_preview_secret` option & `ASTROPRESS_PREVIEW_SECRET` constant support.

- [ ] **Step 1: Create `wordpress/plugins/astropress-connector/includes/class-preview-endpoint.php`**

```php
<?php
/**
 * AstroPress Connector - Secure Preview REST Endpoint
 *
 * @package AstroPress_Connector
 */

if (!defined('ABSPATH')) {
    exit;
}

class AstroPress_Preview_Endpoint {

    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes() {
        register_rest_route('astropress/v1', '/preview', array(
            'methods'             => 'GET',
            'callback'            => array($this, 'get_preview_data'),
            'permission_callback' => array($this, 'validate_preview_secret'),
            'args'                => array(
                'id' => array(
                    'required'          => true,
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    },
                ),
                'type' => array(
                    'required'          => false,
                    'default'           => 'post',
                    'sanitize_callback' => 'sanitize_key',
                ),
                'secret' => array(
                    'required'          => true,
                    'sanitize_callback' => 'sanitize_text_field',
                ),
            ),
        ));
    }

    public function validate_preview_secret($request) {
        $provided_secret = $request->get_param('secret');
        $configured_secret = astropress_get_option('astropress_preview_secret', '');

        if (empty($configured_secret) || empty($provided_secret)) {
            return new WP_Error('astropress_forbidden', 'Preview secret is not configured or missing', array('status' => 401));
        }

        if (!hash_equals($configured_secret, $provided_secret)) {
            return new WP_Error('astropress_forbidden', 'Invalid preview secret', array('status' => 401));
        }

        return true;
    }

    public function get_preview_data($request) {
        $post_id = absint($request->get_param('id'));
        $post = get_post($post_id);

        if (!$post) {
            return new WP_Error('astropress_not_found', 'Draft post not found', array('status' => 404));
        }

        // Check if there is an autosave or recent revision
        $revisions = wp_get_post_revisions($post_id, array('posts_per_page' => 1));
        if (!empty($revisions)) {
            $latest_revision = reset($revisions);
            $title = $latest_revision->post_title;
            $content = $latest_revision->post_content;
            $excerpt = $latest_revision->post_excerpt;
            $date = $latest_revision->post_modified;
        } else {
            $title = $post->post_title;
            $content = $post->post_content;
            $excerpt = $post->post_excerpt;
            $date = $post->post_date;
        }

        // Resolve featured image
        $thumbnail_id = get_post_thumbnail_id($post_id);
        $featured_media = array();
        if ($thumbnail_id) {
            $img_src = wp_get_attachment_image_src($thumbnail_id, 'full');
            $alt_text = get_post_meta($thumbnail_id, '_wp_attachment_image_alt', true);
            if ($img_src) {
                $featured_media[] = array(
                    'source_url'    => $img_src[0],
                    'alt_text'      => $alt_text ? $alt_text : '',
                    'media_details' => array(
                        'width'  => $img_src[1],
                        'height' => $img_src[2],
                    ),
                );
            }
        }

        // Resolve author
        $author_id = $post->post_author;
        $author_data = array(
            'id'   => $author_id,
            'name' => get_the_author_meta('display_name', $author_id),
            'slug' => get_the_author_meta('user_nicename', $author_id),
        );

        $response_data = array(
            'id'             => $post->ID,
            'slug'           => $post->post_name ? $post->post_name : 'preview-' . $post->ID,
            'status'         => $post->post_status,
            'type'           => $post->post_type,
            'date'           => mysql_to_rfc3339($date),
            'title'          => array('rendered' => $title),
            'content'        => array('rendered' => apply_filters('the_content', $content)),
            'excerpt'        => array('rendered' => $excerpt),
            '_embedded'      => array(
                'wp:featuredmedia' => $featured_media,
                'author'           => array($author_data),
            ),
        );

        return rest_ensure_response($response_data);
    }
}
```

- [ ] **Step 2: Update `wordpress/plugins/astropress-connector/includes/class-settings.php`**

Add `astropress_preview_secret` setting field with password visibility toggle and display deploy history widget.

- [ ] **Step 3: Update `wordpress/plugins/astropress-connector/astropress-connector.php`**

Require and instantiate `AstroPress_Preview_Endpoint`.

- [ ] **Step 4: Commit**

```bash
git add wordpress/plugins/astropress-connector
git commit -m "feat(plugin): add secure draft preview endpoint and secret configuration"
```

---

### Task 2: Implement Preview Link Rewriting and Enriched Webhooks in WordPress Plugin

**Files:**
- Modify: `wordpress/plugins/astropress-connector/includes/class-redirects.php`
- Modify: `wordpress/plugins/astropress-connector/includes/class-deploy-hook.php`

**Interfaces:**
- Produces: Preview URL generation: `{$frontend_url}/preview?id={$post->ID}&type={$post->post_type}&secret={$secret}`.
- Produces: Structured JSON deploy payload with deploy history storage in `astropress_deploy_history`.

- [ ] **Step 1: Update `includes/class-redirects.php`**

Filter `preview_post_link`:
```php
public function filter_preview_post_link($link, $post) {
    $frontend_url = rtrim(astropress_get_option('astropress_frontend_url', ''), '/');
    $secret = astropress_get_option('astropress_preview_secret', '');
    if (empty($frontend_url) || empty($secret) || !$post) {
        return $link;
    }
    return sprintf(
        '%s/preview?id=%d&type=%s&secret=%s',
        $frontend_url,
        $post->ID,
        $post->post_type,
        rawurlencode($secret)
    );
}
```

- [ ] **Step 2: Update `includes/class-deploy-hook.php`**

Enrich payload with event details and record deployment history:
```php
$payload = array(
    'event'           => 'post_transition',
    'post_id'         => $post->ID,
    'post_type'       => $post->post_type,
    'slug'            => $post->post_name,
    'status'          => $new_status,
    'previous_status' => $old_status,
    'triggered_at'    => current_time('c'),
);
```

- [ ] **Step 3: Commit**

```bash
git add wordpress/plugins/astropress-connector
git commit -m "feat(plugin): rewrite preview links and enrich deploy webhook payload"
```

---

### Task 3: Implement Configuration & Preview Client in Astro Content Layer

**Files:**
- Modify: `src/config/env.ts`
- Create: `src/lib/wordpress/preview.ts`
- Modify: `src/lib/wordpress/index.ts`
- Create: `tests/lib/wordpress/preview.test.ts`

**Interfaces:**
- Produces: `env.previewSecret` (optional `string`).
- Produces: `getDraftPreview(id: number, type?: 'post' | 'page', secret?: string): Promise<Post | Page>`.

- [ ] **Step 1: Write failing unit test in `tests/lib/wordpress/preview.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { wordpressPostFixture } from '../../fixtures/wordpress';

const clientGetMock = vi.hoisted(() => vi.fn());

vi.mock('../../../src/lib/wordpress/client', () => ({
  createWordPressClient: () => ({ get: clientGetMock }),
}));

describe('getDraftPreview', () => {
  beforeEach(() => {
    clientGetMock.mockReset();
    vi.resetModules();
  });

  it('fetches draft from preview endpoint and normalizes it', async () => {
    clientGetMock.mockResolvedValueOnce({
      data: {
        ...wordpressPostFixture,
        title: { rendered: 'Draft Post Title' },
      },
    });

    const { getDraftPreview } = await import('../../../src/lib/wordpress/preview');
    const result = await getDraftPreview(42, 'post', 'my-secret');

    expect(result.id).toBe(42);
    expect(result.title).toBe('Draft Post Title');
    expect(clientGetMock).toHaveBeenCalledWith('astropress/v1/preview', {
      query: { id: 42, type: 'post', secret: 'my-secret' },
    });
  });

  it('throws an error if secret is missing', async () => {
    const { getDraftPreview } = await import('../../../src/lib/wordpress/preview');
    await expect(getDraftPreview(42, 'post', '')).rejects.toThrow(/secret/i);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- tests/lib/wordpress/preview.test.ts
```

- [ ] **Step 3: Update `src/config/env.ts`**

Add `previewSecret` to `AppEnv` and `loadEnv`:
```ts
export interface AppEnv {
  wordpressUrl: URL;
  wordpressApiUrl: URL;
  siteUrl: URL;
  previewSecret?: string;
}
```

- [ ] **Step 4: Create `src/lib/wordpress/preview.ts`**

Implement `getDraftPreview` consuming the REST endpoint with custom path `astropress/v1/preview` and returning normalized `Post` or `Page`.

- [ ] **Step 5: Export from `src/lib/wordpress/index.ts`**

Export `getDraftPreview`.

- [ ] **Step 6: Verify and commit**

```bash
npm test -- tests/lib/wordpress/preview.test.ts
npm run typecheck
npm run lint
git add src/config/env.ts src/lib/wordpress tests/lib/wordpress/preview.test.ts
git commit -m "feat: add draft preview client to content layer"
```

---

### Task 4: Create Preview Banner Toolbar Component

**Files:**
- Create: `src/components/PreviewBanner.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: `<PreviewBanner postId={id} postType={type} editUrl={editUrl} />`

- [ ] **Step 1: Create `src/components/PreviewBanner.astro`**

```astro
---
interface Props {
  postId: number;
  postType: string;
  editUrl: string;
}

const { postId, postType, editUrl } = Astro.props;
---

<div class="preview-toolbar" role="region" aria-label="Draft Preview Controls">
  <div class="preview-toolbar__container">
    <div class="preview-toolbar__status">
      <span class="preview-toolbar__badge">🟡 MODO RASCUNHO</span>
      <span class="preview-toolbar__label">{postType.toUpperCase()} #{postId} — Não publicado</span>
    </div>
    <div class="preview-toolbar__actions">
      <a href={editUrl} target="_blank" rel="noopener noreferrer" class="preview-toolbar__btn preview-toolbar__btn--edit">
        ✏️ Editar no WordPress
      </a>
      <a href="/" class="preview-toolbar__btn preview-toolbar__btn--exit">
        ✖️ Sair do Preview
      </a>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add styles in `src/styles/global.css`**

Add responsive fixed toolbar styles for `.preview-toolbar`.

- [ ] **Step 3: Commit**

```bash
git add src/components/PreviewBanner.astro src/styles/global.css
git commit -m "feat(ui): add PreviewBanner toolbar component"
```

---

### Task 5: Implement On-Demand Preview Route (`src/pages/preview.astro`)

**Files:**
- Create: `src/pages/preview.astro`

**Interfaces:**
- Handles `GET /preview?id={id}&type={type}&secret={secret}` on-demand (`export const prerender = false;`).

- [ ] **Step 1: Create `src/pages/preview.astro`**

Implement draft retrieval, validation, error screen for 401/404, `noindex,nofollow` metadata, and full article rendering with `<PreviewBanner />`.

- [ ] **Step 2: Verify typecheck & lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/preview.astro
git commit -m "feat(preview): implement on-demand draft preview route"
```

---

### Task 6: Documentation, Integration Tests & Full Suite Verification

**Files:**
- Create: `tests/lib/wordpress/plugin-preview.test.ts`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `wordpress/plugins/astropress-connector/README.md`

**Interfaces:**
- Produces full integration testing of preview schema and complete documentation of the preview workflow.

- [ ] **Step 1: Create `tests/lib/wordpress/plugin-preview.test.ts`**

Write integration tests validating the preview payload contract and unauthorized handling.

- [ ] **Step 2: Update documentation in `README.md`, `docs/architecture.md`, and `wordpress/plugins/astropress-connector/README.md`**

- [ ] **Step 3: Run full verification suite**

```bash
npm test
npm run typecheck
npm run lint
npm run build:ci
```

- [ ] **Step 4: Commit**

```bash
git add README.md docs/ tests/ wordpress/
git commit -m "docs(preview): document Draft Preview & Publishing Workflow"
```

---
