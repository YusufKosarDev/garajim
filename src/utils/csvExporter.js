import { formatDate } from './dateHelpers'

// CSV değeri escape (virgül, tırnak, satır sonu için)
const escapeCSV = (value) => {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Virgül, tırnak veya yeni satır içeriyorsa çift tırnak içine al
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Nesne dizisinden CSV üret
const arrayToCSV = (data, columns) => {
  if (!data || data.length === 0) return ''

  // Header
  const header = columns.map(c => escapeCSV(c.label)).join(',')

  // Satırlar
  const rows = data.map(row =>
    columns.map(c => {
      const value = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor]
      return escapeCSV(value)
    }).join(',')
  )

  // BOM ekle → Excel'de Türkçe karakterler doğru görünsün
  const BOM = '\uFEFF'
  return BOM + [header, ...rows].join('\n')
}

// CSV'yi dosya olarak indir
const downloadCSV = (csv, filename) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Araçları export et
export const exportVehiclesCSV = (vehicles) => {
  const columns = [
    { label: 'ID', accessor: 'id' },
    { label: 'Plaka', accessor: 'plate' },
    { label: 'Marka', accessor: 'brand' },
    { label: 'Model', accessor: 'model' },
    { label: 'Yıl', accessor: 'year' },
    { label: 'Yakıt Tipi', accessor: 'fuelType' },
    { label: 'Güncel KM', accessor: 'currentKm' },
    { label: 'Muayene Tarihi', accessor: (r) => formatDate(r.inspectionDate) },
    { label: 'MTV Tarihi', accessor: (r) => formatDate(r.mtvDate) },
    { label: 'Sigorta Tarihi', accessor: (r) => formatDate(r.insuranceDate) },
    { label: 'Kasko Tarihi', accessor: (r) => formatDate(r.kaskoDate) },
    { label: 'Notlar', accessor: 'notes' },
  ]

  const csv = arrayToCSV(vehicles, columns)
  const timestamp = new Date().toISOString().split('T')[0]
  downloadCSV(csv, `garajim-araclar-${timestamp}.csv`)

  return vehicles.length
}

// Bakım kayıtlarını export et
export const exportMaintenanceCSV = (maintenanceRecords, vehicles) => {
  const withVehicle = maintenanceRecords.map(r => {
    const v = vehicles.find(v => v.id === r.vehicleId)
    return {
      ...r,
      vehicleName: v ? `${v.brand} ${v.model}` : 'Bilinmeyen',
      vehiclePlate: v?.plate || '',
    }
  })

  const columns = [
    { label: 'Tarih', accessor: (r) => formatDate(r.date) },
    { label: 'Araç', accessor: 'vehicleName' },
    { label: 'Plaka', accessor: 'vehiclePlate' },
    { label: 'Bakım Türü', accessor: 'type' },
    { label: 'KM', accessor: 'km' },
    { label: 'Maliyet (₺)', accessor: 'cost' },
    { label: 'Notlar', accessor: 'notes' },
  ]

  const csv = arrayToCSV(withVehicle, columns)
  const timestamp = new Date().toISOString().split('T')[0]
  downloadCSV(csv, `garajim-bakimlar-${timestamp}.csv`)

  return maintenanceRecords.length
}

// Yakıt kayıtlarını export et
export const exportFuelCSV = (fuelRecords, vehicles) => {
  const withVehicle = fuelRecords.map(r => {
    const v = vehicles.find(v => v.id === r.vehicleId)
    return {
      ...r,
      vehicleName: v ? `${v.brand} ${v.model}` : 'Bilinmeyen',
      vehiclePlate: v?.plate || '',
    }
  })

  const columns = [
    { label: 'Tarih', accessor: (r) => formatDate(r.date) },
    { label: 'Araç', accessor: 'vehicleName' },
    { label: 'Plaka', accessor: 'vehiclePlate' },
    { label: 'KM', accessor: 'km' },
    { label: 'Litre', accessor: 'liters' },
    { label: '₺/Litre', accessor: 'pricePerLiter' },
    { label: 'Toplam (₺)', accessor: 'totalCost' },
    { label: 'İstasyon', accessor: 'station' },
    { label: 'Dolu Depo', accessor: (r) => r.fullTank ? 'Evet' : 'Hayır' },
    { label: 'Notlar', accessor: 'notes' },
  ]

  const csv = arrayToCSV(withVehicle, columns)
  const timestamp = new Date().toISOString().split('T')[0]
  downloadCSV(csv, `garajim-yakit-${timestamp}.csv`)

  return fuelRecords.length
}

// Tümünü export et (3 ayrı dosya)
export const exportAllCSV = (vehicles, maintenanceRecords, fuelRecords) => {
  const v = exportVehiclesCSV(vehicles)
  // Ayrı ayrı download başlasın diye küçük delay
  setTimeout(() => exportMaintenanceCSV(maintenanceRecords, vehicles), 300)
  setTimeout(() => exportFuelCSV(fuelRecords, vehicles), 600)
  return {
    vehicles: v,
    maintenance: maintenanceRecords.length,
    fuel: fuelRecords.length,
  }
}

// Tarih filtresi uygula
export const filterByDateRange = (records, range) => {
  if (range === 'all') return records

  const now = new Date()
  let cutoff

  switch (range) {
    case 'month':
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'quarter':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      break
    case 'year':
      cutoff = new Date(now.getFullYear(), 0, 1)
      break
    case 'last12':
      cutoff = new Date(now.getFullYear() - 1, now.getMonth(), 1)
      break
    default:
      return records
  }

  return records.filter(r => new Date(r.date) >= cutoff)
}