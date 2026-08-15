import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Post } from '../../../src/lib/wordpress/normalizers';
import { paginatePosts } from '../../../src/lib/wordpress/posts';
import { postWithEmptyEmbeds, postWithoutEmbeddedData, wordpressPostFixture } from '../../fixtures/wordpress';

const clientGetMock = vi.hoisted(() => vi.fn());

vi.mock('../../../src/lib/wordpress/client', () => ({
  createWordPressClient: () => ({ get: clientGetMock }),
}));

function makePost(id: number): Post {
  return { id, slug: `post-${id}`, title: `Post ${id}`, content: '<p></p>', date: '2026-01-01T00:00:00' };
}

describe('getAllPosts', () => {
  beforeEach(() => {
    clientGetMock.mockReset();
    vi.resetModules();
  });

  it('fetches all REST pages after reading page one total pages', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPostFixture], totalPages: 3 });
    clientGetMock.mockResolvedValueOnce({ data: [postWithoutEmbeddedData] });
    clientGetMock.mockResolvedValueOnce({ data: [postWithEmptyEmbeds] });

    const { getAllPosts, WORDPRESS_API_PAGE_SIZE } = await import('../../../src/lib/wordpress/posts');

    await expect(getAllPosts()).resolves.toHaveLength(3);
    expect(clientGetMock).toHaveBeenNthCalledWith(1, 'posts', {
      query: { _embed: 1, per_page: WORDPRESS_API_PAGE_SIZE, page: 1 },
    });
    expect(clientGetMock).toHaveBeenNthCalledWith(2, 'posts', {
      query: { _embed: 1, per_page: WORDPRESS_API_PAGE_SIZE, page: 2 },
    });
    expect(clientGetMock).toHaveBeenNthCalledWith(3, 'posts', {
      query: { _embed: 1, per_page: WORDPRESS_API_PAGE_SIZE, page: 3 },
    });
  });

  it('normalizes every raw record and sorts the collection newest first', async () => {
    clientGetMock.mockResolvedValueOnce({
      data: [wordpressPostFixture, postWithoutEmbeddedData, postWithEmptyEmbeds],
      totalPages: 1,
    });

    const { getAllPosts } = await import('../../../src/lib/wordpress/posts');
    const posts = await getAllPosts();

    // fixture dates: hello-world 01-05, no-embeds 01-06, empty-embeds 01-07
    expect(posts.map((post) => post.slug)).toEqual(['empty-embeds', 'no-embeds', 'hello-world']);
  });

  it('rejects when REST page one is missing X-WP-TotalPages', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPostFixture] });

    const { getAllPosts } = await import('../../../src/lib/wordpress/posts');
    await expect(getAllPosts()).rejects.toThrow(/X-WP-TotalPages/);
  });

  it('rejects when REST page one reports a non-positive totalPages', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPostFixture], totalPages: 0 });

    const { getAllPosts } = await import('../../../src/lib/wordpress/posts');
    await expect(getAllPosts()).rejects.toThrow(/X-WP-TotalPages/);
  });

  it('rejects when REST page one reports a non-integer totalPages', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPostFixture], totalPages: 1.5 });

    const { getAllPosts } = await import('../../../src/lib/wordpress/posts');
    await expect(getAllPosts()).rejects.toThrow(/X-WP-TotalPages/);
  });

  it('memoizes so repeated and concurrent calls only fetch once', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPostFixture], totalPages: 1 });

    const { getAllPosts } = await import('../../../src/lib/wordpress/posts');

    const [first, second] = await Promise.all([getAllPosts(), getAllPosts()]);
    expect(first).toBe(second);

    const third = await getAllPosts();
    expect(third).toBe(first);

    expect(clientGetMock).toHaveBeenCalledTimes(1);
  });
});

describe('paginatePosts', () => {
  const posts13 = Array.from({ length: 13 }, (_, index) => makePost(index));

  it('paginates a complete normalized collection', () => {
    expect(paginatePosts(posts13, 2, 12)).toEqual({ items: [posts13[12]], page: 2, totalPages: 2 });
  });

  it('returns the first page and full items when everything fits on one page', () => {
    expect(paginatePosts(posts13, 1, 20)).toEqual({ items: posts13, page: 1, totalPages: 1 });
  });

  it('reports totalPages of at least 1 for an empty collection', () => {
    expect(paginatePosts([], 1, 12)).toEqual({ items: [], page: 1, totalPages: 1 });
  });
});

describe('getPosts', () => {
  beforeEach(() => {
    clientGetMock.mockReset();
    vi.resetModules();
  });

  it('returns a page of posts with pagination metadata', async () => {
    clientGetMock.mockResolvedValueOnce({
      data: [wordpressPostFixture, postWithoutEmbeddedData, postWithEmptyEmbeds],
      totalPages: 1,
    });

    const { getPosts } = await import('../../../src/lib/wordpress/posts');
    const result = await getPosts({ page: 1, perPage: 2 });

    expect(result.posts).toHaveLength(2);
    expect(result.pagination).toEqual({ page: 1, totalPages: 2, totalItems: 3 });
  });

  it('defaults to page 1 and BLOG_PAGE_SIZE when no options are given', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPostFixture], totalPages: 1 });

    const { getPosts } = await import('../../../src/lib/wordpress/posts');
    const result = await getPosts();

    expect(result.pagination.page).toBe(1);
    expect(result.posts).toHaveLength(1);
  });
});

describe('getPostBySlug', () => {
  beforeEach(() => {
    clientGetMock.mockReset();
    vi.resetModules();
  });

  it('finds a post by slug within the cached collection', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPostFixture], totalPages: 1 });

    const { getPostBySlug } = await import('../../../src/lib/wordpress/posts');
    const post = await getPostBySlug('hello-world');

    expect(post?.slug).toBe('hello-world');
  });

  it('returns undefined for an unknown slug', async () => {
    clientGetMock.mockResolvedValueOnce({ data: [wordpressPostFixture], totalPages: 1 });

    const { getPostBySlug } = await import('../../../src/lib/wordpress/posts');
    await expect(getPostBySlug('does-not-exist')).resolves.toBeUndefined();
  });
});


