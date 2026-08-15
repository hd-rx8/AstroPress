// @ts-check
/**
 * Deterministic build smoke test (`npm run build:ci`).
 *
 * Starts the in-memory fixture WordPress server on a random local port,
 * runs `astro build` against it with a fake, local-only `SITE_URL`, then
 * asserts the expected static output files exist and satisfy strict
 * performance budgets. Never touches a public WordPress server, so it
 * works offline and in CI.
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
import { auditDistDirectory, DEFAULT_BUDGET_CONFIG } from '../src/lib/performance/index.ts';
import { startFixtureWordPressServer } from './fixture-wp-server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const astroBin = path.join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');

const SITE_URL = 'https://starter.test';

const EXPECTED_FILES = [
  'index.html',
  path.join('blog', 'index.html'),
  path.join('blog', 'manifesto-wordpress-headless-astro', 'index.html'),
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
  const postHtml = read(path.join('blog', 'manifesto-wordpress-headless-astro', 'index.html'));
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

    // 8. Performance Budget Assertions
    const perfReport = await auditDistDirectory(distDir, DEFAULT_BUDGET_CONFIG);
    if (!perfReport.passed) {
      throw new Error(`Performance Budget violation(s):\n${perfReport.violations.join('\n')}`);
    }

    console.log(
      `build:ci OK — verified ${EXPECTED_FILES.length} output file(s) and passed all performance budgets in dist/.`,
    );
  } finally {
    await fixture.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
