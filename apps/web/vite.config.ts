/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import nxViteTsPaths from "vite-tsconfig-paths";

export default defineConfig(async () => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/web',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4200,
    host: 'localhost',
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    (await import('@tailwindcss/vite')).default(),
    nxViteTsPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true, type: 'module' },   // enables SW in dev (localhost)
      manifest: {
        name: 'Trello',
        short_name: 'TRLO',
        start_url: '/',
        // scope: '/',
        display: 'standalone',
        background_color: '#0b0f19',
        theme_color: '#0b0f19',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {

    },
  },
  test: {
    name: '@trello-clone/web',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
