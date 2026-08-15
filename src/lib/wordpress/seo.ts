/**
 * Public SEO entry point for the content layer.
 *
 * Implements a 4-tier cascade metadata extractor:
 * 1. Yoast SEO (raw.yoast_head_json)
 * 2. Rank Math SEO (raw.rank_math_seo)
 * 3. Native WordPress fields (title.rendered, excerpt.rendered, _embedded)
 * 4. Site Defaults (SITE.name, SITE.description)
 */

import { buildBreadcrumbsJsonLd, buildMetadata, buildPostJsonLd, buildWebsiteJsonLd } from '../seo/metadata';
import type { BuildMetadataInput, Metadata } from '../seo/metadata';
import { collapseWhitespace, decodeHtmlEntities, stripHtml } from './normalizers';
import type { Post } from './normalizers';
import type { WordPressRawPage, WordPressRawPost } from './types';

export type { BreadcrumbItem, Metadata } from '../seo/metadata';

export interface WordPressSeoOptions extends Partial<BuildMetadataInput> {
  raw?: WordPressRawPost | WordPressRawPage;
  path: string;
}

export type SeoInput = BuildMetadataInput | WordPressSeoOptions;

function hasRawRecord(input: SeoInput): input is WordPressSeoOptions & { raw: WordPressRawPost | WordPressRawPage } {
  return 'raw' in input && input.raw !== undefined;
}

function normalizeRobots(robots: unknown): string | undefined {
  if (typeof robots === 'string' && robots.trim() !== '') {
    return robots;
  }
  if (Array.isArray(robots) && robots.length > 0) {
    const joined = robots.filter((r) => typeof r === 'string' && r.trim() !== '').join(',');
    return joined !== '' ? joined : undefined;
  }
  if (typeof robots === 'object' && robots !== null) {
    const r = robots as { index?: string; follow?: string };
    const parts = [r.index, r.follow].filter((p): p is string => typeof p === 'string' && p.trim() !== '');
    if (parts.length > 0) {
      return parts.join(',');
    }
  }
  return undefined;
}

/** Builds the shared SEO metadata for a page or WordPress post/page with cascade plugin support. */
export function getSeoData(input: SeoInput): Metadata {
  if (!hasRawRecord(input)) {
    return buildMetadata(input);
  }

  const { raw, path } = input;
  const yoast = raw.yoast_head_json;
  const rankMath = raw.rank_math_seo;

  // Title cascade
  const rawTitle =
    (yoast?.title && yoast.title.trim() !== '' ? yoast.title : undefined) ??
    (rankMath?.title && rankMath.title.trim() !== '' ? rankMath.title : undefined) ??
    (input.title && input.title.trim() !== '' ? input.title : undefined) ??
    (raw.title?.rendered && raw.title.rendered.trim() !== '' ? raw.title.rendered : undefined);
  const title = rawTitle ? collapseWhitespace(decodeHtmlEntities(rawTitle)) : undefined;

  // Description cascade
  const rawDesc =
    (yoast?.description && yoast.description.trim() !== '' ? yoast.description : undefined) ??
    (rankMath?.description && rankMath.description.trim() !== '' ? rankMath.description : undefined) ??
    (input.description && input.description.trim() !== '' ? input.description : undefined) ??
    (raw.excerpt?.rendered && raw.excerpt.rendered.trim() !== '' ? stripHtml(raw.excerpt.rendered) : undefined);
  const description = rawDesc ? collapseWhitespace(decodeHtmlEntities(rawDesc)) : undefined;

  // Canonical cascade
  const canonical =
    (yoast?.canonical && yoast.canonical.trim() !== '' ? yoast.canonical : undefined) ??
    (rankMath?.canonical && rankMath.canonical.trim() !== '' ? rankMath.canonical : undefined) ??
    input.canonical;

  // Robots cascade
  const robots =
    normalizeRobots(yoast?.robots) ??
    normalizeRobots(rankMath?.robots) ??
    normalizeRobots(input.robots);

  // Image cascade
  const featuredMedia = (raw as WordPressRawPost)._embedded?.['wp:featuredmedia']?.[0];
  const imageUrl =
    yoast?.og_image?.[0]?.url ??
    yoast?.twitter_image ??
    rankMath?.og_image ??
    input.imageUrl ??
    (typeof featuredMedia?.source_url === 'string' && featuredMedia.source_url !== '' ? featuredMedia.source_url : undefined);

  // Twitter card cascade
  const twitterCard = yoast?.twitter_card ?? rankMath?.twitter_card;

  // Open Graph title/desc cascade
  const ogTitle = yoast?.og_title ?? rankMath?.og_title;
  const ogDescription = yoast?.og_description ?? rankMath?.og_description;

  return buildMetadata({
    title: title ?? '',
    description,
    path,
    canonical,
    robots,
    imageUrl,
    openGraph: {
      ...(ogTitle ? { title: collapseWhitespace(decodeHtmlEntities(ogTitle)) } : {}),
      ...(ogDescription ? { description: collapseWhitespace(decodeHtmlEntities(ogDescription)) } : {}),
      ...(imageUrl ? { image: imageUrl } : {}),
    },
    twitter: {
      ...(twitterCard ? { card: twitterCard } : {}),
    },
  });
}

/** Extracts the JSON-LD structured data graph, preferring Yoast or Rank Math schema when available. */
export function getJsonLdGraph(
  postOrRaw: WordPressRawPost | WordPressRawPage | Post,
  canonicalUrl: string,
): Record<string, unknown> {
  if ('yoast_head_json' in postOrRaw && postOrRaw.yoast_head_json?.schema) {
    return postOrRaw.yoast_head_json.schema;
  }
  if ('rank_math_seo' in postOrRaw && postOrRaw.rank_math_seo?.schema) {
    return postOrRaw.rank_math_seo.schema;
  }
  if ('content' in postOrRaw && typeof postOrRaw.content === 'string' && typeof postOrRaw.title === 'string') {
    return buildPostJsonLd(postOrRaw as Post, canonicalUrl);
  }
  const rawPost = postOrRaw as WordPressRawPost;
  const post: Post = {
    id: rawPost.id,
    slug: rawPost.slug,
    date: rawPost.date,
    title: typeof rawPost.title === 'string' ? rawPost.title : rawPost.title?.rendered ?? '',
    content: typeof rawPost.content === 'string' ? rawPost.content : rawPost.content?.rendered ?? '',
    featuredImage: rawPost._embedded?.['wp:featuredmedia']?.[0]?.source_url
      ? {
          url: rawPost._embedded['wp:featuredmedia'][0].source_url,
          alt: rawPost._embedded['wp:featuredmedia'][0].alt_text ?? '',
        }
      : undefined,
    author:
      rawPost._embedded?.author?.[0]?.name && rawPost._embedded.author[0].slug
        ? {
            name: rawPost._embedded.author[0].name,
            slug: rawPost._embedded.author[0].slug,
          }
        : undefined,
  };
  return buildPostJsonLd(post, canonicalUrl);
}

export { buildBreadcrumbsJsonLd, buildPostJsonLd, buildWebsiteJsonLd };
