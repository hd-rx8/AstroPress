import { describe, expect, it } from 'vitest';
import { buildRobotsTxt, SITEMAP_INDEX_PATH } from '../../../src/lib/seo/robots';

describe('buildRobotsTxt', () => {
  it('allows all crawling and points to the sitemap index', () => {
    expect(buildRobotsTxt(new URL('https://www.example.com'), '/sitemap-index.xml')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://www.example.com/sitemap-index.xml\n',
    );
  });

  it('resolves the sitemap path against a site URL with a subpath-free origin', () => {
    expect(buildRobotsTxt(new URL('https://cms.example.com'), '/sitemap-index.xml')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://cms.example.com/sitemap-index.xml\n',
    );
  });

  it('uses the shared sitemap index path constant matching the installed integration default', () => {
    expect(SITEMAP_INDEX_PATH).toBe('/sitemap-index.xml');
  });
});
