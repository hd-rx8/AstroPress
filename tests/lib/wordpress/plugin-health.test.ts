import { describe, expect, it } from 'vitest';

export interface AstroPressHealthResponse {
  status: string;
  timestamp: string;
  wordpress: {
    version: string;
    php_version: string;
    permalink_structure: string;
    is_pretty_permalinks: boolean;
    site_url: string;
    home_url: string;
  };
  astropress: {
    plugin_version: string;
    frontend_url: string;
    redirects_enabled: boolean;
    deploy_hook_configured: boolean;
    deploy_debounce_seconds: number;
  };
  seo_plugin: {
    active: 'yoast' | 'rank-math' | 'none';
    version: string | null;
  };
  endpoints: {
    posts: boolean;
    pages: boolean;
    categories: boolean;
    media: boolean;
  };
}

describe('AstroPress Health Endpoint Schema', () => {
  it('validates a compliant health check payload structure', () => {
    const mockHealthPayload: AstroPressHealthResponse = {
      status: 'ok',
      timestamp: '2026-08-15T00:00:00Z',
      wordpress: {
        version: '6.7.1',
        php_version: '8.3.0',
        permalink_structure: '/%postname%/',
        is_pretty_permalinks: true,
        site_url: 'http://localhost:8080',
        home_url: 'http://localhost:8080',
      },
      astropress: {
        plugin_version: '1.0.0',
        frontend_url: 'http://localhost:4321',
        redirects_enabled: true,
        deploy_hook_configured: true,
        deploy_debounce_seconds: 30,
      },
      seo_plugin: {
        active: 'yoast',
        version: '23.5',
      },
      endpoints: {
        posts: true,
        pages: true,
        categories: true,
        media: true,
      },
    };

    expect(mockHealthPayload.status).toBe('ok');
    expect(mockHealthPayload.wordpress.is_pretty_permalinks).toBe(true);
    expect(mockHealthPayload.astropress.plugin_version).toBe('1.0.0');
    expect(mockHealthPayload.astropress.frontend_url).toBe('http://localhost:4321');
    expect(mockHealthPayload.seo_plugin.active).toBe('yoast');
    expect(mockHealthPayload.endpoints.posts).toBe(true);
  });

  it('validates health response when no SEO plugin is installed', () => {
    const payloadWithoutSeo: AstroPressHealthResponse = {
      status: 'ok',
      timestamp: '2026-08-15T00:00:00Z',
      wordpress: {
        version: '6.7.1',
        php_version: '8.3.0',
        permalink_structure: '/%postname%/',
        is_pretty_permalinks: true,
        site_url: 'http://localhost:8080',
        home_url: 'http://localhost:8080',
      },
      astropress: {
        plugin_version: '1.0.0',
        frontend_url: '',
        redirects_enabled: false,
        deploy_hook_configured: false,
        deploy_debounce_seconds: 30,
      },
      seo_plugin: {
        active: 'none',
        version: null,
      },
      endpoints: {
        posts: true,
        pages: true,
        categories: true,
        media: true,
      },
    };

    expect(payloadWithoutSeo.status).toBe('ok');
    expect(payloadWithoutSeo.seo_plugin.active).toBe('none');
    expect(payloadWithoutSeo.seo_plugin.version).toBeNull();
    expect(payloadWithoutSeo.astropress.redirects_enabled).toBe(false);
  });
});
