# Milestone 4: WordPress Connector Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the standalone `astropress-connector` WordPress plugin in `wordpress/plugins/astropress-connector/` with full frontend redirection, admin preview/view-post link rewriting, automated and manual deploy webhook dispatching with debounce, and a `/wp-json/astropress/v1/health` diagnostics endpoint.

**Architecture:** A modular PHP 7.4+/8.x WordPress plugin with single-responsibility classes (`AstroPress_Settings`, `AstroPress_Redirects`, `AstroPress_Deploy_Hook`, `AstroPress_Health_Endpoint`), support for both `wp-admin` UI settings and `wp-config.php` constant overrides, and zero performance impact on the REST API.

**Tech Stack:** PHP (WordPress Plugin API), WordPress REST API, TypeScript / Vitest (integration test suite).

## Global Constraints

- Modern, secure WordPress coding standards (escaping outputs with `esc_html`, `esc_url`, `esc_attr`, validating nonces, checking capabilities).
- Whitelist critical endpoints (`/wp-admin`, `/wp-login.php`, `/wp-json/*`, `/wp-cron.php`, uploads) from any template redirect.
- Keep the Astro frontend decoupled and 100% functional even if the plugin is not installed.
- Full test pass (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build:ci`).

---

## Target File Structure

```text
wordpress/
  plugins/
    astropress-connector/
      astropress-connector.php          (Main plugin entry point & bootstrap)
      includes/
        class-settings.php              (Admin settings page & options API)
        class-redirects.php             (Template redirect & admin link rewrites)
        class-deploy-hook.php           (Webhook dispatcher with debounce & admin bar trigger)
        class-health-endpoint.php       (REST route /wp-json/astropress/v1/health)
      README.md                         (Plugin documentation & constant reference)
tests/
  lib/wordpress/plugin-health.test.ts   (Unit/integration test for health schema & endpoints)
```

---

### Task 1: Create Main Plugin Bootstrap (`astropress-connector.php`)

**Files:**
- Create: `wordpress/plugins/astropress-connector/astropress-connector.php`

**Interfaces:**
- Produces: `ASTROPRESS_CONNECTOR_VERSION`, `ASTROPRESS_CONNECTOR_PLUGIN_DIR`, `ASTROPRESS_CONNECTOR_PLUGIN_URL`, `astropress_get_option(key, default)`.

- [ ] **Step 1: Write `wordpress/plugins/astropress-connector/astropress-connector.php`**

Implement standard WordPress plugin header, constants, helper function for option/constant retrieval, and instantiate plugin classes.

- [ ] **Step 2: Verify PHP syntax**

Run: `php -l wordpress/plugins/astropress-connector/astropress-connector.php` (or verify via test).

- [ ] **Step 3: Commit**

```bash
git add wordpress/plugins/astropress-connector/astropress-connector.php
git commit -m "feat(plugin): create AstroPress Connector plugin bootstrap"
```

---

### Task 2: Implement Admin Settings Page & Options (`includes/class-settings.php`)

**Files:**
- Create: `wordpress/plugins/astropress-connector/includes/class-settings.php`

**Interfaces:**
- Produces: `AstroPress_Settings` registering admin menu under Settings > AstroPress Connector, options sanitization, and constant override notices.

- [ ] **Step 1: Write `includes/class-settings.php`**

Register settings fields (`astropress_frontend_url`, `astropress_deploy_hook_url`, `astropress_enable_redirect`, `astropress_deploy_debounce`) with proper sanitization (`esc_url_raw`, `absint`, `boolval`) and clean admin view markup.

- [ ] **Step 2: Commit**

```bash
git add wordpress/plugins/astropress-connector/includes/class-settings.php
git commit -m "feat(plugin): add settings page and options management"
```

---

### Task 3: Implement Frontend Redirection & Link Rewriting (`includes/class-redirects.php`)

**Files:**
- Create: `wordpress/plugins/astropress-connector/includes/class-redirects.php`

**Interfaces:**
- Produces: `AstroPress_Redirects` with `handle_template_redirect()`, `filter_post_link()`, `filter_page_link()`, `filter_preview_post_link()`, `filter_admin_bar_view_site()`.

- [ ] **Step 1: Write `includes/class-redirects.php`**

Implement:
- `template_redirect` hook checking `is_admin()`, `wp_doing_cron()`, `wp_is_json_request()`, etc., mapping home, posts, and pages to the configured Astro frontend URL.
- `preview_post_link`, `post_link`, `page_link` filters.
- Admin bar "Visitar Site" URL override.

- [ ] **Step 2: Commit**

```bash
git add wordpress/plugins/astropress-connector/includes/class-redirects.php
git commit -m "feat(plugin): add frontend redirects and admin link rewriting"
```

---

### Task 4: Implement Deploy Hook Webhooks & Manual Trigger (`includes/class-deploy-hook.php`)

**Files:**
- Create: `wordpress/plugins/astropress-connector/includes/class-deploy-hook.php`

**Interfaces:**
- Produces: `AstroPress_Deploy_Hook` with `dispatch_deploy_webhook(reason)`, `handle_post_transition()`, `handle_manual_rebuild_ajax()`, `add_admin_bar_rebuild_button()`.

- [ ] **Step 1: Write `includes/class-deploy-hook.php`**

Implement:
- Transient-based debouncing (`astropress_deploy_lock`).
- `wp_remote_post` non-blocking HTTP dispatch.
- Admin bar button "🚀 Rebuild Site" with AJAX trigger and feedback notice.

- [ ] **Step 2: Commit**

```bash
git add wordpress/plugins/astropress-connector/includes/class-deploy-hook.php
git commit -m "feat(plugin): add deploy hook dispatcher with debouncing and admin bar button"
```

---

### Task 5: Implement Health Check REST Endpoint (`includes/class-health-endpoint.php`)

**Files:**
- Create: `wordpress/plugins/astropress-connector/includes/class-health-endpoint.php`

**Interfaces:**
- Produces: `AstroPress_Health_Endpoint` registering `GET /wp-json/astropress/v1/health`.

- [ ] **Step 1: Write `includes/class-health-endpoint.php`**

Register route returning system info, permalink status, detected SEO plugins, and endpoint availability.

- [ ] **Step 2: Commit**

```bash
git add wordpress/plugins/astropress-connector/includes/class-health-endpoint.php
git commit -m "feat(plugin): add /wp-json/astropress/v1/health diagnostics endpoint"
```

---

### Task 6: Plugin Documentation & Automated Tests

**Files:**
- Create: `wordpress/plugins/astropress-connector/README.md`
- Create: `tests/lib/wordpress/plugin-health.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write unit tests for health check schema in `tests/lib/wordpress/plugin-health.test.ts`**
- [ ] **Step 2: Write plugin documentation in `wordpress/plugins/astropress-connector/README.md`**
- [ ] **Step 3: Run full verification suite**

```bash
npm test
npm run typecheck
npm run lint
npm run build:ci
```

- [ ] **Step 4: Commit and Push**

```bash
git add wordpress/ tests/ README.md docs/
git commit -m "docs(plugin): add plugin documentation and health check tests"
git push origin main
```
