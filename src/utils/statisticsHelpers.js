// Bir tarihin ay-yıl anahtarı döndürür: "2026-04" gibi
const getMonthKey = (dateString) => {
  const d = new Date(dateString)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Son N ayın ortalaması — tahmin için
export const getAverageMonthlySpending = (records, fuelRecords, monthsBack = 3) => {
  const now = new Date()
  const cutoff = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)

  const recent = [
    ...records.filter(r => new Date(r.date) >= cutoff).map(r => ({ date: r.date, cost: r.cost || 0 })),
    ...fuelRecords.filter(r => new Date(r.date) >= cutoff).map(r => ({ date: r.date, cost: r.totalCost || 0 })),
  ]

  if (recent.length === 0) return { average: 0, count: 0 }

  const total = recent.reduce((sum, r) => sum + r.cost, 0)
  return {
    average: Math.round(total / monthsBack),
    count: recent.length,
    total,
  }
}

// Bu ayki harcama
export const getCurrentMonthSpending = (records, fuelRecords) => {
  const now = new Date()
  const thisMonth = getMonthKey(now.toISOString())

  const maintenanceCost = records
    .filter(r => getMonthKey(r.date) === thisMonth)
    .reduce((sum, r) => sum + (r.cost || 0), 0)

  const fuelCost = fuelRecords
    .filter(r => getMonthKey(r.date) === thisMonth)
    .reduce((sum, r) => sum + (r.totalCost || 0), 0)

  return {
    maintenance: maintenanceCost,
    fuel: fuelCost,
    total: maintenanceCost + fuelCost,
  }
}

// Bu yıl vs geçen yıl
export const getYearComparison = (records, fuelRecords) => {
  const currentYear = new Date().getFullYear()
  const previousYear = currentYear - 1

  const sumForYear = (year) => {
    const maintenance = records
      .filter(r => new Date(r.date).getFullYear() === year)
      .reduce((sum, r) => sum + (r.cost || 0), 0)
    const fuel = fuelRecords
      .filter(r => new Date(r.date).getFullYear() === year)
      .reduce((sum, r) => sum + (r.totalCost || 0), 0)
    return { maintenance, fuel, total: maintenance + fuel }
  }

  const current = sumForYear(currentYear)
  const previous = sumForYear(previousYear)

  const difference = current.total - previous.total
  const percentChange = previous.total > 0
    ? Math.round((difference / previous.total) * 100)
    : null

  return { current, previous, difference, percentChange, currentYear, previousYear }
}

// Ay bazında aylık harcama (heatmap için)
export const getMonthlyBreakdown = (records, fuelRecords, yearsBack = 2) => {
  const now = new Date()
  const cutoff = new Date(now.getFullYear() - yearsBack, 0, 1)

  const byMonth = {}

  records.filter(r => new Date(r.date) >= cutoff).forEach(r => {
    const key = getMonthKey(r.date)
    if (!byMonth[key]) byMonth[key] = { maintenance: 0, fuel: 0, total: 0 }
    byMonth[key].maintenance += r.cost || 0
    byMonth[key].total += r.cost || 0
  })

  fuelRecords.filter(r => new Date(r.date) >= cutoff).forEach(r => {
    const key = getMonthKey(r.date)
    if (!byMonth[key]) byMonth[key] = { maintenance: 0, fuel: 0, total: 0 }
    byMonth[key].fuel += r.totalCost || 0
    byMonth[key].total += r.totalCost || 0
  })

  return byMonth
}

// Araç başına maliyet analizi
export const getVehicleCostAnalysis = (vehicles, maintenanceRecords, fuelRecords) => {
  return vehicles.map(v => {
    const vMaintenance = maintenanceRecords.filter(r => r.vehicleId === v.id)
    const vFuel = fuelRecords.filter(r => r.vehicleId === v.id)

    const maintenanceCost = vMaintenance.reduce((sum, r) => sum + (r.cost || 0), 0)
    const fuelCost = vFuel.reduce((sum, r) => sum + (r.totalCost || 0), 0)
    const totalCost = maintenanceCost + fuelCost

    // KM bazında analiz — en eski ve en yeni kayıtlardan km aralığı
    const allKms = [
      ...vMaintenance.map(r => Number(r.km) || 0),
      ...vFuel.map(r => Number(r.km) || 0),
    ].filter(km => km > 0)

    const minKm = allKms.length > 0 ? Math.min(...allKms) : 0
    const maxKm = allKms.length > 0 ? Math.max(...allKms) : Number(v.currentKm) || 0
    const kmRange = maxKm - minKm

    const costPerKm = kmRange > 0 ? totalCost / kmRange : null
    const fuelLiters = vFuel.reduce((sum, r) => sum + (Number(r.liters) || 0), 0)
    const avgFuelPrice = fuelLiters > 0 ? fuelCost / fuelLiters : null

    return {
      vehicle: v,
      maintenanceCost,
      fuelCost,
      totalCost,
      recordCount: vMaintenance.length + vFuel.length,
      kmRange,
      costPerKm,
      fuelLiters,
      avgFuelPrice,
    }
  }).sort((a, b) => b.totalCost - a.totalCost)
}

// Bakım türü bazında breakdown (pie chart için)
export const getMaintenanceTypeBreakdown = (records) => {
  const byType = {}
  records.forEach(r => {
    const type = r.type || 'Diğer'
    if (!byType[type]) byType[type] = { count: 0, total: 0 }
    byType[type].count += 1
    byType[type].total += r.cost || 0
  })

  return Object.entries(byType)
    .map(([type, data]) => ({ type, ...data }))
    .sort((a, b) => b.total - a.total)
}

// İstasyon analizi
export const getStationAnalysis = (fuelRecords) => {
  const byStation = {}
  fuelRecords.forEach(r => {
    const station = r.station?.trim() || 'Belirtilmemiş'
    if (!byStation[station]) {
      byStation[station] = { count: 0, total: 0, liters: 0 }
    }
    byStation[station].count += 1
    byStation[station].total += r.totalCost || 0
    byStation[station].liters += Number(r.liters) || 0
  })

  return Object.entries(byStation)
    .map(([station, data]) => ({
      station,
      ...data,
      avgPrice: data.liters > 0 ? data.total / data.liters : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

// Harcama trendi (artıyor mu / azalıyor mu?)
export const getSpendingTrend = (records, fuelRecords) => {
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthBefore = new Date(now.getFullYear(), now.getMonth() - 2, 1)

  const sumForPeriod = (start, end) => {
    const m = records
      .filter(r => {
        const d = new Date(r.date)
        return d >= start && d < end
      })
      .reduce((sum, r) => sum + (r.cost || 0), 0)
    const f = fuelRecords
      .filter(r => {
        const d = new Date(r.date)
        return d >= start && d < end
      })
      .reduce((sum, r) => sum + (r.totalCost || 0), 0)
    return m + f
  }

  const current = sumForPeriod(thisMonth, new Date(now.getFullYear(), now.getMonth() + 1, 1))
  const previous = sumForPeriod(lastMonth, thisMonth)
  const before = sumForPeriod(monthBefore, lastMonth)

  // Trend: son 3 ayın ortalama değişimi
  const avgChange = previous > 0 ? ((current - previous) / previous) * 100 : 0
  const prevChange = before > 0 ? ((previous - before) / before) * 100 : 0

  return {
    current,
    previous,
    before,
    change: avgChange,
    trend: avgChange > 10 ? 'up' : avgChange < -10 ? 'down' : 'stable',
  }
}