import { beforeEach, describe, expect, it, vi } from 'vitest';

const clientGetMock = vi.hoisted(() => vi.fn());

vi.mock('../../../src/lib/wordpress/client', () => ({
  createWordPressClient: () => ({ get: clientGetMock }),
}));

describe('getMediaById', () => {
  beforeEach(() => {
    clientGetMock.mockReset();
    vi.resetModules();
  });

  it('fetches and normalizes a single media record', async () => {
    clientGetMock.mockResolvedValueOnce({
      data: {
        id: 55,
        source_url: 'https://cms.example.com/uploads/banner.jpg',
        alt_text: 'Banner',
        media_details: { width: 1200, height: 630 },
      },
    });

    const { getMediaById } = await import('../../../src/lib/wordpress/media');

    await expect(getMediaById(55)).resolves.toEqual({
      id: 55,
      url: 'https://cms.example.com/uploads/banner.jpg',
      alt: 'Banner',
      width: 1200,
      height: 630,
    });
    expect(clientGetMock).toHaveBeenCalledWith('media/55');
  });

  it('omits width and height when media_details is absent', async () => {
    clientGetMock.mockResolvedValueOnce({
      data: { id: 56, source_url: 'https://cms.example.com/uploads/plain.jpg' },
    });

    const { getMediaById } = await import('../../../src/lib/wordpress/media');
    const media = await getMediaById(56);

    expect(media).not.toHaveProperty('width');
    expect(media).not.toHaveProperty('height');
  });
});
