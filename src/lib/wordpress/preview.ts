import { env } from '../../config/env';
import { createWordPressClient } from './client';
import { normalizePage, normalizePost } from './normalizers';
import type { Page, Post } from './normalizers';
import type { WordPressRawPage, WordPressRawPost } from './types';

/**
 * Fetches an unpublished draft post or page from the AstroPress Connector preview endpoint.
 *
 * @param id The WordPress post ID.
 * @param type The content type ('post' or 'page', default: 'post').
 * @param secret The shared preview secret (defaults to env.previewSecret).
 * @returns The normalized Post or Page object.
 */
export async function getDraftPreview(
  id: number,
  type: 'post' | 'page' = 'post',
  secret?: string,
): Promise<Post | Page> {
  const resolvedSecret = secret ?? env.previewSecret;

  if (!resolvedSecret || resolvedSecret.trim() === '') {
    throw new Error('Preview secret is required to fetch draft preview.');
  }

  const previewBaseUrl = new URL(`${env.wordpressUrl.origin}/wp-json/`);
  const client = createWordPressClient({ baseUrl: previewBaseUrl });

  const { data } = await client.get<WordPressRawPost | WordPressRawPage>('astropress/v1/preview', {
    query: {
      id,
      type,
      secret: resolvedSecret,
    },
  });

  if (type === 'page') {
    return normalizePage(data as WordPressRawPage);
  }

  return normalizePost(data as WordPressRawPost);
}
