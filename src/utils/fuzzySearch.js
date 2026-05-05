/**
 * Basit fuzzy search — query'nin harfleri text içinde sırayla bulunuyorsa eşleşir
 * Örnek: "yağ" → "Yağ Değişimi" (eşleşir), "değşm" → "Değişim" (eşleşir)
 */
export const fuzzyMatch = (text, query) => {
  if (!query) return { score: 1, match: true }
  if (!text) return { score: 0, match: false }

  const normalizedText = normalizeText(text)
  const normalizedQuery = normalizeText(query)

  // Tam eşleşme varsa en yüksek skor
  if (normalizedText.includes(normalizedQuery)) {
    // Başta eşleşirse daha yüksek skor
    const index = normalizedText.indexOf(normalizedQuery)
    const score = index === 0 ? 100 : 80 - index
    return { score, match: true }
  }

  // Karakter bazlı fuzzy match
  let queryIndex = 0
  let lastMatchIndex = -1
  let consecutiveMatches = 0
  let maxConsecutive = 0

  for (let i = 0; i < normalizedText.length && queryIndex < normalizedQuery.length; i++) {
    if (normalizedText[i] === normalizedQuery[queryIndex]) {
      if (lastMatchIndex === i - 1) {
        consecutiveMatches++
        maxConsecutive = Math.max(maxConsecutive, consecutiveMatches)
      } else {
        consecutiveMatches = 1
      }
      lastMatchIndex = i
      queryIndex++
    }
  }

  const allMatched = queryIndex === normalizedQuery.length
  if (!allMatched) return { score: 0, match: false }

  // Skor: eşleşme var ama kıtalara göre puan
  const baseScore = 30
  const consecutiveBonus = maxConsecutive * 5
  const lengthPenalty = normalizedText.length - normalizedQuery.length

  return {
    score: Math.max(10, baseScore + consecutiveBonus - lengthPenalty * 0.5),
    match: true,
  }
}

/**
 * Türkçe karakterleri ve özel karakterleri normalize et
 */
const normalizeText = (text) => {
  return String(text)
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

/**
 * Bir nesnenin birden fazla alanında arama yap, en yüksek skoru döndür
 */
export const multiFieldSearch = (obj, query, fields) => {
  if (!query) return { score: 0, match: true }

  let maxScore = 0
  let matched = false

  for (const field of fields) {
    const value = obj[field]
    if (value !== undefined && value !== null) {
      const result = fuzzyMatch(value, query)
      if (result.match && result.score > maxScore) {
        maxScore = result.score
        matched = true
      }
    }
  }

  return { score: maxScore, match: matched }
}