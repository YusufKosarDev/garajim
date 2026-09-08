// Türkiye plaka formatı: 2 rakam + 1-3 harf + 2-4 rakam
// Örnekler: "34 A 1234", "06 AB 123", "35 ABC 12", "34 ABC 1234"
const PLATE_REGEX = /^\d{2}\s[A-Z]{1,3}\s\d{2,4}$/

// Kullanıcının yazdığı plakayı standart formata çevir
export const formatPlate = (input?: string | null): string => {
  if (!input) return ''

  // Türkçe karakterleri İngilizce'ye çevir, boşlukları ve özel karakterleri sil
  const cleaned = input
    .toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]/g, '')

  if (cleaned.length === 0) return ''

  // İl kodu: ilk 2 karakter (rakam olmalı)
  const provinceCode = cleaned.slice(0, 2)

  // Sadece il kodu varsa veya il kodu tamamlanmamışsa
  if (cleaned.length <= 2) return provinceCode

  // İl kodundan sonra harf kısmı
  const afterIl = cleaned.slice(2)

  // Harfleri bul (rakam başlayana kadar)
  let letters = ''
  let i = 0
  while (i < afterIl.length && /[A-Z]/.test(afterIl[i]) && letters.length < 3) {
    letters += afterIl[i]
    i++
  }

  // Sadece il + harf varsa
  if (i === afterIl.length) {
    return letters ? `${provinceCode} ${letters}` : provinceCode
  }

  // Harften sonraki rakamlar
  const digits = afterIl.slice(i).replace(/[^0-9]/g, '').slice(0, 4)

  if (!letters) return provinceCode
  if (!digits) return `${provinceCode} ${letters}`

  return `${provinceCode} ${letters} ${digits}`
}

// Plaka formatı geçerli mi?
export const isValidPlate = (plate?: string | null): boolean => {
  if (!plate) return false
  return PLATE_REGEX.test(plate.trim())
}

// İki plakayı karşılaştır (case-insensitive, boşluk-insensitive)
export const platesMatch = (plate1?: string | null, plate2?: string | null): boolean => {
  if (!plate1 || !plate2) return false
  const normalize = (p: string) => p.replace(/\s+/g, '').toUpperCase()
  return normalize(plate1) === normalize(plate2)
}