import { supabase } from './supabase'
import {
  vehicleToDb, maintenanceToDb, fuelToDb, tireSetToDb, tireChangeToDb,
} from './supabaseMappers'
import { uploadPhotoFromBase64, uploadPhotosBatch, isBase64, BUCKETS } from './storageHelpers'
import type { KuyrukGirdisi } from './offlineQueue'
import type { Vehicle, MaintenanceRecord, FuelRecord, TireSet, TireChange } from '../types'

/**
 * Kuyruktaki bir girdiyi sunucuya gönderir.
 *
 * Kuyruk, ham DB satırını değil ORİJİNAL ÇAĞRI ARGÜMANINI saklıyor. Böylece
 * fotoğraf yükleme gibi yan işler gönderim anında (yani ağ geri geldiğinde)
 * yapılabiliyor — çevrimdışıyken Storage'a da erişilemediği için base64
 * fotoğraflar kuyrukta bekliyor.
 */
export function createDispatcher(userId: string) {
  const tabloyaCevir = async (tablo: string, arg: Record<string, unknown>) => {
    switch (tablo) {
      case 'vehicles': {
        const v = arg as Partial<Vehicle>
        let photos = v.photos ?? []
        if (photos.some(isBase64)) {
          photos = await uploadPhotosBatch(photos, userId, BUCKETS.VEHICLE_PHOTOS, 'vehicle')
        }
        return vehicleToDb({ ...v, photos }, userId)
      }
      case 'maintenance_records': {
        const m = arg as Partial<MaintenanceRecord>
        let photo = m.photo
        if (photo && isBase64(photo)) {
          photo = await uploadPhotoFromBase64(photo, userId, BUCKETS.MAINTENANCE_PHOTOS, 'maintenance')
        }
        return maintenanceToDb({ ...m, photo }, userId)
      }
      case 'fuel_records':
        return fuelToDb(arg as Partial<FuelRecord>, userId)
      case 'tire_sets':
        return tireSetToDb(arg as Partial<TireSet>, userId)
      case 'tire_changes':
        return tireChangeToDb(arg as Partial<TireChange>, userId)
      default:
        throw new Error(`Bilinmeyen tablo: ${tablo}`)
    }
  }

  return async (girdi: KuyrukGirdisi): Promise<{ gercekId?: string } | void> => {
    const { tablo, islem, payload, hedefId } = girdi

    if (islem === 'delete') {
      if (!hedefId) throw new Error('Silme için hedef id yok')
      const { error } = await supabase.from(tablo).delete().eq('id', hedefId)
      if (error) throw error
      return
    }

    const dbRow = await tabloyaCevir(tablo, payload ?? {})

    if (islem === 'insert') {
      const { data, error } = await supabase.from(tablo).insert([dbRow]).select().single()
      if (error) throw error
      return { gercekId: (data as { id: string })?.id }
    }

    // update
    if (!hedefId) throw new Error('Güncelleme için hedef id yok')
    delete (dbRow as { user_id?: string }).user_id
    const { error } = await supabase.from(tablo).update(dbRow).eq('id', hedefId)
    if (error) throw error
  }
}

/** Bir tablo için, payload içinde geçici id taşıyabilecek alanlar */
export const REFERANS_ALANLARI: Record<string, string[]> = {
  vehicles: [],
  maintenance_records: ['vehicleId'],
  fuel_records: ['vehicleId'],
  tire_sets: ['vehicleId'],
  tire_changes: ['vehicleId'],
}
