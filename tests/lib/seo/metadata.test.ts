import { describe, expect, it } from 'vitest';
import { SITE } from '../../../src/config/site';
import {
  buildBreadcrumbsJsonLd,
  buildMetadata,
  buildPostJsonLd,
  buildWebsiteJsonLd,
} from '../../../src/lib/seo/metadata';
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

  it('defaults robots to index,follow', () => {
    const metadata = buildMetadata({ title: 'About', path: '/about/' });
    expect(metadata.robots).toBe('index,follow');
  });

  it('honors an explicit noindex robots directive', () => {
    const metadata = buildMetadata({ title: 'Draft', path: '/draft/', robots: 'noindex,follow' });
    expect(metadata.robots).toBe('noindex,follow');
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

describe('buildBreadcrumbsJsonLd', () => {
  it('builds a Schema.org BreadcrumbList from item pairs', () => {
    const breadcrumbs = [
      { name: 'Home', url: 'https://www.example.com/' },
      { name: 'Blog', url: 'https://www.example.com/blog/' },
      { name: 'Post Title', url: 'https://www.example.com/blog/post-title/' },
    ];
    expect(buildBreadcrumbsJsonLd(breadcrumbs)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://www.example.com/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blog',
          item: 'https://www.example.com/blog/',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Post Title',
          item: 'https://www.example.com/blog/post-title/',
        },
      ],
    });
  });
});

describe('buildWebsiteJsonLd', () => {
  it('builds a WebSite / Organization Schema.org payload', () => {
    expect(buildWebsiteJsonLd()).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE.name,
      url: 'https://www.example.com/',
      description: SITE.description,
    });
  });

});

