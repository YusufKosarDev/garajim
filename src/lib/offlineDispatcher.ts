import { supabase } from './supabase'
import {
  vehicleToDb, maintenanceToDb, fuelToDb, tireSetToDb, tireChangeToDb,
} from './supabaseMappers'
import { uploadPhotoFromBase64, uploadPhotosBatch, isBase64, BUCKETS } from './storageHelpers'
import type { QueueEntry } from './offlineQueue'
import type { Vehicle, MaintenanceRecord, FuelRecord, TireSet, TireChange } from '../types'

/**
 * Kuyruktaki bir girdiyi sunucuya gönderir.
 *
 * Kuyruk, ham DB satırını değil ORİJİNAL ÇAĞRI ARGÜMANINI saklıyor. Böylece
 * fotoğraf yükleme gibi yan işler gönderim anında (yani ağ geri geldiğinde)
 * yapılabiliyor — çevrimdışıyken Storage'a da erişilemediği için base64
 * fotoğraflar kuyrukta bekliyor.
 */
export function createDispatcher(userId: string, garageId: string | null = null) {
  const tabloyaCevir = async (tablo: string, arg: Record<string, unknown>) => {
    switch (tablo) {
      case 'vehicles': {
        const v = arg as Partial<Vehicle>
        let photos = v.photos ?? []
        if (photos.some(isBase64)) {
          photos = await uploadPhotosBatch(photos, userId, BUCKETS.VEHICLE_PHOTOS, 'vehicle')
        }
        return vehicleToDb({ ...v, photos }, userId, garageId)
      }
      case 'maintenance_records': {
        const m = arg as Partial<MaintenanceRecord>
        let photo = m.photo
        if (photo && isBase64(photo)) {
          photo = await uploadPhotoFromBase64(photo, userId, BUCKETS.MAINTENANCE_PHOTOS, 'maintenance')
        }
        return maintenanceToDb({ ...m, photo }, userId, garageId)
      }
      case 'fuel_records':
        return fuelToDb(arg as Partial<FuelRecord>, userId, garageId)
      case 'tire_sets':
        return tireSetToDb(arg as Partial<TireSet>, userId, garageId)
      case 'tire_changes':
        return tireChangeToDb(arg as Partial<TireChange>, userId, garageId)
      default:
        throw new Error(`Bilinmeyen tablo: ${tablo}`)
    }
  }

  return async (entry: QueueEntry): Promise<{ gercekId?: string } | void> => {
    const { tablo, operation, payload, targetId } = entry

    if (operation === 'delete') {
      if (!targetId) throw new Error('Silme için hedef id yok')
      const { error } = await supabase.from(tablo).delete().eq('id', targetId)
      if (error) throw error
      return
    }

    const dbRow = await tabloyaCevir(tablo, payload ?? {})

    if (operation === 'insert') {
      const { data, error } = await supabase.from(tablo).insert([dbRow]).select().single()
      if (error) throw error
      return { gercekId: (data as { id: string })?.id }
    }

    // update
    if (!targetId) throw new Error('Güncelleme için hedef id yok')
    delete (dbRow as { user_id?: string }).user_id
    // garage_id de düşüyor: mevcut satırın garajı değişmemeli (bkz. supabaseMappers)
    delete (dbRow as { garage_id?: string }).garage_id
    const { error } = await supabase.from(tablo).update(dbRow).eq('id', targetId)
    if (error) throw error
  }
}

/** Bir tablo için, payload içinde geçici id taşıyabilecek alanlar */
export const REFERENCE_FIELDS: Record<string, string[]> = {
  vehicles: [],
  maintenance_records: ['vehicleId'],
  fuel_records: ['vehicleId'],
  tire_sets: ['vehicleId'],
  tire_changes: ['vehicleId'],
}
