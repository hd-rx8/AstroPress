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
  robots: string;
  openGraph: OpenGraphMetadata;
  twitter: TwitterMetadata;
}

export interface BuildMetadataInput {
  title?: string;
  description?: string;
  path: string;
  imageUrl?: string;
  /**
   * Defaults to `'index,follow'`. Pass `'noindex,follow'` to keep a page out
   * of search results while still letting crawlers follow its links.
   */
  robots?: 'index,follow' | 'noindex,follow' | string;
  canonical?: string;
  openGraph?: Partial<OpenGraphMetadata>;
  twitter?: Partial<TwitterMetadata>;
}

/**
 * Builds shared page metadata: canonical URL (resolved against
 * `env.siteUrl`), Open Graph tags, and a Twitter card. `description` falls
 * back to {@link SITE.description} when omitted or empty (e.g. a post with
 * no excerpt). The Open Graph `image` is included only when `imageUrl` is
 * given, and the Twitter card is `summary_large_image` only in that case —
 * otherwise it is the plain `summary` card.
 */
export function buildMetadata({
  title,
  description,
  path,
  imageUrl,
  robots,
  canonical,
  openGraph,
  twitter,
}: BuildMetadataInput): Metadata {
  const resolvedCanonical = canonical ?? new URL(path, env.siteUrl).toString();
  const resolvedTitle = title && title.trim() !== '' ? title : SITE.name;
  const resolvedDescription = description && description.trim() !== '' ? description : SITE.description;

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    canonical: resolvedCanonical,
    robots: robots ?? 'index,follow',
    openGraph: {
      title: openGraph?.title ?? resolvedTitle,
      description: openGraph?.description ?? resolvedDescription,
      url: openGraph?.url ?? resolvedCanonical,
      ...(imageUrl || openGraph?.image ? { image: openGraph?.image ?? imageUrl } : {}),
    },
    twitter: {
      card: twitter?.card ?? (imageUrl || openGraph?.image ? 'summary_large_image' : 'summary'),
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

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/** Builds a Schema.org BreadcrumbList structured data object. */
export function buildBreadcrumbsJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Builds a Schema.org WebSite structured data object for the site. */
export function buildWebsiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: env.siteUrl.toString(),
    description: SITE.description,
  };
}


