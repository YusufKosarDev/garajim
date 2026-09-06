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
      // Kapsam hedefi saf mantık katmanı; bileşenler Cypress E2E ile örtülüyor.
      include: ['src/utils/**', 'src/lib/supabaseMappers.js'],
    },
  },
})
