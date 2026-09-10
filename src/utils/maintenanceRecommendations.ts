import type { Vehicle, MaintenanceRecord, CustomIntervals, RecommendationStatus } from '../types'

// Türkiye araç standartlarına göre önerilen bakım periyotları (km)
export const DEFAULT_INTERVALS: Record<string, number> = {
  'Yağ Değişimi': 10000,
  'Yağ Filtresi': 10000,
  'Hava Filtresi': 20000,
  'Yakıt Filtresi': 30000,
  'Polen Filtresi': 15000,
  'Balata Değişimi': 40000,
  'Disk Değişimi': 80000,
  'Lastik Değişimi': 60000,
  'Triger Seti': 80000,
  'Akü': 60000,
  'Buji': 30000,
  'Antifriz': 60000,
  'Fren Hidroliği': 40000,
}

// Öneri durumu
export const getRecommendationStatus = (kmRemaining: number, interval: number): RecommendationStatus => {
  if (kmRemaining < 0) return 'overdue'          // Gecikti
  if (kmRemaining <= interval * 0.1) return 'urgent'   // %10 kaldı → acil (sarı-kırmızı)
  if (kmRemaining <= interval * 0.2) return 'soon'     // %20 kaldı → yaklaşıyor (sarı)
  return 'ok'                                     // Sorun yok
}

// ============ customIntervals ANAHTAR SÖZLEŞMESİ ============
// Şekil: { 'vehicleId-Bakım Türü': { kilometers, months } }
// vehicleId bir UUID olduğu ve kendisi de tire içerdiği için anahtar
// split('-') ile ayrıştırılamaz — parse için daima parseIntervalKey kullan.

export const buildIntervalKey = (vehicleId: string, maintenanceType: string): string =>
  `${vehicleId}-${maintenanceType}`

const UUID_PREFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i

export interface ParsedIntervalKey { vehicleId: string; maintenanceType: string }

export const parseIntervalKey = (key?: string | null): ParsedIntervalKey | null => {
  if (typeof key !== 'string' || !key) return null

  // 1) Bilinen bakım türlerinden biriyle bitiyor mu? (en güvenilir yol —
  //    hem UUID hem eski sayısal id'lerde, tür içinde tire olsa bile çalışır)
  const known = Object.keys(DEFAULT_INTERVALS).find(t => key.endsWith(`-${t}`))
  if (known) {
    return { vehicleId: key.slice(0, key.length - known.length - 1), maintenanceType: known }
  }

  // 2) UUID ön eki (DEFAULT_INTERVALS dışı bir tür ise)
  if (UUID_PREFIX.test(key)) {
    return { vehicleId: key.slice(0, 36), maintenanceType: key.slice(37) }
  }

  // 3) Eski format: sayısal id + tek tire
  const dash = key.indexOf('-')
  if (dash <= 0) return null
  return { vehicleId: key.slice(0, dash), maintenanceType: key.slice(dash + 1) }
}

/**
 * Formdaki tür adı ile periyot tablosundaki ad AYNI DEĞİL.
 *
 * `MaintenanceForm.jsx`'in açılır listesi kullanıcıya 'Balata', 'Disk',
 * 'Lastik' sunuyor ve bu değerler `maintenance_records.type` sütununa aynen
 * yazılıyor. DEFAULT_INTERVALS ise 'Balata Değişimi', 'Disk Değişimi',
 * 'Lastik Değişimi' anahtarlarını tutuyor. `resolveInterval` düz anahtar
 * araması yaptığı için BU ÜÇ TÜR İÇİN ÖNERİ MOTORU HİÇ EŞLEŞMİYORDU:
 * kullanıcı balata değiştirip kaydediyor, uygulama bir daha asla "balata
 * zamanı geldi" demiyordu. Demo hesabındaki 'Balata' kaydı da sessizce
 * yok sayılıyordu.
 *
 * Çözüm neden burada: açılır listeyi 'Balata Değişimi'ne çevirmek daha temiz
 * görünürdü ama DB'ye yazılmış mevcut 'Balata' kayıtlarını öksüz bırakırdı.
 * DEFAULT_INTERVALS anahtarlarını kısaltmak da olmaz — `i18n.test.ts` onları
 * sözleşme olarak koruyor ve `parseIntervalKey` onlara göre ayrıştırıyor.
 * O yüzden ne veri ne tablo değişiyor; yalnızca ÇÖZÜMLEME adımı iki yazımı
 * da tanıyor.
 */
const TYPE_ALIASES: Record<string, string> = {
  'Balata': 'Balata Değişimi',
  'Disk': 'Disk Değişimi',
  'Lastik': 'Lastik Değişimi',
}

/** Bir bakım türünün DEFAULT_INTERVALS'taki karşılığını verir. */
export const canonicalMaintenanceType = (maintenanceType: string): string =>
  maintenanceType in DEFAULT_INTERVALS
    ? maintenanceType
    : (TYPE_ALIASES[maintenanceType] ?? maintenanceType)

