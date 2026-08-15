import type { WordPressRawCategory, WordPressRawPage, WordPressRawPost } from '../../src/lib/wordpress/types';

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

/** A raw REST page whose slug collides with the reserved `/blog` root route. */
export const pageWithReservedBlogSlug: WordPressRawPage = {
  id: 200,
  slug: 'blog',
  date: '2026-01-03T09:00:00',
  title: { rendered: 'Blog' },
  content: { rendered: '<p>This should not exist as an editable page.</p>' },
};

/** A raw REST page whose slug collides with the reserved `/robots.txt` root route. */
export const pageWithReservedRobotsSlug: WordPressRawPage = {
  id: 201,
  slug: 'robots.txt',
  date: '2026-01-04T09:00:00',
  title: { rendered: 'Robots' },
  content: { rendered: '<p>This should not exist as an editable page.</p>' },
};

/**
 * A raw REST post whose `_embedded` arrays hold WordPress *error objects*
 * rather than real records — what the REST API actually returns when a
 * featured image or author is unreadable (deleted attachment, restricted
 * user, insufficient permissions). The arrays are non-empty, so an
 * emptiness-only guard would let these through and yield `undefined` where a
 * `string` is declared.
 */
export const postWithErrorStubEmbeds = {
  id: 10,
  slug: 'error-stub-embeds',
  date: '2026-01-09T09:00:00',
  title: { rendered: 'Error stub embeds' },
  content: { rendered: '<p>Body.</p>' },
  _embedded: {
    'wp:featuredmedia': [
      { code: 'rest_post_invalid_id', message: 'Invalid post ID.', data: { status: 404 } },
    ],
    author: [{ code: 'rest_forbidden', message: 'Sorry, you are not allowed to do that.', data: { status: 401 } }],
  },
} as unknown as WordPressRawPost;

/** A raw REST post whose title/excerpt contain named and numeric HTML entities. */
export const postWithEntities: WordPressRawPost = {
  id: 9,
  slug: 'its-here',
  date: '2026-01-08T09:00:00',
  title: { rendered: 'It&#8217;s Here &amp; It&#8217;s &#8220;Great&#8221;' },
  content: { rendered: '<p>Body.</p>' },
  excerpt: { rendered: '<p>Rock &amp; roll &#8211; the sequel&hellip;</p>' },
};

export const wordpressCategoryFixture: WordPressRawCategory = {
  id: 5,
  slug: 'news',
  name: 'News &amp; Updates',
  count: 12,
};

