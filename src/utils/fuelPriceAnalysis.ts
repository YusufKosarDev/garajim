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
const SAPMA_PENCERE_GUN = 30

/**
 * Tasarruf için daha dar pencere. "O gün öbür istasyon daha ucuzdu" demek için
 * fiyatların gerçekten aynı dönemde olması gerekir; 30 gün boyunca zam gelirse
 * ayın en ucuz gününü referans almak tasarrufu şişirirdi.
 */
const TASARRUF_PENCERE_GUN = 7

export interface IstasyonSapmasi {
  station: string
  /** Karşılaştırılabilir alım sayısı (aynı dönemde başka istasyon da varken yapılan) */
  count: number
  /** Piyasaya göre ortalama fark, ₺/L. Negatif = ucuz */
  ortSapma: number
  ortYuzdeSapma: number
}

export interface AylikFiyat {
  /** YYYY-MM */
  ay: string
  ortFiyat: number
  litre: number
}

export interface Tasarruf {
  /** Her alımda o dönemde gözlemlenen en ucuz istasyonu seçseydin fark, ₺ */
  toplam: number
  /** Bu hesaba giren alım sayısı — kaç alımda gerçekten daha ucuz bir alternatif vardı */
  karsilastirilanAlim: number
  /** Hesaba giren alımların toplam tutarı; oran verirken payda budur */
  karsilastirilanTutar: number
}

export interface FiyatAnalizi {
  istasyonlar: IstasyonSapmasi[]
  aylikFiyatlar: AylikFiyat[]
  tasarruf: Tasarruf | null
  /** Analiz yapılamadıysa sebebi — kullanıcıya boş kutu göstermemek için */
  yetersizVeri: string | null
}

interface Alim {
  zaman: number
  fiyat: number
  litre: number
  istasyon: string
  ay: string
}

const ortanca = (sayilar: number[]): number => {
  if (sayilar.length === 0) return 0
  const s = [...sayilar].sort((a, b) => a - b)
  const orta = Math.floor(s.length / 2)
  return s.length % 2 ? s[orta] : (s[orta - 1] + s[orta]) / 2
}

/**
 * Piyasa seviyesi için ORTALAMA değil ORTANCA kullanılıyor: tek bir hatalı
 * kayıt (yanlış girilen fiyat) ortalamayı kaydırır, ortancayı kaydırmaz.
 */
const normalize = (kayitlar: FuelRecord[]): Alim[] =>
  kayitlar
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
        istasyon: r.station?.trim() || 'Belirtilmemiş',
        ay: typeof r.date === 'string' ? r.date.slice(0, 7) : '',
      }
    })
    .filter(a => Number.isFinite(a.zaman) && a.fiyat > 0 && a.litre > 0 && a.ay.length === 7)
    .sort((a, b) => a.zaman - b.zaman)

const pencere = (alimlar: Alim[], merkez: Alim, gun: number): Alim[] => {
  const yaricap = gun * GUN_MS
  return alimlar.filter(a => Math.abs(a.zaman - merkez.zaman) <= yaricap)
}

export const analyzeFuelPrices = (kayitlar: FuelRecord[] = []): FiyatAnalizi => {
  const bos: FiyatAnalizi = { istasyonlar: [], aylikFiyatlar: [], tasarruf: null, yetersizVeri: null }

  const alimlar = normalize(kayitlar)
  if (alimlar.length < 2) {
    return { ...bos, yetersizVeri: 'Fiyat karşılaştırması için en az iki yakıt kaydı gerekiyor.' }
  }

  // ---- Aylık fiyat seyri (kendi verinden enflasyon eğrisi) ----
  const aylik = new Map<string, { tutar: number; litre: number }>()
  for (const a of alimlar) {
    const m = aylik.get(a.ay) ?? { tutar: 0, litre: 0 }
    m.tutar += a.fiyat * a.litre
    m.litre += a.litre
    aylik.set(a.ay, m)
  }
  const aylikFiyatlar: AylikFiyat[] = [...aylik.entries()]
    .map(([ay, m]) => ({ ay, ortFiyat: m.tutar / m.litre, litre: m.litre }))
    .sort((a, b) => a.ay.localeCompare(b.ay))

  const istasyonSayisi = new Set(alimlar.map(a => a.istasyon)).size
  if (istasyonSayisi < 2) {
    return {
      ...bos,
      aylikFiyatlar,
      yetersizVeri: 'İstasyon karşılaştırması için en az iki farklı istasyonda alım gerekiyor.',
    }
  }

  // ---- İstasyon sapması ----
  const sapmalar = new Map<string, { farklar: number[]; yuzdeler: number[] }>()

  for (const alim of alimlar) {
    const komsular = pencere(alimlar, alim, SAPMA_PENCERE_GUN)
    // Aynı dönemde başka istasyon yoksa karşılaştırma yapılamaz — bu alım atlanır.
    // Kendisiyle kıyaslanan bir alım "piyasa ortalamasında" görünürdü; bu bir bilgi değil.
    if (new Set(komsular.map(k => k.istasyon)).size < 2) continue

    const piyasa = ortanca(komsular.map(k => k.fiyat))
    if (piyasa <= 0) continue

    const fark = alim.fiyat - piyasa
    const kayit = sapmalar.get(alim.istasyon) ?? { farklar: [], yuzdeler: [] }
    kayit.farklar.push(fark)
    kayit.yuzdeler.push((fark / piyasa) * 100)
    sapmalar.set(alim.istasyon, kayit)
  }

  const ortalama = (d: number[]) => d.reduce((t, n) => t + n, 0) / d.length

  const istasyonlar: IstasyonSapmasi[] = [...sapmalar.entries()]
    .map(([station, { farklar, yuzdeler }]) => ({
      station,
      count: farklar.length,
      ortSapma: ortalama(farklar),
      ortYuzdeSapma: ortalama(yuzdeler),
    }))
    .sort((a, b) => a.ortSapma - b.ortSapma)

  // ---- Gerçekten gözlemlenebilir tasarruf ----
  // Kural: yalnızca AYNI DÖNEMDE BAŞKA BİR İSTASYONDA daha ucuz bir alım
  // yapılmışsa fark sayılır. Yani "o sırada gerçekten daha ucuzu vardı ve bunu
  // biliyordun" durumu. Varsayımsal fiyat üretmiyoruz.
  let toplamTasarruf = 0
  let karsilastirilanAlim = 0
  let karsilastirilanTutar = 0

  for (const alim of alimlar) {
    const alternatifler = pencere(alimlar, alim, TASARRUF_PENCERE_GUN)
      .filter(k => k.istasyon !== alim.istasyon)
    if (alternatifler.length === 0) continue

    const enUcuz = Math.min(...alternatifler.map(k => k.fiyat))
    karsilastirilanAlim += 1
    karsilastirilanTutar += alim.fiyat * alim.litre
    if (enUcuz < alim.fiyat) toplamTasarruf += (alim.fiyat - enUcuz) * alim.litre
  }

  if (istasyonlar.length === 0) {
    return {
      istasyonlar: [],
      aylikFiyatlar,
      tasarruf: null,
      yetersizVeri:
        'Alımlar zaman içinde birbirinden uzak; aynı dönemde karşılaştırılabilir başka istasyon yok.',
    }
  }

  return {
    istasyonlar,
    aylikFiyatlar,
    tasarruf: karsilastirilanAlim > 0
      ? {
          toplam: toplamTasarruf,
          karsilastirilanAlim,
          karsilastirilanTutar,
        }
      : null,
    yetersizVeri: null,
  }
}
