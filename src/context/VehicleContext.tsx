import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import i18n from '../i18n'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from './auth-context'
import { VehicleContext, vehicleQueryKeys } from './vehicle-context'
import { useVehicleMutations } from './mutations/useVehicleMutations'
import { useMaintenanceMutations } from './mutations/useMaintenanceMutations'
import { useFuelMutations } from './mutations/useFuelMutations'
import { useTireSetMutations } from './mutations/useTireSetMutations'
import { useTireChangeMutations } from './mutations/useTireChangeMutations'
import { useGarageDataMutations } from './mutations/useGarageDataMutations'
// Sağlayıcıda yalnızca OKUMA katmanı kaldı; yazma tarafının mapper'ları ve
// Storage yardımcıları artık ilgili mutasyon hook'unda import ediliyor.
import {
  vehicleFromDb,
  maintenanceFromDb,
  fuelFromDb,
  tireSetFromDb,
  tireChangeFromDb,
  customIntervalsFromDbRows,
  formatSupabaseError,
} from '../lib/supabaseMappers'
import { fetchAllRows } from '../lib/fetchAllRows'
import { captureError } from '../lib/errorTracking'
import { isOffline, isNetworkError } from '../lib/offlineQueue'
import { vehicleQueue as queue } from '../lib/vehicleQueue'
import { createDispatcher, REFERENCE_FIELDS } from '../lib/offlineDispatcher'
import type { ReactNode } from 'react'
import type { Updater } from './mutations/shared'
import type {
  Vehicle, MaintenanceRecord, FuelRecord, TireSet, TireChange,
  CustomIntervals, CustomInterval, CustomIntervalRow,
} from '../types'

type GarageRecord = Vehicle | MaintenanceRecord | FuelRecord | TireSet | TireChange


