/**
 * i18n taşıma aracı (madde 29).
 *
 * NE YAPAR: verilen dosyadaki Türkçe JSX metinlerini ve seçili JSX
 * özniteliklerini `t('anahtar')` çağrısına çevirir, karşılıklarını
 * src/i18n/locales/tr.json'a yazar.
 *
 * NE YAPMAZ (bilinçli):
 *  - Modül seviyesindeki sabitlere dokunmaz — orada hook çağrılamaz.
 *  - Şablon dizgilerine (`${...}`) dokunmaz — enterpolasyon kararı el ister.
 *  - ATLA listesindeki metinlere dokunmaz. Oradakiler ekranda etiket gibi
 *    görünen ama aslında VERİTABANINA YAZILAN değerlerdir; çevrilirse eşleşme
 *    kaybolur ve kullanıcının kayıtları görünmez olur.
 *
 * Kullanım: node scripts/i18n-codemod.mjs <dosya> [--uygula]
 * --uygula verilmezse yalnızca ne yapacağını yazar.
 */

import fs from 'node:fs'
import path from 'node:path'


/**
 * ASLA ÇEVRİLMEYECEK metinler: bunlar veritabanı değerleri.
 * "Yağ Değişimi" ekranda etiket gibi durur ama maintenance_records.type
 * sütununda saklanır ve DEFAULT_INTERVALS'ta anahtar olarak aranır.
 */
const ATLA = new Set([
  // Bakım türleri — maintenance_records.type
  'Yağ Değişimi', 'Yağ Filtresi', 'Hava Filtresi', 'Yakıt Filtresi',
  'Polen Filtresi', 'Balata', 'Balata Değişimi', 'Disk', 'Disk Değişimi',
  'Lastik', 'Lastik Değişimi', 'Triger Seti', 'Akü', 'Buji', 'Antifriz',
  'Fren Hidroliği', 'Diğer',
  // Yakıt tipleri — vehicles.fuel_type
  'Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrik',
  // Marka adı çevrilmez
  'Garajım', 'Garajım PWA',
])

const ALAN_ADI = {
  pages: '', components: '', 'components/stats': 'stats', context: 'ctx', hooks: 'hooks',
}

