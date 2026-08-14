import { describe, expect, it } from 'vitest';
import { blogPagePath, blogPaginationRoutePages, pagePath, postPath } from '../../src/lib/routes';

describe('blogPagePath', () => {
  it('returns the blog root for page 1', () => {
    expect(blogPagePath(1)).toBe('/blog/');
  });

  it('returns a numbered pagination path for page > 1', () => {
    expect(blogPagePath(2)).toBe('/blog/page/2/');
    expect(blogPagePath(3)).toBe('/blog/page/3/');
  });
});

describe('postPath', () => {
  it('builds a blog post path from a slug', () => {
    expect(postPath('hello-world')).toBe('/blog/hello-world/');
  });
});

describe('pagePath', () => {
  it('builds a generic page path from a slug', () => {
    expect(pagePath('about')).toBe('/about/');
  });
});

describe('blogPaginationRoutePages', () => {
  it('excludes page 1 because it is served by /blog/, not the dynamic route', () => {
    expect(blogPaginationRoutePages(4)).toEqual([2, 3, 4]);
  });

  it('returns an empty list when there is only a single page', () => {
    expect(blogPaginationRoutePages(1)).toEqual([]);
  });

  it('returns an empty list when there are zero pages', () => {
    expect(blogPaginationRoutePages(0)).toEqual([]);
  });
});
