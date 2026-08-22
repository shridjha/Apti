import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'logo.png', 'favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Apti — Aptitude & Puzzle Practice',
        short_name: 'Apti',
        description: 'Free no-login app for practicing aptitude questions and puzzles. Prepare for placements and job interviews.',
        start_url: '/',
        display: 'standalone',
        background_color: '#FAF9FD',
        theme_color: '#FD6E20',
        icons: [
          {
            src: '/favicon.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,json,woff2}'],
        // Don't precache the OneSignal worker
        globIgnores: ['**/OneSignalSDKWorker.js'],
      },
    }),
  ],
})
