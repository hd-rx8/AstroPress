import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env';

describe('loadEnv', () => {
  it('normalizes URLs and derives the WordPress REST URL', () => {
    expect(
      loadEnv({
        WORDPRESS_URL: 'https://cms.example.com/',
        SITE_URL: 'https://www.example.com/',
      }),
    ).toMatchObject({
      wordpressUrl: new URL('https://cms.example.com'),
      wordpressApiUrl: new URL('https://cms.example.com/wp-json/wp/v2'),
      siteUrl: new URL('https://www.example.com'),
    });
  });

  it.each([undefined, '', 'cms.example.com', 'ftp://cms.example.com', 'https://cms.example.com/wp-json'])(
    'rejects invalid WORDPRESS_URL values (%s)',
    (WORDPRESS_URL) => {
      expect(() => loadEnv({ WORDPRESS_URL, SITE_URL: 'https://www.example.com' })).toThrow(
        /WORDPRESS_URL/,
      );
    },
  );

  it.each([undefined, '', 'www.example.com', 'ftp://www.example.com'])(
    'rejects invalid SITE_URL values (%s)',
    (SITE_URL) => {
      expect(() =>
        loadEnv({ WORDPRESS_URL: 'https://cms.example.com', SITE_URL }),
      ).toThrow(/SITE_URL/);
    },
  );

  it('rejects a relative SITE_URL', () => {
    expect(() =>
      loadEnv({ WORDPRESS_URL: 'https://cms.example.com', SITE_URL: '/blog' }),
    ).toThrow(/SITE_URL/);
  });
});
