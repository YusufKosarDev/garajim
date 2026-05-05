// Türkiye araç standartlarına göre önerilen bakım periyotları (km)
export const DEFAULT_INTERVALS = {
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
export const getRecommendationStatus = (kmRemaining, interval) => {
  if (kmRemaining < 0) return 'overdue'          // Gecikti
  if (kmRemaining <= interval * 0.1) return 'urgent'   // %10 kaldı → acil (sarı-kırmızı)
  if (kmRemaining <= interval * 0.2) return 'soon'     // %20 kaldı → yaklaşıyor (sarı)
  return 'ok'                                     // Sorun yok
}

// Bir araç için, bir bakım türünün durumunu hesapla
export const getMaintenanceRecommendation = (vehicle, maintenanceType, maintenanceRecords, customIntervals = {}) => {
  const interval = customIntervals[maintenanceType] || DEFAULT_INTERVALS[maintenanceType]
  if (!interval) return null  // Periyodu olmayan bakım türleri (Genel Bakım, Diğer)

  const currentKm = Number(vehicle.currentKm) || 0
  if (currentKm === 0) return null  // KM bilgisi yoksa öneri veremeyiz

  // Bu aracın bu türdeki son bakımı
  const typeRecords = maintenanceRecords
    .filter(r => r.vehicleId === vehicle.id && r.type === maintenanceType)
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
export const getAllRecommendations = (vehicles, maintenanceRecords, customIntervals = {}) => {
  const recommendations = []

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
export const getCriticalRecommendations = (vehicles, maintenanceRecords, customIntervals = {}) => {
  return getAllRecommendations(vehicles, maintenanceRecords, customIntervals)
    .filter(r => r.status !== 'ok')
    .sort((a, b) => {
      // Önce en acil olanlar (overdue > urgent > soon)
      const priority = { overdue: 0, urgent: 1, soon: 2 }
      if (priority[a.status] !== priority[b.status]) {
        return priority[a.status] - priority[b.status]
      }
      // Aynı statüdeyse en az km kalan önce
      return a.kmRemaining - b.kmRemaining
    })
}

// Tek bir araç için kritik öneriler
export const getVehicleRecommendations = (vehicle, maintenanceRecords, customIntervals = {}) => {
  return Object.keys(DEFAULT_INTERVALS)
    .map(type => getMaintenanceRecommendation(vehicle, type, maintenanceRecords, customIntervals))
    .filter(r => r && r.hasHistory)
    .sort((a, b) => a.kmRemaining - b.kmRemaining)
}