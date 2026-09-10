import i18n from '../i18n'
import { formatDate, toDateKey } from './dateHelpers'
import { downloadFile } from './downloadFile'
import type { Vehicle, MaintenanceRecord, FuelRecord } from '../types'

// CSV değeri escape (virgül, tırnak, satır sonu için)
const escapeCSV = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Virgül, tırnak veya yeni satır içeriyorsa çift tırnak içine al
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Nesne dizisinden CSV üret
/** Kolon tanımı: sabit alan adı ya da satırdan değer üreten fonksiyon */
export interface CsvKolonu<T> {
  label: string
  accessor: keyof T | ((row: T) => unknown)
}

const arrayToCSV = <T extends object>(data: T[], columns: CsvKolonu<T>[]): string => {
  if (!data || data.length === 0) return ''

  // Header
  const header = columns.map(c => escapeCSV(c.label)).join(',')

  // Satırlar
  const rows = data.map(row =>
    columns.map(c => {
      const value = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor as keyof T]
      return escapeCSV(value)
    }).join(',')
  )

  // BOM ekle → Excel'de Türkçe karakterler doğru görünsün
  const BOM = '\uFEFF'
  return BOM + [header, ...rows].join('\n')
}

// CSV'yi dosya olarak indir
const downloadCSV = (csv: string, filename: string): void =>
  downloadFile(csv, filename, 'text/csv;charset=utf-8;')

// Araçları export et
export const exportVehiclesCSV = (vehicles: Vehicle[]): number => {
  const columns: CsvKolonu<Vehicle>[] = [
    { label: 'ID', accessor: 'id' },
    { label: i18n.t('csv.col.plaka'), accessor: 'plate' },
    { label: i18n.t('csv.col.marka'), accessor: 'brand' },
    { label: i18n.t('csv.col.model'), accessor: 'model' },
    { label: i18n.t('csv.col.yil'), accessor: 'year' },
    { label: i18n.t('csv.col.yakit_tipi'), accessor: 'fuelType' },
    { label: i18n.t('csv.col.guncel_km'), accessor: 'currentKm' },
    { label: i18n.t('csv.col.muayene_tarihi'), accessor: (r) => formatDate(r.inspectionDate) },
    { label: i18n.t('csv.col.mtv_tarihi'), accessor: (r) => formatDate(r.mtvDate) },
    { label: i18n.t('csv.col.sigorta_tarihi'), accessor: (r) => formatDate(r.insuranceDate) },
    { label: i18n.t('csv.col.kasko_tarihi'), accessor: (r) => formatDate(r.kaskoDate) },
    { label: i18n.t('csv.col.notlar'), accessor: 'notes' },
  ]

  const csv = arrayToCSV(vehicles, columns)
  const timestamp = toDateKey(new Date())
  downloadCSV(csv, `garajim-${i18n.t('csv.dosya.araclar')}-${timestamp}.csv`)

  return vehicles.length
}

// Bakım kayıtlarını export et
export const exportMaintenanceCSV = (maintenanceRecords: MaintenanceRecord[], vehicles: Vehicle[]): number => {
  const withVehicle = maintenanceRecords.map(r => {
    const v = vehicles.find(v => v.id === r.vehicleId)
    return {
      ...r,
      vehicleName: v ? `${v.brand} ${v.model}` : i18n.t('csv.bilinmeyen_arac'),
      vehiclePlate: v?.plate || '',
    }
  })

  const columns: CsvKolonu<MaintenanceRecord & { vehicleName: string; vehiclePlate: string }>[] = [
    { label: i18n.t('csv.col.tarih'), accessor: (r) => formatDate(r.date) },
    { label: i18n.t('csv.col.arac'), accessor: 'vehicleName' },
    { label: i18n.t('csv.col.plaka'), accessor: 'vehiclePlate' },
    { label: i18n.t('csv.col.bakim_turu'), accessor: 'type' },
    { label: i18n.t('csv.col.km'), accessor: 'km' },
    { label: i18n.t('csv.col.maliyet'), accessor: 'cost' },
    { label: i18n.t('csv.col.notlar'), accessor: 'notes' },
  ]

  const csv = arrayToCSV(withVehicle, columns)
  const timestamp = toDateKey(new Date())
  downloadCSV(csv, `garajim-${i18n.t('csv.dosya.bakimlar')}-${timestamp}.csv`)

  return maintenanceRecords.length
}

// Yakıt kayıtlarını export et
export const exportFuelCSV = (fuelRecords: FuelRecord[], vehicles: Vehicle[]): number => {
  const withVehicle = fuelRecords.map(r => {
    const v = vehicles.find(v => v.id === r.vehicleId)
    return {
      ...r,
      vehicleName: v ? `${v.brand} ${v.model}` : i18n.t('csv.bilinmeyen_arac'),
      vehiclePlate: v?.plate || '',
    }
  })

  const columns: CsvKolonu<FuelRecord & { vehicleName: string; vehiclePlate: string }>[] = [
    { label: i18n.t('csv.col.tarih'), accessor: (r) => formatDate(r.date) },
    { label: i18n.t('csv.col.arac'), accessor: 'vehicleName' },
    { label: i18n.t('csv.col.plaka'), accessor: 'vehiclePlate' },
    { label: i18n.t('csv.col.km'), accessor: 'km' },
    { label: i18n.t('csv.col.litre'), accessor: 'liters' },
    { label: i18n.t('csv.col.fiyat_litre'), accessor: 'pricePerLiter' },
    { label: i18n.t('csv.col.toplam'), accessor: 'totalCost' },
    { label: i18n.t('csv.col.istasyon'), accessor: 'station' },
    { label: i18n.t('csv.col.dolu_depo'), accessor: (r) => r.fullTank ? i18n.t('csv.evet') : i18n.t('csv.hayir') },
    { label: i18n.t('csv.col.notlar'), accessor: 'notes' },
  ]

  const csv = arrayToCSV(withVehicle, columns)
  const timestamp = toDateKey(new Date())
  downloadCSV(csv, `garajim-${i18n.t('csv.dosya.yakit')}-${timestamp}.csv`)

  return fuelRecords.length
}

// Tümünü export et (3 ayrı dosya)
export const exportAllCSV = (vehicles: Vehicle[], maintenanceRecords: MaintenanceRecord[], fuelRecords: FuelRecord[]) => {
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
export const filterByDateRange = <T extends { date: string }>(records: T[], range: string): T[] => {
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