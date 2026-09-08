import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import i18n from '../i18n'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from './auth-context'
import { VehicleContext, vehicleQueryKeys } from './vehicle-context'
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
import { cevrimdisiMi, agHatasiMi } from '../lib/offlineQueue'
import { vehicleQueue as kuyruk } from '../lib/vehicleQueue'
import { createDispatcher, REFERANS_ALANLARI } from '../lib/offlineDispatcher'
import type { ReactNode } from 'react'
import type {
  Vehicle, MaintenanceRecord, FuelRecord, TireSet, TireChange,
  CustomIntervals, CustomInterval, CustomIntervalRow,
} from '../types'

type Kayit = Vehicle | MaintenanceRecord | FuelRecord | TireSet | TireChange

/** useState setter'larıyla aynı imza: doğrudan değer ya da önceki değeri alan fonksiyon */
type Guncelleyici<T> = T | ((prev: T) => T)

// Modül seviyesinde sabit boş referanslar (bkz. aşağıdaki `?? BOS_DIZI` kullanımı)
const BOS_DIZI: never[] = []
const BOS_NESNE: CustomIntervals = {}

// Liste tabloları: hepsi aynı şekilde çekiliyor, tek yerde tarif edildi
const LIST_QUERIES = [
  { name: 'vehicles', table: 'vehicles', orderBy: 'created_at', ascending: true, map: vehicleFromDb },
  { name: 'maintenanceRecords', table: 'maintenance_records', orderBy: 'date', ascending: false, map: maintenanceFromDb },
  { name: 'fuelRecords', table: 'fuel_records', orderBy: 'date', ascending: false, map: fuelFromDb },
  { name: 'tireSets', table: 'tire_sets', orderBy: 'created_at', ascending: false, map: tireSetFromDb },
  { name: 'tireChanges', table: 'tire_changes', orderBy: 'date', ascending: false, map: tireChangeFromDb },
]

