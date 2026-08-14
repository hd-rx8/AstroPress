/**
 * Shared pagination helpers for aggregating a WordPress REST collection
 * (`posts`, `pages`, ...) across every `X-WP-TotalPages` REST page.
 */

/** `per_page` used when querying the WordPress REST API for posts/pages. */
export const WORDPRESS_API_PAGE_SIZE = 100;

/** True when `value` is a valid, positive-integer `X-WP-TotalPages` reading. */
export function isValidTotalPages(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}
