# WordPress Astro Headless Starter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Build a small static Astro starter that renders WordPress REST content through a typed, normalized integration layer.

**Architecture:** Validated environment configuration feeds a focused WordPress REST client. Post and page modules aggregate and normalize content before static Astro routes, UI, and SEO use it. The data layer remains independent of SSG so it can later support SSR/hybrid rendering.

**Tech Stack:** Astro, TypeScript strict, native fetch, Vitest, ESLint, plain CSS, @astrojs/sitemap, Docker Compose, GitHub Actions.

**Spec:** \`docs/superpowers/specs/2026-08-14-wordpress-astro-headless-starter-design.md\`

## Global Constraints

- SSG only; new WordPress content requires rebuild/deploy.
- Require exactly \`WORDPRESS_URL\` and \`SITE_URL\`; validate absolute HTTP(S), normalize trailing slashes, and reject \`/wp-json\` in the former.
- Keep environment access in one config module; components and routes never access raw environment or REST fields.
- Fetch posts with \`_embed=1&per_page=100\`: page 1 supplies \`X-WP-TotalPages\`, then fetch 2..N, aggregate, normalize, and reuse.
- Use \`HOME_POST_LIMIT = 6\`; home is recent posts, not a duplicate blog page.
- Fail builds for config, timeout, HTTP, JSON, or required-contract failures. Optional image, author, excerpt, and embedded fields remain optional.
- Preserve trusted WordPress HTML with \`set:html\`; no sanitization, Gutenberg/Elementor renderer, extra CMS endpoints, or page-builder asset pipeline.
- No SSR, webhook, categories/authors routes, GraphQL, auth, preview, search, WooCommerce, seeds, E2E, or generic CMS abstraction.
- Use Astro sitemap integration; robots uses the actual sitemap index URL configured for that integration.
- Keep UI responsive and minimal with plain CSS, no component library, Tailwind, animation system, or client-side API fetching.

---

## Target file structure

~~~text
.github/workflows/ci.yml                 CI quality gate
docker-compose.yml                       optional WordPress/MySQL
.env.example                             two required variables
astro.config.ts                          site URL and sitemap
src/config/env.ts                        validated environment boundary
src/config/site.ts                       fixed copy and HOME_POST_LIMIT
src/lib/wordpress/{types,errors,client,normalizers,posts,pages}.ts
src/lib/seo/{metadata,robots}.ts
src/lib/routes.ts
src/layouts/BaseLayout.astro
src/components/{PostCard,PostContent,Pagination}.astro
src/pages/{index,[slug],robots.txt}.ts|astro
src/pages/blog/{index,[slug]}.astro
src/pages/blog/page/[number].astro
src/styles/global.css
tests/fixtures/wordpress.ts
tests/config/env.test.ts
tests/lib/**/*.test.ts
scripts/{fixture-wp-server,verify-build}.mjs
README.md
~~~

### Task 1: Initialize the minimal Astro project and quality tooling

**Files:**
- Create: \`package.json\`, \`astro.config.ts\`, \`tsconfig.json\`, \`eslint.config.js\`, \`vitest.config.ts\`, \`.gitignore\`, \`.env.example\`, \`src/env.d.ts\`
- Create: \`src/pages/index.astro\`

**Interfaces:**
- Produces npm scripts \`dev\`, \`build\`, \`preview\`, \`typecheck\`, \`lint\`, \`test\`, \`test:watch\`, and \`build:ci\`.
- Produces strict TypeScript and Vitest discovery for \`tests/**/*.test.ts\`.

- [ ] **Step 1: Initialize Git and scaffold only the minimal Astro template**

~~~bash
git init
npm create astro@latest . -- --template minimal --typescript strict --no-install --no-git
~~~

If the CLI rejects the existing \`docs/\` directory, create the template in a temporary sibling directory and move only generated project files into the repository root; leave \`docs/\` intact. Do not choose a blog/theme template.

- [ ] **Step 2: Install exactly the base dependencies**

~~~bash
npm install
npm install @astrojs/sitemap
npm install -D vitest eslint @eslint/js typescript-eslint @astrojs/check
~~~

\`@astrojs/check\` is required because \`npm run typecheck\` runs \`astro check\`.

- [ ] **Step 3: Declare scripts and the public environment example**

Use these script values:

~~~json
{
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "typecheck": "astro check",
  "lint": "eslint .",
  "test": "vitest run --passWithNoTests",
  "test:watch": "vitest",
  "build:ci": "node scripts/verify-build.mjs"
}
~~~

Create \`.env.example\` exactly:

~~~env
WORDPRESS_URL=https://cms.example.com
SITE_URL=https://www.example.com
~~~

- [ ] **Step 4: Verify the foundation**

~~~bash
npm run typecheck
npm run lint
npm test
~~~

Expected: all pass with the generated placeholder page and empty test suite.

- [ ] **Step 5: Commit**

~~~bash
git add package.json package-lock.json astro.config.ts tsconfig.json eslint.config.js vitest.config.ts .gitignore .env.example src
git commit -m "chore: initialize Astro starter"
~~~

### Task 2: Add validated configuration and stable site settings

**Files:**
- Create: \`src/config/env.ts\`, \`src/config/site.ts\`
- Test: \`tests/config/env.test.ts\`

**Interfaces:**
- Produces \`loadEnv(source: Record<string, string | undefined>): AppEnv\`.
- Produces \`AppEnv = { wordpressUrl: URL; wordpressApiUrl: URL; siteUrl: URL }\`.
- Produces \`SITE = { name: string; description: string; homePostLimit: 6 }\`.

- [ ] **Step 1: Write failing configuration tests**

~~~ts
it('normalizes URLs and derives the WordPress REST URL', () => {
  expect(loadEnv({
    WORDPRESS_URL: 'https://cms.example.com/',
    SITE_URL: 'https://www.example.com/',
  })).toMatchObject({
    wordpressUrl: new URL('https://cms.example.com'),
    wordpressApiUrl: new URL('https://cms.example.com/wp-json/wp/v2'),
    siteUrl: new URL('https://www.example.com'),
  });
});

it.each([undefined, '', 'cms.example.com', 'ftp://cms.example.com', 'https://cms.example.com/wp-json'])
('rejects invalid WORDPRESS_URL values', (WORDPRESS_URL) => {
  expect(() => loadEnv({ WORDPRESS_URL, SITE_URL: 'https://www.example.com' })).toThrow(/WORDPRESS_URL/);
});
~~~

Add equivalent missing, relative, and non-HTTP(S) \`SITE_URL\` cases.

- [ ] **Step 2: Run the test and confirm failure**

~~~bash
npm test -- tests/config/env.test.ts
~~~

Expected: FAIL because \`loadEnv\` is missing.

- [ ] **Step 3: Implement the boundary**

Use \`new URL()\`, explicitly allow only \`http:\` and \`https:\`, require a root-only WordPress pathname, and trim a trailing slash before deriving \`/wp-json/wp/v2\`. Export one production constant:

~~~ts
export const env = loadEnv(import.meta.env);
~~~

Create:

~~~ts
export const SITE = {
  name: 'WordPress + Astro Headless Starter',
  description: 'A small static starter powered by WordPress REST API and Astro.',
  homePostLimit: 6,
} as const;
~~~

- [ ] **Step 4: Verify and commit**

~~~bash
npm test -- tests/config/env.test.ts
npm run typecheck
npm run lint
git add src/config tests/config
git commit -m "feat: validate WordPress and site URLs"
~~~

Expected: all commands pass.

### Task 3: Build the minimum WordPress REST transport boundary

**Files:**
- Create: \`src/lib/wordpress/types.ts\`, \`src/lib/wordpress/errors.ts\`, \`src/lib/wordpress/client.ts\`
- Test: \`tests/lib/wordpress/client.test.ts\`

**Interfaces:**
- Produces \`WordPressClient.get<T>(path: string, options?: { query?: Record<string, string | number> }): Promise<{ data: T; total?: number; totalPages?: number }>\`.
- Produces \`WordPressRequestError\` with \`operation\`, \`url\`, optional \`status\`, and cause.
- Defines only raw fields needed by V1 REST responses.

- [ ] **Step 1: Write failing mocked-fetch tests**

~~~ts
it('adds query parameters and reads WordPress pagination headers', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify([]), {
    status: 200,
    headers: { 'X-WP-Total': '3', 'X-WP-TotalPages': '1' },
  }));

  await expect(client.get<unknown[]>('posts', {
    query: { _embed: 1, per_page: 100, page: 1 },
  })).resolves.toEqual({ data: [], total: 3, totalPages: 1 });
});

it('reports HTTP operation, URL, and status', async () => {
  fetchMock.mockResolvedValue(new Response('error', {
    status: 500, statusText: 'Internal Server Error',
  }));
  await expect(client.get('posts')).rejects.toThrow(/Failed to fetch WordPress posts[\s\S]*500 Internal Server Error/);
});
~~~

Add timeout/rejected-fetch, malformed JSON, and 404 tests.

- [ ] **Step 2: Run to confirm failure**

~~~bash
npm test -- tests/lib/wordpress/client.test.ts
~~~

Expected: FAIL because the client is missing.

- [ ] **Step 3: Implement only transport behavior**

Create URLs with \`new URL()\` and \`URLSearchParams\`; use an \`AbortController\` and a 10-second timer. Reject non-2xx statuses before parsing JSON. Read pagination headers but do not normalize content or choose endpoints here. Format errors as:

~~~text
Failed to fetch WordPress posts
URL: https://cms.example.com/wp-json/wp/v2/posts?_embed=1&per_page=100&page=1
Status: 500 Internal Server Error
~~~

- [ ] **Step 4: Verify and commit**

~~~bash
npm test -- tests/lib/wordpress/client.test.ts
npm run typecheck
npm run lint
git add src/lib/wordpress tests/lib/wordpress/client.test.ts
git commit -m "feat: add WordPress REST client"
~~~

Expected: all pass.

### Task 4: Normalize the minimal WordPress contracts

**Files:**
- Create: \`src/lib/wordpress/normalizers.ts\`, \`tests/fixtures/wordpress.ts\`
- Modify: \`src/lib/wordpress/types.ts\`
- Test: \`tests/lib/wordpress/normalizers.test.ts\`

**Interfaces:**
- Produces \`Post = { id; slug; title; excerpt?; content; date; featuredImage?; author? }\`.
- Produces \`Page = { id; slug; title; content; excerpt?; date }\`.
- Produces \`normalizePost(raw)\` and \`normalizePage(raw)\`.

- [ ] **Step 1: Add fixtures and failing tests**

Fixtures contain required \`id\`, \`slug\`, \`date\`, \`title.rendered\`, \`content.rendered\`, optional \`excerpt.rendered\`, and minimal \`_embedded\` media/user arrays. Include a post with no embeds or excerpt.

~~~ts
it('does not expose rendered or embedded REST internals to the frontend', () => {
  expect(normalizePost(wordpressPostFixture)).toMatchObject({
    id: 42, slug: 'hello-world', title: 'Hello world',
    excerpt: 'A short excerpt.', content: '<p>Body</p>',
    featuredImage: { url: 'https://cms.example.com/uploads/hero.jpg', alt: 'Hero image' },
    author: { name: 'Ada Lovelace', slug: 'ada' },
  });
});

it('omits unavailable optional editorial fields', () => {
  expect(normalizePost(postWithoutEmbeddedData)).toMatchObject({
    featuredImage: undefined, author: undefined, excerpt: undefined,
  });
});
~~~

- [ ] **Step 2: Run to confirm failure**

~~~bash
npm test -- tests/lib/wordpress/normalizers.test.ts
~~~

Expected: FAIL because normalizers are missing.

- [ ] **Step 3: Implement pure normalizers**

Require only essential post/page fields; throw a contextual contract error if one is absent. Preserve \`content.rendered\` unchanged. Convert title and excerpt to display/plain-text values, stripping excerpt tags and collapsing whitespace. Defensively use only the first embedded featured-media and author record. Do not type or export unrelated WordPress fields.

- [ ] **Step 4: Verify and commit**

~~~bash
npm test -- tests/lib/wordpress/normalizers.test.ts tests/lib/wordpress/client.test.ts
npm run typecheck
git add src/lib/wordpress/normalizers.ts src/lib/wordpress/types.ts tests/fixtures/wordpress.ts tests/lib/wordpress/normalizers.test.ts
git commit -m "feat: normalize WordPress content"
~~~

Expected: all pass.

### Task 5: Aggregate every post API page and retrieve pages

**Files:**
- Create: \`src/lib/wordpress/posts.ts\`, \`src/lib/wordpress/pages.ts\`
- Test: \`tests/lib/wordpress/posts.test.ts\`, \`tests/lib/wordpress/pages.test.ts\`

**Interfaces:**
- Produces \`getAllPosts(): Promise<Post[]>\`.
- Produces \`paginatePosts(posts: Post[], page: number, pageSize: number): { items: Post[]; page: number; totalPages: number }\`.
- Produces \`getAllPages(): Promise<Page[]>\` and \`assertNoReservedPageSlugs(pages: Page[]): void\`.
- Exports \`WORDPRESS_API_PAGE_SIZE = 100\` and \`BLOG_PAGE_SIZE = 12\`.

- [ ] **Step 1: Write failing aggregation tests**

~~~ts
it('fetches all REST pages after reading page one total pages', async () => {
  client.get.mockResolvedValueOnce({ data: [rawPost1], totalPages: 3 });
  client.get.mockResolvedValueOnce({ data: [rawPost2] });
  client.get.mockResolvedValueOnce({ data: [rawPost3] });

  await expect(getAllPosts()).resolves.toHaveLength(3);
  expect(client.get).toHaveBeenNthCalledWith(1, 'posts', { query: { _embed: 1, per_page: 100, page: 1 } });
  expect(client.get).toHaveBeenNthCalledWith(2, 'posts', { query: { _embed: 1, per_page: 100, page: 2 } });
  expect(client.get).toHaveBeenNthCalledWith(3, 'posts', { query: { _embed: 1, per_page: 100, page: 3 } });
});

it('paginates a complete normalized collection', () => {
  expect(paginatePosts(posts13, 2, 12)).toEqual({ items: [posts13[12]], page: 2, totalPages: 2 });
});
~~~

Test failure for missing/invalid page-one \`X-WP-TotalPages\`, and a \`blog\` collision in page slugs.

- [ ] **Step 2: Run to confirm failure**

~~~bash
npm test -- tests/lib/wordpress/posts.test.ts tests/lib/wordpress/pages.test.ts
~~~

Expected: FAIL because query modules are missing.

- [ ] **Step 3: Implement the complete-collection contract**

Fetch post page one with \`_embed=1&per_page=100&page=1\`. Validate a positive integer \`totalPages\`; sequentially fetch 2..N using the same query; aggregate raw records; then normalize the full collection exactly once and sort newest first. \`paginatePosts\` only slices that collection. Fetch pages with native pages API and normalize them. Reject root page slugs \`blog\` and \`robots.txt\`, naming the collision.

Memoize \`getAllPosts()\` and \`getAllPages()\` each behind a module-level cached Promise so concurrent/repeated calls within the same build process reuse one in-flight or resolved fetch instead of re-querying the REST API. This is in-memory deduplication for a single build run only, not a persistent cache.

- [ ] **Step 4: Verify and commit**

~~~bash
npm test -- tests/lib/wordpress/posts.test.ts tests/lib/wordpress/pages.test.ts
npm run typecheck
npm run lint
git add src/lib/wordpress/posts.ts src/lib/wordpress/pages.ts tests/lib/wordpress/posts.test.ts tests/lib/wordpress/pages.test.ts
git commit -m "feat: load paginated WordPress content"
~~~

Expected: all pass.

### Task 6: Centralize metadata, JSON-LD, and path construction

**Files:**
- Create: \`src/lib/routes.ts\`, \`src/lib/seo/metadata.ts\`
- Test: \`tests/lib/routes.test.ts\`, \`tests/lib/seo/metadata.test.ts\`

**Interfaces:**
- Produces \`blogPagePath(page)\`, \`postPath(slug)\`, and \`pagePath(slug)\`.
- Produces \`buildMetadata({ title, description?, path, imageUrl? }): Metadata\`.
- Produces \`buildPostJsonLd(post, canonicalUrl): Record<string, unknown>\`.

- [ ] **Step 1: Write failing path and SEO tests**

~~~ts
expect(blogPagePath(1)).toBe('/blog/');
expect(blogPagePath(2)).toBe('/blog/page/2/');
expect(postPath('hello-world')).toBe('/blog/hello-world/');
expect(pagePath('about')).toBe('/about/');

expect(buildMetadata({
  title: 'Hello', description: 'Short.', path: '/blog/hello/',
  imageUrl: 'https://cms.example.com/hero.jpg',
})).toMatchObject({
  canonical: 'https://www.example.com/blog/hello/',
  openGraph: { image: 'https://cms.example.com/hero.jpg' },
});

expect(buildPostJsonLd(postWithoutEmbeddedData, 'https://www.example.com/blog/hello/'))
  .not.toHaveProperty('author');
~~~

Test empty excerpt fallback to \`SITE.description\`, JSON-LD image omission, and exclusion of blog page one from the dynamic pagination route.

- [ ] **Step 2: Run to confirm failure**

~~~bash
npm test -- tests/lib/routes.test.ts tests/lib/seo/metadata.test.ts
~~~

Expected: FAIL because helpers are missing.

- [ ] **Step 3: Implement minimum SEO semantics**

Use \`new URL(path, env.siteUrl)\` for canonicals. Emit \`BlogPosting\` only with known fields: context, type, headline, datePublished, URL, mainEntityOfPage, optional author, and optional image. Generic pages get shared metadata but no schema. Use \`summary_large_image\` only with an image; otherwise \`summary\`.

- [ ] **Step 4: Verify and commit**

~~~bash
npm test -- tests/lib/routes.test.ts tests/lib/seo/metadata.test.ts
npm run typecheck
git add src/lib/routes.ts src/lib/seo/metadata.ts tests/lib/routes.test.ts tests/lib/seo/metadata.test.ts
git commit -m "feat: add routes and shared SEO metadata"
~~~

Expected: all pass.

### Task 7: Render the static Astro frontend

**Files:**
- Create: \`src/layouts/BaseLayout.astro\`, \`src/components/PostCard.astro\`, \`src/components/PostContent.astro\`, \`src/components/Pagination.astro\`, \`src/styles/global.css\`
- Modify/Create: \`src/pages/index.astro\`, \`src/pages/blog/index.astro\`, \`src/pages/blog/page/[number].astro\`, \`src/pages/blog/[slug].astro\`, \`src/pages/[slug].astro\`

**Interfaces:**
- \`BaseLayout\` consumes \`Metadata\` and optional JSON-LD.
- \`PostCard\` consumes \`Post\`; \`PostContent\` consumes \`{ html: string }\`.
- Routes consume normalized \`Post\`/ \`Page\` values and the query/SEO modules only.

- [ ] **Step 1: Implement visual primitives before pages**

Make one simple responsive global stylesheet: system font stack, readable max width, accessible focus styles, cards, static pagination, and a semantic \`.prose\` area. Do not add client directives.

\`PostContent.astro\` contains the sole raw-HTML rendering boundary:

~~~astro
---
const { html } = Astro.props;
---
<article class="prose" set:html={html} />
~~~

- [ ] **Step 2: Implement layout and cards**

\`BaseLayout\` must render title, description, canonical, OG/Twitter metadata, and a JSON-LD script only when provided. \`PostCard\` conditionally renders featured image, excerpt, and author. \`Pagination\` links page 1 to \`/blog/\` and later pages to \`/blog/page/N/\`.

- [ ] **Step 3: Implement static paths and pages**

Use only complete normalized collections:

~~~text
/                    posts.slice(0, SITE.homePostLimit)
/blog/                paginatePosts(posts, 1, BLOG_PAGE_SIZE)
/blog/page/[number]/  paths 2..totalPages only
/blog/[slug]/         route props carry each normalized Post
/[slug]/              route props carry each normalized Page after slug validation
~~~

Post pages use \`buildPostJsonLd\`. Home/blog/page pages use generic metadata. Do not issue post-by-slug fetches in static route generation.

- [ ] **Step 4: Verify rendering compilation and commit**

~~~bash
npm test
npm run typecheck
npm run lint
git add src
git commit -m "feat: render static WordPress pages"
~~~

Expected: all pass. Defer actual build until Task 8 provides a fixture server.

### Task 8: Add sitemap, robots, deterministic build smoke test, and CI

**Files:**
- Modify: \`astro.config.ts\`, \`package.json\`
- Create: \`src/lib/seo/robots.ts\`, \`src/pages/robots.txt.ts\`, \`tests/lib/seo/robots.test.ts\`
- Create: \`scripts/fixture-wp-server.mjs\`, \`scripts/verify-build.mjs\`, \`.github/workflows/ci.yml\`

**Interfaces:**
- Astro uses \`site: env.siteUrl.href\` and \`integrations: [sitemap()]\`.
- Produces \`buildRobotsTxt(site: URL, sitemapPath: string): string\`.
- \`build:ci\` starts a localhost fixture REST API, runs Astro build with local-only env values, asserts output, and shuts down.

- [ ] **Step 1: Write failing robots and fixture-build assertions**

~~~ts
expect(buildRobotsTxt(new URL('https://www.example.com'), '/sitemap-index.xml')).toBe(
  'User-agent: *\nAllow: /\n\nSitemap: https://www.example.com/sitemap-index.xml\n',
);
~~~

The implementation chooses the default sitemap index path of the installed official integration and holds it in one shared constant. The fixture server must serve posts page 1 with \`X-WP-Total: 2\` and \`X-WP-TotalPages: 1\`, plus one \`about\` page; unknown paths return 404.

- [ ] **Step 2: Run to confirm failure**

~~~bash
npm test -- tests/lib/seo/robots.test.ts
npm run build:ci
~~~

Expected: both fail because robots/build infrastructure is missing.

- [ ] **Step 3: Implement sitemap and robots**

Configure the official integration in \`astro.config.ts\`; \`robots.txt.ts\` returns text/plain built from the shared sitemap path and \`env.siteUrl\`. Do not add the sitemap filename to WordPress page-slug validation.

- [ ] **Step 4: Implement the local build harness**

Use \`node:http\` and a random local port. In \`verify-build.mjs\`, pass:

~~~js
{ WORDPRESS_URL: fixture.url, SITE_URL: 'https://starter.test' }
~~~

Spawn \`astro build\`, then assert \`dist/index.html\`, \`dist/blog/index.html\`, \`dist/blog/hello-world/index.html\`, \`dist/about/index.html\`, \`dist/robots.txt\`, and the sitemap output exist. Always close the HTTP server in \`finally\`.

- [ ] **Step 5: Add GitHub Actions and verify**

~~~yaml
on:
  push:
  pull_request:
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build:ci
~~~

Run locally:

~~~bash
npm test
npm run typecheck
npm run lint
npm run build:ci
~~~

Expected: all pass without a public WordPress server.

- [ ] **Step 6: Commit**

~~~bash
git add astro.config.ts src/lib/seo src/pages/robots.txt.ts scripts tests/lib/seo .github/workflows/ci.yml package.json
git commit -m "ci: verify static WordPress starter"
~~~

### Task 9: Add optional local WordPress and complete documentation

**Files:**
- Create: \`docker-compose.yml\`, \`README.md\`
- Modify: \`.env.example\`

**Interfaces:**
- Docker runs WordPress and MySQL only; no Astro service or source-code dependency.
- README is the installation and architectural guide.

- [ ] **Step 1: Add isolated Compose services**

Create \`wordpress\` and \`mysql\` services with named persistent volumes, localhost ports, and standard database environment variables. Do not add a custom image, plugin volume, seed/import, reverse proxy, or Astro container.

- [ ] **Step 2: Write the README around verified user flows**

Include:
1. headless WordPress explanation and this diagram:

~~~text
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
       │ build
       ▼
   Static HTML
~~~

2. external-CMS quick start: \`npm install\`, copy \`.env.example\`, set two URLs, \`npm run dev\`;
3. optional \`docker compose up -d\` path and manual creation of demo posts/pages;
4. REST \`_embed\`, full page aggregation, \`per_page=100\`, and routes;
5. SSG rebuild limitation, SEO, tests, CI, and static deployment;
6. trusted HTML warning and Elementor/page-builder fidelity limitation;
7. every explicit V1 exclusion and roadmap boundary from the spec.

- [ ] **Step 3: Verify isolation and configuration**

~~~bash
docker compose config
npm test
npm run typecheck
npm run lint
npm run build:ci
rg -n "docker|compose" src
~~~

Expected: Compose validates; Node checks pass; the final ripgrep command emits no source-code references to Docker.

- [ ] **Step 4: Commit documentation and local demo infrastructure**

~~~bash
git add README.md docker-compose.yml .env.example
git commit -m "docs: document WordPress Astro starter"
~~~

### Task 10: Perform release acceptance against a real WordPress installation

**Files:**
- Modify: \`README.md\` only if an observed setup/documentation issue requires a precise correction.

**Interfaces:**
- Confirms the public quick-start contract works with a trusted, real WordPress REST API.

- [ ] **Step 1: Configure a real CMS in local .env**

~~~env
WORDPRESS_URL=https://your-trusted-cms.example.com
SITE_URL=https://starter.example.com
~~~

- [ ] **Step 2: Run the development server and manual acceptance check**

~~~bash
npm run dev
~~~

Verify home has at most six recent posts; blog page one and an additional page appear when content exceeds 12 items; post detail works with and without featured image; a root-level WordPress page works; canonical/OG fields and post JSON-LD are present; trusted editorial HTML renders; robots references sitemap output.

- [ ] **Step 3: Confirm the expected SSG behavior**

Run a production build, publish it to a static host, create a new WordPress post, and confirm it appears only after a fresh build/deploy. Document this as intentional V1 behavior, not a defect.

- [ ] **Step 4: Run final checks and commit any documentation correction**

~~~bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build:ci
git status --short
~~~

Expected: all checks pass and there are no uncommitted implementation changes. If README corrections were needed:

~~~bash
git add README.md
git commit -m "docs: clarify starter setup"
~~~

