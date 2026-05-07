import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import {
  vehicleFromDb,
  vehicleToDb,
  maintenanceFromDb,
  maintenanceToDb,
  fuelFromDb,
  fuelToDb,
  tireSetFromDb,
  tireSetToDb,
  tireChangeFromDb,
  tireChangeToDb,
  customIntervalToDb,
  customIntervalsFromDbRows,
  formatSupabaseError,
} from '../lib/supabaseMappers'
import {
  uploadPhotoFromBase64,
  uploadPhotosBatch,
  deletePhotosBatch,
  deletePhotoByUrl,
  isBase64,
  BUCKETS,
} from '../lib/storageHelpers'

const VehicleContext = createContext(null)

export const useVehicles = () => {
  const ctx = useContext(VehicleContext)
  if (!ctx) throw new Error('useVehicles must be used within VehicleProvider')
  return ctx
}

export const VehicleProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth()

  const [vehicles, setVehicles] = useState([])
  const [maintenanceRecords, setMaintenanceRecords] = useState([])
  const [fuelRecords, setFuelRecords] = useState([])
  const [tireSets, setTireSets] = useState([])
  const [tireChanges, setTireChanges] = useState([])
  const [customIntervals, setCustomIntervals] = useState({})
  const [isLoaded, setIsLoaded] = useState(false)

  // ============ INITIAL LOAD (Auth değişince) ============
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setVehicles([])
      setMaintenanceRecords([])
      setFuelRecords([])
      setTireSets([])
      setTireChanges([])
      setCustomIntervals({})
      setIsLoaded(true)
      return
    }

    const loadAllData = async () => {
      setIsLoaded(false)
      try {
        const [
          vehiclesRes,
          maintenanceRes,
          fuelRes,
          tireSetsRes,
          tireChangesRes,
          customIntervalsRes,
        ] = await Promise.all([
          supabase.from('vehicles').select('*').order('created_at', { ascending: true }),
          supabase.from('maintenance_records').select('*').order('date', { ascending: false }),
          supabase.from('fuel_records').select('*').order('date', { ascending: false }),
          supabase.from('tire_sets').select('*').order('created_at', { ascending: false }),
          supabase.from('tire_changes').select('*').order('date', { ascending: false }),
          supabase.from('custom_intervals').select('*'),
        ])

        if (vehiclesRes.error) throw vehiclesRes.error
        if (maintenanceRes.error) throw maintenanceRes.error
        if (fuelRes.error) throw fuelRes.error
        if (tireSetsRes.error) throw tireSetsRes.error
        if (tireChangesRes.error) throw tireChangesRes.error
        if (customIntervalsRes.error) throw customIntervalsRes.error

        setVehicles((vehiclesRes.data || []).map(vehicleFromDb))
        setMaintenanceRecords((maintenanceRes.data || []).map(maintenanceFromDb))
        setFuelRecords((fuelRes.data || []).map(fuelFromDb))
        setTireSets((tireSetsRes.data || []).map(tireSetFromDb))
        setTireChanges((tireChangesRes.data || []).map(tireChangeFromDb))
        setCustomIntervals(customIntervalsFromDbRows(customIntervalsRes.data))
      } catch (error) {
        console.error('Veri yükleme hatası:', error)
        toast.error('Veriler yüklenemedi: ' + formatSupabaseError(error))
      } finally {
        setIsLoaded(true)
      }
    }

    loadAllData()
  }, [isAuthenticated, user])

  // ============ REAL-TIME SUBSCRIPTIONS ============
  // Aynı kullanıcı başka cihazdan değişiklik yaparsa otomatik senkronize et
  useEffect(() => {
    if (!isAuthenticated || !user) return

    // Generic helper: state'i INSERT/UPDATE/DELETE event'ine göre güncelle
    const handleChange = (setState, fromDbMapper) => (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload

      if (eventType === 'INSERT') {
        const item = fromDbMapper(newRow)
        setState(prev => {
          // Echo prevention: Eğer bu ID zaten state'deyse (kendi eklediğimiz),
          // tekrar ekleme. Sadece başka cihazdan gelen yenileri ekle.
          if (prev.some(x => x.id === item.id)) return prev
          return [...prev, item]
        })
      } else if (eventType === 'UPDATE') {
        const item = fromDbMapper(newRow)
        setState(prev => prev.map(x => (x.id === item.id ? item : x)))
      } else if (eventType === 'DELETE') {
        setState(prev => prev.filter(x => x.id !== oldRow.id))
      }
    }

    // Tüm tablolar için tek bir channel (Supabase önerisi - performans)
    const channel = supabase
      .channel(`user-${user.id}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles', filter: `user_id=eq.${user.id}` },
        handleChange(setVehicles, vehicleFromDb)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_records', filter: `user_id=eq.${user.id}` },
        handleChange(setMaintenanceRecords, maintenanceFromDb)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fuel_records', filter: `user_id=eq.${user.id}` },
        handleChange(setFuelRecords, fuelFromDb)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tire_sets', filter: `user_id=eq.${user.id}` },
        handleChange(setTireSets, tireSetFromDb)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tire_changes', filter: `user_id=eq.${user.id}` },
        handleChange(setTireChanges, tireChangeFromDb)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🔴 Real-time aktif: Tüm cihazlardan değişiklikler dinleniyor')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time bağlantı hatası')
        }
      })

    // Cleanup: component unmount veya user değişince subscription'ı kapat
    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAuthenticated, user])

  // ============ ARAÇ CRUD ============
  const addVehicle = useCallback(async (vehicle) => {
    if (!user) {
      toast.error('Giriş yapmalısın')
      return null
    }

    try {
      // 🆕 Base64 fotoğrafları Storage'a yükle, URL'leri al
      let uploadedPhotos = vehicle.photos || []
      if (uploadedPhotos.length > 0) {
        const hasBase64 = uploadedPhotos.some(isBase64)
        if (hasBase64) {
          const uploadingToast = toast.loading('Fotoğraflar yükleniyor...')
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
      setVehicles(prev => {
        // Real-time event önce gelmiş olabilir, ikinci kez ekleme
        if (prev.some(v => v.id === newVehicle.id)) return prev
        return [...prev, newVehicle]
      })
      toast.success('Araç eklendi ✓')
      return newVehicle
    } catch (error) {
      console.error('addVehicle:', error)
      toast.error('Araç eklenemedi: ' + formatSupabaseError(error))
      return null
    }
  }, [user])

  const updateVehicle = useCallback(async (id, updates) => {
    if (!user) return

    try {
      // 🆕 Yeni base64 fotoğrafları Storage'a yükle (varsa)
      let uploadedPhotos = updates.photos
      if (uploadedPhotos && uploadedPhotos.length > 0) {
        const hasBase64 = uploadedPhotos.some(isBase64)
        if (hasBase64) {
          const uploadingToast = toast.loading('Fotoğraflar yükleniyor...')
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
      delete dbRow.user_id

      const { data, error } = await supabase
        .from('vehicles')
        .update(dbRow)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const updated = vehicleFromDb(data)
      setVehicles(prev => prev.map(v => (v.id === id ? updated : v)))
      toast.success('Araç güncellendi ✓')
    } catch (error) {
      console.error('updateVehicle:', error)
      toast.error('Araç güncellenemedi: ' + formatSupabaseError(error))
    }
  }, [user, vehicles])

  const deleteVehicle = useCallback(async (id) => {
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
      setTireSets(prev => prev.filter(t => t.vehicleId !== id))
      setTireChanges(prev => prev.filter(t => t.vehicleId !== id))

      setCustomIntervals(prev => {
        const filtered = {}
        Object.keys(prev).forEach(key => {
          if (!key.startsWith(`${id}-`)) {
            filtered[key] = prev[key]
          }
        })
        return filtered
      })

      toast.success('Araç ve tüm kayıtları silindi')
    } catch (error) {
      console.error('deleteVehicle:', error)
      toast.error('Araç silinemedi: ' + formatSupabaseError(error))
    }
  }, [user, vehicles, maintenanceRecords])

  // ============ BAKIM CRUD ============
  const addMaintenance = useCallback(async (record) => {
    if (!user) return null

    try {
      // 🆕 Bakım fotoğrafını Storage'a yükle (varsa)
      let uploadedPhoto = record.photo
      if (uploadedPhoto && isBase64(uploadedPhoto)) {
        const uploadingToast = toast.loading('Fotoğraf yükleniyor...')
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
      setMaintenanceRecords(prev => {
        if (prev.some(r => r.id === newRecord.id)) return prev
        return [...prev, newRecord]
      })
      toast.success('Bakım kaydı eklendi ✓')
      return newRecord
    } catch (error) {
      console.error('addMaintenance:', error)
      toast.error('Bakım eklenemedi: ' + formatSupabaseError(error))
      return null
    }
  }, [user])

  const updateMaintenance = useCallback(async (id, updates) => {
    if (!user) return

    try {
      // 🆕 Yeni base64 fotoğraf varsa yükle
      let uploadedPhoto = updates.photo
      if (uploadedPhoto && isBase64(uploadedPhoto)) {
        const uploadingToast = toast.loading('Fotoğraf yükleniyor...')
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
      delete dbRow.user_id

      const { data, error } = await supabase
        .from('maintenance_records')
        .update(dbRow)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const updated = maintenanceFromDb(data)
      setMaintenanceRecords(prev => prev.map(r => (r.id === id ? updated : r)))
      toast.success('Bakım kaydı güncellendi ✓')
    } catch (error) {
      console.error('updateMaintenance:', error)
      toast.error('Bakım güncellenemedi: ' + formatSupabaseError(error))
    }
  }, [user, maintenanceRecords])

  const deleteMaintenance = useCallback(async (id) => {
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
      toast.success('Bakım kaydı silindi')
    } catch (error) {
      console.error('deleteMaintenance:', error)
      toast.error('Bakım silinemedi: ' + formatSupabaseError(error))
    }
  }, [user, maintenanceRecords])

  // ============ YAKIT CRUD ============
  const addFuel = useCallback(async (record) => {
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
      setFuelRecords(prev => {
        if (prev.some(r => r.id === newRecord.id)) return prev
        return [...prev, newRecord]
      })
      toast.success('Yakıt kaydı eklendi ✓')
      return newRecord
    } catch (error) {
      console.error('addFuel:', error)
      toast.error('Yakıt eklenemedi: ' + formatSupabaseError(error))
      return null
    }
  }, [user])

  const updateFuel = useCallback(async (id, updates) => {
    if (!user) return

    try {
      const dbRow = fuelToDb(updates, user.id)
      delete dbRow.user_id

      const { data, error } = await supabase
        .from('fuel_records')
        .update(dbRow)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const updated = fuelFromDb(data)
      setFuelRecords(prev => prev.map(r => (r.id === id ? updated : r)))
      toast.success('Yakıt kaydı güncellendi ✓')
    } catch (error) {
      console.error('updateFuel:', error)
      toast.error('Yakıt güncellenemedi: ' + formatSupabaseError(error))
    }
  }, [user])

  const deleteFuel = useCallback(async (id) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('fuel_records')
        .delete()
        .eq('id', id)

      if (error) throw error

      setFuelRecords(prev => prev.filter(r => r.id !== id))
      toast.success('Yakıt kaydı silindi')
    } catch (error) {
      console.error('deleteFuel:', error)
      toast.error('Yakıt silinemedi: ' + formatSupabaseError(error))
    }
  }, [user])

  // ============ LASTİK SETİ CRUD ============
  const addTireSet = useCallback(async (tireSet) => {
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
      setTireSets(prev => {
        if (prev.some(t => t.id === newSet.id)) return prev
        return [...prev, newSet]
      })
      toast.success(`${tireSet.season === 'winter' ? 'Kışlık' : 'Yazlık'} lastik seti eklendi ✓`)
      return newSet
    } catch (error) {
      console.error('addTireSet:', error)
      toast.error('Lastik seti eklenemedi: ' + formatSupabaseError(error))
      return null
    }
  }, [user])

  const updateTireSet = useCallback(async (id, updates) => {
    if (!user) return

    try {
      const dbRow = tireSetToDb(updates, user.id)
      delete dbRow.user_id

      const { data, error } = await supabase
        .from('tire_sets')
        .update(dbRow)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const updated = tireSetFromDb(data)
      setTireSets(prev => prev.map(t => (t.id === id ? updated : t)))
      toast.success('Lastik seti güncellendi ✓')
    } catch (error) {
      console.error('updateTireSet:', error)
      toast.error('Lastik seti güncellenemedi: ' + formatSupabaseError(error))
    }
  }, [user])

  const deleteTireSet = useCallback(async (id) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('tire_sets')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTireSets(prev => prev.filter(t => t.id !== id))
      toast.success('Lastik seti silindi')
    } catch (error) {
      console.error('deleteTireSet:', error)
      toast.error('Lastik seti silinemedi: ' + formatSupabaseError(error))
    }
  }, [user])

  // ============ LASTİK DEĞİŞİMİ CRUD ============
  const addTireChange = useCallback(async (change) => {
    if (!user) return null

    try {
      const dbRow = tireChangeToDb(change, user.id)
      const { data, error } = await supabase
        .from('tire_changes')
        .insert([dbRow])
        .select()
        .single()

      if (error) throw error

      const newChange = tireChangeFromDb(data)
      setTireChanges(prev => {
        if (prev.some(t => t.id === newChange.id)) return prev
        return [...prev, newChange]
      })
      toast.success('Lastik değişimi kaydedildi ✓')
      return newChange
    } catch (error) {
      console.error('addTireChange:', error)
      toast.error('Lastik değişimi eklenemedi: ' + formatSupabaseError(error))
      return null
    }
  }, [user])

  const updateTireChange = useCallback(async (id, updates) => {
    if (!user) return

    try {
      const dbRow = tireChangeToDb(updates, user.id)
      delete dbRow.user_id

      const { data, error } = await supabase
        .from('tire_changes')
        .update(dbRow)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const updated = tireChangeFromDb(data)
      setTireChanges(prev => prev.map(t => (t.id === id ? updated : t)))
      toast.success('Lastik değişimi güncellendi ✓')
    } catch (error) {
      console.error('updateTireChange:', error)
      toast.error('Lastik değişimi güncellenemedi: ' + formatSupabaseError(error))
    }
  }, [user])

  const deleteTireChange = useCallback(async (id) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('tire_changes')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTireChanges(prev => prev.filter(t => t.id !== id))
      toast.success('Lastik değişim kaydı silindi')
    } catch (error) {
      console.error('deleteTireChange:', error)
      toast.error('Lastik değişimi silinemedi: ' + formatSupabaseError(error))
    }
  }, [user])

  // ============ CUSTOM INTERVALS ============
  const updateCustomIntervals = useCallback(async (intervals) => {
    if (!user) return

    try {
      const { error: deleteError } = await supabase
        .from('custom_intervals')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      const rowsToInsert = []
      Object.keys(intervals).forEach(key => {
        const [vehicleId, ...typeParts] = key.split('-')
        const maintenanceType = typeParts.join('-')
        const interval = intervals[key]
        
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
      toast.success('Bakım periyotları güncellendi ✓')
    } catch (error) {
      console.error('updateCustomIntervals:', error)
      toast.error('Periyotlar güncellenemedi: ' + formatSupabaseError(error))
    }
  }, [user])

  // ============ IMPORT/EXPORT ============
  const importDataMerge = (importedVehicles, importedMaintenance, importedFuel = [], importedIntervals = {}, importedTireSets = [], importedTireChanges = []) => {
    toast('Import özelliği Faz 8\'de Supabase\'e bağlanacak. Şimdilik sadece geçici görsel gösterim.', { icon: 'ℹ️' })
    
    let addedVehicles = 0
    let skippedVehicles = 0
    let addedRecords = 0
    let skippedRecords = 0
    let addedFuel = 0
    let skippedFuel = 0
    let addedTireSets = 0
    let addedTireChanges = 0

    const existingVehicleIds = new Set(vehicles.map(v => v.id))
    const newVehicles = importedVehicles.filter(v => {
      if (existingVehicleIds.has(v.id)) {
        skippedVehicles++
        return false
      }
      addedVehicles++
      return true
    })

    const existingMaintenanceIds = new Set(maintenanceRecords.map(r => r.id))
    const newMaintenance = importedMaintenance.filter(r => {
      if (existingMaintenanceIds.has(r.id)) {
        skippedRecords++
        return false
      }
      addedRecords++
      return true
    })

    const existingFuelIds = new Set(fuelRecords.map(r => r.id))
    const newFuel = importedFuel.filter(r => {
      if (existingFuelIds.has(r.id)) {
        skippedFuel++
        return false
      }
      addedFuel++
      return true
    })

    const existingTireSetIds = new Set(tireSets.map(t => t.id))
    const newTireSets = importedTireSets.filter(t => {
      if (existingTireSetIds.has(t.id)) return false
      addedTireSets++
      return true
    })

    const existingTireChangeIds = new Set(tireChanges.map(t => t.id))
    const newTireChanges = importedTireChanges.filter(t => {
      if (existingTireChangeIds.has(t.id)) return false
      addedTireChanges++
      return true
    })

    setVehicles(prev => [...prev, ...newVehicles])
    setMaintenanceRecords(prev => [...prev, ...newMaintenance])
    setFuelRecords(prev => [...prev, ...newFuel])
    setTireSets(prev => [...prev, ...newTireSets])
    setTireChanges(prev => [...prev, ...newTireChanges])

    setCustomIntervals(prev => ({ ...prev, ...importedIntervals }))

    return {
      addedVehicles, skippedVehicles,
      addedRecords, skippedRecords,
      addedFuel, skippedFuel,
      addedTireSets, addedTireChanges,
    }
  }

  const importDataReplace = (importedVehicles, importedMaintenance, importedFuel = [], importedIntervals = {}, importedTireSets = [], importedTireChanges = []) => {
    toast('Import özelliği Faz 8\'de Supabase\'e bağlanacak. Şimdilik sadece geçici görsel gösterim.', { icon: 'ℹ️' })
    
    setVehicles(importedVehicles)
    setMaintenanceRecords(importedMaintenance)
    setFuelRecords(importedFuel)
    setTireSets(importedTireSets)
    setTireChanges(importedTireChanges)
    setCustomIntervals(importedIntervals)

    return {
      totalVehicles: importedVehicles.length,
      totalRecords: importedMaintenance.length,
      totalFuel: importedFuel.length,
      totalTireSets: importedTireSets.length,
      totalTireChanges: importedTireChanges.length,
    }
  }

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

      toast.success('Tüm veriler silindi')
    } catch (error) {
      console.error('clearAllData:', error)
      toast.error('Veriler silinemedi: ' + formatSupabaseError(error))
    }
  }, [user, vehicles, maintenanceRecords])

  return (
    <VehicleContext.Provider
      value={{
        vehicles,
        maintenanceRecords,
        fuelRecords,
        tireSets,
        tireChanges,
        customIntervals,
        isLoaded,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addMaintenance,
        updateMaintenance,
        deleteMaintenance,
        addFuel,
        updateFuel,
        deleteFuel,
        addTireSet,
        updateTireSet,
        deleteTireSet,
        addTireChange,
        updateTireChange,
        deleteTireChange,
        updateCustomIntervals,
        importDataMerge,
        importDataReplace,
        clearAllData,
      }}
    >
      {children}
    </VehicleContext.Provider>
  )
}