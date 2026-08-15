# Milestone 6: Headless Doctor Automated Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Headless Doctor automated diagnostic engine, CLI command (`npm run doctor`), and `/doctor` web dashboard to audit headless WordPress + Astro health.

**Architecture:** A pure TypeScript diagnostic engine (`src/lib/doctor/`) runs categorized asynchronous checks against environment variables, WordPress endpoints, AstroPress Connector health, permalinks, SEO plugin metadata, and image pipelines. A Node CLI runner (`scripts/doctor.mjs`) renders color-coded terminal reports with `--ci`/`--json` support, and `src/pages/doctor.astro` renders a frontend dashboard.

**Tech Stack:** TypeScript strict, Astro, Node.js (CLI), Vitest, Vanilla CSS.

---

## Global Constraints

- Diagnostic engine must handle network timeouts and offline servers gracefully without unhandled exceptions.
- CLI must support `--ci` flag (exit code 1 if critical failures occur) and `--json` flag (prints pure JSON report).
- Keep static SSG builds 100% functional (`/doctor` static build with client-side interactive audit execution).
- Full test pass (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build:ci`).

---

## Target File Structure

```text
src/
  lib/
    doctor/
      types.ts                         (DoctorReport, DoctorCheck, DoctorCategory types)
      checks.ts                        (7 diagnostic check suites)
      index.ts                         (Runner & report aggregator)
  pages/
    doctor.astro                       (Web diagnostics dashboard)
scripts/
  doctor.mjs                           (CLI diagnostic runner)
  verify-build.mjs                     (Includes /doctor in static output verification)
tests/
  lib/
    doctor/
      doctor.test.ts                   (Unit tests for diagnostic checks)
package.json                           (Adds "doctor" npm script)
README.md                              (Documents npm run doctor and /doctor)
docs/architecture.md                   (Documents Milestone 6 architecture)
```

---

### Task 1: Create Headless Doctor Core Types & Checks Engine

**Files:**
- Create: `src/lib/doctor/types.ts`
- Create: `src/lib/doctor/checks.ts`
- Create: `src/lib/doctor/index.ts`

**Interfaces:**
- Produces: `runDoctorDiagnostics(options?): Promise<DoctorReport>`
- Produces: `DoctorReport`, `DoctorCheck`, `DoctorCategoryReport`, `CheckStatus`.

- [ ] **Step 1: Create `src/lib/doctor/types.ts`**

Define data structures for check results, categories, and report summaries.

- [ ] **Step 2: Create `src/lib/doctor/checks.ts`**

Implement checks for:
1. Environment configuration (`WORDPRESS_URL`, `SITE_URL`, `ASTROPRESS_PREVIEW_SECRET`).
2. Network connectivity & REST index (`/wp-json/`).
3. Core REST endpoints (`/posts`, `/pages`, `/categories`, `/media`).
4. AstroPress Connector plugin health (`/astropress/v1/health`), permalink format, and redirects.
5. SEO metadata ingestion (`yoast_head_json`, `rank_math_seo`).
6. Draft preview handshake (`/astropress/v1/preview`).
7. Image optimization configuration.

- [ ] **Step 3: Create `src/lib/doctor/index.ts`**

Implement `runDoctorDiagnostics()` orchestrating all check suites and calculating aggregate metrics.

- [ ] **Step 4: Commit**

```bash
git add src/lib/doctor
git commit -m "feat(doctor): implement Headless Doctor core diagnostic engine"
```

---

### Task 2: Implement Unit Tests for Diagnostic Engine

**Files:**
- Create: `tests/lib/doctor/doctor.test.ts`

**Interfaces:**
- Validates: `runDoctorDiagnostics` against valid, warning, and failure scenarios.

- [ ] **Step 1: Write `tests/lib/doctor/doctor.test.ts`**

Test passing reports, warning reports (e.g. slow latency or plain permalinks), and failure reports (e.g. unreachable endpoint).

- [ ] **Step 2: Run tests**

```bash
npm test -- tests/lib/doctor/doctor.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add tests/lib/doctor/doctor.test.ts
git commit -m "test(doctor): add comprehensive unit tests for diagnostic checks"
```

---

### Task 3: Build CLI Diagnostic Tool (`scripts/doctor.mjs`)

**Files:**
- Create: `scripts/doctor.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run doctor` CLI runner with ANSI output, `--ci`, and `--json` flags.

- [ ] **Step 1: Create `scripts/doctor.mjs`**

Implement terminal formatter with ANSI colors, boxes, checkmarks, timing stats, and fix remedies.

- [ ] **Step 2: Add `"doctor": "node scripts/doctor.mjs"` to `package.json`**

- [ ] **Step 3: Test CLI runner against fixture server**

- [ ] **Step 4: Commit**

```bash
git add scripts/doctor.mjs package.json
git commit -m "feat(cli): add npm run doctor CLI diagnostic runner"
```

---

### Task 4: Build Web Diagnostics Dashboard (`src/pages/doctor.astro`)

**Files:**
- Create: `src/pages/doctor.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: `/doctor` frontend route displaying live interactive diagnostics.

- [ ] **Step 1: Create `src/pages/doctor.astro`**

Implement client-side interactive audit execution with category cards, status badges, and remediation tips.

- [ ] **Step 2: Add dashboard styling to `src/styles/global.css`**

- [ ] **Step 3: Commit**

```bash
git add src/pages/doctor.astro src/styles/global.css
git commit -m "feat(ui): add /doctor web diagnostics dashboard"
```

---

### Task 5: Documentation & Full Verification Suite

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `scripts/verify-build.mjs`

**Interfaces:**
- Produces: Complete documentation and CI verification of the doctor route.

- [ ] **Step 1: Update `scripts/verify-build.mjs` to include `/doctor/index.html`**
- [ ] **Step 2: Update `README.md` and `docs/architecture.md`**
- [ ] **Step 3: Run full verification suite**

```bash
npm test
npm run typecheck
npm run lint
npm run build:ci
```

- [ ] **Step 4: Commit**

```bash
git add README.md docs/ scripts/verify-build.mjs
git commit -m "docs(doctor): document Headless Doctor CLI and web dashboard"
```

---
