import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeCategory } from '../../../src/lib/wordpress/normalizers';
import { WORDPRESS_API_PAGE_SIZE } from '../../../src/lib/wordpress/pagination';
import { wordpressCategoryFixture } from '../../fixtures/wordpress';

const clientGetMock = vi.hoisted(() => vi.fn());

vi.mock('../../../src/lib/wordpress/client', () => ({
  createWordPressClient: () => ({ get: clientGetMock }),
}));

describe('getAllCategories', () => {
  beforeEach(() => {
    clientGetMock.mockReset();
    vi.resetModules();
  });

  it('fetches all REST pages after reading page one total pages', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressCategoryFixture], totalPages: 2 });
    clientGetMock.mockResolvedValueOnce({ data: [{ id: 6, slug: 'guides', name: 'Guides', count: 3 }] });

    const { getAllCategories } = await import('../../../src/lib/wordpress/categories');

    await expect(getAllCategories()).resolves.toHaveLength(2);
    expect(clientGetMock).toHaveBeenNthCalledWith(1, 'categories', {
      query: { per_page: WORDPRESS_API_PAGE_SIZE, page: 1 },
    });
    expect(clientGetMock).toHaveBeenNthCalledWith(2, 'categories', {
      query: { per_page: WORDPRESS_API_PAGE_SIZE, page: 2 },
    });
  });

  it('normalizes every raw record', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressCategoryFixture], totalPages: 1 });

    const { getAllCategories } = await import('../../../src/lib/wordpress/categories');
    const categories = await getAllCategories();

    expect(categories).toEqual([normalizeCategory(wordpressCategoryFixture)]);
  });

  it('rejects when REST page one is missing X-WP-TotalPages', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressCategoryFixture] });

    const { getAllCategories } = await import('../../../src/lib/wordpress/categories');
    await expect(getAllCategories()).rejects.toThrow(/X-WP-TotalPages/);
  });

  it('memoizes so repeated and concurrent calls only fetch once', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressCategoryFixture], totalPages: 1 });

    const { getAllCategories } = await import('../../../src/lib/wordpress/categories');

    const [first, second] = await Promise.all([getAllCategories(), getAllCategories()]);
    expect(first).toBe(second);
    expect(clientGetMock).toHaveBeenCalledTimes(1);
  });
});
