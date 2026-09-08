import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Not: vite.config.js'i merge ETMİYORUZ — VitePWA ve tailwind eklentilerinin
// test koşumunda işi yok (servis worker üretmeye çalışır, çıktıyı kirletir).
// Testler için gereken tek eklenti React'in JSX dönüşümü.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Kapsam TÜM kaynak üzerinden ölçülüyor. Eskiden yalnızca `src/utils/**`
      // dahildi; bu rakamı çift yönlü bozuyordu — hem context/bileşen testlerini
      // görünmez kılıyor hem de oranı olduğundan iyi gösteriyordu.
      include: ['src/**'],
      exclude: [
        'src/**/*.test.{js,jsx,ts,tsx}',
        'src/test/**',          // test yardımcıları ve mock'lar
        'src/i18n/locales/**',  // çeviri sözlükleri, kod değil
        'src/types.ts',         // yalnızca tip tanımı, çalışma zamanı kodu yok
        'src/sw.js',            // service worker; jsdom'da koşamaz
        'src/main.jsx',         // uygulama giriş noktası
      ],
    },
  },
})
