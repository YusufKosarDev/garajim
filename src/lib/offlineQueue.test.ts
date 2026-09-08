import { describe, it, expect, vi } from 'vitest'
import {
  OfflineQueue,
  createMemoryStore,
  applyIdMappings,
  isNetworkError,
  isOffline,
  type QueueEntry,
} from './offlineQueue'

const entry = (over: Partial<QueueEntry> = {}): QueueEntry => ({
  seq: 0, tablo: 'vehicles', operation: 'insert', createdAt: 0, ...over,
})

describe('OfflineQueue — sıra', () => {
  it('eklenme sırasını korur', async () => {
    const q = new OfflineQueue(createMemoryStore())
    await q.enqueue({ tablo: 'vehicles', operation: 'insert', payload: { plate: 'A' } })
    await q.enqueue({ tablo: 'vehicles', operation: 'insert', payload: { plate: 'B' } })
    await q.enqueue({ tablo: 'vehicles', operation: 'insert', payload: { plate: 'C' } })

    const liste = await q.listele()
    expect(liste.map(g => g.payload?.plate)).toEqual(['A', 'B', 'C'])
  })

  it('kuyruğu sırayla gönderir ve boşaltır', async () => {
    const q = new OfflineQueue(createMemoryStore())
    await q.enqueue({ tablo: 'vehicles', operation: 'insert', payload: { plate: 'A' } })
    await q.enqueue({ tablo: 'fuel_records', operation: 'insert', payload: { km: 1 } })

    const sentEntries: string[] = []
    const result = await q.replay(async (g) => { sentEntries.push(g.tablo) })

    expect(sentEntries).toEqual(['vehicles', 'fuel_records'])
    expect(result.sent).toBe(2)
    expect(result.remaining).toBe(0)
    expect(await q.length()).toBe(0)
  })
})

describe('OfflineQueue — hata durumunda durma', () => {
  it('bir girdi başarısız olursa ARKASINDAKİLERİ DENEMEZ', async () => {
    const q = new OfflineQueue(createMemoryStore())
    await q.enqueue({ tablo: 'vehicles', operation: 'insert', payload: { plate: 'A' } })
    await q.enqueue({ tablo: 'vehicles', operation: 'insert', payload: { plate: 'PATLAK' } })
    await q.enqueue({ tablo: 'fuel_records', operation: 'insert', payload: { km: 1 } })

    const attempted: unknown[] = []
    const result = await q.replay(async (g) => {
      attempted.push(g.payload?.plate ?? g.payload?.km)
      if (g.payload?.plate === 'PATLAK') throw new Error('sunucu hatası')
    })

    // Üçüncü girdi ikinciye bağımlı olabilir; denenmemeli
    expect(attempted).toEqual(['A', 'PATLAK'])
    expect(result.sent).toBe(1)
    expect(result.error).toBeInstanceOf(Error)
  })

  it('başarısız girdi ve sonrası kuyrukta kalır, başarılı olan silinir', async () => {
    const q = new OfflineQueue(createMemoryStore())
    await q.enqueue({ tablo: 'vehicles', operation: 'insert', payload: { plate: 'A' } })
    await q.enqueue({ tablo: 'vehicles', operation: 'insert', payload: { plate: 'PATLAK' } })
    await q.enqueue({ tablo: 'fuel_records', operation: 'insert', payload: { km: 1 } })

    await q.replay(async (g) => {
      if (g.payload?.plate === 'PATLAK') throw new Error('sunucu hatası')
    })

    const remaining = await q.listele()
    expect(remaining.map(g => g.payload?.plate ?? g.payload?.km)).toEqual(['PATLAK', 1])
  })

  it('tekrar denendiğinde kaldığı yerden devam eder', async () => {
    const q = new OfflineQueue(createMemoryStore())
    await q.enqueue({ tablo: 'vehicles', operation: 'insert', payload: { plate: 'A' } })
    await q.enqueue({ tablo: 'vehicles', operation: 'insert', payload: { plate: 'B' } })

    let patlat = true
    await q.replay(async (g) => {
      if (patlat && g.payload?.plate === 'B') throw new Error('geçici')
    })
    expect(await q.length()).toBe(1)

    patlat = false
    const second = await q.replay(async () => {})
    expect(second.sent).toBe(1)
    expect(await q.length()).toBe(0)
  })
})

