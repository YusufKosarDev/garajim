/**
 * Lastik seti CRUD.
 *
 * Sağlayıcıdan çıkarıldı (bkz. shared.ts) — davranış birebir aynı.
 */
import { useCallback } from 'react'
import i18n from '../../i18n'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { tireSetToDb, tireSetFromDb, formatSupabaseError } from '../../lib/supabaseMappers'
import type { TireSet } from '../../types'
import type { MutationDeps } from './shared'
export function useTireSetMutations({
  user, setTireSets,
}: Pick<MutationDeps, 'user' | 'setTireSets'>) {
  const addTireSet = useCallback(async (tireSet: Partial<TireSet>) => {
    if (!user) return null

    try {
      const dbRow = tireSetToDb(tireSet, user.id)
      const { data, error } = await supabase
        .from('tire_sets')
        .insert([dbRow])
        .select()
        .single()

      if (error) throw error

      const newSet = tireSetFromDb(data)
      if (!newSet) throw new Error(i18n.t('ctx.vehicleContext.lastik_seti_okunamadi'))
      setTireSets(prev => {
        if (prev.some(set => set.id === newSet.id)) return prev
        return [...prev, newSet]
      })
      toast.success(`${tireSet.season === 'winter' ? 'Kışlık' : 'Yazlık'} lastik seti eklendi ✓`)
      return newSet
    } catch (error) {
      console.error('addTireSet:', error)
      toast.error(i18n.t('ctx.vehicleContext.lastik_seti_eklenemedi') + formatSupabaseError(error as Error))
      return null
    }
  }, [user, setTireSets])

  const updateTireSet = useCallback(async (id: string, updates: Partial<TireSet>) => {
    if (!user) return

    try {
      const dbRow = tireSetToDb(updates, user.id)
      delete (dbRow as { user_id?: string }).user_id

      const { data, error } = await supabase
        .from('tire_sets')
        .update(dbRow)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const updated = tireSetFromDb(data)
      if (!updated) throw new Error(i18n.t('ctx.vehicleContext.lastik_seti_okunamadi'))
      setTireSets(prev => prev.map(set => (set.id === id ? updated : set)))
      toast.success(i18n.t('ctx.vehicleContext.lastik_seti_guncellendi'))
    } catch (error) {
      console.error('updateTireSet:', error)
      toast.error(i18n.t('ctx.vehicleContext.lastik_seti_guncellenemedi') + formatSupabaseError(error as Error))
    }
  }, [user, setTireSets])

  const deleteTireSet = useCallback(async (id: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('tire_sets')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTireSets(prev => prev.filter(set => set.id !== id))
      toast.success(i18n.t('ctx.vehicleContext.lastik_seti_silindi'))
    } catch (error) {
      console.error('deleteTireSet:', error)
      toast.error(i18n.t('ctx.vehicleContext.lastik_seti_silinemedi') + formatSupabaseError(error as Error))
    }
  }, [user, setTireSets])

  return { addTireSet, updateTireSet, deleteTireSet }
}
