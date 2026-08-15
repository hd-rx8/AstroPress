/**
 * Public SEO entry point for the content layer.
 *
 * Wraps the shared metadata builder so pages call one stable name
 * (`getSeoData`) regardless of where the underlying data comes from. Today
 * that's plain WordPress fields; a later milestone can swap the
 * implementation to prefer Yoast/Rank Math SEO data (when present on a
 * post/page) without changing this function's signature or any call site.
 */

import { buildMetadata, buildPostJsonLd } from '../seo/metadata';
import type { BuildMetadataInput, Metadata } from '../seo/metadata';

export type { Metadata } from '../seo/metadata';

/** Builds the shared SEO metadata (title, description, canonical, robots, Open Graph, Twitter) for one page. */
export function getSeoData(input: BuildMetadataInput): Metadata {
  return buildMetadata(input);
}

export { buildPostJsonLd };