export const VehicleProvider = ({ children }: { children: ReactNode }) => {
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
          // Tablo -> mapper eşlemesi LIST_QUERIES'de kurulu; burada tekil tip bilinmiyor
          return rows.map(satir => (map as (r: unknown) => Kayit | null)(satir))
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
  // useQueries dizi üzerinden map edildiği için tekil sorgu tipleri kayboluyor;
  // dönüşümü LIST_QUERIES'teki mapper garanti ediyor.
  const vehicles = (vehiclesQ.data ?? BOS_DIZI) as Vehicle[]
  const maintenanceRecords = (maintenanceQ.data ?? BOS_DIZI) as MaintenanceRecord[]
  const fuelRecords = (fuelQ.data ?? BOS_DIZI) as FuelRecord[]
  const tireSets = (tireSetsQ.data ?? BOS_DIZI) as TireSet[]
  const tireChanges = (tireChangesQ.data ?? BOS_DIZI) as TireChange[]
  const customIntervals = (intervalsQ.data ?? BOS_NESNE) as CustomIntervals

  // Oturum yoksa sorgular hiç çalışmaz (enabled: false) ve sonsuza kadar "pending"
  // kalırlar — bu durumu yüklenmiş saymalıyız, yoksa uygulama iskelet ekranda takılır.
  const isLoaded = !enabled || results.every(r => r.isSuccess || r.isError)

  // Yükleme hatasını kullanıcıya bir kez göster
  const loadError = results.find(r => r.isError)?.error
  const shownErrorRef = useRef<unknown>(null)
  useEffect(() => {
    if (!loadError || shownErrorRef.current === loadError) return
    shownErrorRef.current = loadError
    captureError(loadError, { yer: i18n.t('ctx.vehicleContext.vehiclecontext_ilk_yukleme') })
    toast.error(i18n.t('ctx.vehicleContext.veriler_yuklenemedi') + formatSupabaseError(loadError))
  }, [loadError])

  // ============ YAZMA: cache'e yazan setter shim'leri ============
  // İmzaları useState setter'larıyla birebir aynı, böylece aşağıdaki tüm CRUD
  // mantığı (fotoğraf yükleme/silme, echo engelleme, toast'lar) değişmeden kaldı.
  const writeCache = useCallback((name: string, updater: unknown) => {
    queryClient.setQueryData(vehicleQueryKeys.list(userId, name), (prev) => {
      const base = prev ?? (name === 'customIntervals' ? {} : [])
      return typeof updater === 'function' ? updater(base) : updater
    })
  }, [queryClient, userId])

  // ============ ÇEVRİMDIŞI KUYRUK ============
  const [bekleyenSayisi, setBekleyenSayisi] = useState(0)

  const sayiyiTazele = useCallback(async () => {
    setBekleyenSayisi(await kuyruk.uzunluk())
  }, [])

  /**
   * Mutasyonu çalıştırır; ağ yoksa kuyruğa alır.
   * Kuyruğa alınırsa `null` döner ve çağıran iyimser güncellemeyi yapar.
   */
  const kuyruklaCalistir = useCallback(async <T,>(
    tanim: {
      tablo: string
      islem: 'insert' | 'update' | 'delete'
      payload?: Record<string, unknown>
      hedefId?: string
      geciciId?: string
    },
    calistir: () => Promise<T>
  ): Promise<{ kuyrukta: true } | { kuyrukta: false; sonuc: T }> => {
    const kuyrugaAl = async () => {
      await kuyruk.kuyrugaAl({
        ...tanim,
        referansAlanlari: REFERANS_ALANLARI[tanim.tablo] ?? [],
      })
      await sayiyiTazele()
      toast(i18n.t('ctx.vehicleContext.cevrimdisisin_kayit_siraya_alindi_baglanti_gelin'), { icon: '📴' })
      return { kuyrukta: true } as const
    }

    if (cevrimdisiMi()) return kuyrugaAl()

    try {
      return { kuyrukta: false, sonuc: await calistir() }
    } catch (error) {
      // Yalnızca AĞ hatasında kuyruğa al — doğrulama/RLS hatası tekrar denenirse
      // yine başarısız olur, kullanıcıya gösterilmeli.
      if (agHatasiMi(error)) return kuyrugaAl()
      throw error
    }
  }, [sayiyiTazele])

  // Bağlantı gelince kuyruğu boşalt
  useEffect(() => {
    if (!userId) return

    const gonder = async () => {
      if (cevrimdisiMi()) return
      if ((await kuyruk.uzunluk()) === 0) return

      const sonuc = await kuyruk.replay(createDispatcher(userId))
      await sayiyiTazele()

      if (sonuc.gonderilen > 0) {
        toast.success(`${sonuc.gonderilen} bekleyen kayıt gönderildi ✓`)
        // Gerçek satırları almak için sorguları tazele
        queryClient.invalidateQueries({ queryKey: vehicleQueryKeys.all(userId) })
      }
      if (sonuc.kalan > 0) {
        console.warn('Kuyruk boşaltılamadı, kalan:', sonuc.kalan, sonuc.hata)
      }
    }

    void gonder()
    window.addEventListener('online', gonder)
    return () => window.removeEventListener('online', gonder)
  }, [userId, queryClient, sayiyiTazele])

  const setVehicles = useCallback((u: Guncelleyici<Vehicle[]>) => writeCache('vehicles', u), [writeCache])
  const setMaintenanceRecordsErken = useCallback(
    (u: Guncelleyici<MaintenanceRecord[]>) => writeCache('maintenanceRecords', u),
    [writeCache]
  )

  /**
   * Bakım kaydını kuyruğa alıp listeye iyimser olarak ekler.
   * Geçici id verilir; bağlantı gelince gerçek id ile değiştirilir
   * (sorgular invalidate edilerek).
   */
  const kuyrugaAlVeIyimserEkle = useCallback(async (record: Partial<MaintenanceRecord>) => {
    const geciciId = `gecici-${crypto.randomUUID()}`
    await kuyruklaCalistir(
      {
        tablo: 'maintenance_records',
        islem: 'insert',
        payload: record as Record<string, unknown>,
        geciciId,
      },
      async () => null
    )
    const iyimser = { ...record, id: geciciId, cost: record.cost ?? 0 } as MaintenanceRecord
    setMaintenanceRecordsErken(prev => [...prev, iyimser])
    return iyimser
  }, [kuyruklaCalistir, setMaintenanceRecordsErken])
  const setMaintenanceRecords = useCallback((u: Guncelleyici<MaintenanceRecord[]>) => writeCache('maintenanceRecords', u), [writeCache])
  const setFuelRecords = useCallback((u: Guncelleyici<FuelRecord[]>) => writeCache('fuelRecords', u), [writeCache])
  const setTireSets = useCallback((u: Guncelleyici<TireSet[]>) => writeCache('tireSets', u), [writeCache])
  const setTireChanges = useCallback((u: Guncelleyici<TireChange[]>) => writeCache('tireChanges', u), [writeCache])
  const setCustomIntervals = useCallback((u: Guncelleyici<CustomIntervals>) => writeCache('customIntervals', u), [writeCache])

  // ============ REAL-TIME SUBSCRIPTIONS ============
  // Garajdaki herhangi bir değişiklik (kendi başka cihazın veya garajı
  // paylaştığın bir üye) otomatik senkronize edilir.
  useEffect(() => {
    if (!isAuthenticated || !user) return

    // Generic helper: state'i INSERT/UPDATE/DELETE event'ine göre güncelle
    const handleChange = <T extends { id: string }>(
      setState: (u: Guncelleyici<T[]>) => void,
      fromDbMapper: (row: never) => T | null
    ) => (payload: { eventType: string; new?: unknown; old?: { id?: string } }) => {
      const { eventType, new: newRow, old: oldRow } = payload

      if (eventType === 'INSERT') {
        const item = fromDbMapper(newRow as never)
        if (!item) return
        setState(prev => {
          // Echo prevention: Eğer bu ID zaten state'deyse (kendi eklediğimiz),
          // tekrar ekleme. Sadece başka cihazdan gelen yenileri ekle.
          if (prev.some(x => x.id === item.id)) return prev
          return [...prev, item]
        })
      } else if (eventType === 'UPDATE') {
        const item = fromDbMapper(newRow as never)
        if (!item) return
        setState(prev => prev.map(x => (x.id === item.id ? item : x)))
      } else if (eventType === 'DELETE') {
        const silinenId = oldRow?.id
        if (!silinenId) return
        setState(prev => prev.filter(x => x.id !== silinenId))
      }
    }

    let channel: ReturnType<typeof supabase.channel> | null = null
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

      const table = <T extends { id: string }>(
        name: string,
        setState: (u: Guncelleyici<T[]>) => void,
        mapper: (row: never) => T | null
      ) => ({
        config: { event: '*' as const, schema: 'public', table: name, filter },
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
          (ch, abone) => ch.on('postgres_changes', abone.config, abone.handler),
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

  // ============ BAKIM CRUD ============
  const addMaintenance = useCallback(async (record: Partial<MaintenanceRecord>) => {
    if (!user) return null

    // Çevrimdışıysa kuyruğa al ve iyimser olarak listeye ekle.
    // Bu tam da servisteyken/yolda kayıt girilen senaryo — en çok burada gerekli.
    if (cevrimdisiMi()) {
      return kuyrugaAlVeIyimserEkle(record)
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
      if (agHatasiMi(error)) {
        return kuyrugaAlVeIyimserEkle(record)
      }
      console.error('addMaintenance:', error)
      toast.error(i18n.t('ctx.vehicleContext.bakim_eklenemedi') + formatSupabaseError(error as Error))
      return null
    }
  }, [user, setMaintenanceRecords, kuyrugaAlVeIyimserEkle])

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

  // ============ YAKIT CRUD ============
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

  // ============ LASTİK SETİ CRUD ============
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

  // ============ LASTİK DEĞİŞİMİ CRUD ============
  const addTireChange = useCallback(async (change: Partial<TireChange>) => {
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
  }, [user, setTireChanges])

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

  // ============ CUSTOM INTERVALS ============
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
        const ham = intervals[key]
        const interval: CustomInterval | null =
          typeof ham === 'number' ? { kilometers: ham, months: null } : (ham ?? null)

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
    bekleyenSayisi,
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
    customIntervals, isLoaded, bekleyenSayisi,
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