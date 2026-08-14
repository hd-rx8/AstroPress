import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizePage } from '../../../src/lib/wordpress/normalizers';
import { WORDPRESS_API_PAGE_SIZE } from '../../../src/lib/wordpress/posts';
import {
  pageWithoutExcerpt,
  pageWithReservedBlogSlug,
  pageWithReservedRobotsSlug,
  wordpressPageFixture,
} from '../../fixtures/wordpress';

const clientGetMock = vi.hoisted(() => vi.fn());

vi.mock('../../../src/lib/wordpress/client', () => ({
  createWordPressClient: () => ({ get: clientGetMock }),
}));

describe('getAllPages', () => {
  beforeEach(() => {
    clientGetMock.mockReset();
    vi.resetModules();
  });

  it('fetches all REST pages after reading page one total pages', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPageFixture], totalPages: 2 });
    clientGetMock.mockResolvedValueOnce({ data: [pageWithoutExcerpt] });

    const { getAllPages } = await importPagesModule();

    await expect(getAllPages()).resolves.toHaveLength(2);
    expect(clientGetMock).toHaveBeenNthCalledWith(1, 'pages', {
      query: { per_page: WORDPRESS_API_PAGE_SIZE, page: 1 },
    });
    expect(clientGetMock).toHaveBeenNthCalledWith(2, 'pages', {
      query: { per_page: WORDPRESS_API_PAGE_SIZE, page: 2 },
    });
  });

  it('normalizes every raw record', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPageFixture], totalPages: 1 });

    const { getAllPages } = await importPagesModule();
    const pages = await getAllPages();

    expect(pages).toEqual([normalizePage(wordpressPageFixture)]);
  });

  it('rejects when REST page one is missing X-WP-TotalPages', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPageFixture] });

    const { getAllPages } = await importPagesModule();
    await expect(getAllPages()).rejects.toThrow(/X-WP-TotalPages/);
  });

  it('rejects when a fetched page slug collides with the reserved "blog" route', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [pageWithReservedBlogSlug], totalPages: 1 });

    const { getAllPages } = await importPagesModule();
    await expect(getAllPages()).rejects.toThrow(/blog/);
  });

  it('memoizes so repeated and concurrent calls only fetch once', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPageFixture], totalPages: 1 });

    const { getAllPages } = await importPagesModule();

    const [first, second] = await Promise.all([getAllPages(), getAllPages()]);
    expect(first).toBe(second);

    const third = await getAllPages();
    expect(third).toBe(first);

    expect(clientGetMock).toHaveBeenCalledTimes(1);
  });
});

describe('assertNoReservedPageSlugs', () => {
  it('does not throw when no page slug collides with a reserved route', async () => {
    const { assertNoReservedPageSlugs } = await importPagesModule();
    expect(() => assertNoReservedPageSlugs([normalizePage(wordpressPageFixture), normalizePage(pageWithoutExcerpt)])).not.toThrow();
  });

  it('throws naming the "blog" slug collision', async () => {
    const { assertNoReservedPageSlugs } = await importPagesModule();
    expect(() => assertNoReservedPageSlugs([normalizePage(pageWithReservedBlogSlug)])).toThrow(/blog/);
  });

  it('throws naming the "robots.txt" slug collision', async () => {
    const { assertNoReservedPageSlugs } = await importPagesModule();
    expect(() => assertNoReservedPageSlugs([normalizePage(pageWithReservedRobotsSlug)])).toThrow(/robots\.txt/);
  });
});

function importPagesModule() {
  return import('../../../src/lib/wordpress/pages');
}
