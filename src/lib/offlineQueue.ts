/**
 * Çevrimdışı mutasyon kuyruğu.
 *
 * Neden elle yazıldı: 16. maddede mutasyonlar useMutation'a sarılmadı
 * (mutateAsync referansı stabil olmadığı için provider memoizasyonunu
 * kırıyordu), dolayısıyla TanStack Query'nin hazır offline kuyruğu gelmiyor.
 *
 * NAİF BİR KUYRUK VERİ BOZAR. Dikkat edilen üç şey:
 *
 * 1. Geçici ID'ler — çevrimdışı eklenen kaydın gerçek id'sini sunucu üretir.
 *    Kayıt geçici bir id ile kuyruğa girer; gönderim başarılı olunca gerçek id
 *    öğrenilir ve KUYRUKTA BEKLEYEN diğer kayıtların bu geçici id'ye yapan
 *    referansları yeniden yazılır (örn. çevrimdışı eklenen araca çevrimdışı
 *    eklenen bakım kaydı).
 * 2. Sıra — kuyruk her zaman eklenme sırasıyla işlenir; bir kayıt başarısız
 *    olursa arkasındakiler denenmez, çünkü ona bağımlı olabilirler.
 * 3. Kalıcılık — kuyruk IndexedDB'de tutulur, sekme kapansa da kaybolmaz.
 */

export type QueueOperation = 'insert' | 'update' | 'delete'

export interface QueueEntry {
  /** Kuyruk içi sıra numarası */
  seq: number
  tablo: string
  operation: QueueOperation
  /** insert için gövde, update için değişiklikler */
  payload?: Record<string, unknown>
  /** update/delete hedefi (geçici id olabilir) */
  targetId?: string
  /** insert ise bu kayda verilen geçici id */
  tempId?: string
  /** payload içinde geçici id taşıyabilecek alanlar (örn. vehicle_id) */
  referenceFields?: string[]
  createdAt: number
}

/** Depolama soyutlaması — testlerde bellek içi, tarayıcıda IndexedDB */
export interface QueueStore {
  all: () => Promise<QueueEntry[]>
  ekle: (entry: QueueEntry) => Promise<void>
  remove: (seq: number) => Promise<void>
  update: (entry: QueueEntry) => Promise<void>
  clear: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Bellek içi depo (testler ve IndexedDB yoksa)
// ---------------------------------------------------------------------------
export function createMemoryStore(): QueueStore {
  let entries: QueueEntry[] = []
  return {
    all: async () => [...entries].sort((a, b) => a.seq - b.seq),
    ekle: async (g) => { entries.push(g) },
    remove: async (seq) => { entries = entries.filter(g => g.seq !== seq) },
    update: async (g) => { entries = entries.map(x => (x.seq === g.seq ? g : x)) },
    clear: async () => { entries = [] },
  }
}

// ---------------------------------------------------------------------------
// IndexedDB deposu
// ---------------------------------------------------------------------------
const DB_NAME = 'garajim-offline'
const STORE_NAME = 'kuyruk'

function dbAc(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const istek = indexedDB.open(DB_NAME, 1)
    istek.onupgradeneeded = () => {
      const db = istek.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'sira' })
      }
    }
    istek.onsuccess = () => resolve(istek.result)
    istek.onerror = () => reject(istek.error)
  })
}

const operation = <T>(mod: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
  dbAc().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mod)
    const istek = fn(tx.objectStore(STORE_NAME))
    istek.onsuccess = () => resolve(istek.result)
    istek.onerror = () => reject(istek.error)
  }))

export function createIndexedDbStore(): QueueStore {
  return {
    all: async () => {
      const all = await operation<QueueEntry[]>('readonly', s => s.getAll() as IDBRequest<QueueEntry[]>)
      return all.sort((a, b) => a.seq - b.seq)
    },
    ekle: async (g) => { await operation('readwrite', s => s.put(g)) },
    update: async (g) => { await operation('readwrite', s => s.put(g)) },
    remove: async (seq) => { await operation('readwrite', s => s.delete(seq)) },
    clear: async () => { await operation('readwrite', s => s.clear()) },
  }
}

