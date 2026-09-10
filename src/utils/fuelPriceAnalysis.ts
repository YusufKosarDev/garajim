import i18n from '../i18n'
/**
 * Yakıt fiyatı analizi — dış API yok, tamamen kullanıcının kendi kayıtlarından.
 *
 * NEDEN AYRI BİR DOSYA: `statisticsHelpers.getStationAnalysis` istasyonların
 * ÖMÜR BOYU ortalama fiyatını karşılaştırıyor. Bu yanıltıcı. 2024'te A'dan
 * 25 ₺/L, 2026'da B'den 45 ₺/L alan biri için "B %80 daha pahalı, A'dan alsaydın
 * servet biriktirirdin" der — oysa aradaki fark istasyon seçimi değil,
 * ENFLASYONDUR. Buradaki hesaplar zamanı dikkate alır.
 *
 * Yöntem: her alım, AYNI DÖNEMDEKİ diğer alımlarla karşılaştırılır. Böylece
 * genel fiyat seviyesi (enflasyon) sadeleşir, geriye istasyon farkı kalır.
 */

import type { FuelRecord } from '../types'

const GUN_MS = 86_400_000

/** İstasyon sapması için pencere: bir ayda ulusal fiyat seviyesi kabaca sabit sayılır */
const DEVIATION_WINDOW_DAYS = 30

/**
 * Tasarruf için daha dar pencere. "O gün öbür istasyon daha ucuzdu" demek için
 * fiyatların gerçekten aynı dönemde olması gerekir; 30 gün boyunca zam gelirse
 * ayın en ucuz gününü referans almak tasarrufu şişirirdi.
 */
const TASARRUF_PENCERE_GUN = 7

export interface StationDeviation {
  station: string
  /** Karşılaştırılabilir alım sayısı (aynı dönemde başka istasyon da varken yapılan) */
  count: number
  /** Piyasaya göre ortalama fark, ₺/L. Negatif = ucuz */
  avgDeviation: number
  avgPercentDeviation: number
}

export interface MonthlyPrice {
  /** YYYY-MM */
  month: string
  ortFiyat: number
  litre: number
}

export interface Tasarruf {
  /** Her alımda o dönemde gözlemlenen en ucuz istasyonu seçseydin fark, ₺ */
  total: number
  /** Bu hesaba giren alım sayısı — kaç alımda gerçekten daha ucuz bir alternatif vardı */
  comparedFillUps: number
  /** Hesaba giren alımların toplam tutarı; oran verirken payda budur */
  comparedAmount: number
}

export interface FuelPriceAnalysis {
  stations: StationDeviation[]
  monthlyPrices: MonthlyPrice[]
  savings: Tasarruf | null
  /** Analiz yapılamadıysa sebebi — kullanıcıya boş kutu göstermemek için */
  insufficientData: string | null
}

interface FillUp {
  zaman: number
  fiyat: number
  litre: number
  station: string
  month: string
}

const ortanca = (numbers: number[]): number => {
  if (numbers.length === 0) return 0
  const s = [...numbers].sort((a, b) => a - b)
  const medium = Math.floor(s.length / 2)
  return s.length % 2 ? s[medium] : (s[medium - 1] + s[medium]) / 2
}

/**
 * Piyasa seviyesi için ORTALAMA değil ORTANCA kullanılıyor: tek bir hatalı
 * kayıt (yanlış girilen fiyat) ortalamayı kaydırır, ortancayı kaydırmaz.
 */
const normalize = (records: FuelRecord[]): FillUp[] =>
  records
    .map(r => {
      const litre = Number(r.liters) || 0
      // pricePerLiter boşsa toplam tutardan türet — eski kayıtlarda bu alan boş olabiliyor
      const fiyat = Number(r.pricePerLiter) > 0
        ? Number(r.pricePerLiter)
        : (litre > 0 ? (Number(r.totalCost) || 0) / litre : 0)
      const zaman = r.date ? new Date(r.date).getTime() : NaN
      return {
        zaman,
        fiyat,
        litre,
        station: r.station?.trim() || 'Belirtilmemiş',
        month: typeof r.date === 'string' ? r.date.slice(0, 7) : '',
      }
    })
    .filter(a => Number.isFinite(a.zaman) && a.fiyat > 0 && a.litre > 0 && a.month.length === 7)
    .sort((a, b) => a.zaman - b.zaman)

