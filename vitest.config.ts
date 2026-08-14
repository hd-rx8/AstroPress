import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      WORDPRESS_URL: 'https://cms.example.com',
      SITE_URL: 'https://www.example.com',
    },
  },
});
