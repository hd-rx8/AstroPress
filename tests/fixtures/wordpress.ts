import type { WordPressRawPage, WordPressRawPost } from '../../src/lib/wordpress/types';

/** A fully-populated raw REST post, including `_embed`-ded media/author. */
export const wordpressPostFixture: WordPressRawPost = {
  id: 42,
  slug: 'hello-world',
  date: '2026-01-05T09:00:00',
  title: { rendered: 'Hello world' },
  content: { rendered: '<p>Body</p>' },
  excerpt: { rendered: '<p>A short   excerpt. </p>\n' },
  _embedded: {
    'wp:featuredmedia': [
      {
        source_url: 'https://cms.example.com/uploads/hero.jpg',
        alt_text: 'Hero image',
      },
    ],
    author: [
      {
        name: 'Ada Lovelace',
        slug: 'ada',
      },
    ],
  },
};

/** A raw REST post with no `_embed` data and no excerpt at all. */
export const postWithoutEmbeddedData: WordPressRawPost = {
  id: 7,
  slug: 'no-embeds',
  date: '2026-01-06T09:00:00',
  title: { rendered: 'No embeds here' },
  content: { rendered: '<p>Plain body.</p>' },
};

/** A raw REST post missing the `_embedded` container entirely and with an empty excerpt. */
export const postWithEmptyEmbeds: WordPressRawPost = {
  id: 8,
  slug: 'empty-embeds',
  date: '2026-01-07T09:00:00',
  title: { rendered: 'Empty embeds' },
  content: { rendered: '<p>Body.</p>' },
  excerpt: { rendered: '' },
  _embedded: {
    'wp:featuredmedia': [],
    author: [],
  },
};

export const wordpressPageFixture: WordPressRawPage = {
  id: 100,
  slug: 'about',
  date: '2026-01-01T09:00:00',
  title: { rendered: 'About us' },
  content: { rendered: '<p>We build things.</p>' },
  excerpt: { rendered: '<p>Who we are.</p>' },
};

export const pageWithoutExcerpt: WordPressRawPage = {
  id: 101,
  slug: 'contact',
  date: '2026-01-02T09:00:00',
  title: { rendered: 'Contact' },
  content: { rendered: '<p>Reach out.</p>' },
};
