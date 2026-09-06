/**
 * Fiş/fatura OCR metnini bakım formu alanlarına çevirir.
 *
 * Burası saf metin işleme — Tesseract'ı hiç tanımıyor (bkz. lib/ocr.ts). Sebebi
 * test edilebilirlik: OCR'ın kendisi yavaş ve belirsiz, asıl hata yapılabilecek
 * yer ise Türkçe fişlerin ayrıştırılması. Bu dosya tamamen deterministik.
 *
 * Tasarım kararı: EMİN OLMADIĞINDA null DÖNER. Yanlış bir tutar önerip
 * kullanıcının onaylamasını ummaktansa hiç önermemek daha iyi — kullanıcı zaten
 * alanı elle dolduracaktı.
 */

export interface AlanOnerisi<T> {
  deger: T
  /** Öneriyi üreten ham satır — kullanıcıya gösteriliyor ki neye onay verdiğini görsün */
  kaynak: string
}

export interface FisOnerileri {
  tutar: AlanOnerisi<number> | null
  tarih: AlanOnerisi<string> | null
  km: AlanOnerisi<number> | null
}

/** Türkçe harfleri ASCII'ye indirger — "ÖDENECEK" ve OCR'ın ürettiği "ODENECEK" aynı anahtara düşsün diye */
const sadelestir = (metin: string): string =>
  metin
    .toUpperCase()
    .replace(/[İI]/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')

/**
 * Türkçe sayı biçimini okur: "1.234,56" -> 1234.56
 *
 * Ayırıcı belirsizliği ("1.500" hem 1500 hem 1,5 olabilir) son ayırıcıdan sonraki
 * basamak sayısıyla çözülüyor: 3 basamak binlik, 1-2 basamak ondalık. Türk
 * fişlerinde "1.500" her zaman bin beş yüz demek.
 */
export const parseTurkishNumber = (ham: string): number | null => {
  if (typeof ham !== 'string') return null

  // OCR sayı bağlamında O/l/S karıştırır ("1.5OO,OO"). Düzeltmeden önceki tek
  // şart: parçada EN AZ BİR gerçek rakam bulunmalı. Bu şart olmasa "TOPLAM"
  // kelimesi 0'a, "OSOS" 505'e dönüşür ve bir kelime tutar sanılırdı.
  let s = ham.trim().replace(/[^\dOoIlSs.,]/g, '')
  if (!/\d/.test(s)) return null
  s = s.replace(/[Oo]/g, '0').replace(/[Il]/g, '1').replace(/[Ss]/g, '5')

  if (!/^\d[\d.,]*$/.test(s)) return null

  const sonNokta = s.lastIndexOf('.')
  const sonVirgul = s.lastIndexOf(',')
  const sonAyirici = Math.max(sonNokta, sonVirgul)

  let tamKisim = s
  let ondalik = ''
  if (sonAyirici !== -1) {
    const kuyruk = s.slice(sonAyirici + 1)
    // 3 basamak = binlik ayırıcı; 1-2 basamak = ondalık; başka bir şey = anlamsız
    if (/^\d{1,2}$/.test(kuyruk)) {
      tamKisim = s.slice(0, sonAyirici)
      ondalik = kuyruk
    } else if (!/^\d{3}$/.test(kuyruk)) {
      return null
    }
  }

  const tam = tamKisim.replace(/[.,]/g, '')
  if (!/^\d+$/.test(tam)) return null

  const sonuc = Number(`${tam}.${ondalik || '0'}`)
  return Number.isFinite(sonuc) ? sonuc : null
}

// Satırdaki son sayıyı bulur — fişlerde tutar sağda, etiket solda durur
const satirdakiSonSayi = (satir: string): number | null => {
  const adaylar = satir.match(/[\d][\d.,OoIlSs]*/g)
  if (!adaylar) return null
  for (let i = adaylar.length - 1; i >= 0; i--) {
    const n = parseTurkishNumber(adaylar[i])
    if (n !== null) return n
  }
  return null
}

// Öncelik sırası önemli: "GENEL TOPLAM" varken "ARA TOPLAM"a bakılmamalı
const TUTAR_ONCELIKLERI = [
  ['GENEL TOPLAM', 'ODENECEK', 'ODENEN TUTAR', 'TOPLAM TUTAR'],
  ['TOPLAM', 'TUTAR', 'YEKUN'],
]

// Bunları içeren satırdaki sayı toplam DEĞİLDİR — "ara toplam" ve "para üstü"
// gerçek tutardan farklıdır, KDV ise onun bir parçasıdır.
const TUTAR_DISLAYICILARI = [
  'ARA TOPLAM', 'KDV', 'ISKONTO', 'INDIRIM', 'PARA USTU', 'ALINAN',
  'TOPKDV', 'KDV TOPLAM',
]

const tutarBul = (satirlar: string[]): AlanOnerisi<number> | null => {
  for (const anahtarlar of TUTAR_ONCELIKLERI) {
    for (let i = 0; i < satirlar.length; i++) {
      const sade = sadelestir(satirlar[i])
      if (TUTAR_DISLAYICILARI.some(d => sade.includes(d))) continue
      if (!anahtarlar.some(a => sade.includes(a))) continue

      // Sayı genelde aynı satırda; sütunlu fişlerde OCR alt satıra atabiliyor
      let deger = satirdakiSonSayi(satirlar[i])
      if (deger === null && i + 1 < satirlar.length) deger = satirdakiSonSayi(satirlar[i + 1])
      if (deger !== null && deger > 0) return { deger, kaynak: satirlar[i].trim() }
    }
  }
  return null
}

const ikiHane = (n: number): string => String(n).padStart(2, '0')

/**
 * Tarih: Türkiye'de GG/AA/YYYY. "12/03/2025" 12 Mart'tır, 3 Aralık değil.
 * Gelecek tarih reddedilir — fiş gelecekten gelemez, o OCR hatasıdır.
 */
const tarihBul = (satirlar: string[], bugun: Date): AlanOnerisi<string> | null => {
  const desen = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/
  const bulunanlar: Array<{ oneri: AlanOnerisi<string>; etiketli: boolean }> = []

  for (const satir of satirlar) {
    const m = satir.match(desen)
    if (!m) continue

    const gun = Number(m[1])
    const ay = Number(m[2])
    let yil = Number(m[3])
    if (m[3].length === 2) yil += 2000

    if (ay < 1 || ay > 12 || gun < 1 || gun > 31) continue
    if (yil < 2000 || yil > bugun.getFullYear()) continue

    const d = new Date(yil, ay - 1, gun)
    // Taşma kontrolü: 31/02 -> Date sessizce 03 Mart yapar
    if (d.getFullYear() !== yil || d.getMonth() !== ay - 1 || d.getDate() !== gun) continue
    if (d.getTime() > bugun.getTime()) continue

    bulunanlar.push({
      oneri: { deger: `${yil}-${ikiHane(ay)}-${ikiHane(gun)}`, kaynak: satir.trim() },
      etiketli: /TARIH|TARIHI|DUZENLEME/.test(sadelestir(satir)),
    })
  }

  if (bulunanlar.length === 0) return null
  // "TARİH:" etiketli satır, fişin altındaki rastgele bir tarihten daha güvenilir
  return (bulunanlar.find(b => b.etiketli) ?? bulunanlar[0]).oneri
}

/**
 * KM: SADECE açıkça etiketliyse. Bir fiş baştan aşağı sayı doludur; etiketsiz
 * bir sayıyı kilometre saymak, kullanıcının aracına yanlış km yazmak demektir.
 */
const KM_UST_SINIR = 2_000_000

const kmBul = (satirlar: string[]): AlanOnerisi<number> | null => {
  for (const satir of satirlar) {
    const sade = sadelestir(satir)
    const m = sade.match(/\b(?:KM|K\.M\.?|KILOMETRE)\b\s*[:.-]?\s*([\d][\d.,]*)/)
    if (!m) continue

    const deger = parseTurkishNumber(m[1])
    // Kilometre tam sayıdır; "12,50" gibi bir eşleşme fiyattır, km değil
    if (deger === null || deger <= 0 || deger > KM_UST_SINIR) continue
    if (!Number.isInteger(deger)) continue

    return { deger: Math.round(deger), kaynak: satir.trim() }
  }
  return null
}

/**
 * OCR metnini alan önerilerine çevirir.
 * @param bugun Test edilebilirlik için enjekte ediliyor — "gelecek tarihi reddet"
 *              kuralı yoksa gerçek takvime bağlı kalır ve testler zamanla kırılır.
 */
export const parseFisMetni = (metin: string, bugun: Date = new Date()): FisOnerileri => {
  if (typeof metin !== 'string' || !metin.trim()) {
    return { tutar: null, tarih: null, km: null }
  }

  const satirlar = metin.split(/\r?\n/).filter(s => s.trim())

  return {
    tutar: tutarBul(satirlar),
    tarih: tarihBul(satirlar, bugun),
    km: kmBul(satirlar),
  }
}
