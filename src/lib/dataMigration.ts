import { supabase } from './supabase'
import {
  vehicleToDb,
  maintenanceToDb,
  fuelToDb,
  tireSetToDb,
  tireChangeToDb,
  customIntervalToDb,
  formatSupabaseError,
} from './supabaseMappers'
import {
  uploadPhotosBatch,
  uploadPhotoFromBase64,
  isBase64,
  BUCKETS,
} from './storageHelpers'
import { parseIntervalKey } from '../utils/maintenanceRecommendations'
import type { Vehicle, MaintenanceRecord, FuelRecord, TireSet, TireChange, CustomIntervals } from '../types'

export interface MigrationSayaci { total: number; success: number; failed: number }
export interface MigrationSonucu {
  success: boolean
  vehicles: MigrationSayaci
  maintenance: MigrationSayaci
  fuel: MigrationSayaci
  tireSets: MigrationSayaci
  tireChanges: MigrationSayaci
  customIntervals: MigrationSayaci
  errors: string[]
}
export type ProgressCallback = (step: string, current: number, total: number) => void

/** Yedek dosyasının (backup.ts exportData çıktısı) şekli */
/**
 * Yedek dosyaları eski sürümlerden gelebiliyor: id'ler LocalStorage
 * döneminde Date.now() sayısıydı, bazı alanlar hiç olmayabiliyor.
 * Bu yüzden alanlar opsiyonel ve id'ler string|number.
 */
type EskiId = string | number

export interface YedekVerisi {
  vehicles?: (Partial<Vehicle> & { id?: EskiId; photo?: string | null })[]
  maintenanceRecords?: (Partial<MaintenanceRecord> & { id?: EskiId; vehicleId?: EskiId })[]
  fuelRecords?: (Partial<FuelRecord> & { id?: EskiId; vehicleId?: EskiId })[]
  tireSets?: (Partial<TireSet> & { id?: EskiId; vehicleId?: EskiId })[]
  tireChanges?: (Partial<TireChange> & { id?: EskiId; vehicleId?: EskiId })[]
  customIntervals?: CustomIntervals
}

/**
 * Migration sonuç tipi
 */
const createResult = (): MigrationSonucu => ({
  success: false,
  vehicles: { total: 0, success: 0, failed: 0 },
  maintenance: { total: 0, success: 0, failed: 0 },
  fuel: { total: 0, success: 0, failed: 0 },
  tireSets: { total: 0, success: 0, failed: 0 },
  tireChanges: { total: 0, success: 0, failed: 0 },
  customIntervals: { total: 0, success: 0, failed: 0 },
  errors: [],
})

/**
 * LocalStorage / JSON yedeğindeki verileri Supabase'e yükle
 * 
 * @param {object} data - { vehicles, maintenanceRecords, fuelRecords, ... }
 * @param {string} userId - Hedef kullanıcı UUID
 * @param {function} onProgress - (step, current, total) => void
 * @returns {Promise<object>} Migration sonuç raporu
 */
