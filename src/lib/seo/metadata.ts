/**
 * Shared SEO metadata and JSON-LD construction.
 *
 * Centralizing this keeps canonical URLs, Open Graph, Twitter card, and
 * structured data logic consistent across every page type instead of being
 * re-derived per template.
 */

import { env } from '../../config/env';
import { SITE } from '../../config/site';
import type { Post } from '../wordpress/normalizers';

export interface OpenGraphMetadata {
  title: string;
  description: string;
  url: string;
  image?: string;
}

export interface TwitterMetadata {
  card: 'summary' | 'summary_large_image';
}

export interface Metadata {
  title: string;
  description: string;
  canonical: string;
  openGraph: OpenGraphMetadata;
  twitter: TwitterMetadata;
}

export interface BuildMetadataInput {
  title: string;
  description?: string;
  path: string;
  imageUrl?: string;
}

/**
 * Builds shared page metadata: canonical URL (resolved against
 * `env.siteUrl`), Open Graph tags, and a Twitter card. `description` falls
 * back to {@link SITE.description} when omitted or empty (e.g. a post with
 * no excerpt). The Open Graph `image` is included only when `imageUrl` is
 * given, and the Twitter card is `summary_large_image` only in that case —
 * otherwise it is the plain `summary` card.
 */
export function buildMetadata({ title, description, path, imageUrl }: BuildMetadataInput): Metadata {
  const canonical = new URL(path, env.siteUrl).toString();
  const resolvedDescription = description && description.trim() !== '' ? description : SITE.description;

  return {
    title,
    description: resolvedDescription,
    canonical,
    openGraph: {
      title,
      description: resolvedDescription,
      url: canonical,
      ...(imageUrl ? { image: imageUrl } : {}),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
    },
  };
}

/**
 * Builds a `BlogPosting` JSON-LD object for a single post. Only fields with
 * known values are emitted: `author` and `image` are omitted entirely
 * (rather than set to `undefined` or `null`) when the post has none.
 */
export function buildPostJsonLd(post: Post, canonicalUrl: string): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: post.date,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
  };

  if (post.author) {
    jsonLd.author = { '@type': 'Person', name: post.author.name };
  }

  if (post.featuredImage) {
    jsonLd.image = post.featuredImage.url;
  }

  return jsonLd;
}
