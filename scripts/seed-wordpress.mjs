#!/usr/bin/env node
// @ts-check
/**
 * WordPress Seeder Script (`npm run seed`).
 *
 * Populates your local Docker WordPress with the 6 AstroPress starter
 * posts, categories, permalinks, and the rocket cover image.
 */

import { execSync } from 'node:child_process';
import console from 'node:console';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function loadLocalEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, 'utf8');
  /** @type {Record<string, string>} */
  const parsed = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["'](.*)["']$/, '$1');
      parsed[key] = val;
    }
  }
  return parsed;
}

const localEnv = loadLocalEnv();
const wpUrl = process.env.WORDPRESS_URL || localEnv.WORDPRESS_URL || 'http://localhost:8080';

console.log(`\n🚀 Conectando ao WordPress em: ${wpUrl}...`);

try {
  const containerName = 'wordpress-astro-headless-starter-wordpress-1';
  const imgPath = path.join(projectRoot, 'public', 'images', 'rocket-cover.jpg');
  const phpScriptPath = path.join(projectRoot, 'scripts', 'seed-wp-docker.php');

  // Copy rocket image and seed script to container
  execSync(`docker cp "${imgPath}" ${containerName}:/var/www/html/rocket-cover.jpg`, { stdio: 'pipe' });
  execSync(`docker cp "${phpScriptPath}" ${containerName}:/var/www/html/seed.php`, { stdio: 'pipe' });

  // Execute PHP seeder
  const output = execSync(`docker exec -i ${containerName} php /var/www/html/seed.php`, { encoding: 'utf8' });
  console.log(output);

  console.log(`\n✨ Seeding concluído! Recarregue a página ${wpUrl}/wp-admin/edit.php para ver os posts.\n`);
} catch (err) {
  console.warn(`[Aviso] Falha ao executar seeder via Docker direto: ${String(err)}`);
  console.log(`\n💡 Se você estiver usando um WordPress remoto, acesse ${wpUrl}/wp-admin para criar seus posts.\n`);
}
