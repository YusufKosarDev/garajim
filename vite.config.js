import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // injectManifest: kendi SW'imizi kullanıyoruz. generateSW modunda push ve
      // notificationclick handler'ı yazacak yer yoktu (bkz. src/sw.js).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      includeAssets: ['favicon.ico', 'logo.svg', 'robots.txt'],
      manifest: {
        name: 'Garajım — Araç Takip Asistanı',
        short_name: 'Garajım',
        description: 'Aracının muayene, MTV, sigorta ve bakım takibi tek uygulamada',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'tr',
        categories: ['productivity', 'utilities', 'lifestyle'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Yeni Araç Ekle',
            short_name: 'Yeni Araç',
            url: '/vehicles',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            url: '/',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      // injectManifest modunda runtimeCaching SW'nin kendisinde tanımlanır
      // (bkz. src/sw.js) — burada yalnızca precache listesi belirlenir.
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },

      devOptions: {
        enabled: false, // Dev modda PWA devre dışı (sıkıntı çıkarmaması için)
      },
    }),
  ],
  build: {
    // 'hidden': map dosyaları üretilir ama bundle'dan referans verilmez.
    // Hata izleme servisine (Sentry) yüklenmeleri için üretilmeye devam eder;
    // deploy adımında dist'ten silinmeleri gerekir ki public olarak sunulmasınlar.
    sourcemap: 'hidden',
  },
})