// @ts-check
/**
 * Minimal, in-memory, WordPress-shaped REST API server used only by
 * `verify-build.mjs` to give `astro build` something real to fetch from
 * without depending on a public WordPress instance.
 *
 * Serves exactly enough of `/wp-json/wp/v2/posts` and `/wp-json/wp/v2/pages`
 * for the frontend's `getAllPosts()` / `getAllPages()` to succeed: one posts
 * REST page (`X-WP-Total: 2`, `X-WP-TotalPages: 1`) containing a post
 * slugged `hello-world` (asserted at `dist/blog/hello-world/index.html`),
 * and one page slugged `about` (asserted at `dist/about/index.html`).
 * Unknown paths return 404, matching real WordPress behavior for the
 * `createWordPressClient` transport layer, which only checks `response.ok`.
 */
import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { URL } from 'node:url';

const POSTS = [
  {
    id: 1,
    slug: 'hello-world',
    date: '2026-01-05T09:00:00',
    title: { rendered: 'Hello world' },
    content: { rendered: '<p>Hello from the fixture WordPress server.</p>' },
    excerpt: { rendered: '<p>Hello from the fixture WordPress server.</p>' },
  },
  {
    id: 2,
    slug: 'second-post',
    date: '2026-01-06T09:00:00',
    title: { rendered: 'Second post' },
    content: { rendered: '<p>Another fixture post.</p>' },
    excerpt: { rendered: '<p>Another fixture post.</p>' },
  },
];

const PAGES = [
  {
    id: 100,
    slug: 'about',
    date: '2026-01-01T09:00:00',
    title: { rendered: 'About' },
    content: { rendered: '<p>About this fixture site.</p>' },
    excerpt: { rendered: '<p>About this fixture site.</p>' },
  },
];

/**
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {unknown} body
 * @param {Record<string, string>} [headers]
 */
function sendJson(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

/**
 * Starts the fixture server on a random local port.
 *
 * @returns {Promise<{ url: URL, close: () => Promise<void> }>}
 */
export function startFixtureWordPressServer() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost');

      if (url.pathname === '/wp-json/wp/v2/posts') {
        sendJson(res, 200, POSTS, {
          'X-WP-Total': String(POSTS.length),
          'X-WP-TotalPages': '1',
        });
        return;
      }

      if (url.pathname === '/wp-json/wp/v2/pages') {
        sendJson(res, 200, PAGES, {
          'X-WP-Total': String(PAGES.length),
          'X-WP-TotalPages': '1',
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'rest_no_route', message: 'Not found.' }));
    });

    server.on('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('Fixture WordPress server failed to bind to a port.'));
        return;
      }

      const url = new URL(`http://127.0.0.1:${address.port}/`);
      resolve({
        url,
        close: () =>
          new Promise((resolveClose, rejectClose) => {
            server.close((err) => (err ? rejectClose(err) : resolveClose()));
          }),
      });
    });
  });
}
