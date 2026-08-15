#!/usr/bin/env node
// @ts-check
/**
 * Headless Doctor CLI Runner (`npm run doctor`).
 *
 * Runs comprehensive diagnostics against your decoupled WordPress CMS
 * and Astro configuration.
 */

import console from 'node:console';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Simple .env parser for standalone CLI execution
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

const args = process.argv.slice(2);
const isJson = args.includes('--json');
const isCi = args.includes('--ci');

// Import doctor diagnostics
const { runDoctorDiagnostics } = await import('../src/lib/doctor/index.ts');

const wpUrl = process.env.WORDPRESS_URL || localEnv.WORDPRESS_URL || 'http://localhost:8080';
const siteUrl = process.env.SITE_URL || localEnv.SITE_URL || 'http://localhost:4321';
const previewSecret = process.env.ASTROPRESS_PREVIEW_SECRET || localEnv.ASTROPRESS_PREVIEW_SECRET;

const report = await runDoctorDiagnostics({
  wordpressUrl: wpUrl,
  siteUrl,
  previewSecret,
});

if (isJson) {
  console.log(JSON.stringify(report, null, 2));
  if (isCi && !report.isHealthy) {
    process.exit(1);
  }
  process.exit(0);
}

// ANSI formatting helpers
const reset = '\x1b[0m';
const bold = '\x1b[1m';
const dim = '\x1b[2m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const cyan = '\x1b[36m';

console.log(`\n${bold}${cyan}╔════════════════════════════════════════════════════════════════╗${reset}`);
console.log(`${bold}${cyan}║              🩺  ASTROPRESS HEADLESS DOCTOR                    ║${reset}`);
console.log(`${bold}${cyan}╚════════════════════════════════════════════════════════════════╝${reset}\n`);

console.log(`${dim}WordPress CMS:${reset}  ${bold}${report.system.wordpressUrl}${reset}`);
console.log(`${dim}Astro Site:${reset}     ${bold}${report.system.siteUrl}${reset}`);
console.log(`${dim}Node Runtime:${reset}   ${report.system.nodeVersion}\n`);

for (const category of report.categories) {
  const catStatusIcon =
    category.status === 'pass'
      ? `${green}✔${reset}`
      : category.status === 'warn'
        ? `${yellow}▲${reset}`
        : `${red}✖${reset}`;

  console.log(`${bold}${catStatusIcon} ${category.title}${reset}`);

  for (const check of category.checks) {
    let icon = `${green}  ✓${reset}`;
    if (check.status === 'warn') {
      icon = `${yellow}  ⚠${reset}`;
    } else if (check.status === 'fail') {
      icon = `${red}  ✕${reset}`;
    }

    const latency = check.latencyMs !== undefined ? ` ${dim}(${check.latencyMs}ms)${reset}` : '';
    console.log(`${icon} ${bold}${check.name}:${reset} ${check.message}${latency}`);

    if (check.remedy) {
      console.log(`    ${cyan}↳ Solução:${reset} ${check.remedy}`);
    }
  }
  console.log('');
}

console.log(`${dim}────────────────────────────────────────────────────────────────${reset}`);
console.log(
  `${bold}Resumo:${reset} ` +
    `${green}${report.passed} OK${reset} · ` +
    `${yellow}${report.warnings} Avisos${reset} · ` +
    `${red}${report.failures} Falhas${reset} ` +
    `${dim}(Tempo total: ${report.durationMs}ms)${reset}\n`,
);

if (report.isHealthy) {
  console.log(`${bold}${green}🎉 Seu ambiente Headless WordPress + Astro está saudável e pronto!${reset}\n`);
} else {
  console.log(`${bold}${red}⚠️  Foram detectadas pendências que precisam ser corrigidas antes do deploy.${reset}\n`);
}

if (isCi && !report.isHealthy) {
  process.exit(1);
}
