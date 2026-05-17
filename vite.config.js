import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Netlify serves at the root URL (rom-tool.netlify.app/) so base = '/'.
  // GitHub Pages serves under /rom-tool/, so we override there using the CI env var.
  base: process.env.GITHUB_ACTIONS ? '/rom-tool/' : '/',
  define: {
    global: 'globalThis',
  },
  server: {
    // Allow any ngrok tunnel host so coworkers can preview the live dev server.
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.io'],
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Cost Estimate Tool',
        short_name: 'Cost Estimate',
        description: 'Cost Estimate Tool — scope-based labor, travel, and material estimator. Works offline.',
        theme_color: '#1a3560',
        background_color: '#f4f6fb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [],
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
})
