/**
 * Araç değer tahmini.
 *
 * KAPSAM SINIRI, ÖNCE BU: burada piyasa verisi yok. Gerçek bir ekspertiz
 * ilanlara, hasar kaydına, donanım paketine ve bölgeye bakar; bunların hiçbiri
 * uygulamada durmuyor. Bu yüzden çıktı bir FİYAT DEĞİL, bir DEĞER KORUMA ORANI:
 * "aracın ilk değerinin yaklaşık %X'i". Kullanıcı alış fiyatını girerse oran
 * ₺'ye çevriliyor, girmezse hesap yine anlamlı kalıyor.
 *
 * Böyle kurulmasının sebebi, `purchasePrice` alanının veritabanında hiç
 * bulunmaması. Uydurma bir fiyat üretip ona güven vermektense, fiyattan
 * bağımsız ve denetlenebilir bir oran vermek daha dürüst.
 *
 * Katsayılar Türkiye ikinci el piyasası için kaba kabullerdir; tam da bu yüzden
 * `bilesenler` alanında her etkinin payı ayrı ayrı dönüyor ve arayüzde
 * gösteriliyor — kullanıcı sayıyı yutmak yerine yargılayabilsin.
 */

import type { Vehicle, MaintenanceRecord } from '../types'

/** Türkiye'de yıllık ortalama kullanım varsayımı */
export const YILLIK_ORTALAMA_KM = 15_000

/**
 * Yaşa göre değer koruma. İlk yıl en sert, sonra yumuşuyor — yeni araç
 * "sıfır" olma primini bir defada kaybeder, eski araç ise zaten dibe yakındır.
 */
const yasEtkisi = (yas: number): number => {
  if (yas <= 0) return 1
  let oran = 0.82 // ilk yıl
  for (let y = 2; y <= yas; y++) {
    if (y <= 5) oran *= 0.88
    else if (y <= 10) oran *= 0.93
    else oran *= 0.96
  }
  // Çok eski araçlar sıfıra gitmez; hurda/klasik tabanı var
  return Math.max(oran, 0.1)
}

/**
 * Kilometre etkisi: yaşına göre BEKLENENDEN fazla mı az mı?
 * Mutlak km değil sapma kullanılıyor — 10 yaşında 150.000 km normaldir,
 * 2 yaşında aynı km değildir.
 *
 * Asimetrik: fazla km cezası, az km primi. Çünkü çok düşük km her zaman artı
 * değil — uzun süre kullanılmamış araçta lastik, conta ve akü sorunu beklenir.
 */
const kmEtkisi = (gercekKm: number, beklenenKm: number): number => {
  const fark = gercekKm - beklenenKm
  const onBinlik = fark / 10_000
  if (fark > 0) return Math.max(-0.20, -0.02 * onBinlik)
  return Math.min(0.10, -0.015 * onBinlik)
}

const GUN_MS = 86_400_000

/** Kayıtlı geçmişi olan araç daha kolay satılır — ama etkisi mütevazı tutuldu */
const bakimEtkisi = (kayitlar: MaintenanceRecord[], bugun: Date): number => {
  if (kayitlar.length === 0) return -0.03 // belgesiz geçmiş

  const birYilOnce = bugun.getTime() - 365 * GUN_MS
  const guncelVar = kayitlar.some(r => {
    const t = new Date(r.date).getTime()
    return Number.isFinite(t) && t >= birYilOnce && t <= bugun.getTime()
  })

  let etki = 0
  if (kayitlar.length >= 3) etki += 0.02 // düzenli tutulmuş geçmiş
  if (guncelVar) etki += 0.03            // son bir yılda bakım görmüş

  return Math.min(0.05, etki)
}

export type Guven = 'dusuk' | 'orta' | 'yuksek'

export interface DegerTahmini {
  /** Araç yaşı (yıl) */
  yas: number
  /** Yaşına göre beklenen toplam km */
  beklenenKm: number
  /** Gerçek km - beklenen km. Pozitif = çok kullanılmış */
  kmFarki: number
  /** İlk değerin ne kadarı kaldı, 0-1 arası */
  kalanOran: number
  /** Her etkinin ayrı payı — arayüzde gösteriliyor ki tahmin denetlenebilsin */
  bilesenler: { yas: number; km: number; bakim: number }
  guven: Guven
  /** Tahmini kısıtlayan bilinen eksikler */
  uyarilar: string[]
  /** Alış fiyatı verildiyse ₺ karşılığı, yoksa null */
  tahminiDeger: number | null
}

export interface DegerSecenekleri {
  /** Kullanıcının girdiği alış fiyatı (₺). Yoksa yalnızca oran döner. */
  alisFiyati?: number | null
  /** Test edilebilirlik için; yoksa gerçek tarih */
  bugun?: Date
}

export const estimateVehicleValue = (
  vehicle: Vehicle | null | undefined,
  maintenanceRecords: MaintenanceRecord[] = [],
  { alisFiyati = null, bugun = new Date() }: DegerSecenekleri = {},
): DegerTahmini | null => {
  // Model yılı olmadan yaş bilinmez, yaş olmadan bu hesabın hiçbir dayanağı kalmaz
  if (!vehicle || !vehicle.year) return null

  const yil = Number(vehicle.year)
  if (!Number.isFinite(yil) || yil < 1900 || yil > bugun.getFullYear() + 1) return null

  const uyarilar: string[] = []
  const yas = Math.max(0, bugun.getFullYear() - yil)
  const beklenenKm = Math.round(yas * YILLIK_ORTALAMA_KM)

  const gercekKm = Number(vehicle.currentKm) || 0
  const kmBilinmiyor = gercekKm <= 0
  if (kmBilinmiyor) uyarilar.push('Aracın güncel kilometresi girilmemiş; km etkisi hesaba katılmadı.')

  const kendiKayitlari = maintenanceRecords.filter(r => r.vehicleId === vehicle.id)
  if (kendiKayitlari.length === 0) {
    uyarilar.push('Bu araç için bakım kaydı yok; belgesiz geçmiş değeri düşürür.')
  }

  const bYas = yasEtkisi(yas)
  const bKm = kmBilinmiyor ? 0 : kmEtkisi(gercekKm, beklenenKm)
  const bBakim = bakimEtkisi(kendiKayitlari, bugun)

  // km ve bakım, yaş oranı ÜZERİNDEN çarpan olarak uygulanıyor: 20 yaşındaki bir
  // araçta "+%5 bakım" mutlak değil oransal bir etkidir.
  const kalanOran = Math.min(1, Math.max(0.05, bYas * (1 + bKm + bBakim)))

  let guven: Guven = 'yuksek'
  if (kmBilinmiyor || kendiKayitlari.length === 0) guven = 'orta'
  if (kmBilinmiyor && kendiKayitlari.length === 0) guven = 'dusuk'
  if (yas > 20) {
    guven = 'dusuk'
    uyarilar.push('20 yaş üstü araçlarda fiyatı model ve durum belirler; yaşa dayalı tahmin zayıftır.')
  }

  const fiyat = Number(alisFiyati)
  const tahminiDeger = Number.isFinite(fiyat) && fiyat > 0 ? Math.round(fiyat * kalanOran) : null

  return {
    yas,
    beklenenKm,
    kmFarki: kmBilinmiyor ? 0 : gercekKm - beklenenKm,
    kalanOran,
    bilesenler: { yas: bYas, km: bKm, bakim: bBakim },
    guven,
    uyarilar,
    tahminiDeger,
  }
}
