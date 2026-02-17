import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        // Melakukan caching pada semua file statis (JS, CSS, Gambar)
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Menambahkan runtime caching untuk data dari Supabase
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin.includes('supabase.co'),
            handler: 'NetworkFirst', // Coba ambil data terbaru, jika gagal pakai data lama (offline)
            options: {
              cacheName: 'supabase-data-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // Simpan selama 1 hari
              }
            }
          }
        ]
      },
      manifest: {
        name: 'SGD Inventaris',
        short_name: 'SGDInvent',
        description: 'Sistem Manajemen Inventaris SGD',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
});