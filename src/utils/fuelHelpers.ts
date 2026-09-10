import type { FuelRecord } from '../types'

// km, DB'de null olabiliyor (kayıt girilirken boş bırakılabilir).
// Önceden bu kontrol edilmiyordu; null - null = 0 olduğu için tesadüfen
// zarar vermiyordu ama sıralamada NaN karşılaştırmasına yol açıyordu.
const kmValue = (record: FuelRecord): number | null =>
  typeof record.km === 'number' && !Number.isNaN(record.km) ? record.km : null

// İki yakıt kaydı arasındaki tüketim: L/100km
export const calculateConsumption = (
  prevRecord?: FuelRecord | null,
  currentRecord?: FuelRecord | null
): number | null => {
  if (!prevRecord || !currentRecord) return null

  const previous = kmValue(prevRecord)
  const current = kmValue(currentRecord)
  if (previous === null || current === null) return null

  const kmDiff = current - previous
  if (kmDiff <= 0) return null
  return (currentRecord.liters / kmDiff) * 100
}

/**
 * Tek bir aracın kayıtlarından litre ve km toplamı.
 * İlk dolumun litresi sayılmaz: ondan önceki aralık bilinmiyor.
 */
const aracToplami = (records: FuelRecord[]): { litre: number; km: number } | null => {
  const kmliOlanlar = records.filter(r => kmValue(r) !== null)
  if (kmliOlanlar.length < 2) return null

  const sirali = [...kmliOlanlar].sort((a, b) => (kmValue(a) ?? 0) - (kmValue(b) ?? 0))
  const km = (kmValue(sirali[sirali.length - 1]) ?? 0) - (kmValue(sirali[0]) ?? 0)
  if (km <= 0) return null

  return { litre: sirali.slice(1).reduce((s, r) => s + r.liters, 0), km }
}

/**
 * Ortalama tüketim (L/100km).
 *
 * ARAÇ BAZINDA hesaplanıp toplanıyor. Önceden tüm kayıtlar tek bir küme gibi
 * ele alınıyordu: en düşük ve en yüksek km arasındaki fark "gidilen yol"
 * sayılıyordu. Tek araçta bu doğru, ama birden fazla araçta ARAÇLARIN
 * KİLOMETRE SAYAÇLARI BİRBİRİNDEN BAĞIMSIZ olduğu için tamamen anlamsız bir
 * sayı çıkıyordu — ör. 18.000-38.500 km arası bir Audi ile 45.000-72.500 km
 * arası bir BMW birlikte 54.500 km "yol" gibi sayılıp gerçek tüketimin çok
 * altında bir değer üretiyordu (6,0 yerine sırasıyla 5,4 ve 7,6).
 *
 * Artık her aracın kendi litre/km toplamı çıkarılıp filo geneli
 * toplamLitre / toplamKm olarak birleştiriliyor — fiziksel olarak doğru olan
 * budur ve tek araçta eski davranışla birebir aynı sonucu verir.
 */
export const getAverageConsumption = (fuelRecords: FuelRecord[]): number | null => {
  const araclaraGore = new Map<string, FuelRecord[]>()
  for (const record of fuelRecords) {
    // vehicleId yoksa hepsi tek küme sayılır (eski yedeklerde olabiliyor)
    const anahtar = record.vehicleId ?? '_'
    const liste = araclaraGore.get(anahtar)
    if (liste) liste.push(record)
    else araclaraGore.set(anahtar, [record])
  }

  let toplamLitre = 0
  let toplamKm = 0
  for (const records of araclaraGore.values()) {
    const toplam = aracToplami(records)
    if (!toplam) continue
    toplamLitre += toplam.litre
    toplamKm += toplam.km
  }

  if (toplamKm <= 0) return null
  return (toplamLitre / toplamKm) * 100
}

// Toplam harcama
export const getTotalFuelCost = (fuelRecords: FuelRecord[]): number => {
  return fuelRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0)
}

// Litre başına ortalama fiyat
export const getAveragePrice = (fuelRecords: FuelRecord[]): number | null => {
  if (fuelRecords.length === 0) return null
  const totalCost = getTotalFuelCost(fuelRecords)
  const totalLiters = fuelRecords.reduce((sum, r) => sum + (r.liters || 0), 0)
  if (totalLiters === 0) return null
  return totalCost / totalLiters
}