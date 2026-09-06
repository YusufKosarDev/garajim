import type { Vehicle, MaintenanceRecord, FuelRecord, ConfirmResult, ValidationResult } from '../types'

// Bir aracın kaydedilmiş en yüksek km değerini bul (araç, bakımlar ve yakıtlardan)
export const getHighestKm = (
  vehicle: Pick<Vehicle, 'currentKm'> | null | undefined,
  maintenanceRecords: MaintenanceRecord[],
  fuelRecords: FuelRecord[],
  excludeRecordId: string | null = null
): number => {
  const values: number[] = []

  if (vehicle?.currentKm) values.push(Number(vehicle.currentKm))

  maintenanceRecords
    .filter(r => r.id !== excludeRecordId)
    .forEach(r => { if (r.km) values.push(Number(r.km)) })

  fuelRecords
    .filter(r => r.id !== excludeRecordId)
    .forEach(r => { if (r.km) values.push(Number(r.km)) })

  return values.length > 0 ? Math.max(...values) : 0
}

// Son yakıt kaydının km'sini bul (aynı veya önceki olamaz)
export const getLastFuelKm = (fuelRecords: FuelRecord[], excludeRecordId: string | null = null): number => {
  const filtered = fuelRecords.filter(r => r.id !== excludeRecordId)
  if (filtered.length === 0) return 0
  return Math.max(...filtered.map(r => Number(r.km || 0)))
}

// Bakım kaydı için km uyarısı gerekli mi?
export const checkMaintenanceKm = (
  newKm: string | number,
  vehicle: Pick<Vehicle, 'currentKm'> | null | undefined,
  maintenanceRecords: MaintenanceRecord[],
  fuelRecords: FuelRecord[],
  excludeRecordId: string | null = null
): ConfirmResult => {
  const highest = getHighestKm(vehicle, maintenanceRecords, fuelRecords, excludeRecordId)
  const km = Number(newKm)

  if (km < highest) {
    return {
      needsConfirm: true,
      message: `Girdiğin ${km.toLocaleString('tr-TR')} km, kayıtlardaki en yüksek km'den (${highest.toLocaleString('tr-TR')} km) düşük. Geçmişe dönük kayıt mı ekliyorsun?`,
    }
  }

  return { needsConfirm: false }
}

// Yakıt kaydı için km kontrolü
export const checkFuelKm = (
  newKm: string | number,
  fuelRecords: FuelRecord[],
  excludeRecordId: string | null = null
): ValidationResult => {
  const lastKm = getLastFuelKm(fuelRecords, excludeRecordId)
  const km = Number(newKm)

  // Aynı km veya daha az → hata (tüketim hesabını bozar)
  if (lastKm > 0 && km <= lastKm) {
    return {
      isValid: false,
      message: `Son yakıt kaydında km ${lastKm.toLocaleString('tr-TR')}. Yeni kayıt bu değerden büyük olmalı.`,
    }
  }

  return { isValid: true }
}