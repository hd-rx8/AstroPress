import { describe, expect, it } from 'vitest';
import { SITE } from '../../../src/config/site';
import { buildMetadata, buildPostJsonLd } from '../../../src/lib/seo/metadata';
import type { Post } from '../../../src/lib/wordpress/normalizers';
import { postWithoutEmbeddedData, wordpressPostFixture } from '../../fixtures/wordpress';
import { normalizePost } from '../../../src/lib/wordpress/normalizers';

describe('buildMetadata', () => {
  it('builds a canonical URL and open graph image from a path and image URL', () => {
    expect(
      buildMetadata({
        title: 'Hello',
        description: 'Short.',
        path: '/blog/hello/',
        imageUrl: 'https://cms.example.com/hero.jpg',
      }),
    ).toMatchObject({
      canonical: 'https://www.example.com/blog/hello/',
      openGraph: { image: 'https://cms.example.com/hero.jpg' },
    });
  });

  it('falls back to SITE.description when no description is given', () => {
    const metadata = buildMetadata({ title: 'About', path: '/about/' });
    expect(metadata.description).toBe(SITE.description);
    expect(metadata.openGraph.description).toBe(SITE.description);
  });

  it('falls back to SITE.description when description is an empty string', () => {
    const metadata = buildMetadata({ title: 'About', description: '', path: '/about/' });
    expect(metadata.description).toBe(SITE.description);
  });

  it('uses the given description when non-empty', () => {
    const metadata = buildMetadata({ title: 'About', description: 'Our story.', path: '/about/' });
    expect(metadata.description).toBe('Our story.');
  });

  it('omits the open graph image when no imageUrl is given', () => {
    const metadata = buildMetadata({ title: 'About', path: '/about/' });
    expect(metadata.openGraph).not.toHaveProperty('image');
  });

  it('uses a summary_large_image twitter card when an image is given', () => {
    const metadata = buildMetadata({
      title: 'Hello',
      path: '/blog/hello/',
      imageUrl: 'https://cms.example.com/hero.jpg',
    });
    expect(metadata.twitter).toEqual({ card: 'summary_large_image' });
  });

  it('uses a plain summary twitter card when no image is given', () => {
    const metadata = buildMetadata({ title: 'About', path: '/about/' });
    expect(metadata.twitter).toEqual({ card: 'summary' });
  });
});

describe('buildPostJsonLd', () => {
  const canonicalUrl = 'https://www.example.com/blog/hello-world/';

  it('emits a BlogPosting with only known fields for a fully populated post', () => {
    const post = normalizePost(wordpressPostFixture);
    expect(buildPostJsonLd(post, canonicalUrl)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      datePublished: post.date,
      url: canonicalUrl,
      mainEntityOfPage: canonicalUrl,
      author: { '@type': 'Person', name: post.author?.name },
      image: post.featuredImage?.url,
    });
  });

  it('omits author when the post has no author', () => {
    const post: Post = normalizePost(postWithoutEmbeddedData);
    expect(buildPostJsonLd(post, canonicalUrl)).not.toHaveProperty('author');
  });

  it('omits image when the post has no featured image', () => {
    const post: Post = normalizePost(postWithoutEmbeddedData);
    expect(buildPostJsonLd(post, canonicalUrl)).not.toHaveProperty('image');
  });
});
