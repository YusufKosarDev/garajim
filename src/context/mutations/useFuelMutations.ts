/**
 * Yakıt kaydı CRUD.
 *
 * Sağlayıcıdan çıkarıldı (bkz. shared.ts) — davranış birebir aynı.
 */
import { useCallback } from 'react'
import i18n from '../../i18n'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { fuelToDb, fuelFromDb, formatSupabaseError } from '../../lib/supabaseMappers'
import type { FuelRecord } from '../../types'
import type { MutationDeps } from './shared'
export function useFuelMutations({
  user, setFuelRecords,
}: Pick<MutationDeps, 'user' | 'setFuelRecords'>) {
  const addFuel = useCallback(async (record: Partial<FuelRecord>) => {
    if (!user) return null

    try {
      const dbRow = fuelToDb(record, user.id)
      const { data, error } = await supabase
        .from('fuel_records')
        .insert([dbRow])
        .select()
        .single()

      if (error) throw error

      const newRecord = fuelFromDb(data)
      if (!newRecord) throw new Error(i18n.t('ctx.vehicleContext.yakit_kaydi_okunamadi'))
      setFuelRecords(prev => {
        if (prev.some(r => r.id === newRecord.id)) return prev
        return [...prev, newRecord]
      })
      toast.success(i18n.t('ctx.vehicleContext.yakit_kaydi_eklendi'))
      return newRecord
    } catch (error) {
      console.error('addFuel:', error)
      toast.error(i18n.t('ctx.vehicleContext.yakit_eklenemedi') + formatSupabaseError(error as Error))
      return null
    }
  }, [user, setFuelRecords])

  const updateFuel = useCallback(async (id: string, updates: Partial<FuelRecord>) => {
    if (!user) return

    try {
      const dbRow = fuelToDb(updates, user.id)
      delete (dbRow as { user_id?: string }).user_id

      const { data, error } = await supabase
        .from('fuel_records')
        .update(dbRow)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const updated = fuelFromDb(data)
      if (!updated) throw new Error(i18n.t('ctx.vehicleContext.yakit_kaydi_okunamadi'))
      setFuelRecords(prev => prev.map(r => (r.id === id ? updated : r)))
      toast.success(i18n.t('ctx.vehicleContext.yakit_kaydi_guncellendi'))
    } catch (error) {
      console.error('updateFuel:', error)
      toast.error(i18n.t('ctx.vehicleContext.yakit_guncellenemedi') + formatSupabaseError(error as Error))
    }
  }, [user, setFuelRecords])

  const deleteFuel = useCallback(async (id: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('fuel_records')
        .delete()
        .eq('id', id)

      if (error) throw error

      setFuelRecords(prev => prev.filter(r => r.id !== id))
      toast.success(i18n.t('ctx.vehicleContext.yakit_kaydi_silindi'))
    } catch (error) {
      console.error('deleteFuel:', error)
      toast.error(i18n.t('ctx.vehicleContext.yakit_silinemedi') + formatSupabaseError(error as Error))
    }
  }, [user, setFuelRecords])

  return { addFuel, updateFuel, deleteFuel }
}
