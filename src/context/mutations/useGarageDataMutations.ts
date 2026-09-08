/**
 * Araç bazlı bakım periyotları ve "tüm verileri sil".
 *
 * Sağlayıcıdan çıkarıldı (bkz. shared.ts) — davranış birebir aynı.
 */
import { useCallback } from 'react'
import i18n from '../../i18n'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { customIntervalToDb, formatSupabaseError } from '../../lib/supabaseMappers'
import { deletePhotosBatch, isBase64, BUCKETS } from '../../lib/storageHelpers'
import { parseIntervalKey } from '../../utils/maintenanceRecommendations'
import type { CustomIntervals, CustomInterval, CustomIntervalRow } from '../../types'
import type { MutationDeps } from './shared'
export function useGarageDataMutations({
  user, vehicles, maintenanceRecords, setVehicles, setMaintenanceRecords, setFuelRecords, setTireSets, setTireChanges, setCustomIntervals,
}: Pick<MutationDeps, 'user' | 'vehicles' | 'maintenanceRecords' | 'setVehicles' | 'setMaintenanceRecords' | 'setFuelRecords' | 'setTireSets' | 'setTireChanges' | 'setCustomIntervals'>) {
  const updateCustomIntervals = useCallback(async (intervals: CustomIntervals) => {
    if (!user) return

    try {
      const { error: deleteError } = await supabase
        .from('custom_intervals')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      const rowsToInsert: CustomIntervalRow[] = []
      Object.keys(intervals).forEach(key => {
        const parsed = parseIntervalKey(key)
        if (!parsed) return
        const { vehicleId, maintenanceType } = parsed
        // Eski yedeklerde değer düz sayı olabiliyor; tek biçime çeviriyoruz
        const raw = intervals[key]
        const interval: CustomInterval | null =
          typeof raw === 'number' ? { kilometers: raw, months: null } : (raw ?? null)

        if (interval && (interval.kilometers || interval.months)) {
          rowsToInsert.push(
            customIntervalToDb(vehicleId, maintenanceType, interval, user.id)
          )
        }
      })

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('custom_intervals')
          .insert(rowsToInsert)

        if (insertError) throw insertError
      }

      setCustomIntervals(intervals)
      toast.success(i18n.t('ctx.vehicleContext.bakim_periyotlari_guncellendi'))
    } catch (error) {
      console.error('updateCustomIntervals:', error)
      toast.error(i18n.t('ctx.vehicleContext.periyotlar_guncellenemedi') + formatSupabaseError(error as Error))
    }
  }, [user, setCustomIntervals])

  const clearAllData = useCallback(async () => {
    if (!user) return

    try {
      // 🆕 Tüm fotoğrafları Storage'dan da sil
      const allVehiclePhotos = vehicles.flatMap(v => v.photos || [])
      const allMaintenancePhotos = maintenanceRecords
        .map(r => r.photo)
        .filter(p => p && !isBase64(p))

      if (allVehiclePhotos.length > 0) {
        deletePhotosBatch(allVehiclePhotos, BUCKETS.VEHICLE_PHOTOS).catch(err =>
          console.error('Araç fotoğraflarını silme hatası:', err)
        )
      }
      if (allMaintenancePhotos.length > 0) {
        deletePhotosBatch(allMaintenancePhotos, BUCKETS.MAINTENANCE_PHOTOS).catch(err =>
          console.error('Bakım fotoğraflarını silme hatası:', err)
        )
      }

      // CASCADE sayesinde diğer tablolardaki kayıtlar da silinir
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error

      setVehicles([])
      setMaintenanceRecords([])
      setFuelRecords([])
      setTireSets([])
      setTireChanges([])
      setCustomIntervals({})

      toast.success(i18n.t('ctx.vehicleContext.tum_veriler_silindi'))
    } catch (error) {
      console.error('clearAllData:', error)
      toast.error(i18n.t('ctx.vehicleContext.veriler_silinemedi') + formatSupabaseError(error as Error))
    }
  }, [user, vehicles, maintenanceRecords, setVehicles, setMaintenanceRecords, setFuelRecords, setTireSets, setTireChanges, setCustomIntervals])

  return { updateCustomIntervals, clearAllData }
}
