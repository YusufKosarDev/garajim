import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '../test/supabaseMock'

/**
 * LocalStorage yedeğinden Supabase'e taşıma.
 *
 * NEDEN BURASI ÖNEMLİ: bu modülün 433 satırı vardı ve HİÇ testi yoktu, ama
 * kullanıcının tüm geçmişi buradan geçiyor. Üstelik en kritik işi sessiz:
 * eski yedeklerde araç id'si `Date.now()` sayısıydı, Supabase'de UUID.
 * Alt kayıtlar (bakım, yakıt, lastik, periyot) YENİ uuid'ye bağlanmazsa
 * taşıma "başarılı" der, satırlar da yazılır — ama hiçbiri bir araca
 * bağlı olmaz ve kullanıcı verisini kaybetmiş gibi görür.
 *
 * Testler o eşleştirmeyi, kısmi başarısızlığın diğer kayıtları durdurmamasını
 * ve eski yedek biçimlerinin normalleştirilmesini çitliyor.
 */

const h = vi.hoisted(() => ({
  sb: null as ReturnType<typeof createSupabaseMock> | null,
  storage: {
    uploadPhotosBatch: vi.fn(async (arr: string[]) => arr.map((_, i) => `https://cdn/v${i}.jpg`)),
    uploadPhotoFromBase64: vi.fn(async () => 'https://cdn/tek.jpg'),
    isBase64: (v: unknown) => typeof v === 'string' && v.startsWith('data:'),
    BUCKETS: { VEHICLE_PHOTOS: 'vehicle-photos', MAINTENANCE_PHOTOS: 'maintenance-photos' },
  },
  garaj: { fetchPrimaryGarageId: vi.fn(async () => 'g1') },
}))

vi.mock('./supabase', () => ({ get supabase() { return h.sb!.client } }))
vi.mock('./storageHelpers', () => h.storage)
vi.mock('./garageId', () => h.garaj)

const { migrateDataToSupabase } = await import('./dataMigration')
import type { BackupData } from './dataMigration'

const ESKI_ID = 1717171717171 // Date.now() döneminden kalma araç id'si

const yedek = (): BackupData => ({
  vehicles: [{ id: ESKI_ID, plate: '34 ABC 123', brand: 'BMW', model: '320i', photos: [] as string[] }],
  maintenanceRecords: [{ id: 2, vehicleId: ESKI_ID, type: 'Yağ Değişimi', date: '2026-01-05', km: 1000, cost: 1500 }],
  fuelRecords: [{ id: 3, vehicleId: ESKI_ID, date: '2026-01-06', km: 1100, liters: 40, totalCost: 2000 }],
  tireSets: [{ id: 4, vehicleId: ESKI_ID, brand: 'Michelin', season: 'summer' as const, size: '225/45 R17' }],
  tireChanges: [{ id: 5, vehicleId: ESKI_ID, date: '2026-01-07', km: 1100, toSeason: 'summer' as const }],
  customIntervals: { [`${ESKI_ID}-Yağ Değişimi`]: { kilometers: 8000, months: 12 } },
})

const aracEklendi = (uuid = 'uuid-yeni') =>
  h.sb!.setResponse('vehicles', 'insert', { data: { id: uuid }, error: null })

const payload = (tablo: string) => h.sb!.callsFor(tablo, 'insert')[0]?.payload?.[0]

beforeEach(() => {
  h.sb = createSupabaseMock()
  h.garaj.fetchPrimaryGarageId.mockClear().mockResolvedValue('g1')
  Object.values(h.storage).forEach(f => (f as { mockClear?: () => void }).mockClear?.())
})

describe('geçersiz girdi', () => {
  it('userId yoksa hiç sorgu yapmadan hata döner', async () => {
    const r = await migrateDataToSupabase(yedek(), '')
    expect(r.success).toBe(false)
    expect(r.errors[0]).toContain('Kullanıcı ID')
    expect(h.sb!.calls).toHaveLength(0)
  })

  it('veri null ise hata döner', async () => {
    const r = await migrateDataToSupabase(null as unknown as BackupData, 'user-1')
    expect(r.success).toBe(false)
    expect(r.errors).toHaveLength(1)
  })
})

