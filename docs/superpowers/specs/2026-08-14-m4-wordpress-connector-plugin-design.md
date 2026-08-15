# Milestone 4 Design Spec: AstroPress WordPress Connector Plugin

## Goal

Create a standalone, lightweight WordPress plugin (`astropress-connector`) that bridges the decoupled WordPress CMS with the Astro frontend. The plugin handles full frontend redirects, replaces admin preview and "View Post" links, dispatches automated and manual build/deploy webhooks, and exposes a `/wp-json/astropress/v1/health` REST endpoint for automated health checks.

---

## 1. Plugin Architecture & Structure

The plugin is located in `wordpress/plugins/astropress-connector/`:

```text
wordpress/
  plugins/
    astropress-connector/
      astropress-connector.php      (main plugin entry point)
      includes/
        class-settings.php          (wp-admin settings page and options)
        class-redirects.php         (frontend template redirection and admin bar link rewriting)
        class-deploy-hook.php       (webhook dispatcher with debounce & admin bar action)
        class-health-endpoint.php   (REST API route /wp-json/astropress/v1/health)
      README.md                     (installation and configuration guide)
```

### 1.1 Configuration & Options
Configurable through **Configurações > AstroPress Connector** in `wp-admin`, or overridden via `wp-config.php` constants:

| Option Name | Constant Override | Description | Default |
|---|---|---|---|
| `astropress_frontend_url` | `ASTROPRESS_FRONTEND_URL` | Public Astro Frontend URL (e.g. `http://localhost:4321` or `https://www.example.com`) | `''` |
| `astropress_deploy_hook_url` | `ASTROPRESS_DEPLOY_HOOK_URL` | Webhook URL for CI/CD rebuilds (Vercel, Netlify, GitHub Actions) | `''` |
| `astropress_enable_redirect` | `ASTROPRESS_ENABLE_REDIRECT` | Whether to redirect public WordPress frontend hits to Astro | `true` |
| `astropress_deploy_debounce` | `ASTROPRESS_DEPLOY_DEBOUNCE` | Debounce window in seconds to avoid firing multiple builds | `30` |

---

## 2. Frontend Redirections & Link Rewriting

### 2.1 Public Frontend Redirection
When `astropress_enable_redirect` is active:
- Any incoming GET request to the WordPress frontend is redirected (302 in dev, 301 in production) to the corresponding path on the Astro frontend:
  - Homepage (`/`) -> `ASTROPRESS_FRONTEND_URL/`
  - Single Post (`/hello-world/` or `/2026/08/14/hello-world/`) -> `ASTROPRESS_FRONTEND_URL/blog/hello-world/`
  - Page (`/about/`) -> `ASTROPRESS_FRONTEND_URL/about/`
- **Whitelisted paths (NEVER redirected):**
  - `/wp-admin/*`
  - `/wp-login.php`
  - `/wp-json/*` (REST API)
  - `/wp-cron.php`
  - `/xmlrpc.php`
  - Media uploads / static files (`/wp-content/uploads/*`)

### 2.2 Admin Panel Link Rewriting
- **"Ver Post" / "View Post":** Rewrites permalinks on post/page edit screens and admin lists to point directly to the Astro frontend route.
- **"Visitar Site" / "View Site":** Admin bar top link points to `ASTROPRESS_FRONTEND_URL`.
- **Preview Link:** Replaces standard preview link with Astro preview URL.

---

## 3. Deploy Hooks & Rebuild Dispatcher

### 3.1 Automatic Build Trigger
Listens to WordPress post lifecycle hooks:
- `transition_post_status` (when moving to or from `'publish'`)
- `wp_trash_post`, `before_delete_post`
- `save_post` (only for published posts/pages, avoiding auto-drafts and revisions)

**Debounce Logic:**
- Uses WordPress Transients (`set_transient('astropress_last_deploy_time', time(), $debounce_seconds)`).
- If a build was triggered less than `$debounce_seconds` ago, subsequent rapid saves queue or skip duplicate HTTP requests to protect CI/CD build quotas.

### 3.2 Manual Rebuild Trigger
- Adds a **"🚀 Rebuild Site"** button in the WordPress Admin Top Bar (for users with `edit_posts` / `manage_options` capability).
- Clicking the button performs an async AJAX/REST trigger and displays an admin notice: *"Build disparado com sucesso na Vercel/CI!"*.

---

## 4. Health Check Endpoint (`/wp-json/astropress/v1/health`)

Exposes a public/authenticated health diagnostics endpoint:
`GET /wp-json/astropress/v1/health`

### Response Payload Schema
```json
{
  "status": "ok",
  "wordpress": {
    "version": "6.x",
    "php_version": "8.x",
    "permalink_structure": "/%postname%/",
    "is_pretty_permalinks": true
  },
  "astropress": {
    "plugin_version": "1.0.0",
    "frontend_url": "http://localhost:4321",
    "redirects_enabled": true,
    "deploy_hook_configured": true
  },
  "seo_plugin": {
    "active": "yoast",
    "version": "23.x"
  },
  "endpoints": {
    "posts": true,
    "pages": true,
    "categories": true,
    "media": true
  }
}
```

---

## 5. Verification & Testing

1. **PHP Syntax & Linter Validation:** Run PHP syntax check (`php -l`) on all plugin files.
2. **Integration Verification Script:** Node/TS test script validating:
   - Plugin header metadata.
   - Redirection header rules.
   - Health endpoint schema output against the local WordPress instance.
3. **CI Build & Regression Check:** Run `npm test && npm run typecheck && npm run lint && npm run build:ci` ensuring zero regressions on the Astro frontend.
