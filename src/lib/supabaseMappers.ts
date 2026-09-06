import type {
  Vehicle, VehicleRow,
  MaintenanceRecord, MaintenanceRow,
  FuelRecord, FuelRow,
  TireSet, TireSetRow,
  TireChange, TireChangeRow,
  CustomInterval, CustomIntervalRow, CustomIntervals,
} from '../types'

/**
 * Supabase (snake_case) ↔ Frontend (camelCase) dönüşümleri
 * 
 * PostgreSQL convention'ı snake_case kullanır.
 * JavaScript convention'ı camelCase kullanır.
 * Bu dosya iki tarafı birbirine çevirir.
 */

/**
 * Postgres numeric sütunları PostgREST üzerinden STRING olarak geliyor
 * (ör. cost: '1234.56'). Mapper'lar bunu dağınık parseFloat çağrılarıyla
 * çeviriyordu; tek yerde topluyoruz. null/undefined/boş/NaN -> 0.
 */
const sayiya = (deger: string | number | null | undefined): number => {
  if (deger === null || deger === undefined || deger === '') return 0
  const n = typeof deger === 'number' ? deger : parseFloat(deger)
  return Number.isNaN(n) ? 0 : n
}

// ============================================
// VEHICLES
// ============================================

export const vehicleFromDb = (row: VehicleRow | null): Vehicle | null => {
  if (!row) return null
  return {
    id: row.id,
    plate: row.plate,
    brand: row.brand,
    model: row.model,
    year: row.year,
    fuelType: row.fuel_type,
    currentKm: row.current_km,
    inspectionDate: row.inspection_date,
    mtvDate: row.mtv_date,
    insuranceDate: row.insurance_date,
    kaskoDate: row.kasko_date,
    notes: row.notes,
    photos: row.photos || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const vehicleToDb = (vehicle: Partial<Vehicle>, userId: string) => {
  // Sadece DB sütunlarına karşılık gelen alanları gönder
  const dbRow = {
    user_id: userId,
    plate: vehicle.plate,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year ?? null,
    fuel_type: vehicle.fuelType ?? null,
    current_km: vehicle.currentKm ?? 0,
    inspection_date: vehicle.inspectionDate || null,
    mtv_date: vehicle.mtvDate || null,
    insurance_date: vehicle.insuranceDate || null,
    kasko_date: vehicle.kaskoDate || null,
    notes: vehicle.notes ?? null,
    photos: vehicle.photos ?? [],
  }
  return dbRow
}

// ============================================
// MAINTENANCE RECORDS
// ============================================

export const maintenanceFromDb = (row: MaintenanceRow | null): MaintenanceRecord | null => {
  if (!row) return null
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    type: row.type,
    date: row.date,
    km: row.km,
    cost: sayiya(row.cost),
    notes: row.notes,
    photo: row.photo_url, // Eski sistemle uyum için 'photo' adı
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const maintenanceToDb = (record: Partial<MaintenanceRecord>, userId: string) => {
  return {
    vehicle_id: record.vehicleId,
    user_id: userId,
    type: record.type,
    date: record.date,
    km: record.km ?? null,
    cost: record.cost ?? 0,
    notes: record.notes ?? null,
    photo_url: record.photo ?? null,
  }
}

// ============================================
// FUEL RECORDS
// ============================================

export const fuelFromDb = (row: FuelRow | null): FuelRecord | null => {
  if (!row) return null
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    date: row.date,
    km: row.km,
    liters: sayiya(row.liters),
    pricePerLiter: sayiya(row.price_per_liter),
    totalCost: sayiya(row.total_cost),
    fullTank: row.full_tank ?? false,
    station: row.station,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const fuelToDb = (record: Partial<FuelRecord>, userId: string) => {
  return {
    vehicle_id: record.vehicleId,
    user_id: userId,
    date: record.date,
    km: record.km ?? null,
    liters: record.liters,
    price_per_liter: record.pricePerLiter ?? 0,
    total_cost: record.totalCost,
    full_tank: record.fullTank ?? false,
    station: record.station ?? null,
    notes: record.notes ?? null,
  }
}

// ============================================
// TIRE SETS
// ============================================

export const tireSetFromDb = (row: TireSetRow | null): TireSet | null => {
  if (!row) return null
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    season: row.season,
    brand: row.brand,
    size: row.size,
    tires: row.tires || [],
    purchaseDate: row.purchase_date,
    purchasePrice: sayiya(row.purchase_price),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const tireSetToDb = (tireSet: Partial<TireSet>, userId: string) => {
  return {
    vehicle_id: tireSet.vehicleId,
    user_id: userId,
    season: tireSet.season,
    brand: tireSet.brand ?? null,
    size: tireSet.size ?? null,
    tires: tireSet.tires ?? [],
    purchase_date: tireSet.purchaseDate || null,
    purchase_price: tireSet.purchasePrice ?? 0,
    notes: tireSet.notes ?? null,
  }
}

// ============================================
// TIRE CHANGES
// ============================================

export const tireChangeFromDb = (row: TireChangeRow | null): TireChange | null => {
  if (!row) return null
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    date: row.date,
    fromSeason: row.from_season,
    toSeason: row.to_season,
    km: row.km,
    cost: sayiya(row.cost),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const tireChangeToDb = (change: Partial<TireChange>, userId: string) => {
  return {
    vehicle_id: change.vehicleId,
    user_id: userId,
    date: change.date,
    from_season: change.fromSeason || null,
    to_season: change.toSeason,
    km: change.km ?? null,
    cost: change.cost ?? 0,
    notes: change.notes ?? null,
  }
}

// ============================================
// CUSTOM INTERVALS
// ============================================

/**
 * customIntervals frontend'de obje olarak tutuluyor:
 *   { 'vehicleId-Yağ Değişimi': { kilometers: 7500, months: 12 } }
 * 
 * Database'de her ayar bir satır:
 *   { vehicle_id, maintenance_type, kilometers, months }
 * 
 * Bu fonksiyonlar iki tarafı birbirine çevirir.
 */

export const customIntervalToDb = (
  vehicleId: string,
  maintenanceType: string,
  interval: CustomInterval,
  userId: string
): CustomIntervalRow => {
  return {
    vehicle_id: vehicleId,
    user_id: userId,
    maintenance_type: maintenanceType,
    kilometers: interval.kilometers ?? null,
    months: interval.months ?? null,
  }
}

export const customIntervalsFromDbRows = (rows?: CustomIntervalRow[] | null): CustomIntervals => {
  // DB satırlarını obje formatına çevir
  // [{ vehicle_id, maintenance_type, kilometers, months }] →
  // { 'vehicleId-Yağ Değişimi': { kilometers, months } }
  const result: CustomIntervals = {}
  if (!rows || !Array.isArray(rows)) return result
  
  rows.forEach(row => {
    const key = `${row.vehicle_id}-${row.maintenance_type}`
    result[key] = {
      kilometers: row.kilometers,
      months: row.months,
    }
  })
  return result
}

// ============================================
// HATA MESAJLARI (Türkçe)
// ============================================

export const formatSupabaseError = (error?: { message?: string } | string | null): string => {
  if (!error) return 'Bilinmeyen hata'
  
  const msg = typeof error === 'string' ? error : (error.message || String(error))
  
  // Yaygın hataları Türkçeleştir
  if (msg.includes('duplicate key')) return 'Bu kayıt zaten var'
  if (msg.includes('violates foreign key')) return 'Geçersiz referans'
  if (msg.includes('violates check constraint')) return 'Geçersiz değer'
  if (msg.includes('violates not-null')) return 'Eksik alan'
  if (msg.includes('JWT expired')) return 'Oturum süresi doldu, tekrar giriş yapın'
  if (msg.includes('Network')) return 'İnternet bağlantısı yok'
  
  return msg
}