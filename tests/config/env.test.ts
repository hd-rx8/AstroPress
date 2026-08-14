import { describe, expect, it } from 'vitest';
import { loadEnv, pickEnvValue } from '../../src/config/env';

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

  it.each(['https://example.com/blog', 'https://example.com/blog/', 'https://example.com/a/b'])(
    'rejects a SITE_URL with a subpath (%s)',
    (SITE_URL) => {
      // V1 serves from a domain root only. A subpath would be silently dropped
      // when route paths are resolved against it, so it must fail loudly here
      // rather than produce wrong canonicals, JSON-LD, and sitemap references.
      expect(() => loadEnv({ WORDPRESS_URL: 'https://cms.example.com', SITE_URL })).toThrow(/SITE_URL/);
    },
  );

  it('explains that subpath deployments are unsupported when rejecting one', () => {
    expect(() =>
      loadEnv({ WORDPRESS_URL: 'https://cms.example.com', SITE_URL: 'https://example.com/blog' }),
    ).toThrow(/not supported in V1/);
  });

  it('accepts a root SITE_URL with or without a trailing slash', () => {
    for (const SITE_URL of ['https://www.example.com', 'https://www.example.com/']) {
      expect(loadEnv({ WORDPRESS_URL: 'https://cms.example.com', SITE_URL }).siteUrl).toEqual(
        new URL('https://www.example.com'),
      );
    }
  });
});

describe('pickEnvValue', () => {
  it('reads a value present only in the .env files', () => {
    // Regression test for the config phase being blind to `.env`: Astro loads
    // `astro.config.ts` before it loads `.env` for the app, so consulting only
    // `process.env` there made a `SITE_URL` set solely in `.env` invisible and
    // silently fell back to a placeholder host in the generated sitemap.
    expect(pickEnvValue('SITE_URL', {}, { SITE_URL: 'https://www.example.com' })).toBe(
      'https://www.example.com',
    );
  });

  it('lets process.env win over a .env file value', () => {
    expect(
      pickEnvValue(
        'SITE_URL',
        { SITE_URL: 'https://from-process.example.com' },
        { SITE_URL: 'https://from-file.example.com' },
      ),
    ).toBe('https://from-process.example.com');
  });

  it('reports genuinely unset values as undefined', () => {
    expect(pickEnvValue('SITE_URL', {}, {})).toBeUndefined();
  });

  it('treats an empty string in either source as unset', () => {
    expect(pickEnvValue('SITE_URL', { SITE_URL: '' }, {})).toBeUndefined();
    expect(pickEnvValue('SITE_URL', {}, { SITE_URL: '' })).toBeUndefined();
  });
});