const windowOf = (fillUps: FillUp[], center: FillUp, days: number): FillUp[] => {
  const yaricap = days * GUN_MS
  return fillUps.filter(a => Math.abs(a.zaman - center.zaman) <= yaricap)
}

export const analyzeFuelPrices = (records: FuelRecord[] = []): FuelPriceAnalysis => {
  const bos: FuelPriceAnalysis = { stations: [], monthlyPrices: [], savings: null, insufficientData: null }

  const fillUps = normalize(records)
  if (fillUps.length < 2) {
    return { ...bos, insufficientData: i18n.t('fuelPriceAnalysis.en_az_iki_kayit') }
  }

  // ---- Aylık fiyat seyri (kendi verinden enflasyon eğrisi) ----
  const monthly = new Map<string, { tutar: number; litre: number }>()
  for (const a of fillUps) {
    const m = monthly.get(a.month) ?? { tutar: 0, litre: 0 }
    m.tutar += a.fiyat * a.litre
    m.litre += a.litre
    monthly.set(a.month, m)
  }
  const monthlyPrices: MonthlyPrice[] = [...monthly.entries()]
    .map(([month, m]) => ({ month, ortFiyat: m.tutar / m.litre, litre: m.litre }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const stationCount = new Set(fillUps.map(a => a.station)).size
  if (stationCount < 2) {
    return {
      ...bos,
      monthlyPrices,
      insufficientData: i18n.t('fuelPriceAnalysis.en_az_iki_istasyon'),
    }
  }

  // ---- İstasyon sapması ----
  const deviations = new Map<string, { differences: number[]; percentages: number[] }>()

  for (const alim of fillUps) {
    const neighbours = windowOf(fillUps, alim, DEVIATION_WINDOW_DAYS)
    // Aynı dönemde başka istasyon yoksa karşılaştırma yapılamaz — bu alım atlanır.
    // Kendisiyle kıyaslanan bir alım "piyasa ortalamasında" görünürdü; bu bir bilgi değil.
    if (new Set(neighbours.map(k => k.station)).size < 2) continue

    const piyasa = ortanca(neighbours.map(k => k.fiyat))
    if (piyasa <= 0) continue

    const fark = alim.fiyat - piyasa
    const record = deviations.get(alim.station) ?? { differences: [], percentages: [] }
    record.differences.push(fark)
    record.percentages.push((fark / piyasa) * 100)
    deviations.set(alim.station, record)
  }

  const average = (d: number[]) => d.reduce((t, n) => t + n, 0) / d.length

  const stations: StationDeviation[] = [...deviations.entries()]
    .map(([station, { differences, percentages }]) => ({
      station,
      count: differences.length,
      avgDeviation: average(differences),
      avgPercentDeviation: average(percentages),
    }))
    .sort((a, b) => a.avgDeviation - b.avgDeviation)

  // ---- Gerçekten gözlemlenebilir tasarruf ----
  // Kural: yalnızca AYNI DÖNEMDE BAŞKA BİR İSTASYONDA daha ucuz bir alım
  // yapılmışsa fark sayılır. Yani "o sırada gerçekten daha ucuzu vardı ve bunu
  // biliyordun" durumu. Varsayımsal fiyat üretmiyoruz.
  let totalSavings = 0
  let comparedFillUps = 0
  let comparedAmount = 0

  for (const alim of fillUps) {
    const alternatives = windowOf(fillUps, alim, TASARRUF_PENCERE_GUN)
      .filter(k => k.station !== alim.station)
    if (alternatives.length === 0) continue

    const enUcuz = Math.min(...alternatives.map(k => k.fiyat))
    comparedFillUps += 1
    comparedAmount += alim.fiyat * alim.litre
    if (enUcuz < alim.fiyat) totalSavings += (alim.fiyat - enUcuz) * alim.litre
  }

  if (stations.length === 0) {
    return {
      stations: [],
      monthlyPrices,
      savings: null,
      insufficientData:
        i18n.t('fuelPriceAnalysis.alimlar_uzak'),
    }
  }

  return {
    stations,
    monthlyPrices,
    savings: comparedFillUps > 0
      ? {
          total: totalSavings,
          comparedFillUps,
          comparedAmount,
        }
      : null,
    insufficientData: null,
  }
}