// Modül seviyesinde sabit boş referanslar (bkz. aşağıdaki `?? BOS_DIZI` kullanımı)
const EMPTY_ARRAY: never[] = []
const EMPTY_OBJECT: CustomIntervals = {}

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
          return rows.map(row => (map as (r: unknown) => GarageRecord | null)(row))
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
  const vehicles = (vehiclesQ.data ?? EMPTY_ARRAY) as Vehicle[]
  const maintenanceRecords = (maintenanceQ.data ?? EMPTY_ARRAY) as MaintenanceRecord[]
  const fuelRecords = (fuelQ.data ?? EMPTY_ARRAY) as FuelRecord[]
  const tireSets = (tireSetsQ.data ?? EMPTY_ARRAY) as TireSet[]
  const tireChanges = (tireChangesQ.data ?? EMPTY_ARRAY) as TireChange[]
  const customIntervals = (intervalsQ.data ?? EMPTY_OBJECT) as CustomIntervals

  // Oturum yoksa sorgular hiç çalışmaz (enabled: false) ve sonsuza kadar "pending"
  // kalırlar — bu durumu yüklenmiş saymalıyız, yoksa uygulama iskelet ekranda takılır.
  const isLoaded = !enabled || results.every(r => r.isSuccess || r.isError)

  // Yükleme hatasını kullanıcıya bir kez göster
  const loadError = results.find(r => r.isError)?.error
  const shownErrorRef = useRef<unknown>(null)
  useEffect(() => {
    if (!loadError || shownErrorRef.current === loadError) return
    shownErrorRef.current = loadError
    // Sentry'ye ÇEVRİLMEMİŞ sabit bir etiket gidiyor: burada eskiden i18n.t()
    // vardı, yani aynı hata kullanıcının diline göre iki farklı metinle
    // raporlanıyordu. Telemetri arayüz dilinden bağımsız olmalı.
    captureError(loadError, { where: 'VehicleContext.initialLoad' })
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
  const [pendingCount, setPendingCount] = useState(0)

  const refreshPendingCount = useCallback(async () => {
    setPendingCount(await queue.length())
  }, [])

  /**
   * Mutasyonu çalıştırır; ağ yoksa kuyruğa alır.
   * Kuyruğa alınırsa `null` döner ve çağıran iyimser güncellemeyi yapar.
   */
  const runQueued = useCallback(async <T,>(
    mutation: {
      tablo: string
      operation: 'insert' | 'update' | 'delete'
      payload?: Record<string, unknown>
      targetId?: string
      tempId?: string
    },
    run: () => Promise<T>
  ): Promise<{ queued: true } | { queued: false; result: T }> => {
    const enqueue = async () => {
      await queue.enqueue({
        ...mutation,
        referenceFields: REFERENCE_FIELDS[mutation.tablo] ?? [],
      })
      await refreshPendingCount()
      toast(i18n.t('ctx.vehicleContext.cevrimdisisin_kayit_siraya_alindi_baglanti_gelin'), { icon: '📴' })
      return { queued: true } as const
    }

    if (isOffline()) return enqueue()

    try {
      return { queued: false, result: await run() }
    } catch (error) {
      // Yalnızca AĞ hatasında kuyruğa al — doğrulama/RLS hatası tekrar denenirse
      // yine başarısız olur, kullanıcıya gösterilmeli.
      if (isNetworkError(error)) return enqueue()
      throw error
    }
  }, [refreshPendingCount])

  // Bağlantı gelince kuyruğu boşalt
  useEffect(() => {
    if (!userId) return

    const flushQueue = async () => {
      if (isOffline()) return
      if ((await queue.length()) === 0) return

      const result = await queue.replay(createDispatcher(userId))
      await refreshPendingCount()

      if (result.sent > 0) {
        toast.success(i18n.t('ctx.vehicleContext.kuyruk_gonderildi', { count: result.sent }))
        // Gerçek satırları almak için sorguları tazele
        queryClient.invalidateQueries({ queryKey: vehicleQueryKeys.all(userId) })
      }
      if (result.remaining > 0) {
        console.warn('Kuyruk boşaltılamadı, kalan:', result.remaining, result.error)
      }
    }

    void flushQueue()
    window.addEventListener('online', flushQueue)
    return () => window.removeEventListener('online', flushQueue)
  }, [userId, queryClient, refreshPendingCount])

  const setVehicles = useCallback((u: Updater<Vehicle[]>) => writeCache('vehicles', u), [writeCache])
  const setMaintenanceRecordsEarly = useCallback(
    (u: Updater<MaintenanceRecord[]>) => writeCache('maintenanceRecords', u),
    [writeCache]
  )

  /**
   * Bakım kaydını kuyruğa alıp listeye iyimser olarak ekler.
   * Geçici id verilir; bağlantı gelince gerçek id ile değiştirilir
   * (sorgular invalidate edilerek).
   */
  const enqueueWithOptimisticInsert = useCallback(async (record: Partial<MaintenanceRecord>) => {
    const tempId = `gecici-${crypto.randomUUID()}`
    await runQueued(
      {
        tablo: 'maintenance_records',
        operation: 'insert',
        payload: record as Record<string, unknown>,
        tempId,
      },
      async () => null
    )
    const optimistic = { ...record, id: tempId, cost: record.cost ?? 0 } as MaintenanceRecord
    setMaintenanceRecordsEarly(prev => [...prev, optimistic])
    return optimistic
  }, [runQueued, setMaintenanceRecordsEarly])
  const setMaintenanceRecords = useCallback((u: Updater<MaintenanceRecord[]>) => writeCache('maintenanceRecords', u), [writeCache])
  const setFuelRecords = useCallback((u: Updater<FuelRecord[]>) => writeCache('fuelRecords', u), [writeCache])
  const setTireSets = useCallback((u: Updater<TireSet[]>) => writeCache('tireSets', u), [writeCache])
  const setTireChanges = useCallback((u: Updater<TireChange[]>) => writeCache('tireChanges', u), [writeCache])
  const setCustomIntervals = useCallback((u: Updater<CustomIntervals>) => writeCache('customIntervals', u), [writeCache])

  // ============ REAL-TIME SUBSCRIPTIONS ============
  // Garajdaki herhangi bir değişiklik (kendi başka cihazın veya garajı
  // paylaştığın bir üye) otomatik senkronize edilir.
  useEffect(() => {
    if (!isAuthenticated || !user) return

    // Generic helper: state'i INSERT/UPDATE/DELETE event'ine göre güncelle
    const handleChange = <T extends { id: string }>(
      setState: (u: Updater<T[]>) => void,
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
        setState: (u: Updater<T[]>) => void,
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
          // Başarılı abonelik sessiz: production konsoluna her oturumda emoji
          // log basmanın kimseye faydası yok. Hata dalı duruyor.
          if (status === 'CHANNEL_ERROR') {
            console.error('Real-time bağlantı hatası')
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

  // ============ MUTASYONLAR ============
  // Altı alanın CRUD mantığı ayrı hook'lara taşındı (bkz. mutations/shared.ts).
  // Sağlayıcının dışarı verdiği API değişmedi — bu bir iç yeniden düzenleme.
  const mutationDeps = {
    user, vehicles, maintenanceRecords,
    setVehicles, setMaintenanceRecords, setFuelRecords,
    setTireSets, setTireChanges, setCustomIntervals,
    enqueueWithOptimisticInsert,
  }

  const { addVehicle, updateVehicle, deleteVehicle } = useVehicleMutations(mutationDeps)
  const { addMaintenance, updateMaintenance, deleteMaintenance } = useMaintenanceMutations(mutationDeps)
  const { addFuel, updateFuel, deleteFuel } = useFuelMutations(mutationDeps)
  const { addTireSet, updateTireSet, deleteTireSet } = useTireSetMutations(mutationDeps)
  const { addTireChange, updateTireChange, deleteTireChange } = useTireChangeMutations(mutationDeps)
  const { updateCustomIntervals, clearAllData } = useGarageDataMutations(mutationDeps)

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
    pendingCount,
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
    customIntervals, isLoaded, pendingCount,
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