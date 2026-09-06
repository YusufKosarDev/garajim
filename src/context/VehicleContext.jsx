import { createContext, useContext, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
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
import { parseIntervalKey } from '../utils/maintenanceRecommendations'
import { fetchAllRows } from '../lib/fetchAllRows'
import { captureError } from '../lib/errorTracking'

const VehicleContext = createContext(null)

export const useVehicles = () => {
  const ctx = useContext(VehicleContext)
  if (!ctx) throw new Error('useVehicles must be used within VehicleProvider')
  return ctx
}

// Sorgu anahtarları — realtime ve mutasyonlar cache'e bunlarla yazıyor
export const vehicleQueryKeys = {
  all: (userId) => ['garaj', userId],
  list: (userId, name) => ['garaj', userId, name],
}

// Modül seviyesinde sabit boş referanslar (bkz. aşağıdaki `?? BOS_DIZI` kullanımı)
const BOS_DIZI = []
const BOS_NESNE = {}

// Liste tabloları: hepsi aynı şekilde çekiliyor, tek yerde tarif edildi
const LIST_QUERIES = [
  { name: 'vehicles', table: 'vehicles', orderBy: 'created_at', ascending: true, map: vehicleFromDb },
  { name: 'maintenanceRecords', table: 'maintenance_records', orderBy: 'date', ascending: false, map: maintenanceFromDb },
  { name: 'fuelRecords', table: 'fuel_records', orderBy: 'date', ascending: false, map: fuelFromDb },
  { name: 'tireSets', table: 'tire_sets', orderBy: 'created_at', ascending: false, map: tireSetFromDb },
  { name: 'tireChanges', table: 'tire_changes', orderBy: 'date', ascending: false, map: tireChangeFromDb },
]

export const VehicleProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id
  const enabled = Boolean(isAuthenticated && userId)

  // ============ OKUMA: TanStack Query ============
  // Elle yazılmış yükleme/cache mantığının yerini aldı. Retry, pencere odaklanınca
  // yeniden doğrulama ve tekrarlı isteklerin birleştirilmesi buradan geliyor.
  const results = useQueries({
    queries: [
      ...LIST_QUERIES.map(({ name, table, orderBy, ascending, map }) => ({
        queryKey: vehicleQueryKeys.list(userId, name),
        enabled,
        queryFn: async () => {
          const rows = await fetchAllRows(supabase, table, orderBy, ascending)
          return rows.map(map)
        },
      })),
      {
        queryKey: vehicleQueryKeys.list(userId, 'customIntervals'),
        enabled,
        queryFn: async () => {
          const { data, error } = await supabase.from('custom_intervals').select('*')
          if (error) throw error
          return customIntervalsFromDbRows(data)
        },
      },
    ],
  })

  const [vehiclesQ, maintenanceQ, fuelQ, tireSetsQ, tireChangesQ, intervalsQ] = results

  // Sabit boş referanslar: `?? []` her render'da yeni dizi üretir ve aşağıdaki
  // provider useMemo'sunu (madde 14) her render'da geçersiz kılardı.
  const vehicles = vehiclesQ.data ?? BOS_DIZI
  const maintenanceRecords = maintenanceQ.data ?? BOS_DIZI
  const fuelRecords = fuelQ.data ?? BOS_DIZI
  const tireSets = tireSetsQ.data ?? BOS_DIZI
  const tireChanges = tireChangesQ.data ?? BOS_DIZI
  const customIntervals = intervalsQ.data ?? BOS_NESNE

  // Oturum yoksa sorgular hiç çalışmaz (enabled: false) ve sonsuza kadar "pending"
  // kalırlar — bu durumu yüklenmiş saymalıyız, yoksa uygulama iskelet ekranda takılır.
  const isLoaded = !enabled || results.every(r => r.isSuccess || r.isError)

  // Yükleme hatasını kullanıcıya bir kez göster
  const loadError = results.find(r => r.isError)?.error
  const shownErrorRef = useRef(null)
  useEffect(() => {
    if (!loadError || shownErrorRef.current === loadError) return
    shownErrorRef.current = loadError
    captureError(loadError, { yer: 'VehicleContext ilk yükleme' })
    toast.error('Veriler yüklenemedi: ' + formatSupabaseError(loadError))
  }, [loadError])

  // ============ YAZMA: cache'e yazan setter shim'leri ============
  // İmzaları useState setter'larıyla birebir aynı, böylece aşağıdaki tüm CRUD
  // mantığı (fotoğraf yükleme/silme, echo engelleme, toast'lar) değişmeden kaldı.
  const writeCache = useCallback((name, updater) => {
    queryClient.setQueryData(vehicleQueryKeys.list(userId, name), (prev) => {
      const base = prev ?? (name === 'customIntervals' ? {} : [])
      return typeof updater === 'function' ? updater(base) : updater
    })
  }, [queryClient, userId])

  const setVehicles = useCallback((u) => writeCache('vehicles', u), [writeCache])
  const setMaintenanceRecords = useCallback((u) => writeCache('maintenanceRecords', u), [writeCache])
  const setFuelRecords = useCallback((u) => writeCache('fuelRecords', u), [writeCache])
  const setTireSets = useCallback((u) => writeCache('tireSets', u), [writeCache])
  const setTireChanges = useCallback((u) => writeCache('tireChanges', u), [writeCache])
  const setCustomIntervals = useCallback((u) => writeCache('customIntervals', u), [writeCache])

  // ============ REAL-TIME SUBSCRIPTIONS ============
  // Garajdaki herhangi bir değişiklik (kendi başka cihazın veya garajı
  // paylaştığın bir üye) otomatik senkronize edilir.
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

    let channel = null
    let cancelled = false

    const subscribe = async () => {
      // Veriler garaj bazlıdır (tüm tablolarda garage_id var) ve bir garajı
      // birden fazla kullanıcı paylaşabilir. user_id ile filtrelemek, garajı
      // paylaştığın kişinin satırlarını — onların user_id'si farklı olduğu için —
      // dışarıda bırakıyor ve "çoklu kullanıcı senkronu" hiç çalışmıyordu.
      const { data, error } = await supabase
        .from('garage_members')
        .select('garage_id')
        .eq('user_id', user.id)

      if (cancelled) return

      const garageIds = (data || []).map(r => r.garage_id).filter(Boolean)

      // Üyelik okunamazsa eski davranışa düş: hiç dinlememektense
      // en azından kendi değişikliklerini dinlemeye devam et.
      const filter = garageIds.length > 0
        ? `garage_id=in.(${garageIds.join(',')})`
        : `user_id=eq.${user.id}`

      if (error || garageIds.length === 0) {
        console.warn('Real-time: garaj üyeliği alınamadı, user_id filtresine düşülüyor', error)
      }

      const table = (name, setState, mapper) => ({
        config: { event: '*', schema: 'public', table: name, filter },
        handler: handleChange(setState, mapper),
      })

      const tables = [
        table('vehicles', setVehicles, vehicleFromDb),
        table('maintenance_records', setMaintenanceRecords, maintenanceFromDb),
        table('fuel_records', setFuelRecords, fuelFromDb),
        table('tire_sets', setTireSets, tireSetFromDb),
        table('tire_changes', setTireChanges, tireChangeFromDb),
      ]

      // Tüm tablolar için tek bir channel (Supabase önerisi - performans)
      channel = tables
        .reduce(
          (ch, t) => ch.on('postgres_changes', t.config, t.handler),
          supabase.channel(`user-${user.id}-changes`)
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('🔴 Real-time aktif: Garajdaki tüm değişiklikler dinleniyor')
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Real-time bağlantı hatası')
          }
        })
    }

    subscribe()

    // Cleanup: component unmount veya user değişince subscription'ı kapat
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [isAuthenticated, user, setVehicles, setMaintenanceRecords, setFuelRecords, setTireSets, setTireChanges])

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
  }, [user, setVehicles])

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
  }, [user, vehicles, setVehicles])

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
  }, [user, vehicles, maintenanceRecords, setVehicles, setMaintenanceRecords, setFuelRecords, setTireSets, setTireChanges, setCustomIntervals])

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
  }, [user, setMaintenanceRecords])

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
  }, [user, maintenanceRecords, setMaintenanceRecords])

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
  }, [user, maintenanceRecords, setMaintenanceRecords])

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
  }, [user, setFuelRecords])

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
  }, [user, setFuelRecords])

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
  }, [user, setFuelRecords])

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
  }, [user, setTireSets])

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
  }, [user, setTireSets])

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
  }, [user, setTireSets])

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
  }, [user, setTireChanges])

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
  }, [user, setTireChanges])

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
  }, [user, setTireChanges])

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
        const parsed = parseIntervalKey(key)
        if (!parsed) return
        const { vehicleId, maintenanceType } = parsed
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

      toast.success('Tüm veriler silindi')
    } catch (error) {
      console.error('clearAllData:', error)
      toast.error('Veriler silinemedi: ' + formatSupabaseError(error))
    }
  }, [user, vehicles, maintenanceRecords, setVehicles, setMaintenanceRecords, setFuelRecords, setTireSets, setTireChanges, setCustomIntervals])

  // Çıplak nesne literali her render'da yeni referans üretiyordu ve context'i
  // tüketen HER bileşen yeniden render oluyordu — lastik verisi değişince
  // onu hiç kullanmayan Dashboard bile.
  const value = useMemo(() => ({
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
    clearAllData,
  }), [
    vehicles, maintenanceRecords, fuelRecords, tireSets, tireChanges,
    customIntervals, isLoaded,
    addVehicle, updateVehicle, deleteVehicle,
    addMaintenance, updateMaintenance, deleteMaintenance,
    addFuel, updateFuel, deleteFuel,
    addTireSet, updateTireSet, deleteTireSet,
    addTireChange, updateTireChange, deleteTireChange,
    updateCustomIntervals, clearAllData,
  ])

  return (
    <VehicleContext.Provider value={value}>
      {children}
    </VehicleContext.Provider>
  )
}