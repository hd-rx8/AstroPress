import { describe, expect, it } from 'vitest';
import { buildMetadata } from '../../../src/lib/seo/metadata';
import { getSeoData } from '../../../src/lib/wordpress/seo';

describe('getSeoData', () => {
  it('builds metadata identical to buildMetadata for the same input', () => {
    const input = { title: 'Hello', path: '/blog/hello/' };
    expect(getSeoData(input)).toEqual(buildMetadata(input));
  });

  it('defaults robots to index,follow', () => {
    expect(getSeoData({ title: 'About', path: '/about/' }).robots).toBe('index,follow');
  });

  it('honors an explicit noindex robots directive', () => {
    expect(getSeoData({ title: 'Draft', path: '/draft/', robots: 'noindex,follow' }).robots).toBe('noindex,follow');
  });
});