// Eski yedeklerde değer düz sayı olarak durabildiği için ikisini de kabul ediyoruz.
export const resolveInterval = (
  customIntervals: CustomIntervals | undefined,
  vehicleId: string,
  maintenanceType: string
): number => {
  // Özel periyot KULLANICININ YAZDIĞI adla saklanıyor (anahtar formdaki türden
  // üretiliyor), o yüzden önce onunla aranıyor; takma ad yalnızca varsayılan
  // tabloya düşerken devreye giriyor.
  const custom = customIntervals?.[buildIntervalKey(vehicleId, maintenanceType)]
  const km = typeof custom === 'number' ? custom : custom?.kilometers
  return km || DEFAULT_INTERVALS[canonicalMaintenanceType(maintenanceType)]
}

// Bir araç için, bir bakım türünün durumunu hesapla
export interface Recommendation {
  vehicleId: string
  vehicle: Vehicle
  type: string
  interval: number
  lastKm: number | null
  currentKm: number
  nextDueKm: number
  kmRemaining: number
  status: RecommendationStatus
  hasHistory: boolean
}

export const getMaintenanceRecommendation = (
  vehicle: Vehicle,
  maintenanceType: string,
  maintenanceRecords: MaintenanceRecord[],
  customIntervals: CustomIntervals = {}
): Recommendation | null => {
  const interval = resolveInterval(customIntervals, vehicle.id, maintenanceType)
  if (!interval) return null  // Periyodu olmayan bakım türleri (Genel Bakım, Diğer)

  const currentKm = Number(vehicle.currentKm) || 0
  if (currentKm === 0) return null  // KM bilgisi yoksa öneri veremeyiz

  // Bu aracın bu türdeki son bakımı.
  //
  // Karşılaştırma KANONİK ad üzerinden: `getAllRecommendations` DEFAULT_INTERVALS
  // anahtarlarını geziyor ('Balata Değişimi'), oysa form 'Balata' yazıyor. Düz
  // eşitlik kullanıldığı sürece bu iki taraf hiç buluşmuyordu — periyot bulunsa
  // bile kayıt bulunamadığı için `hasHistory: false` çıkıyor ve öneri
  // `getAllRecommendations`'ta eleniyordu.
  const aranan = canonicalMaintenanceType(maintenanceType)
  const typeRecords = maintenanceRecords
    .filter(r => r.vehicleId === vehicle.id && canonicalMaintenanceType(r.type) === aranan)
    .sort((a, b) => Number(b.km) - Number(a.km))

  const lastRecord = typeRecords[0]
  const lastKm = lastRecord ? Number(lastRecord.km) : null

  // Hiç yapılmamışsa: mevcut km'yi "0'dan başla" say
  // (Ama yine de önerebilmek için)
  const referenceKm = lastKm !== null ? lastKm : 0
  const nextDueKm = referenceKm + interval
  const kmRemaining = nextDueKm - currentKm
  const status = getRecommendationStatus(kmRemaining, interval)

  return {
    vehicleId: vehicle.id,
    vehicle,
    type: maintenanceType,
    interval,
    lastKm,
    currentKm,
    nextDueKm,
    kmRemaining,
    status,
    hasHistory: lastKm !== null,
  }
}

// Tüm araçlar için tüm bakım türlerinin önerilerini hesapla
export const getAllRecommendations = (
  vehicles: Vehicle[],
  maintenanceRecords: MaintenanceRecord[],
  customIntervals: CustomIntervals = {}
): Recommendation[] => {
  const recommendations: Recommendation[] = []

  vehicles.forEach(vehicle => {
    Object.keys(DEFAULT_INTERVALS).forEach(type => {
      const rec = getMaintenanceRecommendation(vehicle, type, maintenanceRecords, customIntervals)
      if (rec && rec.hasHistory) {
        // Sadece geçmişte en az bir kez yapılan bakımlar için öneri ver
        recommendations.push(rec)
      }
    })
  })

  return recommendations
}

// Sadece dikkat gerektirenler (overdue, urgent, soon)
export const getCriticalRecommendations = (
  vehicles: Vehicle[],
  maintenanceRecords: MaintenanceRecord[],
  customIntervals: CustomIntervals = {}
): Recommendation[] => {
  return getAllRecommendations(vehicles, maintenanceRecords, customIntervals)
    .filter(r => r.status !== 'ok')
    .sort((a, b) => {
      // Önce en acil olanlar (overdue > urgent > soon).
      // 'ok' yukarıda filtrelendiği için pratikte gelmiyor, yine de haritada
      // yer alsın — aksi halde tanımsız indeks NaN karşılaştırması üretir.
      const priority: Record<RecommendationStatus, number> = {
        overdue: 0, urgent: 1, soon: 2, ok: 3,
      }
      if (priority[a.status] !== priority[b.status]) {
        return priority[a.status] - priority[b.status]
      }
      // Aynı statüdeyse en az km kalan önce
      return a.kmRemaining - b.kmRemaining
    })
}

// Tek bir araç için kritik öneriler
export const getVehicleRecommendations = (
  vehicle: Vehicle,
  maintenanceRecords: MaintenanceRecord[],
  customIntervals: CustomIntervals = {}
): Recommendation[] => {
  return Object.keys(DEFAULT_INTERVALS)
    .map(type => getMaintenanceRecommendation(vehicle, type, maintenanceRecords, customIntervals))
    .filter((r): r is Recommendation => r !== null && r.hasHistory)
    .sort((a, b) => a.kmRemaining - b.kmRemaining)
}