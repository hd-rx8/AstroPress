import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWordPressClient } from '../../../src/lib/wordpress/client';
import type { WordPressClient } from '../../../src/lib/wordpress/client';

describe('createWordPressClient', () => {
  const baseUrl = new URL('https://cms.example.com/wp-json/wp/v2');
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: WordPressClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    client = createWordPressClient({ baseUrl, fetchFn: fetchMock as unknown as typeof fetch });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds query parameters and reads WordPress pagination headers', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'X-WP-Total': '3', 'X-WP-TotalPages': '1' },
      }),
    );

    await expect(
      client.get<unknown[]>('posts', {
        query: { _embed: 1, per_page: 100, page: 1 },
      }),
    ).resolves.toEqual({ data: [], total: 3, totalPages: 1 });

    const requestedUrl = fetchMock.mock.calls[0]?.[0] as URL;
    expect(requestedUrl.toString()).toBe(
      'https://cms.example.com/wp-json/wp/v2/posts?_embed=1&per_page=100&page=1',
    );
  });

  it('reports HTTP operation, URL, and status', async () => {
    fetchMock.mockResolvedValue(
      new Response('error', {
        status: 500,
        statusText: 'Internal Server Error',
      }),
    );
    await expect(client.get('posts')).rejects.toThrow(
      /Failed to fetch WordPress posts[\s\S]*500 Internal Server Error/,
    );
  });

  it('reports a 404 response with its status', async () => {
    fetchMock.mockResolvedValue(
      new Response('Not Found', {
        status: 404,
        statusText: 'Not Found',
      }),
    );
    await expect(client.get('posts/999')).rejects.toThrow(
      /Failed to fetch WordPress posts\/999[\s\S]*404 Not Found/,
    );
  });

  it('reports a rejected fetch (network failure) as a WordPressRequestError', async () => {
    fetchMock.mockRejectedValue(new TypeError('network failure'));
    await expect(client.get('posts')).rejects.toThrow(/Failed to fetch WordPress posts/);
  });

  it('reports malformed JSON responses', async () => {
    fetchMock.mockResolvedValue(new Response('not valid json', { status: 200 }));
    await expect(client.get('posts')).rejects.toThrow(/Failed to fetch WordPress posts/);
  });

  it('aborts and rejects when the request exceeds the timeout', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url: URL, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });

    const promise = client.get('posts');
    const assertion = expect(promise).rejects.toThrow(/Failed to fetch WordPress posts/);
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it('omits total/totalPages when pagination headers are absent', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
    await expect(client.get('posts/1')).resolves.toEqual({ data: { id: 1 } });
  });
});
