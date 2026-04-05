import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [svelte()],
  // dev (npm run dev)  → base = '/'  → http://localhost:5173/
  // build (GitHub Pages) → base = '/KCD2-Farkle/'
  base: command === 'serve' ? '/' : '/KCD2-Farkle/',
  resolve: {
    alias: {
      '$lib': resolve(__dirname, 'src/lib'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}))
