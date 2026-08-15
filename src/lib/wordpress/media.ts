/**
 * Fetches a single WordPress media (attachment) record by ID.
 *
 * Unlike posts/pages/categories, media is not aggregated as a full
 * collection — callers request only the specific attachment they need
 * (e.g. an image referenced by ID from outside a post's embedded featured
 * media). No memoization: each ID is a distinct, cheap single-record fetch.
 */

import { createWordPressClient } from './client';
import { normalizeMedia } from './normalizers';
import type { Media } from './normalizers';
import type { WordPressRawMedia } from './types';

const client = createWordPressClient();

/** Fetches and normalizes a single media (attachment) record by its WordPress ID. */
export async function getMediaById(id: number): Promise<Media> {
  const { data } = await client.get<WordPressRawMedia>(`media/${id}`);
  return normalizeMedia(data);
}
