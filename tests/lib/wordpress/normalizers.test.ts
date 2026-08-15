import { describe, expect, it } from 'vitest';
import { normalizeCategory, normalizeMedia, normalizePage, normalizePost } from '../../../src/lib/wordpress/normalizers';
import {
  pageWithoutExcerpt,
  postWithEmptyEmbeds,
  postWithEntities,
  postWithErrorStubEmbeds,
  postWithoutEmbeddedData,
  wordpressCategoryFixture,
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

  it('treats error-stub _embedded entries as absent rather than trusting them', () => {
    // WordPress returns `[{ code, message, data }]` — not an empty array — when
    // an embedded record is unreadable. Guarding only on array emptiness would
    // emit `url: undefined` / `name: undefined` behind a `string` type.
    expect(normalizePost(postWithErrorStubEmbeds)).toMatchObject({
      featuredImage: undefined,
      author: undefined,
    });
  });

  it('rejects partially-formed embeds that are missing the fields it needs', () => {
    const partial = {
      ...wordpressPostFixture,
      _embedded: {
        // A real media object that simply has no `source_url`, and an author
        // record missing `slug` — neither can produce a valid value.
        'wp:featuredmedia': [{ alt_text: 'Alt but no URL' }],
        author: [{ name: 'Ada Lovelace' }],
      },
    } as unknown as Parameters<typeof normalizePost>[0];

    expect(normalizePost(partial)).toMatchObject({ featuredImage: undefined, author: undefined });
  });

  it('still normalizes a well-formed embed after the hardening', () => {
    // Guards against over-tightening: valid embeds must keep working.
    expect(normalizePost(wordpressPostFixture)).toMatchObject({
      featuredImage: { url: 'https://cms.example.com/uploads/hero.jpg', alt: 'Hero image' },
      author: { name: 'Ada Lovelace', slug: 'ada' },
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

  it('decodes named and numeric HTML entities in title and excerpt', () => {
    expect(normalizePost(postWithEntities)).toMatchObject({
      title: 'It’s Here & It’s “Great”',
      excerpt: 'Rock & roll – the sequel…',
    });
  });

  it('includes featured image width and height when the embed reports them', () => {
    const withDimensions = {
      ...wordpressPostFixture,
      _embedded: {
        ...wordpressPostFixture._embedded,
        'wp:featuredmedia': [
          {
            source_url: 'https://cms.example.com/uploads/hero.jpg',
            alt_text: 'Hero image',
            media_details: { width: 1600, height: 900 },
          },
        ],
      },
    };
    expect(normalizePost(withDimensions).featuredImage).toEqual({
      url: 'https://cms.example.com/uploads/hero.jpg',
      alt: 'Hero image',
      width: 1600,
      height: 900,
    });
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

describe('normalizeCategory', () => {
  it('normalizes a category, decoding entities in the name', () => {
    expect(normalizeCategory(wordpressCategoryFixture)).toEqual({
      id: 5,
      slug: 'news',
      name: 'News & Updates',
      count: 12,
    });
  });

  it('throws a contextual error when a required field is missing', () => {
    const invalid = { ...wordpressCategoryFixture, slug: undefined } as never;
    expect(() => normalizeCategory(invalid)).toThrow(/slug/i);
  });
});

describe('normalizeMedia', () => {
  it('normalizes a media record with known dimensions', () => {
    expect(
      normalizeMedia({
        id: 55,
        source_url: 'https://cms.example.com/uploads/banner.jpg',
        alt_text: 'Banner',
        media_details: { width: 1200, height: 630 },
      }),
    ).toEqual({
      id: 55,
      url: 'https://cms.example.com/uploads/banner.jpg',
      alt: 'Banner',
      width: 1200,
      height: 630,
    });
  });

  it('omits width and height when media_details is absent', () => {
    const media = normalizeMedia({ id: 56, source_url: 'https://cms.example.com/uploads/plain.jpg' });
    expect(media).not.toHaveProperty('width');
    expect(media).not.toHaveProperty('height');
    expect(media.alt).toBe('');
  });
});


