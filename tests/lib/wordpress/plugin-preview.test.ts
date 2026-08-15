import { describe, expect, it } from 'vitest';

export interface AstroPressPreviewResponse {
  id: number;
  slug: string;
  status: string;
  type: string;
  date: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  _embedded: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text?: string;
      media_details?: {
        width?: number;
        height?: number;
      };
    }>;
    author?: Array<{
      id: number;
      name: string;
      slug: string;
    }>;
  };
}

describe('AstroPress Preview Endpoint Schema', () => {
  it('validates a compliant draft post preview payload structure', () => {
    const mockPreviewPayload: AstroPressPreviewResponse = {
      id: 99,
      slug: 'draft-post-99',
      status: 'draft',
      type: 'post',
      date: '2026-08-15T00:00:00Z',
      title: { rendered: 'Upcoming Features in AstroPress' },
      content: { rendered: '<p>This is draft content undergoing review.</p>' },
      excerpt: { rendered: '<p>Draft excerpt preview.</p>' },
      _embedded: {
        'wp:featuredmedia': [
          {
            source_url: 'https://cms.example.com/uploads/preview.jpg',
            alt_text: 'Preview banner',
            media_details: { width: 1200, height: 630 },
          },
        ],
        author: [
          {
            id: 1,
            name: 'Editorial Team',
            slug: 'editorial',
          },
        ],
      },
    };

    expect(mockPreviewPayload.id).toBe(99);
    expect(mockPreviewPayload.status).toBe('draft');
    expect(mockPreviewPayload.title.rendered).toBe('Upcoming Features in AstroPress');
    expect(mockPreviewPayload._embedded['wp:featuredmedia']?.[0]?.source_url).toBe(
      'https://cms.example.com/uploads/preview.jpg',
    );
  });

  it('validates a draft page preview payload without embeds', () => {
    const mockPagePreview: AstroPressPreviewResponse = {
      id: 105,
      slug: 'new-services',
      status: 'pending',
      type: 'page',
      date: '2026-08-15T00:00:00Z',
      title: { rendered: 'New Services Page' },
      content: { rendered: '<p>Our new services description.</p>' },
      excerpt: { rendered: '' },
      _embedded: {
        'wp:featuredmedia': [],
        author: [],
      },
    };

    expect(mockPagePreview.id).toBe(105);
    expect(mockPagePreview.type).toBe('page');
    expect(mockPagePreview.status).toBe('pending');
  });
});
