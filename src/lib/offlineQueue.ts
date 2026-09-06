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

export type KuyrukIslemi = 'insert' | 'update' | 'delete'

export interface KuyrukGirdisi {
  /** Kuyruk içi sıra numarası */
  sira: number
  tablo: string
  islem: KuyrukIslemi
  /** insert için gövde, update için değişiklikler */
  payload?: Record<string, unknown>
  /** update/delete hedefi (geçici id olabilir) */
  hedefId?: string
  /** insert ise bu kayda verilen geçici id */
  geciciId?: string
  /** payload içinde geçici id taşıyabilecek alanlar (örn. vehicle_id) */
  referansAlanlari?: string[]
  olusturma: number
}

/** Depolama soyutlaması — testlerde bellek içi, tarayıcıda IndexedDB */
export interface KuyrukDeposu {
  hepsi: () => Promise<KuyrukGirdisi[]>
  ekle: (girdi: KuyrukGirdisi) => Promise<void>
  sil: (sira: number) => Promise<void>
  guncelle: (girdi: KuyrukGirdisi) => Promise<void>
  temizle: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Bellek içi depo (testler ve IndexedDB yoksa)
// ---------------------------------------------------------------------------
export function createMemoryStore(): KuyrukDeposu {
  let girdiler: KuyrukGirdisi[] = []
  return {
    hepsi: async () => [...girdiler].sort((a, b) => a.sira - b.sira),
    ekle: async (g) => { girdiler.push(g) },
    sil: async (sira) => { girdiler = girdiler.filter(g => g.sira !== sira) },
    guncelle: async (g) => { girdiler = girdiler.map(x => (x.sira === g.sira ? g : x)) },
    temizle: async () => { girdiler = [] },
  }
}

// ---------------------------------------------------------------------------
// IndexedDB deposu
// ---------------------------------------------------------------------------
const DB_ADI = 'garajim-offline'
const STORE_ADI = 'kuyruk'

function dbAc(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const istek = indexedDB.open(DB_ADI, 1)
    istek.onupgradeneeded = () => {
      const db = istek.result
      if (!db.objectStoreNames.contains(STORE_ADI)) {
        db.createObjectStore(STORE_ADI, { keyPath: 'sira' })
      }
    }
    istek.onsuccess = () => resolve(istek.result)
    istek.onerror = () => reject(istek.error)
  })
}

const islem = <T>(mod: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
  dbAc().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_ADI, mod)
    const istek = fn(tx.objectStore(STORE_ADI))
    istek.onsuccess = () => resolve(istek.result)
    istek.onerror = () => reject(istek.error)
  }))

export function createIndexedDbStore(): KuyrukDeposu {
  return {
    hepsi: async () => {
      const hepsi = await islem<KuyrukGirdisi[]>('readonly', s => s.getAll() as IDBRequest<KuyrukGirdisi[]>)
      return hepsi.sort((a, b) => a.sira - b.sira)
    },
    ekle: async (g) => { await islem('readwrite', s => s.put(g)) },
    guncelle: async (g) => { await islem('readwrite', s => s.put(g)) },
    sil: async (sira) => { await islem('readwrite', s => s.delete(sira)) },
    temizle: async () => { await islem('readwrite', s => s.clear()) },
  }
}

// ---------------------------------------------------------------------------
// Kuyruk
// ---------------------------------------------------------------------------

/** Kuyruktaki bir girdiyi sunucuya gönderen fonksiyon. Insert ise gerçek id döner. */
export type Gonderici = (girdi: KuyrukGirdisi) => Promise<{ gercekId?: string } | void>

export interface ReplaySonucu {
  gonderilen: number
  kalan: number
  /** geçici id -> gerçek id */
  idEslesmeleri: Record<string, string>
  hata?: unknown
}

export class OfflineQueue {
  private depo: KuyrukDeposu
  private sonrakiSira = 0

  constructor(depo: KuyrukDeposu = createMemoryStore()) {
    this.depo = depo
  }

  async uzunluk(): Promise<number> {
    return (await this.depo.hepsi()).length
  }

  async listele(): Promise<KuyrukGirdisi[]> {
    return this.depo.hepsi()
  }

  async temizle(): Promise<void> {
    await this.depo.temizle()
  }

  /** Kuyruğa yeni bir mutasyon ekler; sıra numarası mevcut en büyükten sonradır */
  async kuyrugaAl(girdi: Omit<KuyrukGirdisi, 'sira' | 'olusturma'>): Promise<KuyrukGirdisi> {
    const mevcut = await this.depo.hepsi()
    const enBuyuk = mevcut.reduce((m, g) => Math.max(m, g.sira), -1)
    this.sonrakiSira = Math.max(this.sonrakiSira, enBuyuk + 1)

    const tam: KuyrukGirdisi = {
      ...girdi,
      sira: this.sonrakiSira++,
      olusturma: Date.now(),
    }
    await this.depo.ekle(tam)
    return tam
  }

  /**
   * Kuyruğu sırayla gönderir.
   *
   * Bir girdi başarısız olursa DURUR — arkasındaki girdiler ona bağımlı
   * olabilir (çevrimdışı eklenen araca eklenen bakım kaydı gibi).
   */
  async replay(gonder: Gonderici): Promise<ReplaySonucu> {
    const idEslesmeleri: Record<string, string> = {}
    let gonderilen = 0

    const girdiler = await this.depo.hepsi()

    for (const girdi of girdiler) {
      // Bu girdi, daha önce gönderilmiş geçici bir id'ye referans veriyorsa
      // referansı gerçek id ile değiştir.
      const cozulmus = uygulaEslesmeler(girdi, idEslesmeleri)

      try {
        const sonuc = await gonder(cozulmus)
        if (cozulmus.geciciId && sonuc && sonuc.gercekId) {
          idEslesmeleri[cozulmus.geciciId] = sonuc.gercekId
        }
        await this.depo.sil(girdi.sira)
        gonderilen++
      } catch (hata) {
        return {
          gonderilen,
          kalan: girdiler.length - gonderilen,
          idEslesmeleri,
          hata,
        }
      }
    }

    return { gonderilen, kalan: 0, idEslesmeleri }
  }
}

/**
 * Girdideki geçici id referanslarını gerçek id'lerle değiştirir.
 * Hem hedefId'yi hem payload içindeki referans alanlarını kapsar.
 */
export function uygulaEslesmeler(
  girdi: KuyrukGirdisi,
  eslesmeler: Record<string, string>
): KuyrukGirdisi {
  if (Object.keys(eslesmeler).length === 0) return girdi

  const yeni: KuyrukGirdisi = { ...girdi }

  if (yeni.hedefId && eslesmeler[yeni.hedefId]) {
    yeni.hedefId = eslesmeler[yeni.hedefId]
  }

  if (yeni.payload && yeni.referansAlanlari?.length) {
    const payload = { ...yeni.payload }
    for (const alan of yeni.referansAlanlari) {
      const deger = payload[alan]
      if (typeof deger === 'string' && eslesmeler[deger]) {
        payload[alan] = eslesmeler[deger]
      }
    }
    yeni.payload = payload
  }

  return yeni
}

/** Çevrimdışı mı? Ağ hatası mı? */
export const cevrimdisiMi = (): boolean =>
  typeof navigator !== 'undefined' && navigator.onLine === false

export const agHatasiMi = (hata: unknown): boolean => {
  if (!hata) return false
  const mesaj = (hata as { message?: string })?.message ?? String(hata)
  return /network|fetch|failed to fetch|load failed|timeout/i.test(mesaj)
}
