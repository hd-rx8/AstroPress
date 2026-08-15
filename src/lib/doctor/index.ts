import {
  checkConnectivity,
  checkConnectorPlugin,
  checkEnvironment,
  checkImageConfiguration,
  checkPreviewHandshake,
  checkRestEndpoints,
  checkSeoIngestion,
} from './checks.ts';
import type { DoctorCategoryReport, DoctorReport, DoctorRunnerOptions } from './types.ts';

export {
  checkConnectivity,
  checkConnectorPlugin,
  checkEnvironment,
  checkImageConfiguration,
  checkPreviewHandshake,
  checkRestEndpoints,
  checkSeoIngestion,
} from './checks.ts';

export type { CheckStatus, DoctorCategoryReport, DoctorCheck, DoctorReport, DoctorRunnerOptions } from './types.ts';

/**
 * Runs the full suite of Headless Doctor diagnostic checks.
 *
 * @param options Optional overrides for environment and fetch implementation.
 * @returns Complete structured diagnostic report.
 */
export async function runDoctorDiagnostics(options: DoctorRunnerOptions = {}): Promise<DoctorReport> {
  const start = Date.now();

  const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : undefined;
  const procEnv = typeof process !== 'undefined' && process.env ? process.env : undefined;

  const resolvedWpUrl =
    options.wordpressUrl ??
    (metaEnv?.WORDPRESS_URL as string | undefined) ??
    procEnv?.WORDPRESS_URL ??
    'http://localhost:8080';

  const resolvedSiteUrl =
    options.siteUrl ??
    (metaEnv?.SITE_URL as string | undefined) ??
    procEnv?.SITE_URL ??
    'http://localhost:4321';

  const resolvedSecret =
    options.previewSecret ??
    (metaEnv?.ASTROPRESS_PREVIEW_SECRET as string | undefined) ??
    procEnv?.ASTROPRESS_PREVIEW_SECRET;

  const resolvedOptions: DoctorRunnerOptions = {
    wordpressUrl: resolvedWpUrl,
    siteUrl: resolvedSiteUrl,
    previewSecret: resolvedSecret,
    fetchFn: options.fetchFn ?? fetch,
    timeoutMs: options.timeoutMs ?? 5000,
  };

  const categories: DoctorCategoryReport[] = [];

  // 1. Environment & Configuration
  const envReport = checkEnvironment(resolvedOptions);
  categories.push(envReport);

  // If WordPress URL is valid, proceed with remote network checks
  if (resolvedWpUrl && resolvedWpUrl.startsWith('http')) {
    // 2. Connectivity
    const connReport = await checkConnectivity(resolvedWpUrl, resolvedOptions.fetchFn, resolvedOptions.timeoutMs);
    categories.push(connReport);

    // 3. Core REST Endpoints
    const endpointsReport = await checkRestEndpoints(resolvedWpUrl, resolvedOptions.fetchFn, resolvedOptions.timeoutMs);
    categories.push(endpointsReport);

    // 4. AstroPress Connector Plugin & Health
    const pluginReport = await checkConnectorPlugin(resolvedWpUrl, resolvedOptions.fetchFn, resolvedOptions.timeoutMs);
    categories.push(pluginReport);

    // 5. SEO Ingestion
    const seoReport = await checkSeoIngestion(resolvedWpUrl, resolvedOptions.fetchFn, resolvedOptions.timeoutMs);
    categories.push(seoReport);

    // 6. Draft Preview Handshake
    const previewReport = await checkPreviewHandshake(
      resolvedWpUrl,
      resolvedOptions.previewSecret,
      resolvedOptions.fetchFn,
      resolvedOptions.timeoutMs,
    );
    categories.push(previewReport);

    // 7. Image Optimization
    const imageReport = checkImageConfiguration(resolvedWpUrl);
    categories.push(imageReport);
  }

  // Aggregate metrics
  let totalChecks = 0;
  let passed = 0;
  let warnings = 0;
  let failures = 0;

  for (const cat of categories) {
    for (const check of cat.checks) {
      totalChecks += 1;
      if (check.status === 'pass') passed += 1;
      else if (check.status === 'warn') warnings += 1;
      else if (check.status === 'fail') failures += 1;
    }
  }

  const durationMs = Date.now() - start;
  const isHealthy = failures === 0;

  return {
    timestamp: new Date().toISOString(),
    durationMs,
    isHealthy,
    totalChecks,
    passed,
    warnings,
    failures,
    categories,
    system: {
      nodeVersion: typeof process !== 'undefined' ? process.version : 'browser',
      wordpressUrl: resolvedWpUrl || 'N/A',
      siteUrl: resolvedSiteUrl || 'N/A',
    },
  };
}
