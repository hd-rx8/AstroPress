import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BUDGET_CONFIG,
  auditHtmlContent,
  getGzipSizeBytes,
  isEditorialRoute,
} from '../../../src/lib/performance';

describe('Performance Budget - Route Identification', () => {
  it('correctly classifies editorial vs interactive routes', () => {
    expect(isEditorialRoute('/')).toBe(true);
    expect(isEditorialRoute('/blog')).toBe(true);
    expect(isEditorialRoute('/blog/hello-world')).toBe(true);
    expect(isEditorialRoute('/about')).toBe(true);

    expect(isEditorialRoute('/preview')).toBe(false);
    expect(isEditorialRoute('/preview/')).toBe(false);
    expect(isEditorialRoute('/doctor')).toBe(false);
    expect(isEditorialRoute('/doctor/')).toBe(false);
  });
});

describe('Performance Budget - HTML Content Audit', () => {
  it('passes compliant editorial HTML with zero scripts and valid images', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <title>Compliant Post</title>
          <script type="application/ld+json">{"@context":"https://schema.org"}</script>
        </head>
        <body>
          <h1>Title</h1>
          <img src="/photo.webp" width="800" height="600" alt="Sample photo" loading="lazy" />
        </body>
      </html>
    `;

    const result = auditHtmlContent(html, '/blog/hello-world');
    expect(result.passed).toBe(true);
    expect(result.scriptsCount).toBe(0); // application/ld+json is ignored
    expect(result.missingDimensionsCount).toBe(0);
    expect(result.missingAltCount).toBe(0);
    expect(result.violations).toHaveLength(0);
  });

  it('fails editorial HTML containing client JavaScript scripts', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Bad Page</title></head>
        <body>
          <h1>Title</h1>
          <script>console.log("bad inline script");</script>
        </body>
      </html>
    `;

    const result = auditHtmlContent(html, '/blog');
    expect(result.passed).toBe(false);
    expect(result.scriptsCount).toBe(1);
    expect(result.violations[0]).toContain('Página editorial contém 1 tag(s) <script>');
  });

  it('allows scripts within interactive routes like /preview', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Preview</title></head>
        <body>
          <script>console.log("preview live fetch");</script>
        </body>
      </html>
    `;

    const result = auditHtmlContent(html, '/preview');
    expect(result.passed).toBe(true);
    expect(result.scriptsCount).toBe(1);
  });

  it('detects images without explicit dimensions (CLS risk)', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <img src="/test.jpg" alt="No dimensions" />
        </body>
      </html>
    `;

    const result = auditHtmlContent(html, '/about');
    expect(result.passed).toBe(false);
    expect(result.missingDimensionsCount).toBe(1);
    expect(result.violations[0]).toContain('sem atributos explicitos width/height');
  });

  it('detects images without alt text', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <img src="/test.jpg" width="100" height="100" />
        </body>
      </html>
    `;

    const result = auditHtmlContent(html, '/about');
    expect(result.passed).toBe(false);
    expect(result.missingAltCount).toBe(1);
    expect(result.violations[0]).toContain('sem atributo alt');
  });

  it('calculates gzip sizes correctly', () => {
    const content = 'Hello world '.repeat(100);
    const rawLength = Buffer.byteLength(content, 'utf8');
    const gzipLength = getGzipSizeBytes(content);

    expect(gzipLength).toBeLessThan(rawLength);
  });

  it('enforces HTML page max size budget', () => {
    const hugeHtml = '<div>' + 'A'.repeat(60 * 1024) + '</div>';
    const result = auditHtmlContent(hugeHtml, '/', DEFAULT_BUDGET_CONFIG);

    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes('Tamanho HTML'))).toBe(true);
  });
});
