import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import type { PerformanceAuditReport, PerformanceBudgetConfig, RouteAssetAudit } from './types.ts';

export const DEFAULT_BUDGET_CONFIG: PerformanceBudgetConfig = {
  budgets: {
    editorialJsMaxBytes: 0,
    interactiveJsMaxBytes: 20480, // 20 KB
    cssGlobalMaxBytes: 25600, // 25 KB
    htmlPageMaxBytes: 51200, // 50 KB
    imageMaxBytes: 358400, // 350 KB
  },
  rules: {
    requireImageDimensions: true,
    requireImageAlt: true,
    requireZeroEditorialJs: true,
    allowedImageExtensions: ['.webp', '.avif', '.svg', '.png', '.jpg', '.jpeg'],
  },
};

/** Calculates gzip byte size synchronously. */
export function getGzipSizeBytes(content: string | Buffer): number {
  return gzipSync(content).length;
}

/** Determines if a route is an editorial content page (which forbids client JS). */
export function isEditorialRoute(route: string): boolean {
  const clean = route.replace(/^\/|\/$/g, '');
  if (clean === 'preview' || clean.startsWith('preview/')) return false;
  if (clean === 'doctor' || clean.startsWith('doctor/')) return false;
  return true;
}

/** Analyzes a single HTML string against performance budget rules. */
export function auditHtmlContent(
  html: string,
  route: string,
  config: PerformanceBudgetConfig = DEFAULT_BUDGET_CONFIG,
): RouteAssetAudit {
  const violations: string[] = [];
  const editorial = isEditorialRoute(route);

  const rawBytes = Buffer.byteLength(html, 'utf8');
  const gzipBytes = getGzipSizeBytes(html);

  // Check HTML page size
  if (rawBytes > config.budgets.htmlPageMaxBytes) {
    violations.push(
      `Tamanho HTML (${(rawBytes / 1024).toFixed(1)} KB) excede o limite de ${(config.budgets.htmlPageMaxBytes / 1024).toFixed(1)} KB.`,
    );
  }

  // Parse scripts (exclude application/ld+json and spec-compliant data tags)
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let scriptsCount = 0;
  let scriptBytes = 0;

  let scriptMatch: RegExpExecArray | null;
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    const attrs = scriptMatch[1] || '';
    const scriptContent = scriptMatch[2] || '';

    // Ignore Schema.org JSON-LD scripts
    if (/type=["']application\/ld\+json["']/i.test(attrs)) {
      continue;
    }

    scriptsCount += 1;
    scriptBytes += Buffer.byteLength(scriptContent, 'utf8');
  }

  // Enforce Zero-JS on editorial routes
  if (editorial && config.rules.requireZeroEditorialJs && scriptsCount > 0) {
    violations.push(
      `Página editorial contém ${scriptsCount} tag(s) <script>. O limite para páginas editoriais é 0 KB (zero client JavaScript).`,
    );
  } else if (!editorial && scriptBytes > config.budgets.interactiveJsMaxBytes) {
    violations.push(
      `Tamanho de scripts da rota interativa (${(scriptBytes / 1024).toFixed(1)} KB) excede o limite de ${(config.budgets.interactiveJsMaxBytes / 1024).toFixed(1)} KB.`,
    );
  }

  // Parse images for CLS prevention (width/height attributes) and Alt accessibility
  const imgRegex = /<img\b([^>]*)\/?>/gi;
  let imagesCount = 0;
  let missingDimensionsCount = 0;
  let missingAltCount = 0;

  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    imagesCount += 1;
    const attrs = imgMatch[1] || '';

    const hasWidth = /\bwidth=["'][^"']+["']/i.test(attrs);
    const hasHeight = /\bheight=["'][^"']+["']/i.test(attrs);
    const hasAlt = /\balt=["'][^"']*["']/i.test(attrs);

    if (config.rules.requireImageDimensions && (!hasWidth || !hasHeight)) {
      missingDimensionsCount += 1;
    }

    if (config.rules.requireImageAlt && !hasAlt) {
      missingAltCount += 1;
    }
  }

  if (missingDimensionsCount > 0) {
    violations.push(
      `${missingDimensionsCount} imagem(ns) sem atributos explicitos width/height (risco de CLS/Cumulative Layout Shift).`,
    );
  }

  if (missingAltCount > 0) {
    violations.push(
      `${missingAltCount} imagem(ns) sem atributo alt (problema de acessibilidade/SEO).`,
    );
  }

  return {
    route,
    htmlPath: route === '/' ? 'index.html' : `${route.replace(/^\/|\/$/g, '')}/index.html`,
    htmlSizeBytes: rawBytes,
    htmlGzipBytes: gzipBytes,
    scriptsCount,
    scriptBytes,
    imagesCount,
    missingDimensionsCount,
    missingAltCount,
    isEditorial: editorial,
    passed: violations.length === 0,
    violations,
  };
}

/** Recursively collects all files matching specific extensions in a directory. */
function findFilesRecursively(dir: string, extensions: string[]): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFilesRecursively(fullPath, extensions));
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Audits the static output directory (`dist/`) against performance budgets.
 *
 * @param distDir Absolute path to the compiled dist folder.
 * @param config Optional budget configuration override.
 * @returns Complete audit report.
 */
export async function auditDistDirectory(
  distDir: string,
  config: PerformanceBudgetConfig = DEFAULT_BUDGET_CONFIG,
): Promise<PerformanceAuditReport> {
  const start = Date.now();
  const globalViolations: string[] = [];

  if (!existsSync(distDir)) {
    throw new Error(`Diretório de build não encontrado: ${distDir}. Execute \`npm run build\` antes de auditar.`);
  }

  // 1. Audit CSS files
  const cssFiles = findFilesRecursively(distDir, ['.css']);
  let totalCssBytes = 0;
  let totalCssGzipBytes = 0;

  for (const file of cssFiles) {
    const content = readFileSync(file);
    totalCssBytes += content.length;
    totalCssGzipBytes += getGzipSizeBytes(content);
  }

  if (totalCssBytes > config.budgets.cssGlobalMaxBytes) {
    globalViolations.push(
      `Tamanho total do CSS (${(totalCssBytes / 1024).toFixed(1)} KB) excede o orçamento de ${(config.budgets.cssGlobalMaxBytes / 1024).toFixed(1)} KB.`,
    );
  }

  // 2. Audit HTML pages
  const htmlFiles = findFilesRecursively(distDir, ['.html']);
  const routes: RouteAssetAudit[] = [];

  for (const file of htmlFiles) {
    const relPath = path.relative(distDir, file).replace(/\\/g, '/');
    let route = '/' + relPath.replace(/(^|\/)index\.html$/, '$1');
    if (route !== '/' && route.endsWith('/')) {
      route = route.slice(0, -1);
    }

    const htmlContent = readFileSync(file, 'utf8');
    const routeAudit = auditHtmlContent(htmlContent, route, config);
    routes.push(routeAudit);

    if (!routeAudit.passed) {
      for (const v of routeAudit.violations) {
        globalViolations.push(`[Rota ${route}]: ${v}`);
      }
    }
  }

  const durationMs = Date.now() - start;
  const passed = globalViolations.length === 0;

  return {
    timestamp: new Date().toISOString(),
    durationMs,
    passed,
    totalPages: htmlFiles.length,
    totalCssBytes,
    totalCssGzipBytes,
    routes,
    violations: globalViolations,
  };
}
