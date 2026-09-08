/**
 * i18n denetimi — `npm run i18n:audit`
 *
 * NEDEN VAR: sözlüğün TAM olması (tr.json ile en.json'ın aynı anahtarları
 * içermesi) bir testle korunuyor (src/i18n/i18n.test.ts). Ama bu, hiç sözlüğe
 * GİRMEMİŞ bir metni yakalayamaz — bileşenin içinde düz yazılmış Türkçe bir
 * etiket iki dosyada da yoktur, dolayısıyla parite testi mutludur.
 *
 * Bu script o boşluğu ölçer: kaynakta t() dışında kalmış, kullanıcıya görünen
 * Türkçe metinleri listeler. Sezgisel çalışır (Türkçe kelime listesine bakar),
 * yani yanlış pozitif üretebilir — bu yüzden CI'ı kırmaz, bir envanter aracıdır.
 *
 * Kullanım:
 *   npm run i18n:audit          → listeyi göster
 *   npm run i18n:audit -- --say → yalnızca sayıyı göster
 */
import fs from 'node:fs'
import path from 'node:path'

const walk = (dizin) =>
  fs.readdirSync(dizin, { withFileTypes: true }).flatMap((girdi) => {
    const yol = path.join(dizin, girdi.name)
    return girdi.isDirectory() ? walk(yol) : [yol]
  })

const files = walk('src').filter(
  (f) => /\.(jsx|tsx|ts|js)$/.test(f) && !/\.test\./.test(f) && !/locales/.test(f)
)

// Türkçe'ye özgü harfe değil, yaygın Türkçe kelimelere bakıyoruz: "Bu Ay" gibi
// hiç özel harf içermeyen metinler de yakalansın.
const TURKCE_KELIMELER = [
  'bu', 've', 'için', 'icin', 'ile', 'yok', 'var', 'bir', 'her', 'daha', 'çok',
  'az', 'son', 'ilk', 'yeni', 'eski', 'ay', 'yıl', 'yil', 'gün', 'gun', 'hafta',
  'araç', 'arac', 'bakım', 'bakim', 'yakıt', 'yakit', 'lastik', 'kayıt', 'kayit',
  'tarih', 'toplam', 'ortalama', 'değişim', 'degisim', 'geçen', 'gecen', 'kadar',
  'sonra', 'önce', 'once', 'göre', 'gore', 'olarak', 'veri', 'ekle', 'sil',
  'düzenle', 'duzenle', 'kaydet', 'iptal', 'geri', 'ileri', 'kapat',
  'muayene', 'sigorta', 'kasko', 'plaka', 'marka', 'harcama', 'tutar',
]
const kelimeRe = new RegExp(
  '(^|[^\\p{L}])(' + TURKCE_KELIMELER.join('|') + ')([^\\p{L}]|$)',
  'iu'
)

// Kod olan, metin olmayan değerler
const eleRe = new RegExp(
  '^(?:' +
    '[a-z][\\w.]*\\.[a-z][\\w_.]*' + // i18n anahtarı
    '|[\\w\\-/.:@ ]*(?:bg-|text-|border-|flex|grid|rounded|hover:|px-|py-|w-|h-|md:|sm:|lg:)[\\w\\-/.: \\[\\]%]*' + // tailwind
    '|https?://|\\.{0,2}/' + // url / import yolu
    '|[A-Z_]+|\\d[\\d.,]*|[a-z-]+' + // sabit / sayı / tek kelime
    ')$'
)

const bulunanlar = []
for (const dosya of files) {
  const kaynak = fs.readFileSync(dosya, 'utf8')
  kaynak.split('\n').forEach((satir, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(satir)) return

    const adaylar = [
      ...satir.matchAll(/'([^'\\\n]{3,120})'/g),
      ...satir.matchAll(/"([^"\\\n]{3,120})"/g),
      ...satir.matchAll(/`([^`\n]{3,120})`/g),
      ...satir.matchAll(/>\s*([^<>{}\n]{3,120}?)\s*</g),
    ]

    for (const eslesme of adaylar) {
      const metin = eslesme[1].trim()
      if (!metin || eleRe.test(metin)) continue
      if (!kelimeRe.test(metin)) continue
      if (/^[a-z][\w]*\.[\w.]+$/.test(metin)) continue
      bulunanlar.push(
        dosya.split(path.sep).join('/') + ':' + (i + 1) + '  ' + metin.slice(0, 90)
      )
    }
  })
}

const benzersiz = [...new Set(bulunanlar)]
if (process.argv.includes('--say')) {
  console.log(benzersiz.length)
} else {
  console.log('t() dışında kalmış olabilecek Türkçe metin: ' + benzersiz.length)
  console.log('(sezgisel tarama — bir kısmı yanlış pozitiftir)\n')
  console.log(benzersiz.join('\n'))
}
