import { describe, expect, it, vi } from 'vitest';
import {
  checkConnectivity,
  checkConnectorPlugin,
  checkEnvironment,
  checkImageConfiguration,
  checkPreviewHandshake,
  checkRestEndpoints,
  checkSeoIngestion,
  runDoctorDiagnostics,
} from '../../../src/lib/doctor';

describe('Headless Doctor - Environment Checks', () => {
  it('passes when all environment variables are properly formatted', () => {
    const report = checkEnvironment({
      wordpressUrl: 'https://cms.example.com',
      siteUrl: 'https://www.example.com',
      previewSecret: 'valid-secret-123',
    });

    expect(report.status).toBe('pass');
    expect(report.checks.every((c) => c.status === 'pass')).toBe(true);
  });

  it('recognizes local Docker development setup gracefully', () => {
    const report = checkEnvironment({
      wordpressUrl: 'http://localhost:8080',
      siteUrl: 'http://localhost:4321',
    });

    expect(report.status).toBe('warn'); // only warn due to optional preview secret
    expect(report.checks.find((c) => c.id === 'env_wp_url')?.message).toContain('Ambiente Local detectado');
    expect(report.checks.find((c) => c.id === 'env_site_url')?.message).toContain('Ambiente Local detectado');
  });

  it('fails when WORDPRESS_URL contains a subpath or is missing', () => {
    const missing = checkEnvironment({ siteUrl: 'https://www.example.com' });
    expect(missing.status).toBe('fail');
    expect(missing.checks.some((c) => c.id === 'env_wp_url' && c.status === 'fail')).toBe(true);

    const subpath = checkEnvironment({
      wordpressUrl: 'https://cms.example.com/wp-json',
      siteUrl: 'https://www.example.com',
    });
    expect(subpath.status).toBe('fail');
    expect(subpath.checks.some((c) => c.id === 'env_wp_url_root' && c.status === 'fail')).toBe(true);
  });

  it('warns when ASTROPRESS_PREVIEW_SECRET is missing', () => {
    const report = checkEnvironment({
      wordpressUrl: 'https://cms.example.com',
      siteUrl: 'https://www.example.com',
      previewSecret: undefined,
    });

    expect(report.status).toBe('warn');
    expect(report.checks.some((c) => c.id === 'env_preview_secret' && c.status === 'warn')).toBe(true);
  });
});

describe('Headless Doctor - Connectivity & REST Checks', () => {
  it('checks connectivity and discovers REST index', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string | URL) => {
      const urlStr = url.toString();
      if (urlStr.endsWith('/wp-json/')) {
        return new Response(JSON.stringify({ name: 'My WP Site', namespaces: ['wp/v2'] }), {
          status: 200,
        });
      }
      return new Response(null, { status: 200 });
    });

    const report = await checkConnectivity('https://cms.example.com', fetchMock as never);
    expect(report.status).toBe('pass');
    expect(report.checks).toHaveLength(2);
  });

  it('verifies core REST endpoints with total headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'X-WP-Total': '42' },
      }),
    );

    const report = await checkRestEndpoints('https://cms.example.com', fetchMock as never);
    expect(report.status).toBe('pass');
    expect(report.checks).toHaveLength(4);
    expect(report.checks[0].message).toContain('42 registros');
  });
});

describe('Headless Doctor - Plugin & SEO Checks', () => {
  it('detects healthy AstroPress Connector plugin with pretty permalinks', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'ok',
          astropress: {
            plugin_version: '1.1.0',
            frontend_url: 'https://www.example.com',
            redirects_enabled: true,
          },
          wordpress: {
            is_pretty_permalinks: true,
            permalink_structure: '/%postname%/',
          },
        }),
        { status: 200 },
      ),
    );

    const report = await checkConnectorPlugin('https://cms.example.com', fetchMock as never);
    expect(report.status).toBe('pass');
    expect(report.checks.some((c) => c.id === 'plugin_permalinks' && c.status === 'pass')).toBe(true);
  });

  it('detects Yoast SEO in sample post', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 1,
            title: { rendered: 'Post' },
            yoast_head_json: { title: 'Yoast Title' },
          },
        ]),
        { status: 200 },
      ),
    );

    const report = await checkSeoIngestion('https://cms.example.com', fetchMock as never);
    expect(report.status).toBe('pass');
    expect(report.checks[0].message).toContain('Yoast SEO');
  });

  it('validates preview handshake when authorized', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1, title: { rendered: 'Draft' } }), {
        status: 200,
      }),
    );

    const report = await checkPreviewHandshake(
      'https://cms.example.com',
      'my-secret',
      fetchMock as never,
    );
    expect(report.status).toBe('pass');
  });
});

describe('Headless Doctor - Image Configuration & Full Engine Run', () => {
  it('validates remote image host patterns', () => {
    const report = checkImageConfiguration('https://cms.example.com');
    expect(report.status).toBe('pass');
    expect(report.checks[0].message).toContain('cms.example.com');
  });

  it('aggregates full report with timing and health state', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'X-WP-Total': '5' },
      }),
    );

    const report = await runDoctorDiagnostics({
      wordpressUrl: 'https://cms.example.com',
      siteUrl: 'https://www.example.com',
      previewSecret: 'secret',
      fetchFn: fetchMock as never,
    });

    expect(report.isHealthy).toBe(true);
    expect(report.totalChecks).toBeGreaterThan(5);
    expect(report.categories.length).toBe(7);
  });
});