// ---------------------------------------------------------------------------
// Kuyruk
// ---------------------------------------------------------------------------

/** Kuyruktaki bir girdiyi sunucuya gönderen fonksiyon. Insert ise gerçek id döner. */
export type Sender = (entry: QueueEntry) => Promise<{ gercekId?: string } | void>

export interface ReplayResult {
  sent: number
  remaining: number
  /** geçici id -> gerçek id */
  idEslesmeleri: Record<string, string>
  error?: unknown
}

export class OfflineQueue {
  private store: QueueStore
  private nextSeq = 0

  constructor(store: QueueStore = createMemoryStore()) {
    this.store = store
  }

  async length(): Promise<number> {
    return (await this.store.all()).length
  }

  async listele(): Promise<QueueEntry[]> {
    return this.store.all()
  }

  async clear(): Promise<void> {
    await this.store.clear()
  }

  /** Kuyruğa yeni bir mutasyon ekler; sıra numarası mevcut en büyükten sonradır */
  async enqueue(entry: Omit<QueueEntry, 'seq' | 'createdAt'>): Promise<QueueEntry> {
    const existing = await this.store.all()
    const maxSeq = existing.reduce((m, g) => Math.max(m, g.seq), -1)
    this.nextSeq = Math.max(this.nextSeq, maxSeq + 1)

    const tam: QueueEntry = {
      ...entry,
      seq: this.nextSeq++,
      createdAt: Date.now(),
    }
    await this.store.ekle(tam)
    return tam
  }

  /**
   * Kuyruğu sırayla gönderir.
   *
   * Bir girdi başarısız olursa DURUR — arkasındaki girdiler ona bağımlı
   * olabilir (çevrimdışı eklenen araca eklenen bakım kaydı gibi).
   */
  async replay(flushQueue: Sender): Promise<ReplayResult> {
    const idEslesmeleri: Record<string, string> = {}
    let sent = 0

    const entries = await this.store.all()

    for (const entry of entries) {
      // Bu girdi, daha önce gönderilmiş geçici bir id'ye referans veriyorsa
      // referansı gerçek id ile değiştir.
      const cozulmus = applyIdMappings(entry, idEslesmeleri)

      try {
        const result = await flushQueue(cozulmus)
        if (cozulmus.tempId && result && result.gercekId) {
          idEslesmeleri[cozulmus.tempId] = result.gercekId
        }
        await this.store.remove(entry.seq)
        sent++
      } catch (error) {
        return {
          sent,
          remaining: entries.length - sent,
          idEslesmeleri,
          error,
        }
      }
    }

    return { sent, remaining: 0, idEslesmeleri }
  }
}

/**
 * Girdideki geçici id referanslarını gerçek id'lerle değiştirir.
 * Hem hedefId'yi hem payload içindeki referans alanlarını kapsar.
 */
export function applyIdMappings(
  entry: QueueEntry,
  idMappings: Record<string, string>
): QueueEntry {
  if (Object.keys(idMappings).length === 0) return entry

  const updated: QueueEntry = { ...entry }

  if (updated.targetId && idMappings[updated.targetId]) {
    updated.targetId = idMappings[updated.targetId]
  }

  if (updated.payload && updated.referenceFields?.length) {
    const payload = { ...updated.payload }
    for (const field of updated.referenceFields) {
      const value = payload[field]
      if (typeof value === 'string' && idMappings[value]) {
        payload[field] = idMappings[value]
      }
    }
    updated.payload = payload
  }

  return updated
}

/** Çevrimdışı mı? Ağ hatası mı? */
export const isOffline = (): boolean =>
  typeof navigator !== 'undefined' && navigator.onLine === false

export const isNetworkError = (error: unknown): boolean => {
  if (!error) return false
  const message = (error as { message?: string })?.message ?? String(error)
  return /network|fetch|failed to fetch|load failed|timeout/i.test(message)
}
