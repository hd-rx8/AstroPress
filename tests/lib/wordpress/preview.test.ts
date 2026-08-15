import { beforeEach, describe, expect, it, vi } from 'vitest';
import { wordpressPageFixture, wordpressPostFixture } from '../../fixtures/wordpress';

const clientGetMock = vi.hoisted(() => vi.fn());

vi.mock('../../../src/lib/wordpress/client', () => ({
  createWordPressClient: () => ({ get: clientGetMock }),
}));

describe('getDraftPreview', () => {
  beforeEach(() => {
    clientGetMock.mockReset();
    vi.resetModules();
  });

  it('fetches draft post from preview endpoint and normalizes it', async () => {
    clientGetMock.mockResolvedValueOnce({
      data: {
        ...wordpressPostFixture,
        title: { rendered: 'Draft Post Title' },
      },
    });

    const { getDraftPreview } = await import('../../../src/lib/wordpress/preview');
    const result = await getDraftPreview(42, 'post', 'my-secret');

    expect(result.id).toBe(42);
    expect(result.title).toBe('Draft Post Title');
    expect(clientGetMock).toHaveBeenCalledWith('astropress/v1/preview', {
      query: { id: 42, type: 'post', secret: 'my-secret' },
    });
  });

  it('fetches draft page from preview endpoint and normalizes it', async () => {
    clientGetMock.mockResolvedValueOnce({
      data: {
        ...wordpressPageFixture,
        title: { rendered: 'Draft Page Title' },
      },
    });

    const { getDraftPreview } = await import('../../../src/lib/wordpress/preview');
    const result = await getDraftPreview(100, 'page', 'my-secret');

    expect(result.id).toBe(100);
    expect(result.title).toBe('Draft Page Title');
    expect(clientGetMock).toHaveBeenCalledWith('astropress/v1/preview', {
      query: { id: 100, type: 'page', secret: 'my-secret' },
    });
  });

  it('throws an error if secret is missing or empty', async () => {
    const { getDraftPreview } = await import('../../../src/lib/wordpress/preview');
    await expect(getDraftPreview(42, 'post', '')).rejects.toThrow(/secret/i);
  });
});
