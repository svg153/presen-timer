import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    // Everything under test is plain logic or a spawned Node process, so the
    // fast `node` environment is enough — the browser half is covered by the
    // end-to-end run against a real MCP client.
    environment: 'node',
    include: ['src/**/*.test.ts', 'mcp/**/*.test.mjs']
  }
});
