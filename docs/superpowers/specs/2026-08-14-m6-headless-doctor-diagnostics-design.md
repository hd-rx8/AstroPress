# Milestone 6 Design Spec: Headless Doctor Automated Diagnostics

**Status:** Approved  
**Date:** 2026-08-14  
**Milestone:** 6  
**Topic:** Headless Doctor Automated Diagnostics

---

## 1. Executive Summary

This specification defines the architecture, data contracts, and user interfaces for **Milestone 6: Headless Doctor Automated Diagnostics** in the Astro + WordPress Headless Starter.

Headless Doctor provides an end-to-end automated diagnostics engine that audits a headless WordPress + Astro setup. It verifies environment variables, network connectivity, REST API availability, AstroPress Connector plugin status, permalink structures, remote image patterns, SEO plugin integrations, and draft preview handshakes.

It exposes two distinct presentation surfaces:
1. **CLI Runner (`npm run doctor`):** A terminal interface with ANSI colors, progress badges, error troubleshooting instructions, and `--ci` / `--json` flags for deployment pipelines.
2. **Web Diagnostics Dashboard (`/doctor`):** A frontend route displaying structured health cards, system information, latency gauges, and actionable recommendations.

---

## 2. Architecture & Data Flow

```text
┌────────────────────────────────────────────────────────┐
│               Headless Doctor Engine                   │
│             (src/lib/doctor/{types,checks,index}.ts)   │
└──────────────────────────┬─────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│        CLI Diagnostic        │   │        Web Dashboard         │
│     (scripts/doctor.mjs)     │   │   (src/pages/doctor.astro)   │
│                              │   │                              │
│ - Terminal ANSI Report       │   │ - Status cards & latency     │
│ - Flag: --ci (exit code 1)   │   │ - Expandable error details   │
│ - Flag: --json (CI artifacts)│   │ - One-click re-check         │
└──────────────────────────────┘   └──────────────────────────────┘
```

---

## 3. Diagnostic Check Categories

### Category 1: Environment & Configuration
- **Check 1.1:** `.env` variables present (`WORDPRESS_URL`, `SITE_URL`).
- **Check 1.2:** `WORDPRESS_URL` valid format (absolute http/https, no trailing slash, no `/wp-json` suffix).
- **Check 1.3:** `SITE_URL` valid format (domain/subdomain root, no subpath).
- **Check 1.4:** `ASTROPRESS_PREVIEW_SECRET` configured for draft previews.

### Category 2: WordPress Network & Discovery
- **Check 2.1:** WordPress base URL reachability & HTTP status.
- **Check 2.2:** REST API root index discovery at `/wp-json/`.
- **Check 2.3:** Network round-trip latency measurement (< 500ms is healthy, > 1500ms warns).

### Category 3: Core WordPress REST Endpoints
- **Check 3.1:** Posts endpoint `/wp-json/wp/v2/posts?per_page=1` & `X-WP-Total` header.
- **Check 3.2:** Pages endpoint `/wp-json/wp/v2/pages?per_page=1`.
- **Check 3.3:** Categories endpoint `/wp-json/wp/v2/categories?per_page=1`.
- **Check 3.4:** Media endpoint `/wp-json/wp/v2/media?per_page=1`.

### Category 4: AstroPress Connector Plugin & Health
- **Check 4.1:** Plugin endpoint `/wp-json/astropress/v1/health` reachability.
- **Check 4.2:** Permalink structure verification (ensures `is_pretty_permalinks` is true, warns on `?p=123` plain permalinks).
- **Check 4.3:** Frontend redirects status (`redirects_enabled`).
- **Check 4.4:** Deploy webhook hook configured (`deploy_hook_configured`).

### Category 5: SEO Ingestion & Schema Graph
- **Check 5.1:** Detect active SEO plugin (`yoast`, `rank-math`, or `native`).
- **Check 5.2:** Inspect sample post for `yoast_head_json` or `rank_math_seo` schema output.

### Category 6: Draft Preview Handshake
- **Check 6.1:** Handshake with `/wp-json/astropress/v1/preview` using configured secret.
- **Check 6.2:** Verification that unauthorized requests are properly rejected (401).

### Category 7: Image Optimization & Remote Patterns
- **Check 7.1:** Verification that WordPress media upload hostname matches `astro.config.ts` remote patterns.

---

## 4. Report Data Model

```ts
export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface DoctorCheck {
  id: string;
  name: string;
  category: string;
  status: CheckStatus;
  message: string;
  details?: string;
  remedy?: string;
  latencyMs?: number;
}

export interface DoctorCategoryReport {
  name: string;
  title: string;
  checks: DoctorCheck[];
  status: CheckStatus;
}

export interface DoctorReport {
  timestamp: string;
  durationMs: number;
  isHealthy: boolean;
  totalChecks: number;
  passed: number;
  warnings: number;
  failures: number;
  categories: DoctorCategoryReport[];
  system: {
    nodeVersion: string;
    wordpressUrl: string;
    siteUrl: string;
  };
}
```

---

## 5. User Interfaces

### 5.1. CLI Tool (`npm run doctor`)
- Outputs color-coded terminal report with box borders, category headers, check statuses, and clear resolution advice for warnings/errors.
- **Exit codes:**
  - `0`: All required checks passed (or only non-blocking warnings exist).
  - `1`: One or more critical checks failed (in `--ci` mode, or standalone failures).

### 5.2. Web Dashboard (`/doctor`)
- Rendered in Astro with `<BaseLayout>` using `robots: 'noindex,nofollow'`.
- Interactive grid of category cards with status badges (`🟢 OK`, `🟡 Atenção`, `🔴 Falha`), latency counters, and expandable diagnostic details.

---

## 6. Testing & CI Strategy

1. **Unit Tests:** `tests/lib/doctor/doctor.test.ts` verifying all check rules against mocked WordPress responses.
2. **Integration Verification:** Running `node scripts/doctor.mjs` against the local fixture server during CI verification.
3. **Full Suite:** Passing `npm test`, `npm run typecheck`, `npm run lint`, `npm run build:ci`.
