import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

import 'dotenv/config';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  server: {
    host: '0.0.0.0',
    port: 4321,
  },
});
