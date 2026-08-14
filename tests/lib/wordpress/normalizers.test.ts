import { describe, expect, it } from 'vitest';
import { normalizePage, normalizePost } from '../../../src/lib/wordpress/normalizers';
import {
  pageWithoutExcerpt,
  postWithEmptyEmbeds,
  postWithoutEmbeddedData,
  wordpressPageFixture,
  wordpressPostFixture,
} from '../../fixtures/wordpress';

describe('normalizePost', () => {
  it('does not expose rendered or embedded REST internals to the frontend', () => {
    expect(normalizePost(wordpressPostFixture)).toMatchObject({
      id: 42,
      slug: 'hello-world',
      title: 'Hello world',
      excerpt: 'A short excerpt.',
      content: '<p>Body</p>',
      featuredImage: { url: 'https://cms.example.com/uploads/hero.jpg', alt: 'Hero image' },
      author: { name: 'Ada Lovelace', slug: 'ada' },
    });
  });

  it('preserves content.rendered unchanged', () => {
    expect(normalizePost(wordpressPostFixture).content).toBe('<p>Body</p>');
  });

  it('omits unavailable optional editorial fields', () => {
    expect(normalizePost(postWithoutEmbeddedData)).toMatchObject({
      featuredImage: undefined,
      author: undefined,
      excerpt: undefined,
    });
  });

  it('omits optional fields when _embedded arrays are present but empty', () => {
    expect(normalizePost(postWithEmptyEmbeds)).toMatchObject({
      featuredImage: undefined,
      author: undefined,
      excerpt: undefined,
    });
  });

  it('does not leak _embedded or excerpt.rendered keys onto the normalized Post', () => {
    const post = normalizePost(wordpressPostFixture) as unknown as Record<string, unknown>;
    expect(post).not.toHaveProperty('_embedded');
    expect(post).not.toHaveProperty('rendered');
  });

  it('throws a contextual error when a required field is missing', () => {
    const invalid = { ...wordpressPostFixture, slug: undefined } as never;
    expect(() => normalizePost(invalid)).toThrow(/slug/i);
  });
});

describe('normalizePage', () => {
  it('normalizes a page with an excerpt', () => {
    expect(normalizePage(wordpressPageFixture)).toMatchObject({
      id: 100,
      slug: 'about',
      title: 'About us',
      content: '<p>We build things.</p>',
      excerpt: 'Who we are.',
    });
  });

  it('omits excerpt when unavailable', () => {
    expect(normalizePage(pageWithoutExcerpt)).toMatchObject({
      excerpt: undefined,
    });
  });

  it('throws a contextual error when a required field is missing', () => {
    const invalid = { ...wordpressPageFixture, title: undefined } as never;
    expect(() => normalizePage(invalid)).toThrow(/title/i);
  });
});
