/**
 * Codemod'un güvenle dokunamadığı iki dosya için elle taşıma (madde 29).
 *
 * ErrorBoundary bir CLASS bileşeni: hook çağıramaz.
 * VehicleContext'te metinlerin bir kısmı bileşen gövdesinin dışında.
 * İkisinde de i18n ÖRNEĞİ doğrudan kullanılıyor (`i18n.t`). Bu, dil değişince
 * yeniden render tetiklemez; sorun değil, çünkü buradaki metinler ya hata
 * ekranında ya da çağrı anında okunan geçici bildirimlerde (toast) geçiyor.
 */

import fs from 'node:fs'

const kacir = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const sozlukYaz = (yeni) => {
  const yol = 'src/i18n/locales/tr.json'
  const mevcut = JSON.parse(fs.readFileSync(yol, 'utf8'))
  const birlesik = { ...mevcut, ...yeni }
  const sirali = Object.fromEntries(Object.keys(birlesik).sort().map(k => [k, birlesik[k]]))
  fs.writeFileSync(yol, JSON.stringify(sirali, null, 2) + '\n')
}

const importEkle = (kaynak, satir, kosul) =>
  kosul.test(kaynak) ? kaynak : kaynak.replace(/^(import .*\r?\n)/m, `$1${satir}\n`)

// ---------------------------------------------------------------- ErrorBoundary
const errorBoundary = () => {
  const yol = 'src/components/ErrorBoundary.jsx'
  let s = fs.readFileSync(yol, 'utf8')
  const sozluk = {}

  const metinler = [
    ['Bir şeyler ters gitti 😟', 'errorBoundary.bir_seyler_ters_gitti'],
    ['Uygulamada beklenmedik bir hata oluştu. Endişelenme — verilerin güvende.', 'errorBoundary.beklenmedik_hata_verilerin_guvende'],
    ['Ne yapabilirsin?', 'errorBoundary.ne_yapabilirsin'],
    ['"Yeniden Dene" butonuna tıkla', 'errorBoundary.yeniden_dene_butonuna_tikla'],
    ['Sayfayı yenile (F5)', 'errorBoundary.sayfayi_yenile_f5'],
    ['Problem devam ederse, ayarlardan veri yedeği alıp tarayıcı önbelleğini temizle', 'errorBoundary.problem_devam_ederse_yedek_al'],
    ['Yeniden Dene', 'errorBoundary.yeniden_dene'],
    ['Ana Sayfa', 'errorBoundary.ana_sayfa'],
    ['Yenile', 'errorBoundary.yenile'],
    ['Hata devam ediyorsa geri bildirim için tarayıcı konsolundaki hatayı kaydedin', 'errorBoundary.hata_devam_ediyorsa_konsolu_kaydet'],
  ]

  for (const [metin, anahtar] of metinler) {
    const desen = new RegExp('(>\\s*)' + kacir(metin) + '(\\s*<)', 'g')
    if (!desen.test(s)) { console.log('  !! bulunamadı:', metin.slice(0, 45)); continue }
    s = s.replace(desen, (_m, a, b) => `${a}{i18n.t('${anahtar}')}${b}`)
    sozluk[anahtar] = metin
  }

  s = importEkle(s, "import i18n from '../i18n'", /from '\.\.\/i18n'/)
  fs.writeFileSync(yol, s)
  sozlukYaz(sozluk)
  console.log(`ErrorBoundary: ${Object.keys(sozluk).length} anahtar`)
}

// -------------------------------------------------------------- VehicleContext
const HARF = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u' }
const slug = (m) =>
  m.replace(/[çğıöşüÇĞİÖŞÜ]/g, h => HARF[h]).toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    .split('_').slice(0, 6).join('_').slice(0, 48) || 'metin'

const vehicleContext = () => {
  const yol = 'src/context/VehicleContext.tsx'
  let s = fs.readFileSync(yol, 'utf8')
  const sozluk = {}
  let sayac = 0

  // Yalnızca toast çağrılarındaki düz dizgeler. Şablon dizgilerine
  // (`${...}` içerenlere) dokunulmuyor: enterpolasyon kararı el ister.
  s = s.replace(
    /\btoast\.(success|error)\((\s*)'([^'\\\n]*)'/g,
    (tam, tur, bosluk, metin) => {
      const temiz = metin.trim()
      if (!/[a-zA-ZçğıöşüÇĞİÖŞÜ]{2,}/.test(temiz)) return tam
      const anahtar = `ctx.vehicleContext.${slug(temiz)}`
      sozluk[anahtar] = temiz
      sayac++
      return `toast.${tur}(${bosluk}i18n.t('${anahtar}')`
    }
  )

  if (sayac === 0) { console.log('VehicleContext: değişiklik yok'); return }

  s = importEkle(s, "import i18n from '../i18n'", /from '\.\.\/i18n'/)
  fs.writeFileSync(yol, s)
  sozlukYaz(sozluk)
  console.log(`VehicleContext: ${Object.keys(sozluk).length} anahtar (${sayac} çağrı)`)
}

errorBoundary()
vehicleContext()
