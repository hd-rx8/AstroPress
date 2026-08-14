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
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { startFixtureWordPressServer } from './fixture-wp-server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const astroBin = path.join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');

const EXPECTED_FILES = [
  'index.html',
  path.join('blog', 'index.html'),
  path.join('blog', 'hello-world', 'index.html'),
  path.join('about', 'index.html'),
  'robots.txt',
  'sitemap-index.xml',
];

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
      SITE_URL: 'https://starter.test',
    });

    const distDir = path.join(projectRoot, 'dist');
    const missing = EXPECTED_FILES.filter((file) => !existsSync(path.join(distDir, file)));

    if (missing.length > 0) {
      throw new Error(`Missing expected build output file(s): ${missing.join(', ')}`);
    }

    console.log(`build:ci OK — verified ${EXPECTED_FILES.length} output file(s) in dist/.`);
  } finally {
    await fixture.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
