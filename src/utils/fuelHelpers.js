// İki yakıt kaydı arasındaki tüketim: L/100km
export const calculateConsumption = (prevRecord, currentRecord) => {
  if (!prevRecord || !currentRecord) return null
  const kmDiff = currentRecord.km - prevRecord.km
  if (kmDiff <= 0) return null
  return (currentRecord.liters / kmDiff) * 100
}

// Bir aracın tüm yakıt kayıtlarına göre ortalama tüketim
export const getAverageConsumption = (fuelRecords) => {
  if (fuelRecords.length < 2) return null

  const sorted = [...fuelRecords].sort((a, b) => a.km - b.km)
  const totalKm = sorted[sorted.length - 1].km - sorted[0].km
  // İlk kayıt hariç toplam litre (ilk dolumda önceki aralık yok)
  const totalLiters = sorted.slice(1).reduce((sum, r) => sum + r.liters, 0)

  if (totalKm <= 0) return null
  return (totalLiters / totalKm) * 100
}

// Toplam harcama
export const getTotalFuelCost = (fuelRecords) => {
  return fuelRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0)
}

// Litre başına ortalama fiyat
export const getAveragePrice = (fuelRecords) => {
  if (fuelRecords.length === 0) return null
  const totalCost = getTotalFuelCost(fuelRecords)
  const totalLiters = fuelRecords.reduce((sum, r) => sum + (r.liters || 0), 0)
  if (totalLiters === 0) return null
  return totalCost / totalLiters
}