export const migrateDataToSupabase = async (
  data: YedekVerisi | null | undefined,
  userId: string,
  onProgress: ProgressCallback = () => {}
): Promise<MigrationSonucu> => {
  const result = createResult()

  if (!userId) {
    result.errors.push('Kullanıcı ID gerekli')
    return result
  }

  if (!data || typeof data !== 'object') {
    result.errors.push('Geçersiz veri')
    return result
  }

  // Eski ID → Yeni UUID eşleştirmesi (vehicles için)
  // LocalStorage'da vehicleId 'Date.now()' formatında
  // Supabase'de UUID. Eski ID'leri yeni UUID'lere eşleştirmemiz lazım
  const vehicleIdMap = new Map<string, string>() // oldId → newUuid

  // ============ VEHICLES ============
  const vehicles = data.vehicles || []
  result.vehicles.total = vehicles.length

  if (vehicles.length > 0) {
    onProgress('vehicles', 0, vehicles.length)

    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i]
      onProgress('vehicles', i + 1, vehicles.length)

      try {
        // Fotoğrafları Storage'a yükle (varsa base64)
        let uploadedPhotos = vehicle.photos || []
        if (uploadedPhotos.length > 0) {
          const hasBase64 = uploadedPhotos.some(isBase64)
          if (hasBase64) {
            uploadedPhotos = await uploadPhotosBatch(
              uploadedPhotos,
              userId,
              BUCKETS.VEHICLE_PHOTOS,
              'vehicle'
            )
          }
        }

        // Eski photo (single) varsa onu da photos'a ekle
        if (vehicle.photo && isBase64(vehicle.photo)) {
          const url = await uploadPhotoFromBase64(
            vehicle.photo,
            userId,
            BUCKETS.VEHICLE_PHOTOS,
            'vehicle'
          )
          if (url) uploadedPhotos.push(url)
        }

        const dbRow = vehicleToDb({ ...vehicle, photos: uploadedPhotos }, userId)

        const { data: inserted, error } = await supabase
          .from('vehicles')
          .insert([dbRow])
          .select()
          .single()

        if (error) throw error

        // ID eşleştirmesi (eski ID → yeni UUID)
        vehicleIdMap.set(String(vehicle.id), inserted.id)
        result.vehicles.success++
      } catch (error) {
        console.error('Migration vehicle error:', error)
        result.vehicles.failed++
        result.errors.push(`Araç (${vehicle.plate || 'Bilinmiyor'}): ${formatSupabaseError(error as Error)}`)
      }
    }
  }

  // ============ MAINTENANCE RECORDS ============
  const maintenance = data.maintenanceRecords || []
  result.maintenance.total = maintenance.length

  if (maintenance.length > 0) {
    onProgress('maintenance', 0, maintenance.length)

    for (let i = 0; i < maintenance.length; i++) {
      const record = maintenance[i]
      onProgress('maintenance', i + 1, maintenance.length)

      try {
        // Vehicle ID'yi yeni UUID'ye çevir
        const newVehicleId = vehicleIdMap.get(String(record.vehicleId))
        if (!newVehicleId) {
          throw new Error('Bağlı araç bulunamadı (silinmiş olabilir)')
        }

        // Fotoğrafı Storage'a yükle (varsa base64)
        let uploadedPhoto = record.photo
        if (uploadedPhoto && isBase64(uploadedPhoto)) {
          uploadedPhoto = await uploadPhotoFromBase64(
            uploadedPhoto,
            userId,
            BUCKETS.MAINTENANCE_PHOTOS,
            'maintenance'
          )
        }

        const dbRow = maintenanceToDb(
          { ...record, vehicleId: newVehicleId, photo: uploadedPhoto },
          userId
        )

        const { error } = await supabase
          .from('maintenance_records')
          .insert([dbRow])

        if (error) throw error
        result.maintenance.success++
      } catch (error) {
        console.error('Migration maintenance error:', error)
        result.maintenance.failed++
        result.errors.push(`Bakım kaydı (${record.type || 'Bilinmiyor'}): ${formatSupabaseError(error as Error)}`)
      }
    }
  }

  // ============ FUEL RECORDS ============
  const fuel = data.fuelRecords || []
  result.fuel.total = fuel.length

  if (fuel.length > 0) {
    onProgress('fuel', 0, fuel.length)

    for (let i = 0; i < fuel.length; i++) {
      const record = fuel[i]
      onProgress('fuel', i + 1, fuel.length)

      try {
        const newVehicleId = vehicleIdMap.get(String(record.vehicleId))
        if (!newVehicleId) {
          throw new Error('Bağlı araç bulunamadı')
        }

        const dbRow = fuelToDb(
          { ...record, vehicleId: newVehicleId },
          userId
        )

        const { error } = await supabase
          .from('fuel_records')
          .insert([dbRow])

        if (error) throw error
        result.fuel.success++
      } catch (error) {
        console.error('Migration fuel error:', error)
        result.fuel.failed++
        result.errors.push(`Yakıt kaydı: ${formatSupabaseError(error as Error)}`)
      }
    }
  }

  // ============ TIRE SETS ============
  const tireSets = data.tireSets || []
  result.tireSets.total = tireSets.length

  if (tireSets.length > 0) {
    onProgress('tireSets', 0, tireSets.length)

    for (let i = 0; i < tireSets.length; i++) {
      const tireSet = tireSets[i]
      onProgress('tireSets', i + 1, tireSets.length)

      try {
        const newVehicleId = vehicleIdMap.get(String(tireSet.vehicleId))
        if (!newVehicleId) {
          throw new Error('Bağlı araç bulunamadı')
        }

        const dbRow = tireSetToDb(
          { ...tireSet, vehicleId: newVehicleId },
          userId
        )

        const { error } = await supabase
          .from('tire_sets')
          .insert([dbRow])

        if (error) throw error
        result.tireSets.success++
      } catch (error) {
        console.error('Migration tire set error:', error)
        result.tireSets.failed++
        result.errors.push(`Lastik seti (${tireSet.season || ''}): ${formatSupabaseError(error as Error)}`)
      }
    }
  }

  // ============ TIRE CHANGES ============
  const tireChanges = data.tireChanges || []
  result.tireChanges.total = tireChanges.length

  if (tireChanges.length > 0) {
    onProgress('tireChanges', 0, tireChanges.length)

    for (let i = 0; i < tireChanges.length; i++) {
      const change = tireChanges[i]
      onProgress('tireChanges', i + 1, tireChanges.length)

      try {
        const newVehicleId = vehicleIdMap.get(String(change.vehicleId))
        if (!newVehicleId) {
          throw new Error('Bağlı araç bulunamadı')
        }

        const dbRow = tireChangeToDb(
          { ...change, vehicleId: newVehicleId },
          userId
        )

        const { error } = await supabase
          .from('tire_changes')
          .insert([dbRow])

        if (error) throw error
        result.tireChanges.success++
      } catch (error) {
        console.error('Migration tire change error:', error)
        result.tireChanges.failed++
        result.errors.push(`Lastik değişimi: ${formatSupabaseError(error as Error)}`)
      }
    }
  }

  // ============ CUSTOM INTERVALS ============
  const intervals = data.customIntervals || {}
  const intervalKeys = Object.keys(intervals)
  result.customIntervals.total = intervalKeys.length

  if (intervalKeys.length > 0) {
    onProgress('customIntervals', 0, intervalKeys.length)

    const rowsToInsert = []
    for (let i = 0; i < intervalKeys.length; i++) {
      const key = intervalKeys[i]
      onProgress('customIntervals', i + 1, intervalKeys.length)

      const parsed = parseIntervalKey(key)
      if (!parsed) {
        result.customIntervals.failed++
        continue
      }
      const { vehicleId: oldVehicleId, maintenanceType } = parsed
      const newVehicleId = vehicleIdMap.get(String(oldVehicleId))

      if (!newVehicleId) {
        result.customIntervals.failed++
        continue
      }

      // Eski yedeklerde değer düz sayı olabiliyor; tek biçime çeviriyoruz
      const ham = intervals[key]
      const interval = typeof ham === 'number'
        ? { kilometers: ham, months: null }
        : (ham ?? null)

      if (interval && (interval.kilometers || interval.months)) {
        rowsToInsert.push(
          customIntervalToDb(newVehicleId, maintenanceType, interval, userId)
        )
      }
    }

    if (rowsToInsert.length > 0) {
      try {
        const { error } = await supabase
          .from('custom_intervals')
          .insert(rowsToInsert)

        if (error) throw error
        result.customIntervals.success = rowsToInsert.length
      } catch (error) {
        console.error('Migration intervals error:', error)
        result.customIntervals.failed = rowsToInsert.length
        result.errors.push(`Bakım periyotları: ${formatSupabaseError(error as Error)}`)
      }
    }
  }

  // Sonuç
  result.success = result.errors.length === 0

  return result
}

