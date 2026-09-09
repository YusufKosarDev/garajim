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

import i18n from '../i18n'
import type { Vehicle, MaintenanceRecord } from '../types'

/** Türkiye'de yıllık ortalama kullanım varsayımı */
export const AVERAGE_KM_PER_YEAR = 15_000

/**
 * Yaşa göre değer koruma. İlk yıl en sert, sonra yumuşuyor — yeni araç
 * "sıfır" olma primini bir defada kaybeder, eski araç ise zaten dibe yakındır.
 */
const ageImpact = (age: number): number => {
  if (age <= 0) return 1
  let oran = 0.82 // ilk yıl
  for (let y = 2; y <= age; y++) {
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
const kmImpact = (actualKm: number, expectedKm: number): number => {
  const fark = actualKm - expectedKm
  const tenThousands = fark / 10_000
  if (fark > 0) return Math.max(-0.20, -0.02 * tenThousands)
  return Math.min(0.10, -0.015 * tenThousands)
}

const GUN_MS = 86_400_000

/** Kayıtlı geçmişi olan araç daha kolay satılır — ama etkisi mütevazı tutuldu */
const maintenanceImpact = (records: MaintenanceRecord[], today: Date): number => {
  if (records.length === 0) return -0.03 // belgesiz geçmiş

  const oneYearAgo = today.getTime() - 365 * GUN_MS
  const guncelVar = records.some(r => {
    const t = new Date(r.date).getTime()
    return Number.isFinite(t) && t >= oneYearAgo && t <= today.getTime()
  })

  let etki = 0
  if (records.length >= 3) etki += 0.02 // düzenli tutulmuş geçmiş
  if (guncelVar) etki += 0.03            // son bir yılda bakım görmüş

  return Math.min(0.05, etki)
}

export type Confidence = 'low' | 'medium' | 'high'

export interface ValuationResult {
  /** Araç yaşı (yıl) */
  age: number
  /** Yaşına göre beklenen toplam km */
  expectedKm: number
  /** Gerçek km - beklenen km. Pozitif = çok kullanılmış */
  kmFarki: number
  /** İlk değerin ne kadarı kaldı, 0-1 arası */
  remainingRatio: number
  /** Her etkinin ayrı payı — arayüzde gösteriliyor ki tahmin denetlenebilsin */
  components: { age: number; km: number; maintenance: number }
  confidence: Confidence
  /** Tahmini kısıtlayan bilinen eksikler */
  warnings: string[]
  /** Alış fiyatı verildiyse ₺ karşılığı, yoksa null */
  estimatedValue: number | null
}

export interface ValuationOptions {
  /** Kullanıcının girdiği alış fiyatı (₺). Yoksa yalnızca oran döner. */
  purchasePrice?: number | null
  /** Test edilebilirlik için; yoksa gerçek tarih */
  today?: Date
}

export const estimateVehicleValue = (
  vehicle: Vehicle | null | undefined,
  maintenanceRecords: MaintenanceRecord[] = [],
  { purchasePrice = null, today = new Date() }: ValuationOptions = {},
): ValuationResult | null => {
  // Model yılı olmadan yaş bilinmez, yaş olmadan bu hesabın hiçbir dayanağı kalmaz
  if (!vehicle || !vehicle.year) return null

  const year = Number(vehicle.year)
  if (!Number.isFinite(year) || year < 1900 || year > today.getFullYear() + 1) return null

  const warnings: string[] = []
  const age = Math.max(0, today.getFullYear() - year)
  const expectedKm = Math.round(age * AVERAGE_KM_PER_YEAR)

  const actualKm = Number(vehicle.currentKm) || 0
  const kmUnknown = actualKm <= 0
  if (kmUnknown) warnings.push(i18n.t('vehicleValuation.warning.km_girilmemis'))

  const ownRecords = maintenanceRecords.filter(r => r.vehicleId === vehicle.id)
  if (ownRecords.length === 0) {
    warnings.push(i18n.t('vehicleValuation.warning.bakim_kaydi_yok'))
  }

  const bYas = ageImpact(age)
  const bKm = kmUnknown ? 0 : kmImpact(actualKm, expectedKm)
  const bMaintenance = maintenanceImpact(ownRecords, today)

  // km ve bakım, yaş oranı ÜZERİNDEN çarpan olarak uygulanıyor: 20 yaşındaki bir
  // araçta "+%5 bakım" mutlak değil oransal bir etkidir.
  const remainingRatio = Math.min(1, Math.max(0.05, bYas * (1 + bKm + bMaintenance)))

  let confidence: Confidence = 'high'
  if (kmUnknown || ownRecords.length === 0) confidence = 'medium'
  if (kmUnknown && ownRecords.length === 0) confidence = 'low'
  if (age > 20) {
    confidence = 'low'
    warnings.push(i18n.t('vehicleValuation.warning.yirmi_yas_ustu'))
  }

  const fiyat = Number(purchasePrice)
  const estimatedValue = Number.isFinite(fiyat) && fiyat > 0 ? Math.round(fiyat * remainingRatio) : null

  return {
    age,
    expectedKm,
    kmFarki: kmUnknown ? 0 : actualKm - expectedKm,
    remainingRatio,
    components: { age: bYas, km: bKm, maintenance: bMaintenance },
    confidence,
    warnings,
    estimatedValue,
  }
}