describe('eski id -> yeni uuid eşleştirmesi', () => {
  it('alt kayıtların hepsi YENİ uuid ile yazılır', async () => {
    aracEklendi('uuid-bmw')

    const r = await migrateDataToSupabase(yedek(), 'user-1')

    expect(r.success).toBe(true)
    for (const tablo of ['maintenance_records', 'fuel_records', 'tire_sets', 'tire_changes']) {
      expect(payload(tablo).vehicle_id, tablo).toBe('uuid-bmw')
    }
    // Özel periyot toplu insert ediliyor, satır dizisinin ilk elemanı
    expect(h.sb!.callsFor('custom_intervals', 'insert')[0].payload[0].vehicle_id).toBe('uuid-bmw')
  })

  it('sahipsiz alt kayıt YAZILMAZ, başarısız sayılır', async () => {
    aracEklendi()
    const veri = yedek()
    veri.maintenanceRecords![0].vehicleId = 999999 // yedekte olmayan araç

    const r = await migrateDataToSupabase(veri, 'user-1')

    expect(r.maintenance).toMatchObject({ total: 1, success: 0, failed: 1 })
    expect(h.sb!.callsFor('maintenance_records', 'insert')).toHaveLength(0)
  })
})

describe('kısmi başarısızlık', () => {
  it('araç yazılamazsa taşıma durmaz ama success false olur', async () => {
    h.sb!.setResponse('vehicles', 'insert', { data: null, error: { message: 'duplicate key value' } })

    const r = await migrateDataToSupabase(yedek(), 'user-1')

    expect(r.vehicles).toMatchObject({ total: 1, success: 0, failed: 1 })
    expect(r.success).toBe(false)
    expect(r.errors[0]).toContain('34 ABC 123')
    // Araç yazılamadığı için alt kayıtlar da bağlanamıyor — ama akış devam etti
    expect(r.fuel.failed).toBe(1)
  })

  it('plakası olmayan araç için hata metni yine anlamlı', async () => {
    h.sb!.setResponse('vehicles', 'insert', { data: null, error: { message: 'bir hata' } })
    const veri = yedek()
    delete (veri.vehicles![0] as { plate?: string }).plate

    const r = await migrateDataToSupabase(veri, 'user-1')

    expect(r.errors[0]).toBeTruthy()
    expect(r.errors[0]).not.toContain('undefined')
  })
})

describe('eski yedek biçimleri normalleştiriliyor', () => {
  it('özel periyot düz sayıysa {kilometers, months:null} olur', async () => {
    aracEklendi()
    const veri = yedek()
    veri.customIntervals = { [`${ESKI_ID}-Yağ Değişimi`]: 7500 } as never

    await migrateDataToSupabase(veri, 'user-1')

    expect(h.sb!.callsFor('custom_intervals', 'insert')[0].payload[0])
      .toMatchObject({ kilometers: 7500, months: null, maintenance_type: 'Yağ Değişimi' })
  })

  it('çözülemeyen periyot anahtarı başarısız sayılır, insert edilmez', async () => {
    aracEklendi()
    const veri = yedek()
    veri.customIntervals = { 'anahtarsiz': { kilometers: 1000, months: null } } as never

    const r = await migrateDataToSupabase(veri, 'user-1')

    expect(r.customIntervals.failed).toBe(1)
    expect(h.sb!.callsFor('custom_intervals', 'insert')).toHaveLength(0)
  })

  it('base64 fotoğraflar Storage a yüklenir, DB ye URL gider', async () => {
    aracEklendi()
    const veri = yedek()
    veri.vehicles![0].photos = ['data:image/jpeg;base64,AAA']

    await migrateDataToSupabase(veri, 'user-1')

    expect(h.storage.uploadPhotosBatch).toHaveBeenCalledTimes(1)
    expect(payload('vehicles').photos).toEqual(['https://cdn/v0.jpg'])
  })
})

describe('garaj kimliği', () => {
  it('taşınan satırlar garage_id taşır — yoksa realtime bu kayıtları görmez', async () => {
    aracEklendi()

    await migrateDataToSupabase(yedek(), 'user-1')

    expect(payload('vehicles').garage_id).toBe('g1')
    expect(payload('fuel_records').garage_id).toBe('g1')
  })

  it('üyelik okunamazsa taşıma DURMAZ, anahtar gönderilmez', async () => {
    aracEklendi()
    h.garaj.fetchPrimaryGarageId.mockRejectedValueOnce(new Error('RLS'))

    const r = await migrateDataToSupabase(yedek(), 'user-1')

    expect(r.success).toBe(true)
    expect(payload('vehicles')).not.toHaveProperty('garage_id')
  })
})

describe('ilerleme bildirimi', () => {
  it('her adım için çağrılır ve toplam sayıyı doğru verir', async () => {
    aracEklendi()
    const adimlar: [string, number, number][] = []

    await migrateDataToSupabase(yedek(), 'user-1', (a, b, c) => adimlar.push([a, b, c]))

    const adlar = [...new Set(adimlar.map(a => a[0]))]
    expect(adlar).toEqual(['vehicles', 'maintenance', 'fuel', 'tireSets', 'tireChanges', 'customIntervals'])
    expect(adimlar.every(([, , toplam]) => toplam === 1)).toBe(true)
  })
})
