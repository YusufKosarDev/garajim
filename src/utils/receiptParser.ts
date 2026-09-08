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

export interface FieldSuggestion<T> {
  value: T
  /** Öneriyi üreten ham satır — kullanıcıya gösteriliyor ki neye onay verdiğini görsün */
  sourceLine: string
}

export interface ReceiptSuggestions {
  amount: FieldSuggestion<number> | null
  date: FieldSuggestion<string> | null
  km: FieldSuggestion<number> | null
}

/** Türkçe harfleri ASCII'ye indirger — "ÖDENECEK" ve OCR'ın ürettiği "ODENECEK" aynı anahtara düşsün diye */
const normalizeText = (text: string): string =>
  text
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
export const parseTurkishNumber = (raw: string): number | null => {
  if (typeof raw !== 'string') return null

  // OCR sayı bağlamında O/l/S karıştırır ("1.5OO,OO"). Düzeltmeden önceki tek
  // şart: parçada EN AZ BİR gerçek rakam bulunmalı. Bu şart olmasa "TOPLAM"
  // kelimesi 0'a, "OSOS" 505'e dönüşür ve bir kelime tutar sanılırdı.
  let s = raw.trim().replace(/[^\dOoIlSs.,]/g, '')
  if (!/\d/.test(s)) return null
  s = s.replace(/[Oo]/g, '0').replace(/[Il]/g, '1').replace(/[Ss]/g, '5')

  if (!/^\d[\d.,]*$/.test(s)) return null

  const sonNokta = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  const lastSeparator = Math.max(sonNokta, lastComma)

  let tamKisim = s
  let decimalPart = ''
  if (lastSeparator !== -1) {
    const queue = s.slice(lastSeparator + 1)
    // 3 basamak = binlik ayırıcı; 1-2 basamak = ondalık; başka bir şey = anlamsız
    if (/^\d{1,2}$/.test(queue)) {
      tamKisim = s.slice(0, lastSeparator)
      decimalPart = queue
    } else if (!/^\d{3}$/.test(queue)) {
      return null
    }
  }

  const tam = tamKisim.replace(/[.,]/g, '')
  if (!/^\d+$/.test(tam)) return null

  const result = Number(`${tam}.${decimalPart || '0'}`)
  return Number.isFinite(result) ? result : null
}

// Satırdaki son sayıyı bulur — fişlerde tutar sağda, etiket solda durur
const lastNumberInLine = (line: string): number | null => {
  const candidates = line.match(/[\d][\d.,OoIlSs]*/g)
  if (!candidates) return null
  for (let i = candidates.length - 1; i >= 0; i--) {
    const n = parseTurkishNumber(candidates[i])
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

const findAmount = (lines: string[]): FieldSuggestion<number> | null => {
  for (const keywords of TUTAR_ONCELIKLERI) {
    for (let i = 0; i < lines.length; i++) {
      const normalized = normalizeText(lines[i])
      if (TUTAR_DISLAYICILARI.some(d => normalized.includes(d))) continue
      if (!keywords.some(a => normalized.includes(a))) continue

      // Sayı genelde aynı satırda; sütunlu fişlerde OCR alt satıra atabiliyor
      let value = lastNumberInLine(lines[i])
      if (value === null && i + 1 < lines.length) value = lastNumberInLine(lines[i + 1])
      if (value !== null && value > 0) return { value, sourceLine: lines[i].trim() }
    }
  }
  return null
}

const twoDigits = (n: number): string => String(n).padStart(2, '0')

/**
 * Tarih: Türkiye'de GG/AA/YYYY. "12/03/2025" 12 Mart'tır, 3 Aralık değil.
 * Gelecek tarih reddedilir — fiş gelecekten gelemez, o OCR hatasıdır.
 */
const findDate = (lines: string[], today: Date): FieldSuggestion<string> | null => {
  const pattern = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/
  const matches: Array<{ suggestion: FieldSuggestion<string>; labeled: boolean }> = []

  for (const line of lines) {
    const m = line.match(pattern)
    if (!m) continue

    const gun = Number(m[1])
    const ay = Number(m[2])
    let year = Number(m[3])
    if (m[3].length === 2) year += 2000

    if (ay < 1 || ay > 12 || gun < 1 || gun > 31) continue
    if (year < 2000 || year > today.getFullYear()) continue

    const d = new Date(year, ay - 1, gun)
    // Taşma kontrolü: 31/02 -> Date sessizce 03 Mart yapar
    if (d.getFullYear() !== year || d.getMonth() !== ay - 1 || d.getDate() !== gun) continue
    if (d.getTime() > today.getTime()) continue

    matches.push({
      suggestion: { value: `${year}-${twoDigits(ay)}-${twoDigits(gun)}`, sourceLine: line.trim() },
      labeled: /TARIH|TARIHI|DUZENLEME/.test(normalizeText(line)),
    })
  }

  if (matches.length === 0) return null
  // "TARİH:" etiketli satır, fişin altındaki rastgele bir tarihten daha güvenilir
  return (matches.find(b => b.labeled) ?? matches[0]).suggestion
}

/**
 * KM: SADECE açıkça etiketliyse. Bir fiş baştan aşağı sayı doludur; etiketsiz
 * bir sayıyı kilometre saymak, kullanıcının aracına yanlış km yazmak demektir.
 */
const KM_UST_SINIR = 2_000_000

const findKm = (lines: string[]): FieldSuggestion<number> | null => {
  for (const line of lines) {
    const normalized = normalizeText(line)
    const m = normalized.match(/\b(?:KM|K\.M\.?|KILOMETRE)\b\s*[:.-]?\s*([\d][\d.,]*)/)
    if (!m) continue

    const value = parseTurkishNumber(m[1])
    // Kilometre tam sayıdır; "12,50" gibi bir eşleşme fiyattır, km değil
    if (value === null || value <= 0 || value > KM_UST_SINIR) continue
    if (!Number.isInteger(value)) continue

    return { value: Math.round(value), sourceLine: line.trim() }
  }
  return null
}

/**
 * OCR metnini alan önerilerine çevirir.
 * @param bugun Test edilebilirlik için enjekte ediliyor — "gelecek tarihi reddet"
 *              kuralı yoksa gerçek takvime bağlı kalır ve testler zamanla kırılır.
 */
export const parseReceiptText = (text: string, today: Date = new Date()): ReceiptSuggestions => {
  if (typeof text !== 'string' || !text.trim()) {
    return { amount: null, date: null, km: null }
  }

  const lines = text.split(/\r?\n/).filter(s => s.trim())

  return {
    amount: findAmount(lines),
    date: findDate(lines, today),
    km: findKm(lines),
  }
}
