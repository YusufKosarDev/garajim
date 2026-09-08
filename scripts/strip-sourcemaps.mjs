/**
 * Build çıktısındaki kaynak haritalarını siler.
 *
 * NEDEN: `vite.config.js` sourcemap'i 'hidden' üretiyor — Sentry'ye yüklenip
 * okunabilir stack trace elde edilebilsin diye. Ama `dist/` olduğu gibi deploy
 * edilirse bu .map dosyaları herkese açık servis edilir ve tüm kaynak kod
 * (yorumlar dahil) canlı siteden okunabilir hale gelir.
 *
 * Bu script build'in son adımı olarak koşar: haritalar üretilir, gerekirse
 * Sentry'ye yüklenir, sonra yayımlanacak çıktıdan çıkarılır.
 *
 * Node ile yazıldı çünkü `rm -rf dist/**\/*.map` Windows'ta çalışmıyor.
 */
import fs from 'node:fs'
import path from 'node:path'

const CIKTI_DIZINI = 'dist'

if (!fs.existsSync(CIKTI_DIZINI)) {
  console.error(`[strip-sourcemaps] "${CIKTI_DIZINI}" bulunamadı — önce build çalışmalı.`)
  process.exit(1)
}

/** Dizini özyinelemeli gezip .map dosyalarını toplar */
const haritalariBul = (dizin) =>
  fs.readdirSync(dizin, { withFileTypes: true }).flatMap((girdi) => {
    const tamYol = path.join(dizin, girdi.name)
    if (girdi.isDirectory()) return haritalariBul(tamYol)
    return girdi.name.endsWith('.map') ? [tamYol] : []
  })

const haritalar = haritalariBul(CIKTI_DIZINI)
let toplamBayt = 0

for (const harita of haritalar) {
  toplamBayt += fs.statSync(harita).size
  fs.rmSync(harita)
}

const mb = (toplamBayt / 1024 / 1024).toFixed(2)
console.log(`[strip-sourcemaps] ${haritalar.length} kaynak haritası silindi (${mb} MB).`)
