/**
 * Mutasyon hook'larının ortak sözleşmesi.
 *
 * NEDEN AYRI: VehicleContext.tsx 1000 satırı aşmıştı ve altı ayrı alanın
 * (araç, bakım, yakıt, lastik seti, lastik değişimi, periyot) CRUD mantığı
 * tek dosyada iç içe duruyordu. Dosya bölündü ama SÖZLEŞME DEĞİŞMEDİ:
 * sağlayıcının dışarı verdiği API birebir aynı, bu bir iç yeniden düzenleme.
 *
 * Okuma katmanı (TanStack Query), realtime aboneliği ve çevrimdışı kuyruk
 * sağlayıcıda kaldı — bunlar mutasyonlar arasında PAYLAŞILIYOR ve bölünmeleri
 * yapıyı basitleştirmezdi.
 */
import type { User } from '@supabase/supabase-js'
import type {
  Vehicle, MaintenanceRecord, FuelRecord, TireSet, TireChange, CustomIntervals,
} from '../../types'

/** useState setter'larıyla aynı imza: doğrudan değer ya da önceki değeri alan fonksiyon */
export type Updater<T> = T | ((prev: T) => T)

/** Query cache'ine yazan setter — imzası useState setter'ıyla birebir aynı */
export type CacheSetter<T> = (updater: Updater<T>) => void

/** Çevrimdışıyken kuyruğa alınacak mutasyonun tanımı */
export interface QueuedMutation {
  tablo: string
  operation: 'insert' | 'update' | 'delete'
  payload?: Record<string, unknown>
  targetId?: string
  tempId?: string
}

/**
 * Mutasyonu çalıştırır; ağ yoksa kuyruğa alır.
 * Kuyruğa alınırsa `{ queued: true }` döner ve çağıran iyimser güncellemeyi yapar.
 */
export type RunQueued = <T>(
  mutation: QueuedMutation,
  run: () => Promise<T>
) => Promise<{ queued: true } | { queued: false; result: T }>

/**
 * Her mutasyon hook'una geçen bağımlılıklar.
 *
 * Tek bir nesne olarak geçiyor çünkü hook'ların çoğu aynı setter kümesine
 * ihtiyaç duyuyor (silme işlemleri ilişkili tabloları da temizliyor) ve
 * altı ayrı parametre listesi hem okunmaz hem de her eklemede altı imzayı
 * birden değiştirmeyi gerektirirdi.
 */
export interface MutationDeps {
  user: User | null
  /** Yeni satırlara yazılacak garaj kimliği; üyelik okunamazsa null (bkz. lib/garageId.ts) */
  garageId: string | null
  vehicles: Vehicle[]
  maintenanceRecords: MaintenanceRecord[]
  setVehicles: CacheSetter<Vehicle[]>
  setMaintenanceRecords: CacheSetter<MaintenanceRecord[]>
  setFuelRecords: CacheSetter<FuelRecord[]>
  setTireSets: CacheSetter<TireSet[]>
  setTireChanges: CacheSetter<TireChange[]>
  setCustomIntervals: CacheSetter<CustomIntervals>
  runQueued: RunQueued
  /** Bakım kaydını kuyruğa alıp listeye iyimser olarak ekler */
  enqueueWithOptimisticInsert: (record: Partial<MaintenanceRecord>) => Promise<MaintenanceRecord>
}
