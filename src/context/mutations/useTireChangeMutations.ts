/**
 * Mevsimlik lastik değişimi kaydı CRUD.
 *
 * Sağlayıcıdan çıkarıldı (bkz. shared.ts) — davranış birebir aynı.
 */
import { useCallback } from 'react'
import i18n from '../../i18n'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { tireChangeToDb, tireChangeFromDb, formatSupabaseError } from '../../lib/supabaseMappers'
import type { TireChange } from '../../types'
import type { MutationDeps } from './shared'
export function useTireChangeMutations({
  user, garageId, setTireChanges,
}: Pick<MutationDeps, 'user' | 'garageId' | 'setTireChanges'>) {
  const addTireChange = useCallback(async (change: Partial<TireChange>) => {
    if (!user) return null

    try {
      const dbRow = tireChangeToDb(change, user.id, garageId)
      const { data, error } = await supabase
        .from('tire_changes')
        .insert([dbRow])
        .select()
        .single()

      if (error) throw error

      const newChange = tireChangeFromDb(data)
      if (!newChange) throw new Error(i18n.t('ctx.vehicleContext.lastik_degisimi_okunamadi'))
      setTireChanges(prev => {
        if (prev.some(set => set.id === newChange.id)) return prev
        return [...prev, newChange]
      })
      toast.success(i18n.t('ctx.vehicleContext.lastik_degisimi_kaydedildi'))
      return newChange
    } catch (error) {
      console.error('addTireChange:', error)
      toast.error(i18n.t('ctx.vehicleContext.lastik_degisimi_eklenemedi') + formatSupabaseError(error as Error))
      return null
    }
  }, [user, setTireChanges, garageId])

  const updateTireChange = useCallback(async (id: string, updates: Partial<TireChange>) => {
    if (!user) return

    try {
      const dbRow = tireChangeToDb(updates, user.id)
      delete (dbRow as { user_id?: string }).user_id

      const { data, error } = await supabase
        .from('tire_changes')
        .update(dbRow)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const updated = tireChangeFromDb(data)
      if (!updated) throw new Error(i18n.t('ctx.vehicleContext.lastik_degisimi_okunamadi'))
      setTireChanges(prev => prev.map(set => (set.id === id ? updated : set)))
      toast.success(i18n.t('ctx.vehicleContext.lastik_degisimi_guncellendi'))
    } catch (error) {
      console.error('updateTireChange:', error)
      toast.error(i18n.t('ctx.vehicleContext.lastik_degisimi_guncellenemedi') + formatSupabaseError(error as Error))
    }
  }, [user, setTireChanges])

  const deleteTireChange = useCallback(async (id: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('tire_changes')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTireChanges(prev => prev.filter(set => set.id !== id))
      toast.success(i18n.t('ctx.vehicleContext.lastik_degisim_kaydi_silindi'))
    } catch (error) {
      console.error('deleteTireChange:', error)
      toast.error(i18n.t('ctx.vehicleContext.lastik_degisimi_silinemedi') + formatSupabaseError(error as Error))
    }
  }, [user, setTireChanges])

  return { addTireChange, updateTireChange, deleteTireChange }
}
