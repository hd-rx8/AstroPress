# Milestone 7: Performance Budgets & Static Assets Auditor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Performance Budget auditor engine, configuration (`budget.json`), CLI runner (`npm run audit:perf`), and CI build integration to guarantee zero editorial JS and strict asset size limits.

**Architecture:** A static performance auditor (`src/lib/performance/`) inspects the compiled `dist/` directory, checks HTML AST for scripts/styles/images, calculates uncompressed and gzipped payload sizes, and enforces budget thresholds defined in `budget.json`. The CLI runner (`scripts/audit-performance.mjs`) formats the report into terminal tables, and `scripts/verify-build.mjs` prevents budget regressions during CI.

**Tech Stack:** TypeScript strict, Node.js (`node:fs`, `node:zlib`, `node:path`), Vitest.

---

## Global Constraints

- Must strictly assert **0 KB of client JavaScript** on editorial routes (`/`, `/blog/`, `/blog/:slug/`, `/:slug/`).
- Global CSS must not exceed **25 KB** uncompressed.
- All `<img>` tags must have explicit `width`, `height`, and `alt` attributes to guarantee CLS = 0.
- Full verification pass (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build:ci`, `npm run audit:perf`).

---

## Target File Structure

```text
budget.json                                    (Declarative budget limits)
src/
  lib/
    performance/
      types.ts                                 (PerformanceReport, RouteAssetAudit types)
      auditor.ts                               (dist directory scanner & HTML analyzer)
      index.ts                                 (Public entry point)
scripts/
  audit-performance.mjs                        (CLI runner: npm run audit:perf)
  verify-build.mjs                             (Updated with automated budget assertions)
tests/
  lib/
    performance/
      performance.test.ts                      (Unit tests for budget assertions)
package.json                                   (Adds "audit:perf" script)
README.md                                      (Documents performance budgets)
docs/architecture.md                           (Documents Milestone 7 architecture)
```

---

### Task 1: Create Budget Configuration & Auditor Engine

**Files:**
- Create: `budget.json`
- Create: `src/lib/performance/types.ts`
- Create: `src/lib/performance/auditor.ts`
- Create: `src/lib/performance/index.ts`

**Interfaces:**
- Produces: `auditDistDirectory(distDir, config?): Promise<PerformanceAuditReport>`

- [ ] **Step 1: Create `budget.json`**

Define budgets for JS, CSS, HTML, and CLS image rules.

- [ ] **Step 2: Create `src/lib/performance/types.ts`**

Define TypeScript types for route asset audits, budget configurations, and audit reports.

- [ ] **Step 3: Create `src/lib/performance/auditor.ts`**

Implement HTML inspection (finding `<script>`, `<link rel="stylesheet">`, `<img>`), size calculation with gzip (`node:zlib`), and budget validation.

- [ ] **Step 4: Create `src/lib/performance/index.ts`**

Export public audit functions and default budget configs.

- [ ] **Step 5: Commit**

```bash
git add budget.json src/lib/performance
git commit -m "feat(perf): implement performance budget auditor engine"
```

---

### Task 2: Implement Unit Tests for Performance Auditor

**Files:**
- Create: `tests/lib/performance/performance.test.ts`

**Interfaces:**
- Validates: `auditDistDirectory` and `auditHtmlContent` against compliant and non-compliant samples.

- [ ] **Step 1: Write `tests/lib/performance/performance.test.ts`**

Test:
- Compliant editorial route (0 scripts, valid images, small size).
- Editorial route with rogue `<script>` (fails zero-JS budget).
- Missing `width`/`height` on `<img>` (fails CLS rule).
- Global CSS exceeding budget limit.

- [ ] **Step 2: Run tests**

```bash
npm test -- tests/lib/performance/performance.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add tests/lib/performance/performance.test.ts
git commit -m "test(perf): add unit tests for performance budget assertions"
```

---

### Task 3: Build CLI Diagnostic Tool (`scripts/audit-performance.mjs`)

**Files:**
- Create: `scripts/audit-performance.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run audit:perf` CLI runner with ANSI table format, `--ci`, and `--json` support.

- [ ] **Step 1: Create `scripts/audit-performance.mjs`**

Implement terminal formatter showing route sizes, gzip comparisons, script count, and pass/fail summary.

- [ ] **Step 2: Add `"audit:perf": "node scripts/audit-performance.mjs"` to `package.json`**

- [ ] **Step 3: Commit**

```bash
git add scripts/audit-performance.mjs package.json
git commit -m "feat(cli): add npm run audit:perf CLI tool"
```

---

### Task 4: Integrate Performance Budgets into CI Smoke Test (`scripts/verify-build.mjs`)

**Files:**
- Modify: `scripts/verify-build.mjs`

**Interfaces:**
- Runs: `auditDistDirectory` as part of `npm run build:ci`.

- [ ] **Step 1: Update `scripts/verify-build.mjs` to call `auditDistDirectory`**
- [ ] **Step 2: Run `npm run build:ci`**
- [ ] **Step 3: Commit**

```bash
git add scripts/verify-build.mjs
git commit -m "ci(perf): enforce performance budgets in build smoke test"
```

---

### Task 5: Documentation & Full Verification Suite

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`

**Interfaces:**
- Documents: Performance budgets, CLI usage, and CI rules.

- [ ] **Step 1: Update `README.md` and `docs/architecture.md`**
- [ ] **Step 2: Run full verification suite**

```bash
npm test
npm run typecheck
npm run lint
npm run build:ci
npm run audit:perf
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/
git commit -m "docs(perf): document performance budgets and asset auditor"
```

---
