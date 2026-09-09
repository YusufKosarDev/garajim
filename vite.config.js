import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Güvenlik başlıkları TEK KAYNAKTAN okunuyor: `vercel.json`.
 *
 * Canlıda başlıkları Vercel uyguluyor, ama `npm run preview` sırasında da
 * aynılarının geçerli olması gerekiyor — aksi halde CSP ihlalleri ancak
 * deploy sonrası fark edilir. Kopyalayıp iki yerde tutmak yerine üretim
 * yapılandırması burada okunup preview sunucusuna veriliyor.
 *
 * CSP'de izin verilen dış kaynaklar ve sebepleri:
 *   cdn.jsdelivr.net          → Tesseract.js worker + WASM çekirdeği + dil verisi
 *   *.supabase.co / wss:      → veritabanı, storage (fotoğraf) ve realtime
 *   *.tile.openstreetmap.org  → Leaflet harita karoları
 *   overpass.*                → yakındaki servis sorgusu (3 mirror, fallback)
 *   fonts.googleapis/gstatic  → web fontları
 *   *.ingest.sentry.io        → hata izleme (DSN tanımlıysa)
 */
const guvenlikBasliklari = () => {
  const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
  const kural = vercel.headers?.find(h => h.source === '/(.*)')
  return Object.fromEntries((kural?.headers ?? []).map(({ key, value }) => [key, value]))
}

export default defineConfig({
  preview: {
    headers: guvenlikBasliklari(),
  },
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

    rolldownOptions: {
      output: {
        /**
         * Satıcı kodunu birkaç kararlı gruba topluyoruz.
         *
         * NEDEN: sözlükler dinamik import'a alınınca (bkz. src/i18n/index.ts)
         * bundler async sınırlar yüzünden grafiği çok daha ince parçalara
         * bölmeye başladı — ilk yükte 9 dosya yerine 44 dosya isteniyordu.
         * Toplam boyut düşmüştü ama istek sayısı gereksiz yere artmıştı.
         *
         * Gruplar kütüphane bazında ayrılıyor ki biri güncellendiğinde
         * diğerlerinin tarayıcı önbelleği geçersizleşmesin.
         */
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: 'vendor-supabase', test: /node_modules[\\/]@supabase[\\/]/ },
            { name: 'vendor-i18n', test: /node_modules[\\/](i18next|react-i18next|i18next-browser-languagedetector)[\\/]/ },
            { name: 'vendor-icons', test: /node_modules[\\/]lucide-react[\\/]/ },
            // Catch-all bir `vendor` grubu YOK: jspdf, recharts, leaflet ve
            // tesseract yalnızca ilgili rota açılınca inmeli. Hepsini tek
            // gruba toplamak ilk yükü 313 kB'dan 739 kB gzip'e çıkarıyordu.
          ],
        },
      },
    },
  },
})