const anahtarOnEki = (dosya) => {
  const rel = dosya.replace(/\\/g, '/').replace(/^src\//, '').replace(/\.(jsx|tsx)$/, '')
  const parcalar = rel.split('/')
  const ad = parcalar.pop()
  const klasor = parcalar.join('/')
  const alan = ALAN_ADI[klasor] ?? klasor.replace(/\//g, '.')
  const taban = ad.charAt(0).toLowerCase() + ad.slice(1)
  return alan ? `${alan}.${taban}` : taban
}

const HARF = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u' }

const slug = (metin) =>
  metin
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, h => HARF[h])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .split('_').slice(0, 6).join('_')
    .slice(0, 48) || 'metin'

// Bu özniteliklerdeki dizgeler kullanıcıya görünür
const CEVRILECEK_OZNITELIK = /^(placeholder|title|alt|aria-label|label|hint|description)$/

/**
 * Kod belirteçlerinin sayısı. Dönüşüm bunları DEĞİŞTİRMEMELİ; değişmişse
 * regex kod yutmuş demektir. Satır sayısını saymak yetmez: çok satırlı bir
 * metin düğümü tek satıra inebiliyor ve bu meşru.
 */
/**
 * Dosyadaki React bileşenlerinin gövde başlangıçlarını bulur.
 *
 * Neden regex değil: bileşen imzaları çok satırlı olabiliyor ve parametre
 * listesinin İÇİNDE parantez geçebiliyor — MigrationModal'da
 * `onConfirm,  // () => Promise<result>` yorumu tam da bunu yapıyor ve
 * `\([^)]*\)` deseni orada kırılıyordu. Burada parantezler sayılıyor.
 *
 * Ad büyük harfle başlamalı: React'te bileşeni sıradan yardımcı fonksiyondan
 * ayıran şey budur. Bu ayrım olmadan araç `const addToStack = ...` içine hook
 * koydu ve testler "Invalid hook call" ile patladı.
 */
const bilesenGovdeleri = (kaynak) => {
  const bas = /^(?:export\s+(?:default\s+)?)?(?:function\s+([A-Z]\w*)\s*\(|const\s+([A-Z]\w*)\s*=\s*(?:memo\()?\()/gm
  const bulunanlar = []

  for (const m of kaynak.matchAll(bas)) {
    // Eşleşme açılış parantezinde bitiyor; eşini bul
    let derinlik = 1
    let i = m.index + m[0].length
    while (i < kaynak.length && derinlik > 0) {
      if (kaynak[i] === '(') derinlik++
      else if (kaynak[i] === ')') derinlik--
      i++
    }
    if (derinlik !== 0) continue

    // `)` ile gövdeyi açan `{` arasında dönüş tipi ve `=>` olabilir
    const ara = kaynak.slice(i, i + 120)
    const govdeAcilis = ara.match(/^[^{;]*\{/)
    if (!govdeAcilis) continue

    bulunanlar.push({
      ad: m[1] ?? m[2],
      imzaBasi: m.index,
      govdeBasi: i + govdeAcilis[0].length,
    })
  }
  return bulunanlar
}

const kodBelirtecleri = (s) => ({
  const: (s.match(/\bconst\b/g) || []).length,
  return: (s.match(/\breturn\b/g) || []).length,
  ok: (s.match(/=>/g) || []).length,
  function: (s.match(/\bfunction\b/g) || []).length,
  parantez: (s.match(/[[\]]/g) || []).length,
  // `&&` / `||` sayımı, karşılaştırma operatörünün yuttuğu koşul ifadelerini
  // yakalar — ilk denemede `{j > 0 && !x && <span>` tam da böyle bozulmuştu.
  ve: (s.match(/&&/g) || []).length,
  veya: (s.match(/\|\|/g) || []).length,
})

/**
 * @param {object} secenekler
 * @param {boolean} secenekler.uygula  Dosyayı yaz
 * @param {boolean} secenekler.ornek   Hook yerine i18n ÖRNEĞİNİ kullan
 *   (`i18n.t('...')`). İki durumda şart:
 *     - ErrorBoundary bir CLASS bileşeni; hook çağıramaz.
 *     - VehicleContext'te bazı metinler bileşen gövdesinin dışında.
 *   Örnek üzerinden çeviri, dil değişiminde yeniden render tetiklemez; bu yüzden
 *   yalnızca çağrı anında okunan geçici metinlerde (toast) kullanılıyor.
 */
export function tasi(dosya, { uygula = false, ornek = false } = {}) {
  let kaynak = fs.readFileSync(dosya, 'utf8')
  const oncekiBelirtecler = kodBelirtecleri(kaynak)

  // `t` gölgelenmesi: `map(t => ...)` gibi bir yerde `t` çeviri fonksiyonu
  // olmaktan çıkıp dizi elemanı olur. O kapsamda `t('anahtar')` üretilirse
  // bir dizgiyi fonksiyon gibi çağırmış oluruz. Riskli dosya elle taşınsın.
  const golgeliT = /\((\s*)t(\s*)(,|\)|=>)/.test(kaynak) || /\bt\s*=>/.test(kaynak)

  const onEk = anahtarOnEki(dosya)
  const sozluk = {}
  const kullanilan = new Set()
  let degisiklik = 0

  const anahtarUret = (metin) => {
    const taban = `${onEk}.${slug(metin)}`
    let a = taban, i = 2
    while (kullanilan.has(a) && sozluk[a] !== metin) a = `${taban}_${i++}`
    kullanilan.add(a)
    sozluk[a] = metin
    return a
  }

  // JSX zaten ardışık boşlukları tek boşluğa indirger; sözlükte de öyle dursun
  const normalle = (metin) => metin.trim().replace(/\s+/g, ' ')

  /**
   * Türkçe metinlerin çoğunda ç/ğ/ı/ö/ş/ü var ama hepsinde yok: "Tarih",
   * "Fatura", "Marka", "Model", "Toplam", "Kaydet" hepsi ASCII. Yalnızca Türkçe
   * karaktere bakan ilk sürüm bunları kaçırıyordu.
   *
   * Uygulama baştan sona Türkçe olduğu için kural tersine çevrildi: harf içeren
   * her aday çevrilir, teknik görünenler elenir.
   */
  const TEKNIK = /^(?:[A-Z0-9]{1,5}|https?:.*|[\d\s.,%₺€$/:+-]*)$/

  const cevrilebilir = (metin) => {
    const t = metin.trim()
    if (t.length < 2 || ATLA.has(t) || t.includes('${')) return false
    // En az iki ardışık harf: " • ", "—", "₺" gibi süsleri eler
    if (!/[a-zA-ZçğıöşüÇĞİÖŞÜ]{2,}/.test(t)) return false
    // KM, CSV, PWA, MB gibi kısaltmalar ve sayı/birim parçaları çevrilmez
    if (TEKNIK.test(t)) return false
    return true
  }

  /**
   * Çok satırlı eşleşmeler kod parçası olabilir ve bu araç ilk denemesinde tam
   * olarak bunu yaptı: `const onInvalid = () => toast.error(...)` satırındaki
   * `=>` işaretinin `>`'sini bir JSX etiketinin kapanışı sandı, oradan sonraki
   * `<Modal`'a kadar DOKUZ SATIR KODU yuttu — bir dizi tanımı ve `return (`
   * dahil. Derleme bunu yakaladı, ama sözdizimini bozmayan bir yutma sessiz
   * kalırdı.
   *
   * Asıl çare aşağıdaki geriye bakışta: eşleşme `=`, `!`, `<` veya `>`'den
   * sonra gelen bir `>` ile BAŞLAYAMAZ. Bu, `=>`, `>=`, `<=` ve `>>`'yi bir
   * anda eler. Buradaki kontrol ikinci savunma hattı.
   */
  const kodKokuyor = (metin) =>
    /\/\/|\/\*|\*\/|=>|\)\s*:|\?\s*\(|;|=|\[|\]|&&|\|\||\breturn\b|\bconst\b/.test(metin)

  // 1) JSX öznitelikleri:  placeholder="Ara..."  ->  placeholder={t('...')}
  kaynak = kaynak.replace(
    /\b([a-zA-Z-]+)=("([^"\\\n]*)"|'([^'\\\n]*)')/g,
    (tam, isim, _q, cift, tek) => {
      const metin = cift ?? tek
      if (!CEVRILECEK_OZNITELIK.test(isim) || !cevrilebilir(metin)) return tam
      degisiklik++
      return `${isim}={t('${anahtarUret(normalle(metin))}')}`
    }
  )

  // 2) Kullanıcıya gösterilen çağrı argümanları: toast.error('...'), usePageTitle('...')
  kaynak = kaynak.replace(
    /\b(toast\.(?:success|error|loading)|toast|usePageTitle)\((\s*)("([^"\\\n]*)"|'([^'\\\n]*)')/g,
    (tam, cagri, bosluk, _q, cift, tek) => {
      const metin = cift ?? tek
      if (!cevrilebilir(metin)) return tam
      degisiklik++
      return `${cagri}(${bosluk}t('${anahtarUret(normalle(metin))}')`
    }
  )

  // 3) JSX metin düğümleri:  >Araç Ekle<  ->  >{t('...')}<
  //    Çok satırlı düğümler de kapsanıyor (JSX'te girintili metin yaygın), ama
  //    süslü parantez içeren karışık düğümler elde kalıyor: oradaki metin
  //    enterpolasyon ister ve karar makineye bırakılamaz.
  //    Geriye bakış iki şeyi birden eler:
  //      (?<![=!<>])  ->  `=>`, `>=`, `<=`, `>>` içindeki `>`
  //      (?<!\s)      ->  `j > 0` gibi KARŞILAŞTIRMA operatörü. JSX etiketleri
  //                       `>` işaretinden hemen önce boşluk bırakmaz; karşılaştırma
  //                       ise hep boşlukla yazılır. Bu koruma olmadan
  //                       `{j > 0 && !x && <span>` ifadesindeki ` 0 && !x && `
  //                       metin sanılıp çevrildi ve dosya derlenmez oldu.
  kaynak = kaynak.replace(
    /(?<![=!<>\s])(>)([^<>{}]+)(<)/g,
    (tam, ac, metin, kapa) => {
      if (!cevrilebilir(metin) || kodKokuyor(metin)) return tam
      const bosBas = metin.match(/^\s*/)[0]
      const bosSon = metin.match(/\s*$/)[0]
      degisiklik++
      return `${ac}${bosBas}{t('${anahtarUret(normalle(metin))}')}${bosSon}${kapa}`
    }
  )

  if (degisiklik === 0) return { dosya, degisiklik: 0, sozluk: {} }

  // YAPISAL DOĞRULAMA — kod yutulmasına karşı asıl savunma.
  const sonrakiBelirtecler = kodBelirtecleri(kaynak)
  for (const [ad, sayi] of Object.entries(oncekiBelirtecler)) {
    if (sonrakiBelirtecler[ad] !== sayi) {
      throw new Error(
        `${dosya}: dönüşüm kod yuttu — '${ad}' sayısı ${sayi} iken ${sonrakiBelirtecler[ad]} oldu`
      )
    }
  }

  if (golgeliT) {
    throw new Error(`${dosya}: 't' başka bir değişken olarak kullanılıyor (gölgeleme); elle taşınmalı`)
  }

  // 4) Hook ve import — yalnızca gerekiyorsa.
  //    Desenlerde `\n` yerine `\r?\n` şart: dosyalar CRLF ve ilk denemede bu
  //    yüzden ne import ne hook eklendi, üstelik SESSİZCE. Aşağıdaki doğrulama
  //    tam da bunun için var.
  if (!/useTranslation/.test(kaynak)) {
    const IMPORT = `import { useTranslation } from 'react-i18next'\n`
    if (/^import /m.test(kaynak)) {
      kaynak = kaynak.replace(/^(import .*\r?\n)/m, `$1${IMPORT}`)
    } else {
      // Hiç import'u olmayan dosyalar da var (ör. yalnızca JSX döndüren
      // PageLoader). İlk denemede bunlar sessizce atlanıyordu.
      kaynak = IMPORT + '\n' + kaynak
    }
  }

  /**
   * Hook yerleştirme. İki ders burada:
   *
   * 1. Ad BÜYÜK HARFLE başlamalı. İlk sürüm `const addToStack = (...) => {`
   *    gibi sıradan bir yardımcı fonksiyonu bileşen sanıp içine hook koydu;
   *    testler "Invalid hook call" ile patladı. React'te bileşen adı büyük
   *    harfle başlar, ayrım budur.
   *
   * 2. Dosyada birden fazla bileşen olabilir (ör. Dashboard.jsx içindeki
   *    DateRow). Yalnızca ilkine hook koymak, ikincide tanımsız `t` bırakır.
   *    Bu yüzden her bileşenin gövdesi ayrı ayrı taranıyor ve `t('` KULLANAN
   *    her bileşene hook ekleniyor — kullanmayana eklenmiyor ki lint
   *    "kullanılmayan değişken" demesin.
   */
  const bilesenler = bilesenGovdeleri(kaynak)
  // Sondan başa: metne ekleme yapınca önceki indeksler kaymasın
  for (let i = bilesenler.length - 1; i >= 0; i--) {
    const { govdeBasi } = bilesenler[i]
    const son = i + 1 < bilesenler.length ? bilesenler[i + 1].imzaBasi : kaynak.length
    const govde = kaynak.slice(govdeBasi, son)
    if (!/\bt\('/.test(govde) || /const \{ t \} = useTranslation\(\)/.test(govde)) continue

    kaynak = kaynak.slice(0, govdeBasi) + `\n  const { t } = useTranslation()\n` + kaynak.slice(govdeBasi)
  }

  // DOĞRULAMA: `t(` yazıp `t`yi tanımlamadan dosyayı kaydetmek, çalışma
  // zamanında patlayan bir sayfa demek. Sessizce geçmektense burada duruyoruz.
  if (/\bt\('/.test(kaynak)) {
    if (!/from 'react-i18next'/.test(kaynak)) {
      throw new Error(`${dosya}: t() eklendi ama react-i18next import edilemedi`)
    }
    // Her bileşen kendi hook'unu almalı; ilk bileşene bakıp geçmek yetmez.
    const son = bilesenGovdeleri(kaynak)
    const ilkBilesen = son.length ? son[0].imzaBasi : Infinity
    if (kaynak.slice(0, ilkBilesen).match(/\bt\('/)) {
      throw new Error(`${dosya}: t() bir bileşenin dışında kullanılıyor (modül seviyesi); elle taşınmalı`)
    }
    for (let i = 0; i < son.length; i++) {
      const bit = i + 1 < son.length ? son[i + 1].imzaBasi : kaynak.length
      const govde = kaynak.slice(son[i].govdeBasi, bit)
      if (/\bt\('/.test(govde) && !/const \{ t \} = useTranslation\(\)/.test(govde)) {
        throw new Error(`${dosya}: ${son[i].ad} içinde t() var ama hook yok`)
      }
    }
  }

  if (uygula) fs.writeFileSync(dosya, kaynak)
  return { dosya, degisiklik, sozluk }
}

// CLI
if (process.argv[1] && import.meta.url.endsWith('i18n-codemod.mjs') && process.argv[1].endsWith('i18n-codemod.mjs')) {
  const dosyalar = process.argv.slice(2).filter(a => !a.startsWith('--'))
  const uygula = process.argv.includes('--uygula')
  const hepsi = {}
  const basarisiz = []
  for (const d of dosyalar) {
    try {
      const r = tasi(d, { uygula })
      Object.assign(hepsi, r.sozluk)
      if (r.degisiklik) console.log(`${String(r.degisiklik).padStart(3)}  ${d}`)
    } catch (hata) {
      // Tek dosyanın tanınmaması toplu çalıştırmayı durdurmasın; sonda listelenir
      // ve o dosyalar elle taşınır.
      basarisiz.push(`${d}: ${hata.message.replace(`${d}: `, '')}`)
    }
  }
  if (basarisiz.length) {
    console.log(`\n!! ELLE TAŞINACAK (${basarisiz.length}):`)
    basarisiz.forEach(m => console.log('   ' + m))
  }

  const yol = 'src/i18n/locales/tr.json'
  if (uygula && Object.keys(hepsi).length) {
    fs.mkdirSync(path.dirname(yol), { recursive: true })
    const mevcut = fs.existsSync(yol) ? JSON.parse(fs.readFileSync(yol, 'utf8')) : {}
    const birlesik = { ...mevcut, ...hepsi }
    const sirali = Object.fromEntries(Object.keys(birlesik).sort().map(k => [k, birlesik[k]]))
    fs.writeFileSync(yol, JSON.stringify(sirali, null, 2) + '\n')
    console.log(`\n${Object.keys(hepsi).length} anahtar -> ${yol}`)
  }
}