describe('OfflineQueue — geçici id eşleştirme', () => {
  it('çevrimdışı eklenen araca eklenen bakım kaydı gerçek id ile gönderilir', async () => {
    const q = new OfflineQueue(createMemoryStore())

    await q.enqueue({
      tablo: 'vehicles', operation: 'insert',
      payload: { plate: '34 ABC 1234' },
      tempId: 'gecici-arac-1',
    })
    await q.enqueue({
      tablo: 'maintenance_records', operation: 'insert',
      payload: { vehicle_id: 'gecici-arac-1', type: 'Yağ Değişimi' },
      referenceFields: ['vehicle_id'],
    })

    const sentEntries: Record<string, unknown>[] = []
    const result = await q.replay(async (g) => {
      sentEntries.push(g.payload ?? {})
      if (g.tablo === 'vehicles') return { gercekId: 'gercek-uuid-42' }
    })

    // Bakım kaydı artık GERÇEK araç id'siyle gitmeli
    expect(sentEntries[1].vehicle_id).toBe('gercek-uuid-42')
    expect(result.idEslesmeleri['gecici-arac-1']).toBe('gercek-uuid-42')
  })

  it('geçici id ye yapılan güncelleme de gerçek id ye yönlendirilir', async () => {
    const q = new OfflineQueue(createMemoryStore())

    await q.enqueue({ tablo: 'vehicles', operation: 'insert', payload: { plate: 'A' }, tempId: 'gecici-1' })
    await q.enqueue({ tablo: 'vehicles', operation: 'update', targetId: 'gecici-1', payload: { plate: 'B' } })

    const targets: (string | undefined)[] = []
    await q.replay(async (g) => {
      targets.push(g.targetId)
      if (g.operation === 'insert') return { gercekId: 'gercek-9' }
    })

    expect(targets[1]).toBe('gercek-9')
  })

  it('eşleşme yoksa girdi olduğu gibi kalır', () => {
    const g = entry({ targetId: 'x', payload: { vehicle_id: 'y' }, referenceFields: ['vehicle_id'] })
    expect(applyIdMappings(g, {})).toBe(g)
  })

  it('yalnızca referansAlanlari içindeki alanlar yeniden yazılır', () => {
    const g = entry({
      payload: { vehicle_id: 'gecici', notes: 'gecici' },
      referenceFields: ['vehicle_id'],
    })
    const result = applyIdMappings(g, { gecici: 'gercek' })

    expect(result.payload?.vehicle_id).toBe('gercek')
    // notes bir referans değil, aynı metin olsa bile dokunulmamalı
    expect(result.payload?.notes).toBe('gecici')
  })
})

describe('kalıcılık', () => {
  it('aynı depoyla yeni kuyruk örneği bekleyenleri görür', async () => {
    const store = createMemoryStore()
    const q1 = new OfflineQueue(store)
    await q1.enqueue({ tablo: 'vehicles', operation: 'insert', payload: { plate: 'A' } })

    // Sekme kapanıp açılmış gibi
    const q2 = new OfflineQueue(store)
    expect(await q2.length()).toBe(1)

    // Sıra numarası çakışmamalı
    await q2.enqueue({ tablo: 'vehicles', operation: 'insert', payload: { plate: 'B' } })
    const liste = await q2.listele()
    expect(liste.map(g => g.seq)).toEqual([0, 1])
  })
})

describe('ağ durumu yardımcıları', () => {
  it('ağ hatalarını tanır', () => {
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true)
    expect(isNetworkError(new Error('NetworkError when attempting to fetch'))).toBe(true)
    expect(isNetworkError(new Error('timeout of 5000ms exceeded'))).toBe(true)
  })

  it('ağ hatası olmayanları ayırt eder', () => {
    expect(isNetworkError(new Error('duplicate key value'))).toBe(false)
    expect(isNetworkError(null)).toBe(false)
  })

  it('navigator.onLine false ise çevrimdışı sayar', () => {
    const orijinal = navigator.onLine
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(isOffline()).toBe(true)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(orijinal)
  })
})
