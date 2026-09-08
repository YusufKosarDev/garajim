/**
 * Bakım kaydı CRUD. Çevrimdışıyken ekleme kuyruğa alınıp listeye
 * iyimser olarak yazılır — servisteyken/yolda kayıt girilen senaryo.
 *
 * Sağlayıcıdan çıkarıldı (bkz. shared.ts) — davranış birebir aynı.
 */
import { useCallback } from 'react'
import i18n from '../../i18n'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { maintenanceToDb, maintenanceFromDb, formatSupabaseError } from '../../lib/supabaseMappers'
import { uploadPhotoFromBase64, deletePhotoByUrl, isBase64, BUCKETS } from '../../lib/storageHelpers'
import { isOffline, isNetworkError } from '../../lib/offlineQueue'
import type { MaintenanceRecord } from '../../types'
import type { MutationDeps } from './shared'
export function useMaintenanceMutations({
  user, maintenanceRecords, setMaintenanceRecords, enqueueWithOptimisticInsert,
}: Pick<MutationDeps, 'user' | 'maintenanceRecords' | 'setMaintenanceRecords' | 'enqueueWithOptimisticInsert'>) {
  const addMaintenance = useCallback(async (record: Partial<MaintenanceRecord>) => {
    if (!user) return null

    // Çevrimdışıysa kuyruğa al ve iyimser olarak listeye ekle.
    // Bu tam da servisteyken/yolda kayıt girilen senaryo — en çok burada gerekli.
    if (isOffline()) {
      return enqueueWithOptimisticInsert(record)
    }

    try {
      // 🆕 Bakım fotoğrafını Storage'a yükle (varsa)
      let uploadedPhoto = record.photo
      if (uploadedPhoto && isBase64(uploadedPhoto)) {
        const uploadingToast = toast.loading(i18n.t('ctx.vehicleContext.fotograf_yukleniyor'))
        uploadedPhoto = await uploadPhotoFromBase64(
          uploadedPhoto,
          user.id,
          BUCKETS.MAINTENANCE_PHOTOS,
          'maintenance'
        )
        toast.dismiss(uploadingToast)
      }

      const dbRow = maintenanceToDb({ ...record, photo: uploadedPhoto }, user.id)
      const { data, error } = await supabase
        .from('maintenance_records')
        .insert([dbRow])
        .select()
        .single()

      if (error) throw error

      const newRecord = maintenanceFromDb(data)
      if (!newRecord) throw new Error(i18n.t('ctx.vehicleContext.bakim_kaydi_okunamadi'))
      setMaintenanceRecords(prev => {
        if (prev.some(r => r.id === newRecord.id)) return prev
        return [...prev, newRecord]
      })
      toast.success(i18n.t('ctx.vehicleContext.bakim_kaydi_eklendi'))
      return newRecord
    } catch (error) {
      if (isNetworkError(error)) {
        return enqueueWithOptimisticInsert(record)
      }
      console.error('addMaintenance:', error)
      toast.error(i18n.t('ctx.vehicleContext.bakim_eklenemedi') + formatSupabaseError(error as Error))
      return null
    }
  }, [user, setMaintenanceRecords, enqueueWithOptimisticInsert])

  const updateMaintenance = useCallback(async (id: string, updates: Partial<MaintenanceRecord>) => {
    if (!user) return

    try {
      // 🆕 Yeni base64 fotoğraf varsa yükle
      let uploadedPhoto = updates.photo
      if (uploadedPhoto && isBase64(uploadedPhoto)) {
        const uploadingToast = toast.loading(i18n.t('ctx.vehicleContext.fotograf_yukleniyor'))
        uploadedPhoto = await uploadPhotoFromBase64(
          uploadedPhoto,
          user.id,
          BUCKETS.MAINTENANCE_PHOTOS,
          'maintenance'
        )
        toast.dismiss(uploadingToast)
      }

      // 🆕 Eski fotoğraf değiştiyse Storage'dan sil
      const currentRecord = maintenanceRecords.find(r => r.id === id)
      if (currentRecord && currentRecord.photo && uploadedPhoto !== currentRecord.photo) {
        if (!isBase64(currentRecord.photo)) {
          deletePhotoByUrl(currentRecord.photo, BUCKETS.MAINTENANCE_PHOTOS).catch(err =>
            console.error('Eski fotoğraf silme hatası:', err)
          )
        }
      }

      const updatesWithPhoto = uploadedPhoto !== undefined 
        ? { ...updates, photo: uploadedPhoto } 
        : updates

      const dbRow = maintenanceToDb(updatesWithPhoto, user.id)
      delete (dbRow as { user_id?: string }).user_id

      const { data, error } = await supabase
        .from('maintenance_records')
        .update(dbRow)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const updated = maintenanceFromDb(data)
      if (!updated) throw new Error(i18n.t('ctx.vehicleContext.bakim_kaydi_okunamadi'))
      setMaintenanceRecords(prev => prev.map(r => (r.id === id ? updated : r)))
      toast.success(i18n.t('ctx.vehicleContext.bakim_kaydi_guncellendi'))
    } catch (error) {
      console.error('updateMaintenance:', error)
      toast.error(i18n.t('ctx.vehicleContext.bakim_guncellenemedi') + formatSupabaseError(error as Error))
    }
  }, [user, maintenanceRecords, setMaintenanceRecords])

  const deleteMaintenance = useCallback(async (id: string) => {
    if (!user) return

    try {
      // 🆕 Fotoğrafı Storage'dan sil
      const record = maintenanceRecords.find(r => r.id === id)
      if (record && record.photo && !isBase64(record.photo)) {
        deletePhotoByUrl(record.photo, BUCKETS.MAINTENANCE_PHOTOS).catch(err =>
          console.error('Fotoğraf silme hatası:', err)
        )
      }

      const { error } = await supabase
        .from('maintenance_records')
        .delete()
        .eq('id', id)

      if (error) throw error

      setMaintenanceRecords(prev => prev.filter(r => r.id !== id))
      toast.success(i18n.t('ctx.vehicleContext.bakim_kaydi_silindi'))
    } catch (error) {
      console.error('deleteMaintenance:', error)
      toast.error(i18n.t('ctx.vehicleContext.bakim_silinemedi') + formatSupabaseError(error as Error))
    }
  }, [user, maintenanceRecords, setMaintenanceRecords])

  return { addMaintenance, updateMaintenance, deleteMaintenance }
}
