import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Ohne include/exclude zieht vitest auch die Playwright-Specs unter /e2e
    // ein und stirbt beim Worker-Start. Vitest-Tests leben ausschliesslich
    // unter src/, Playwright laeuft ueber `npm run test:e2e`.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'e2e/**', 'mobile/**', '.next/**'],
    server: {
      deps: {
        // next-auth muss durch Vite laufen, sonst greift der 'next/server'-
        // Alias unten nicht (extern aufgeloeste Module umgehen ihn).
        inline: ['next-auth', '@auth/core'],
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // next-auth importiert intern 'next/server'. Ausserhalb des Next-Builds
      // (also in vitest) kennt Nodes Resolver diesen Alias nicht — ohne die
      // Zeile bricht jeder Test, der auth.config.ts laedt.
      'next/server': resolve(__dirname, 'node_modules/next/server.js'),
    },
  },
})
