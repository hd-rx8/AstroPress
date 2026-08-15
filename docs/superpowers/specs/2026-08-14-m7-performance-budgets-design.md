# Milestone 7 Design Spec: Performance Budgets & Static Assets Auditor

**Status:** Approved  
**Date:** 2026-08-14  
**Milestone:** 7  
**Topic:** Performance Budgets & Static Assets Auditor

---

## 1. Executive Summary

This specification defines the architecture, budget contracts, and CLI reporting tools for **Milestone 7: Performance Budgets & Static Assets Auditor** in the Astro + WordPress Headless Starter.

Milestone 7 enforces strict performance budgets directly on the build output (`dist/`), ensuring the project maintains its zero-runtime JavaScript commitment on editorial routes, minimal CSS payload (< 25 KB), lightweight HTML documents (< 50 KB), and complete image CLS prevention.

---

## 2. Architecture & Data Flow

```text
┌────────────────────────────────────────────────────────┐
│               Astro Build Output (dist/)               │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│             Performance Budget Auditor                 │
│         (src/lib/performance/{types,auditor}.ts)       │
│                                                        │
│ - Reads budget.json configuration                      │
│ - Analyzes HTML markup (scripts, styles, img tags)     │
│ - Calculates raw and gzipped file sizes                │
│ - Asserts against strict budget constraints            │
└──────────────────────────┬─────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│     CLI (npm run audit:perf) │   │     CI Smoke Test Runner     │
│   (scripts/audit-perf.mjs)   │   │  (scripts/verify-build.mjs)  │
│                              │   │                              │
│ - Colorful ANSI budget table │   │ - Automated regression guard │
│ - Route-by-route breakdown   │   │ - Blocks non-compliant PRs  │
│ - Flags: --json, --ci        │   │   before deploy              │
└──────────────────────────────┘   └──────────────────────────────┘
```

---

## 3. Performance Budget Specifications (`budget.json`)

```json
{
  "budgets": {
    "editorialJsMaxBytes": 0,
    "interactiveJsMaxBytes": 20480,
    "cssGlobalMaxBytes": 25600,
    "htmlPageMaxBytes": 51200,
    "imageMaxBytes": 358400
  },
  "rules": {
    "requireImageDimensions": true,
    "requireImageAlt": true,
    "requireZeroEditorialJs": true,
    "allowedImageExtensions": [".webp", ".avif", ".svg", ".png", ".jpg", ".jpeg"]
  }
}
```

### 3.1. Budget Rules
1. **Zero Client-Side JavaScript on Editorial Routes:**
   - Editorial routes (`/`, `/blog/`, `/blog/:slug/`, `/:slug/`) must have **0 KB** of client scripts.
   - Interactive routes (`/preview`, `/doctor`) must not exceed **20 KB** of total JS.
2. **Global CSS Size:**
   - Total CSS in `dist/` must be `<= 25 KB` uncompressed (`<= 7 KB` gzipped).
3. **HTML Document Size:**
   - Emitted static HTML files must be `<= 50 KB` per page.
4. **Image & CLS Safety:**
   - Every `<img>` tag must include explicit `width` and `height` attributes (preventing Cumulative Layout Shift).
   - Every `<img>` tag must include an `alt` attribute.
   - Images must not exceed `350 KB`.

---

## 4. Auditor Module Interfaces

```ts
export interface PerformanceBudgetConfig {
  budgets: {
    editorialJsMaxBytes: number;
    interactiveJsMaxBytes: number;
    cssGlobalMaxBytes: number;
    htmlPageMaxBytes: number;
    imageMaxBytes: number;
  };
  rules: {
    requireImageDimensions: boolean;
    requireImageAlt: boolean;
    requireZeroEditorialJs: boolean;
    allowedImageExtensions: string[];
  };
}

export interface RouteAssetAudit {
  route: string;
  htmlPath: string;
  htmlSizeBytes: number;
  htmlGzipBytes: number;
  scriptsCount: number;
  scriptBytes: number;
  imagesCount: number;
  missingDimensionsCount: number;
  missingAltCount: number;
  isEditorial: boolean;
  passed: boolean;
  violations: string[];
}

export interface PerformanceAuditReport {
  timestamp: string;
  durationMs: number;
  passed: boolean;
  totalPages: number;
  totalCssBytes: number;
  totalCssGzipBytes: number;
  routes: RouteAssetAudit[];
  violations: string[];
}
```

---

## 5. CLI & CI Integration

### 5.1. CLI Tool (`npm run audit:perf`)
- Prints a clean ANSI budget comparison table with:
  - Route path
  - HTML size (raw / gzip)
  - JS bundle size (asserting 0 KB on editorial)
  - Image CLS / Alt audit
  - Pass/Fail status
- Exits with `0` on success and `1` on budget violation.

### 5.2. Build Verification (`npm run build:ci`)
- `scripts/verify-build.mjs` executes the performance auditor after the build succeeds, preventing asset bloat from landing in main or production.
