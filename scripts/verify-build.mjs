// @ts-check
/**
 * Deterministic build smoke test (`npm run build:ci`).
 *
 * Starts the in-memory fixture WordPress server on a random local port,
 * runs `astro build` against it with a fake, local-only `SITE_URL`, then
 * asserts the expected static output files exist. Never touches a public
 * WordPress server, so it works offline and in CI.
 *
 * The fixture server is always closed in a `finally` block, even if the
 * build itself fails, so this script never leaves a stray process behind.
 */
import { spawn } from 'node:child_process';
import console from 'node:console';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { startFixtureWordPressServer } from './fixture-wp-server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const astroBin = path.join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');

const SITE_URL = 'https://starter.test';

const EXPECTED_FILES = [
  'index.html',
  path.join('blog', 'index.html'),
  path.join('blog', 'hello-world', 'index.html'),
  path.join('about', 'index.html'),
  path.join('preview', 'index.html'),
  path.join('doctor', 'index.html'),
  'robots.txt',
  'sitemap-index.xml',
  'sitemap-0.xml',
];

/**
 * Asserts what the build actually *emitted*, not merely that files exist.
 *
 * File-existence checks alone cannot catch rendering or configuration
 * regressions: a broken JSON-LD tag or a sitemap generated against the wrong
 * host both still produce every expected file. A JSON-LD regression reached
 * review exactly that way, which is what the JSON-LD check below guards.
 *
 * Note on scope: this script injects SITE_URL through `process.env`, so the
 * host-consistency checks verify that every emitted URL agrees with the host
 * the build was given — they do NOT by themselves cover the config phase
 * failing to read `.env`, since that path is not exercised here. The
 * regression test for that specific defect is `pickEnvValue` in
 * `tests/config/env.test.ts`; these assertions are the broader net that
 * catches any placeholder or mismatched host reaching real output.
 *
 * @param {string} distDir
 */
function verifyBuildOutput(distDir) {
  /** @param {string} file */
  const read = (file) => readFileSync(path.join(distDir, file), 'utf8');
  /** @param {unknown} condition @param {string} message */
  const assert = (condition, message) => {
    if (!condition) {
      throw new Error(`Build output assertion failed: ${message}`);
    }
  };

  // 1. JSON-LD is present, interpolated, and valid JSON — not the literal
  //    template expression, and not an empty tag.
  const postHtml = read(path.join('blog', 'hello-world', 'index.html'));
  const jsonLdMatch = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(postHtml);
  if (jsonLdMatch === null) {
    throw new Error('Build output assertion failed: post page has no application/ld+json script tag');
  }

  const jsonLdRaw = jsonLdMatch[1];
  let jsonLd;
  try {
    jsonLd = JSON.parse(jsonLdRaw);
  } catch (cause) {
    throw new Error(`Build output assertion failed: post page JSON-LD is not valid JSON: ${jsonLdRaw}`, { cause });
  }
  assert(jsonLd['@type'] === 'BlogPosting', `post JSON-LD @type is "${jsonLd['@type']}", expected "BlogPosting"`);
  assert(
    typeof jsonLd.headline === 'string' && jsonLd.headline.length > 0,
    `post JSON-LD headline is missing or empty (received: ${JSON.stringify(jsonLd.headline)})`,
  );

  // 2..4. Every emitted absolute URL agrees on the host the build was given.
  //    The sitemap check is the one that catches a config phase that cannot
  //    see SITE_URL and silently falls back to a placeholder host.
  const homeHtml = read('index.html');
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(homeHtml)?.[1];
  assert(canonical?.startsWith(SITE_URL), `home canonical is "${canonical}", expected it to start with "${SITE_URL}"`);

  const ogUrl = /<meta property="og:url" content="([^"]+)"/.exec(homeHtml)?.[1];
  assert(ogUrl?.startsWith(SITE_URL), `home og:url is "${ogUrl}", expected it to start with "${SITE_URL}"`);

  const sitemapLoc = /<loc>([^<]+)<\/loc>/.exec(read('sitemap-0.xml'))?.[1];
  assert(
    sitemapLoc?.startsWith(SITE_URL),
    `sitemap-0.xml first <loc> is "${sitemapLoc}", expected it to start with "${SITE_URL}" ` +
      '(a placeholder host here means the Astro config phase could not read SITE_URL)',
  );

  const robotsSitemap = /Sitemap: (\S+)/.exec(read('robots.txt'))?.[1];
  assert(
    robotsSitemap?.startsWith(SITE_URL),
    `robots.txt Sitemap is "${robotsSitemap}", expected it to start with "${SITE_URL}"`,
  );

  // 5. og:type is per-page, not hardcoded.
  assert(
    /<meta property="og:type" content="article"/.test(postHtml),
    'post page og:type is not "article"',
  );

  // 6. preview page output includes noindex robots directive
  const previewHtml = read(path.join('preview', 'index.html'));
  assert(
    /<meta name="robots" content="noindex,nofollow"/.test(previewHtml),
    'preview page is missing noindex,nofollow robots meta tag',
  );

  // 7. doctor page output includes noindex robots directive
  const doctorHtml = read(path.join('doctor', 'index.html'));
  assert(
    /<meta name="robots" content="noindex,nofollow"/.test(doctorHtml),
    'doctor page is missing noindex,nofollow robots meta tag',
  );
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {Promise<void>}
 */
function runAstroBuild(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [astroBin, 'build'], {
      cwd: projectRoot,
      env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`astro build exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const fixture = await startFixtureWordPressServer();

  try {
    await runAstroBuild({
      ...process.env,
      WORDPRESS_URL: fixture.url.href,
      SITE_URL: SITE_URL,
    });

    const distDir = path.join(projectRoot, 'dist');
    const missing = EXPECTED_FILES.filter((file) => !existsSync(path.join(distDir, file)));

    if (missing.length > 0) {
      throw new Error(`Missing expected build output file(s): ${missing.join(', ')}`);
    }

    verifyBuildOutput(distDir);

    console.log(
      `build:ci OK — verified ${EXPECTED_FILES.length} output file(s) and their contents in dist/.`,
    );
  } finally {
    await fixture.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
