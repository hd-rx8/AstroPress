import { describe, expect, it } from 'vitest';
import { buildMetadata } from '../../../src/lib/seo/metadata';
import { getSeoData } from '../../../src/lib/wordpress/seo';
import {
  postWithPartialSeoFixture,
  postWithRankMathFixture,
  postWithYoastSeoFixture,
} from '../../fixtures/wordpress';

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

describe('getSeoData with SEO plugins', () => {
  it('extracts Yoast SEO metadata when yoast_head_json is present', () => {
    const seo = getSeoData({ raw: postWithYoastSeoFixture, path: '/blog/yoast-post/' });
    expect(seo.title).toBe('Custom Yoast Title & Insights');
    expect(seo.description).toBe('Custom Yoast Meta Description with "quotes".');
    expect(seo.canonical).toBe('https://www.example.com/blog/yoast-post/');
    expect(seo.robots).toBe('index,follow');
    expect(seo.openGraph.image).toBe('https://cms.example.com/uploads/yoast-og.jpg');
    expect(seo.twitter.card).toBe('summary_large_image');
  });

  it('extracts Rank Math metadata when rank_math_seo is present', () => {
    const seo = getSeoData({ raw: postWithRankMathFixture, path: '/blog/rank-math-post/' });
    expect(seo.title).toBe('Rank Math Custom Title');
    expect(seo.description).toBe('Rank Math Meta Description.');
    expect(seo.canonical).toBe('https://www.example.com/blog/rank-math-post/');
    expect(seo.robots).toBe('index,follow');
    expect(seo.openGraph.image).toBe('https://cms.example.com/uploads/rankmath-og.jpg');
  });

  it('falls back to native WordPress fields when plugin fields are empty or partial', () => {
    const seo = getSeoData({ raw: postWithPartialSeoFixture, path: '/blog/partial-seo/' });
    expect(seo.title).toBe('Hello world');
    expect(seo.description).toBe('A short excerpt.');
  });
});
