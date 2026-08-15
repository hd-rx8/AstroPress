#!/usr/bin/env node
// @ts-check
/**
 * Static Performance Budget CLI Auditor (`npm run audit:perf`).
 *
 * Inspects compiled HTML/CSS assets in `dist/` against strict performance
 * budgets (Zero client JS on editorial pages, CSS <= 25 KB, CLS image safety).
 */

import console from 'node:console';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const args = process.argv.slice(2);
const isJson = args.includes('--json');
const isCi = args.includes('--ci');

// Import performance auditor
const { auditDistDirectory, DEFAULT_BUDGET_CONFIG } = await import(
  '../src/lib/performance/index.ts'
);

// Load budget.json if present
let budgetConfig = DEFAULT_BUDGET_CONFIG;
const budgetPath = path.join(projectRoot, 'budget.json');
if (existsSync(budgetPath)) {
  try {
    budgetConfig = JSON.parse(readFileSync(budgetPath, 'utf8'));
  } catch (err) {
    console.warn(`[Aviso] Falha ao ler budget.json, usando padrão: ${String(err)}`);
  }
}

if (!existsSync(distDir)) {
  console.error(`\n❌ Diretório \`dist/\` não encontrado. Execute \`npm run build\` antes de auditar.\n`);
  process.exit(1);
}

const report = await auditDistDirectory(distDir, budgetConfig);

if (isJson) {
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) {
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
console.log(`${bold}${cyan}║          ⚡  ASTROPRESS PERFORMANCE BUDGET AUDITOR             ║${reset}`);
console.log(`${bold}${cyan}╚════════════════════════════════════════════════════════════════╝${reset}\n`);

console.log(
  `${dim}Total de Páginas:${reset}  ${bold}${report.totalPages}${reset}   ` +
    `${dim}Total CSS:${reset} ${bold}${(report.totalCssBytes / 1024).toFixed(1)} KB${reset} ` +
    `${dim}(Gzip: ${(report.totalCssGzipBytes / 1024).toFixed(1)} KB / Limite: ${(budgetConfig.budgets.cssGlobalMaxBytes / 1024).toFixed(1)} KB)${reset}\n`,
);

// Render route table header
console.log(
  `${bold}${'Rota'.padEnd(30)} ${'HTML (Raw/Gzip)'.padEnd(18)} ${'Client JS'.padEnd(16)} ${'Imagens/CLS'.padEnd(16)} ${'Status'}${reset}`,
);
console.log(`${dim}${'─'.repeat(88)}${reset}`);

for (const r of report.routes) {
  const routeName = (r.route.length > 28 ? r.route.slice(0, 26) + '..' : r.route).padEnd(30);
  const htmlSize = `${(r.htmlSizeBytes / 1024).toFixed(1)}k / ${(r.htmlGzipBytes / 1024).toFixed(1)}k`.padEnd(18);

  let jsText = '';
  if (r.isEditorial) {
    jsText = r.scriptsCount === 0 ? `${green}0 KB (0 JS) ✓${reset}` : `${red}${r.scriptsCount} scripts ✖${reset}`;
  } else {
    jsText = `${(r.scriptBytes / 1024).toFixed(1)}k (Interativo)`;
  }
  const jsCol = jsText.padEnd(r.isEditorial ? 25 : 16);

  let imgText = '';
  if (r.imagesCount === 0) {
    imgText = `${dim}Sem imagens${reset}`;
  } else if (r.missingDimensionsCount === 0) {
    imgText = `${green}${r.imagesCount} img (0 CLS) ✓${reset}`;
  } else {
    imgText = `${red}${r.missingDimensionsCount} sem dim ✖${reset}`;
  }
  const imgCol = imgText.padEnd(25);

  const status = r.passed ? `${green}${bold}PASS ✓${reset}` : `${red}${bold}FAIL ✖${reset}`;

  console.log(`${routeName} ${htmlSize} ${jsCol} ${imgCol} ${status}`);
}

console.log(`${dim}${'─'.repeat(88)}${reset}\n`);

if (report.passed) {
  console.log(
    `${bold}${green}🎉 Todos os orçamentos de performance foram cumpridos com sucesso!${reset} ` +
      `${dim}(Tempo: ${report.durationMs}ms)${reset}\n`,
  );
} else {
  console.log(`${bold}${red}⚠️  Foram detectadas violações de orçamento de performance:${reset}\n`);
  for (const v of report.violations) {
    console.log(`  ${red}✖${reset} ${v}`);
  }
  console.log('');
  process.exit(1);
}
