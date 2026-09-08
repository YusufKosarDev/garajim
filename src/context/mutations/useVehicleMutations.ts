/**
 * Araç CRUD. Silme, aracın bakım/yakıt/lastik kayıtlarını ve
 * Storage'daki fotoğraflarını da temizler.
 *
 * Sağlayıcıdan çıkarıldı (bkz. shared.ts) — davranış birebir aynı.
 */
import { useCallback } from 'react'
import i18n from '../../i18n'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { vehicleToDb, vehicleFromDb, formatSupabaseError } from '../../lib/supabaseMappers'
import { uploadPhotoFromBase64, uploadPhotosBatch, deletePhotosBatch, isBase64, BUCKETS } from '../../lib/storageHelpers'
import type { Vehicle, CustomIntervals } from '../../types'
import type { MutationDeps } from './shared'
export function useVehicleMutations({
  user, vehicles, maintenanceRecords, setVehicles, setMaintenanceRecords, setFuelRecords, setTireSets, setTireChanges, setCustomIntervals,
}: Pick<MutationDeps, 'user' | 'vehicles' | 'maintenanceRecords' | 'setVehicles' | 'setMaintenanceRecords' | 'setFuelRecords' | 'setTireSets' | 'setTireChanges' | 'setCustomIntervals'>) {
  const addVehicle = useCallback(async (vehicle: Partial<Vehicle>) => {
    if (!user) {
      toast.error(i18n.t('ctx.vehicleContext.giris_yapmalisin'))
      return null
    }

    try {
      // 🆕 Base64 fotoğrafları Storage'a yükle, URL'leri al
      let uploadedPhotos = vehicle.photos || []
      if (uploadedPhotos.length > 0) {
        const hasBase64 = uploadedPhotos.some(isBase64)
        if (hasBase64) {
          const uploadingToast = toast.loading(i18n.t('ctx.vehicleContext.fotograflar_yukleniyor'))
          uploadedPhotos = await uploadPhotosBatch(
            uploadedPhotos,
            user.id,
            BUCKETS.VEHICLE_PHOTOS,
            'vehicle'
          )
          toast.dismiss(uploadingToast)
        }
      }

      const dbRow = vehicleToDb({ ...vehicle, photos: uploadedPhotos }, user.id)
      const { data, error } = await supabase
        .from('vehicles')
        .insert([dbRow])
        .select()
        .single()

      if (error) throw error

      const newVehicle = vehicleFromDb(data)
      if (!newVehicle) throw new Error(i18n.t('ctx.vehicleContext.arac_kaydi_okunamadi'))
      setVehicles(prev => {
        // Real-time event önce gelmiş olabilir, ikinci kez ekleme
        if (prev.some(v => v.id === newVehicle.id)) return prev
        return [...prev, newVehicle]
      })
      toast.success(i18n.t('ctx.vehicleContext.arac_eklendi'))
      return newVehicle
    } catch (error) {
      console.error('addVehicle:', error)
      toast.error(i18n.t('ctx.vehicleContext.arac_eklenemedi') + formatSupabaseError(error as Error))
      return null
    }
  }, [user, setVehicles])

  const updateVehicle = useCallback(async (id: string, updates: Partial<Vehicle>) => {
    if (!user) return

    try {
      // 🆕 Yeni base64 fotoğrafları Storage'a yükle (varsa)
      let uploadedPhotos = updates.photos
      if (uploadedPhotos && uploadedPhotos.length > 0) {
        const hasBase64 = uploadedPhotos.some(isBase64)
        if (hasBase64) {
          const uploadingToast = toast.loading(i18n.t('ctx.vehicleContext.fotograflar_yukleniyor'))
          // Sadece base64 olanları yükle, mevcut URL'leri koru
          const uploadResults = await Promise.all(
            uploadedPhotos.map(photo => 
              isBase64(photo) 
                ? uploadPhotoFromBase64(photo, user.id, BUCKETS.VEHICLE_PHOTOS, 'vehicle')
                : photo // Zaten URL ise olduğu gibi tut
            )
          )
          uploadedPhotos = uploadResults.filter(url => url !== null)
          toast.dismiss(uploadingToast)
        }
      }

      // 🆕 Eski fotoğraflar arasından silinmiş olanları Storage'dan da sil
      const currentVehicle = vehicles.find(v => v.id === id)
      if (currentVehicle && uploadedPhotos !== undefined) {
        const oldUrls = currentVehicle.photos || []
        const newUrls = uploadedPhotos || []
        const removedUrls = oldUrls.filter(url => !newUrls.includes(url))
        if (removedUrls.length > 0) {
          // Async olarak sil (UI'yi bekletme)
          deletePhotosBatch(removedUrls, BUCKETS.VEHICLE_PHOTOS).catch(err =>
            console.error('Eski fotoğraf silme hatası:', err)
          )
        }
      }

      const updatesWithPhotos = uploadedPhotos !== undefined 
        ? { ...updates, photos: uploadedPhotos } 
        : updates

      const dbRow = vehicleToDb(updatesWithPhotos, user.id)
      delete (dbRow as { user_id?: string }).user_id

      const { data, error } = await supabase
        .from('vehicles')
        .update(dbRow)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const updated = vehicleFromDb(data)
      if (!updated) throw new Error(i18n.t('ctx.vehicleContext.arac_kaydi_okunamadi'))
      setVehicles(prev => prev.map(v => (v.id === id ? updated : v)))
      toast.success(i18n.t('ctx.vehicleContext.arac_guncellendi'))
    } catch (error) {
      console.error('updateVehicle:', error)
      toast.error(i18n.t('ctx.vehicleContext.arac_guncellenemedi') + formatSupabaseError(error as Error))
    }
  }, [user, vehicles, setVehicles])

  const deleteVehicle = useCallback(async (id: string) => {
    if (!user) return

    try {
      // 🆕 Önce bu aracın fotoğraflarını Storage'dan sil
      const vehicle = vehicles.find(v => v.id === id)
      if (vehicle && vehicle.photos && vehicle.photos.length > 0) {
        // Async olarak sil (UI'yi bekletme)
        deletePhotosBatch(vehicle.photos, BUCKETS.VEHICLE_PHOTOS).catch(err =>
          console.error('Araç fotoğraf silme hatası:', err)
        )
      }

      // 🆕 Bu araca ait bakım fotoğraflarını Storage'dan sil
      const relatedMaintenance = maintenanceRecords.filter(r => r.vehicleId === id)
      const maintenancePhotos = relatedMaintenance
        .map(r => r.photo)
        .filter(p => p && !isBase64(p))
      if (maintenancePhotos.length > 0) {
        deletePhotosBatch(maintenancePhotos, BUCKETS.MAINTENANCE_PHOTOS).catch(err =>
          console.error('Bakım fotoğraf silme hatası:', err)
        )
      }

      // CASCADE sayesinde DB'de bağlı kayıtlar otomatik silinir
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)

      if (error) throw error

      // State'i temizle
      setVehicles(prev => prev.filter(v => v.id !== id))
      setMaintenanceRecords(prev => prev.filter(r => r.vehicleId !== id))
      setFuelRecords(prev => prev.filter(r => r.vehicleId !== id))
      setTireSets(prev => prev.filter(set => set.vehicleId !== id))
      setTireChanges(prev => prev.filter(set => set.vehicleId !== id))

      setCustomIntervals(prev => {
        const filtered: CustomIntervals = {}
        Object.keys(prev).forEach(key => {
          if (!key.startsWith(`${id}-`)) {
            filtered[key] = prev[key]
          }
        })
        return filtered
      })

      toast.success(i18n.t('ctx.vehicleContext.arac_ve_tum_kayitlari_silindi'))
    } catch (error) {
      console.error('deleteVehicle:', error)
      toast.error(i18n.t('ctx.vehicleContext.arac_silinemedi') + formatSupabaseError(error as Error))
    }
  }, [user, vehicles, maintenanceRecords, setVehicles, setMaintenanceRecords, setFuelRecords, setTireSets, setTireChanges, setCustomIntervals])

  return { addVehicle, updateVehicle, deleteVehicle }
}
