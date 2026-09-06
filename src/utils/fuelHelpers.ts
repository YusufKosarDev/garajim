import type { FuelRecord } from '../types'

// km, DB'de null olabiliyor (kayıt girilirken boş bırakılabilir).
// Önceden bu kontrol edilmiyordu; null - null = 0 olduğu için tesadüfen
// zarar vermiyordu ama sıralamada NaN karşılaştırmasına yol açıyordu.
const kmDegeri = (kayit: FuelRecord): number | null =>
  typeof kayit.km === 'number' && !Number.isNaN(kayit.km) ? kayit.km : null

// İki yakıt kaydı arasındaki tüketim: L/100km
export const calculateConsumption = (
  prevRecord?: FuelRecord | null,
  currentRecord?: FuelRecord | null
): number | null => {
  if (!prevRecord || !currentRecord) return null

  const onceki = kmDegeri(prevRecord)
  const simdiki = kmDegeri(currentRecord)
  if (onceki === null || simdiki === null) return null

  const kmDiff = simdiki - onceki
  if (kmDiff <= 0) return null
  return (currentRecord.liters / kmDiff) * 100
}

// Bir aracın tüm yakıt kayıtlarına göre ortalama tüketim
export const getAverageConsumption = (fuelRecords: FuelRecord[]): number | null => {
  // km'si olmayan kayıtlar mesafe hesabına giremez
  const kmliKayitlar = fuelRecords.filter(r => kmDegeri(r) !== null)
  if (kmliKayitlar.length < 2) return null

  const sorted = [...kmliKayitlar].sort((a, b) => (kmDegeri(a) ?? 0) - (kmDegeri(b) ?? 0))
  const ilk = kmDegeri(sorted[0]) ?? 0
  const son = kmDegeri(sorted[sorted.length - 1]) ?? 0
  const totalKm = son - ilk

  // İlk kayıt hariç toplam litre (ilk dolumda önceki aralık yok)
  const totalLiters = sorted.slice(1).reduce((sum, r) => sum + r.liters, 0)

  if (totalKm <= 0) return null
  return (totalLiters / totalKm) * 100
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