/**
 * LocalStorage'da Garajım verisi var mı kontrol et
 */
export const hasLocalStorageData = () => {
  try {
    const raw = localStorage.getItem('garajim_data')
    if (!raw) return false
    const data = JSON.parse(raw)
    const hasAny =
      (data.vehicles && data.vehicles.length > 0) ||
      (data.maintenanceRecords && data.maintenanceRecords.length > 0) ||
      (data.fuelRecords && data.fuelRecords.length > 0) ||
      (data.tireSets && data.tireSets.length > 0)
    return hasAny
  } catch {
    return false
  }
}

/**
 * LocalStorage'daki veriyi al
 */
export const getLocalStorageData = () => {
  try {
    const raw = localStorage.getItem('garajim_data')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Migration sonrası LocalStorage'ı temizle (opsiyonel)
 */
export const clearLocalStorageData = () => {
  try {
    localStorage.removeItem('garajim_data')
    return true
  } catch {
    return false
  }
}

/**
 * Veri sayılarını getir (UI'da göstermek için)
 */
export const getDataCounts = (data: YedekVerisi | null | undefined) => {
  if (!data) return null
  return {
    vehicles: (data.vehicles || []).length,
    maintenance: (data.maintenanceRecords || []).length,
    fuel: (data.fuelRecords || []).length,
    tireSets: (data.tireSets || []).length,
    tireChanges: (data.tireChanges || []).length,
    customIntervals: Object.keys(data.customIntervals || {}).length,
  }
}