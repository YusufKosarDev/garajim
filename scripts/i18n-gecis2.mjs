/**
 * İkinci taşıma geçişi (madde 29): bileşen GÖVDESİ İÇİNDEKİ düz dizgeler.
 *
 * Birinci geçiş yalnızca JSX metin düğümlerini ve seçili öznitelikleri aldı.
 * Geriye ternary'ler (`isEdit ? 'Güncelle' : 'Kaydet'`) ve grafik etiketleri
 * gibi ifade içindeki dizgeler kaldı.
 *
 * ATLANANLAR ve nedenleri:
 *  - console.* çağrıları: geliştiriciye yazılır, kullanıcıya değil.
 *  - Karşılaştırma içeren satırlar (=== / !== / case): `type === 'Diğer'`
 *    bir VERİ karşılaştırmasıdır; çevrilirse eşleşme kaybolur.
 *  - Modül seviyesi: orada `t` yok. O dosyalar elle taşınıyor.
 *  - ATLA listesi: veritabanına yazılan alan değerleri.
 *  - import/require yolları ve className gibi teknik dizgeler.
 */

import fs from 'node:fs'
import path from 'node:path'

const ATLA = new Set([
  'Yağ Değişimi', 'Yağ Filtresi', 'Hava Filtresi', 'Yakıt Filtresi',
  'Polen Filtresi', 'Balata', 'Balata Değişimi', 'Disk', 'Disk Değişimi',
  'Lastik', 'Lastik Değişimi', 'Triger Seti', 'Akü', 'Buji', 'Antifriz',
  'Fren Hidroliği', 'Diğer',
  'Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrik',
  'Garajım', 'Garajım PWA',
])

const HARF = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u' }
const slug = (m) =>
  m.replace(/[çğıöşüÇĞİÖŞÜ]/g, h => HARF[h]).toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    .split('_').slice(0, 6).join('_').slice(0, 48) || 'metin'

const onEk = (dosya) => {
  const rel = dosya.replace(/\\/g, '/').replace(/^src\//, '').replace(/\.(jsx|tsx)$/, '')
  const parcalar = rel.split('/')
  const ad = parcalar.pop()
  const klasor = parcalar.join('/')
  const alan = { pages: '', components: '', 'components/stats': 'stats', 'components/charts': 'charts', context: 'ctx' }[klasor]
    ?? klasor.replace(/\//g, '.')
  const taban = ad.charAt(0).toLowerCase() + ad.slice(1)
  return alan ? `${alan}.${taban}` : taban
}

const TR = /[çğıöşüÇĞİÖŞÜ]/

// Bileşen gövdesinin başladığı satır — o satırdan sonrası `t` erişimine sahip
const bilesenBasi = (satirlar) =>
  satirlar.findIndex(l =>
    /^(?:export\s+(?:default\s+)?)?(?:function\s+[A-Z]|const\s+[A-Z]\w*\s*=\s*(?:memo\()?\()/.test(l))

const atlanacakSatir = (satir) =>
  // Kaçışlı tırnak: `'Email\'ini doğrula'` dizgesinde desen kapanış tırnağını
  // yanlış yerde bulup dizgeyi ortadan böldü ve iki dosyayı derlenemez hale
  // getirdi. Böyle satırlar elle taşınıyor.
  /\\'/.test(satir) ||
  /console\.(log|error|warn|info)/.test(satir) ||
  /===|!==|\bcase\s|\bimport\s|require\(/.test(satir) ||
  /className=/.test(satir) ||
  /\bt\('/.test(satir) === false && /^\s*\/\//.test(satir)

export function gecis2(dosya, uygula) {
  const ham = fs.readFileSync(dosya, 'utf8')
  const satirlar = ham.split(/\r?\n/)
  const bas = bilesenBasi(satirlar)
  if (bas < 0) return { degisiklik: 0, sozluk: {} }

  // Bu dosya hook yerine i18n örneğini kullanıyorsa (ErrorBoundary bir class,
  // VehicleContext'te metinler bileşen dışında) üretilen çağrı da öyle olmalı.
  // Aksi halde tanımsız bir `t` yazılırdı.
  const ornekModu = /i18n\.t\(/.test(ham) && !/const \{ t \} = useTranslation\(\)/.test(ham)
  const cagriOneki = ornekModu ? 'i18n.' : ''

  const sozluk = {}
  const kullanilan = new Set()
  let degisiklik = 0

  const anahtarUret = (metin) => {
    const taban = `${onEk(dosya)}.${slug(metin)}`
    let a = taban, i = 2
    while (kullanilan.has(a) && sozluk[a] !== metin) a = `${taban}_${i++}`
    kullanilan.add(a)
    sozluk[a] = metin
    return a
  }

  const yeniSatirlar = satirlar.map((satir, i) => {
    if (i < bas || atlanacakSatir(satir)) return satir

    return satir.replace(/'([^'\\\n]*)'/g, (tam, metin) => {
      const v = metin.trim()
      if (!TR.test(v) || v.length < 2 || ATLA.has(v)) return tam
      // Zaten çeviri anahtarı olan dizgelere dokunma
      if (/^[a-z][a-zA-Z]*\./.test(v)) return tam
      degisiklik++
      return `${cagriOneki}t('${anahtarUret(v)}')`
    })
  })

  if (degisiklik === 0) return { degisiklik: 0, sozluk: {} }

  let kaynak = yeniSatirlar.join('\n')

  if (!ornekModu && !/useTranslation/.test(kaynak)) {
    kaynak = kaynak.replace(/^(import .*\n)/m, `$1import { useTranslation } from 'react-i18next'\n`)
  }
  if (!/const \{ t \} = useTranslation\(\)/.test(kaynak) && !/i18n\.t\(/.test(kaynak)) {
    return { degisiklik: 0, sozluk: {}, uyari: `${dosya}: hook yok, elle taşınmalı` }
  }

  if (uygula) fs.writeFileSync(dosya, kaynak)
  return { degisiklik, sozluk }
}

// CLI
const dosyalar = []
;(function tara(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) tara(p)
    else if (/\.(jsx|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) dosyalar.push(p)
  }
})('src')

const uygula = process.argv.includes('--uygula')
const hepsi = {}
const uyarilar = []
for (const d of dosyalar) {
  const r = gecis2(d, uygula)
  if (r.uyari) { uyarilar.push(r.uyari); continue }
  if (!r.degisiklik) continue
  Object.assign(hepsi, r.sozluk)
  console.log(String(r.degisiklik).padStart(3), d)
}
if (uyarilar.length) {
  console.log(`\n!! ELLE (${uyarilar.length}):`)
  uyarilar.forEach(u => console.log('   ' + u))
}
if (uygula && Object.keys(hepsi).length) {
  const yol = 'src/i18n/locales/tr.json'
  const mevcut = JSON.parse(fs.readFileSync(yol, 'utf8'))
  const b = { ...mevcut, ...hepsi }
  fs.writeFileSync(yol, JSON.stringify(Object.fromEntries(Object.keys(b).sort().map(k => [k, b[k]])), null, 2) + '\n')
  console.log(`\n${Object.keys(hepsi).length} yeni anahtar`)
}
