# 🚀 WordPress + Astro Headless Starter (AstroPress)

[![Astro 5](https://img.shields.io/badge/Astro-5.0-bc52ee.svg?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![WordPress](https://img.shields.io/badge/WordPress-6.0%2B-21759b.svg?style=flat-square&logo=wordpress&logoColor=white)](https://wordpress.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Zero-JS](https://img.shields.io/badge/Client%20JS-0%20KB%20(Zero--JS)-16a34a.svg?style=flat-square)](https://astro.build)
[![Performance](https://img.shields.io/badge/Lighthouse-100%2F100-22c55e.svg?style=flat-square)](https://pagespeed.web.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Performance-first WordPress Headless starter for Astro 5.** Static-first (SSG), TypeScript-strict, **0 KB client-side JavaScript** by default, with a decoupled content layer that keeps WordPress REST API details out of your pages and components.

Created and architected by [**hdrx**](https://github.com/hd-rx8).

---

## 🌟 Highlights

- **⚡ 0 KB Client-Side JavaScript:** High-performance static HTML/CSS compiled at build time. No client-side hydration penalty, instant First Contentful Paint (FCP) and **CLS = 0**.
- **🎨 Modern Editorial Design System:** Bespoke typography powered by *Plus Jakarta Sans* (Display) + *Inter* (Body) + *JetBrains Mono* (Code), asymmetric featured post cards, 3-column responsive grid, and previous/next article navigation.
- **🐳 Instant Out-of-the-Box Docker Setup:** Comes pre-packaged with a complete MySQL database (`wordpress/init.sql`), media assets, 6 comprehensive technical architecture articles, and the "About" README-in-site page.
- **🩺 Headless Doctor (CLI & Web Dashboard):** Automated 7-category diagnostic engine (`npm run doctor` and `/doctor`) verifying environment, connectivity, REST endpoints, permalinks, connector plugin, SEO, and draft preview.
- **👁️ Real-Time Draft Preview (`/preview`):** Tokenized handshake between the `astropress-connector` plugin and Astro's on-demand SSR route to view unpublished drafts without triggering a full rebuild.
- **🎯 4-Tier SEO Cascade & Schema.org JSON-LD:** Intelligent metadata cascade (Yoast SEO > Rank Math > Native WP Fields > Site Defaults) with structured JSON-LD graphs (`BlogPosting`, `BreadcrumbList`, `WebSite`).
- **🖼️ Automated Image Pipeline (`astro:assets`):** Compiles remote WordPress media into responsive WebP/AVIF formats at build time with explicit dimensions to eliminate Cumulative Layout Shift.
- **📊 Declarative Performance Budgets (`budget.json`):** Enforced in CI via `npm run audit:perf` to block CSS bloat (>25 KB) and accidental client JS on editorial pages.

---

## 🏛️ Architecture & Data Flow

WordPress remains your **editorial system of record** (Gutenberg, categories, authors, media library). Astro queries the WordPress REST API **at build time** and compiles pure static assets for Edge CDN deployment.

```text
┌─────────────────────────────────────────────────────────────┐
│                        WordPress CMS                        │
│   (Backend isolado: Gutenberg, mídias, taxonomias, posts)   │
└──────────────────────────────┬──────────────────────────────┘
                               │  REST API (/wp-json/wp/v2/*)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       Content Layer                         │
│   (src/lib/wordpress/ — client HTTP resiliente + normalizer)│
└──────────────────────────────┬──────────────────────────────┘
                               │  Normalized Types (Post, Page, Media)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       Astro 5 SSG                           │
│   (src/pages/**, src/components/** — Modern Design System)  │
└──────────────────────────────┬──────────────────────────────┘
                               │  HTML + CSS Estáticos (0 KB Client JS)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Edge CDN / Hosting                       │
│        (Cloudflare Pages, Vercel, Netlify, AWS S3)          │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start (3 Minutes)

### 1. Clone the repository and install dependencies
```bash
git clone https://github.com/hd-rx8/AstroPress-Headless-Starter.git
cd AstroPress-Headless-Starter
npm install
```

### 2. Start the pre-seeded local WordPress (Docker)
```bash
docker compose up -d
```
> 💡 *The Docker container starts with WordPress 6 and MySQL 8.4 pre-loaded with all demo articles, media attachments, permalinks (`/%postname%/`), and admin credits.*

### 3. Verify health and start development server
```bash
npm run doctor # Run automated diagnostics
npm run dev    # Starts Astro on http://localhost:4321
```

- **Frontend (Astro):** [`http://localhost:4321`](http://localhost:4321)
- **WordPress Admin:** [`http://localhost:8080/wp-admin`](http://localhost:8080/wp-admin) (`admin` / `admin`)
- **Web Diagnostics:** [`http://localhost:4321/doctor`](http://localhost:4321/doctor)

---

## 📚 Starter Articles & Architecture Guides Included

The starter database comes with 6 in-depth technical articles that serve as living documentation:

1. **Manifesto & Tese:** *Por que WordPress Headless + Astro 5 é a Arquitetura Definitiva* (`/blog/manifesto-wordpress-headless-astro/`)
2. **Deep Dive no Core:** *Normalização de Dados, Resiliência e Isolamento de Payloads* (`/blog/arquitetura-do-core-e-normalizacao/`)
3. **Guia Definitivo de Setup:** *Do Docker Local à Produção em Alta Escala* (`/blog/guia-definitivo-de-setup-e-deploy/`)
4. **Draft Preview em Tempo Real:** *Como Visualizar Rascunhos sem Rebuild* (`/blog/draft-preview-e-fluxo-editorial/`)
5. **Engenharia de SEO & Imagens:** *Cascata de Metadados e WebP/AVIF* (`/blog/seo-avancado-e-otimizacao-de-imagens/`)
6. **Observabilidade & Performance:** *Headless Doctor e Performance Budgets* (`/blog/observabilidade-doctor-e-performance-budgets/`)

---

## 🛠️ CLI Commands & Tooling

| Command | Purpose |
|---|---|
| `npm run dev` | Starts the Astro development server at `http://localhost:4321`. |
| `npm run build` | Compiles production-ready static assets in `dist/`. |
| `npm run build:ci` | Offline smoke test build against an in-memory fixture REST server. |
| `npm run doctor` | Runs the 7-category Headless Doctor diagnostic report. |
| `npm run audit:perf` | Inspects `dist/` and asserts against `budget.json` performance budgets. |
| `npm run seed` | Re-seeds local WordPress with the latest demo content and uploads. |
| `npm test` | Runs the unit and integration test suite with Vitest (130+ tests). |
| `npm run typecheck` | Validates TypeScript and Astro components (`astro check`). |
| `npm run lint` | Lints project files with ESLint. |

---

## ⚙️ Configuration (`.env`)

```env
# Base URL of your WordPress installation (no trailing slash, no /wp-json)
WORDPRESS_URL=http://localhost:8080

# Canonical public URL for the Astro site (used for sitemaps, robots & Open Graph)
SITE_URL=http://localhost:4321

# Shared secret token for authenticating on-demand draft preview requests
ASTROPRESS_PREVIEW_SECRET=astropress_preview_secret_token_123
```

---

## 🔒 Security & Performance Guarantees

- **Zero SQL/PHP Vulnerability on Frontend:** Public users only access static HTML files on the CDN. The WordPress backend and MySQL database remain private and unreachable from public traffic.
- **Zero CLS Image Pipeline:** All images define explicit aspect ratios and responsive widths, preventing Cumulative Layout Shift during page load.
- **Zero Editorial Client JS:** Editorial articles and institutional pages ship **0 bytes** of client JavaScript, guaranteeing maximum battery efficiency and instant response times on mobile devices.

---

## 👨‍💻 Author & Credits

- Created and maintained by [**hdrx**](https://github.com/hd-rx8).
- Repository: [**AstroPress-Headless-Starter**](https://github.com/hd-rx8/AstroPress-Headless-Starter).

## 📄 License

This project is licensed under the [MIT License](LICENSE).
