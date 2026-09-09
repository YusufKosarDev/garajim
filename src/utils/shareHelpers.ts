import LZString from 'lz-string'
import { z } from 'zod'
import type { Vehicle, MaintenanceRecord, FuelRecord } from '../types'

/**
 * Paylaşım yükünün şeması.
 *
 * NEDEN VAR: `/share/:encodedData` KİMLİK DOĞRULAMASI OLMAYAN tek rota ve
 * içeriği tamamen URL'den geliyor. Eskiden yalnızca `version` alanına bakılıp
 * gerisi olduğu gibi bileşene veriliyordu; yani uydurulmuş bir link, beklenen
 * alanların yerine herhangi bir şeyi (obje, dizi, null) koyabiliyordu.
 * XSS yok — React metni kaçırıyor — ama `fuel.map(...)` gibi çağrılar
 * beklenmedik tipte patlıyor ve kullanıcı bomboş bir hata ekranı görüyordu.
 * Zod projede zaten var; güven sınırında kullanılmaması tutarsızlıktı.
 *
 * TASARIM: alanlar TOLERANSLI (nullish serbest, bilinmeyen alanlar yok
 * sayılıyor) çünkü daha önce paylaşılmış linkler çalışmaya devam etmeli.
 * Zorlanan şey alanların TİPİ ve yükün genel ŞEKLİ.
 */
const sayiVeyaMetin = z.union([z.number(), z.string()]).nullish()

const paylasimSemasi = z.object({
  version: z.literal(1),
  sharedAt: z.string().nullish(),
  vehicle: z.object({
    plate: z.string().nullish(),
    brand: z.string().nullish(),
    model: z.string().nullish(),
    year: sayiVeyaMetin,
    fuelType: z.string().nullish(),
    currentKm: sayiVeyaMetin,
    inspectionDate: z.string().nullish(),
    mtvDate: z.string().nullish(),
    insuranceDate: z.string().nullish(),
    kaskoDate: z.string().nullish(),
    notes: z.string().nullish(),
  }),
  maintenance: z.array(z.object({
    id: z.string().nullish(),
    type: z.string().nullish(),
    date: z.string().nullish(),
    km: sayiVeyaMetin,
    cost: sayiVeyaMetin,
    notes: z.string().nullish(),
  })),
  fuel: z.array(z.object({
    id: z.string().nullish(),
    date: z.string().nullish(),
    km: sayiVeyaMetin,
    liters: sayiVeyaMetin,
    pricePerLiter: sayiVeyaMetin,
    totalCost: sayiVeyaMetin,
    fullTank: z.boolean().nullish(),
    station: z.string().nullish(),
  })),
})

export type PaylasimYuku = z.infer<typeof paylasimSemasi>

// Paylaşılabilir veri oluştur (compress edilmiş, URL-safe)
export const encodeShareData = (
  vehicle: Vehicle,
  maintenanceRecords: MaintenanceRecord[],
  fuelRecords: FuelRecord[]
): string => {
  // Sadece gerekli alanları al, fotoğrafları çıkar (URL'i şişirmesin)
  const sharedVehicle = {
    plate: vehicle.plate,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    fuelType: vehicle.fuelType,
    currentKm: vehicle.currentKm,
    inspectionDate: vehicle.inspectionDate,
    mtvDate: vehicle.mtvDate,
    insuranceDate: vehicle.insuranceDate,
    kaskoDate: vehicle.kaskoDate,
    notes: vehicle.notes,
  }

  const sharedMaintenance = maintenanceRecords.map(r => ({
    id: r.id,
    type: r.type,
    date: r.date,
    km: r.km,
    cost: r.cost,
    notes: r.notes,
    // photo dahil edilmiyor — URL şişer
  }))

  const sharedFuel = fuelRecords.map(r => ({
    id: r.id,
    date: r.date,
    km: r.km,
    liters: r.liters,
    pricePerLiter: r.pricePerLiter,
    totalCost: r.totalCost,
    fullTank: r.fullTank,
    station: r.station,
  }))

  const data = {
    vehicle: sharedVehicle,
    maintenance: sharedMaintenance,
    fuel: sharedFuel,
    sharedAt: new Date().toISOString(),
    version: 1,
  }

  // JSON → compress → URL-safe base64
  const json = JSON.stringify(data)
  return LZString.compressToEncodedURIComponent(json)
}

// Paylaşılan veriyi decode et
export const decodeShareData = (encoded: string): PaylasimYuku | null => {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null

    // Şema versiyonu da doğrulamanın parçası (version: z.literal(1)), o yüzden
    // ayrı bir kontrole gerek kalmadı. Başarısızlıkta null dönüyor —
    // SharedReport'un beklediği sözleşme değişmedi.
    const parsed = paylasimSemasi.safeParse(JSON.parse(json))
    if (!parsed.success) {
      console.error('Share data validation failed:', parsed.error.issues)
      return null
    }

    return parsed.data
  } catch (err) {
    console.error('Share data decode error:', err)
    return null
  }
}

// Paylaşım URL'i oluştur
export const createShareUrl = (
  vehicle: Vehicle,
  maintenanceRecords: MaintenanceRecord[],
  fuelRecords: FuelRecord[]
): string => {
  const encoded = encodeShareData(vehicle, maintenanceRecords, fuelRecords)
  const baseUrl = window.location.origin
  return `${baseUrl}/share/${encoded}`
}

// URL boyutunu hesapla (kullanıcıya bilgi için)
export const getShareUrlSize = (url: string) => {
  return {
    chars: url.length,
    kb: (url.length / 1024).toFixed(2),
  }
}

// Browser native share API destekli mi?
export const isNativeShareSupported = () => {
  return typeof navigator !== 'undefined' && 'share' in navigator
}

// Native share API ile paylaş
export const shareNatively = async ({ title, text, url }: { title: string; text: string; url: string }) => {
  if (!isNativeShareSupported()) {
    return { success: false, reason: 'unsupported' }
  }

  try {
    await navigator.share({ title, text, url })
    return { success: true }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      return { success: false, reason: 'cancelled' }
    }
    return { success: false, reason: 'error', error: err }
  }
}

// Clipboard'a kopyala
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback için eski yöntem
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return true
    } catch {
      return false
    }
  }
}