import { describe, it, expect, vi } from 'vitest'
import {
  OfflineQueue,
  createMemoryStore,
  uygulaEslesmeler,
  agHatasiMi,
  cevrimdisiMi,
  type KuyrukGirdisi,
} from './offlineQueue'

const girdi = (over: Partial<KuyrukGirdisi> = {}): KuyrukGirdisi => ({
  sira: 0, tablo: 'vehicles', islem: 'insert', olusturma: 0, ...over,
})

describe('OfflineQueue — sıra', () => {
  it('eklenme sırasını korur', async () => {
    const q = new OfflineQueue(createMemoryStore())
    await q.kuyrugaAl({ tablo: 'vehicles', islem: 'insert', payload: { plate: 'A' } })
    await q.kuyrugaAl({ tablo: 'vehicles', islem: 'insert', payload: { plate: 'B' } })
    await q.kuyrugaAl({ tablo: 'vehicles', islem: 'insert', payload: { plate: 'C' } })

    const liste = await q.listele()
    expect(liste.map(g => g.payload?.plate)).toEqual(['A', 'B', 'C'])
  })

  it('kuyruğu sırayla gönderir ve boşaltır', async () => {
    const q = new OfflineQueue(createMemoryStore())
    await q.kuyrugaAl({ tablo: 'vehicles', islem: 'insert', payload: { plate: 'A' } })
    await q.kuyrugaAl({ tablo: 'fuel_records', islem: 'insert', payload: { km: 1 } })

    const gonderilenler: string[] = []
    const sonuc = await q.replay(async (g) => { gonderilenler.push(g.tablo) })

    expect(gonderilenler).toEqual(['vehicles', 'fuel_records'])
    expect(sonuc.gonderilen).toBe(2)
    expect(sonuc.kalan).toBe(0)
    expect(await q.uzunluk()).toBe(0)
  })
})

describe('OfflineQueue — hata durumunda durma', () => {
  it('bir girdi başarısız olursa ARKASINDAKİLERİ DENEMEZ', async () => {
    const q = new OfflineQueue(createMemoryStore())
    await q.kuyrugaAl({ tablo: 'vehicles', islem: 'insert', payload: { plate: 'A' } })
    await q.kuyrugaAl({ tablo: 'vehicles', islem: 'insert', payload: { plate: 'PATLAK' } })
    await q.kuyrugaAl({ tablo: 'fuel_records', islem: 'insert', payload: { km: 1 } })

    const denenenler: unknown[] = []
    const sonuc = await q.replay(async (g) => {
      denenenler.push(g.payload?.plate ?? g.payload?.km)
      if (g.payload?.plate === 'PATLAK') throw new Error('sunucu hatası')
    })

    // Üçüncü girdi ikinciye bağımlı olabilir; denenmemeli
    expect(denenenler).toEqual(['A', 'PATLAK'])
    expect(sonuc.gonderilen).toBe(1)
    expect(sonuc.hata).toBeInstanceOf(Error)
  })

  it('başarısız girdi ve sonrası kuyrukta kalır, başarılı olan silinir', async () => {
    const q = new OfflineQueue(createMemoryStore())
    await q.kuyrugaAl({ tablo: 'vehicles', islem: 'insert', payload: { plate: 'A' } })
    await q.kuyrugaAl({ tablo: 'vehicles', islem: 'insert', payload: { plate: 'PATLAK' } })
    await q.kuyrugaAl({ tablo: 'fuel_records', islem: 'insert', payload: { km: 1 } })

    await q.replay(async (g) => {
      if (g.payload?.plate === 'PATLAK') throw new Error('sunucu hatası')
    })

    const kalan = await q.listele()
    expect(kalan.map(g => g.payload?.plate ?? g.payload?.km)).toEqual(['PATLAK', 1])
  })

  it('tekrar denendiğinde kaldığı yerden devam eder', async () => {
    const q = new OfflineQueue(createMemoryStore())
    await q.kuyrugaAl({ tablo: 'vehicles', islem: 'insert', payload: { plate: 'A' } })
    await q.kuyrugaAl({ tablo: 'vehicles', islem: 'insert', payload: { plate: 'B' } })

    let patlat = true
    await q.replay(async (g) => {
      if (patlat && g.payload?.plate === 'B') throw new Error('geçici')
    })
    expect(await q.uzunluk()).toBe(1)

    patlat = false
    const ikinci = await q.replay(async () => {})
    expect(ikinci.gonderilen).toBe(1)
    expect(await q.uzunluk()).toBe(0)
  })
})

describe('OfflineQueue — geçici id eşleştirme', () => {
  it('çevrimdışı eklenen araca eklenen bakım kaydı gerçek id ile gönderilir', async () => {
    const q = new OfflineQueue(createMemoryStore())

    await q.kuyrugaAl({
      tablo: 'vehicles', islem: 'insert',
      payload: { plate: '34 ABC 1234' },
      geciciId: 'gecici-arac-1',
    })
    await q.kuyrugaAl({
      tablo: 'maintenance_records', islem: 'insert',
      payload: { vehicle_id: 'gecici-arac-1', type: 'Yağ Değişimi' },
      referansAlanlari: ['vehicle_id'],
    })

    const gonderilenler: Record<string, unknown>[] = []
    const sonuc = await q.replay(async (g) => {
      gonderilenler.push(g.payload ?? {})
      if (g.tablo === 'vehicles') return { gercekId: 'gercek-uuid-42' }
    })

    // Bakım kaydı artık GERÇEK araç id'siyle gitmeli
    expect(gonderilenler[1].vehicle_id).toBe('gercek-uuid-42')
    expect(sonuc.idEslesmeleri['gecici-arac-1']).toBe('gercek-uuid-42')
  })

  it('geçici id ye yapılan güncelleme de gerçek id ye yönlendirilir', async () => {
    const q = new OfflineQueue(createMemoryStore())

    await q.kuyrugaAl({ tablo: 'vehicles', islem: 'insert', payload: { plate: 'A' }, geciciId: 'gecici-1' })
    await q.kuyrugaAl({ tablo: 'vehicles', islem: 'update', hedefId: 'gecici-1', payload: { plate: 'B' } })

    const hedefler: (string | undefined)[] = []
    await q.replay(async (g) => {
      hedefler.push(g.hedefId)
      if (g.islem === 'insert') return { gercekId: 'gercek-9' }
    })

    expect(hedefler[1]).toBe('gercek-9')
  })

  it('eşleşme yoksa girdi olduğu gibi kalır', () => {
    const g = girdi({ hedefId: 'x', payload: { vehicle_id: 'y' }, referansAlanlari: ['vehicle_id'] })
    expect(uygulaEslesmeler(g, {})).toBe(g)
  })

  it('yalnızca referansAlanlari içindeki alanlar yeniden yazılır', () => {
    const g = girdi({
      payload: { vehicle_id: 'gecici', notes: 'gecici' },
      referansAlanlari: ['vehicle_id'],
    })
    const sonuc = uygulaEslesmeler(g, { gecici: 'gercek' })

    expect(sonuc.payload?.vehicle_id).toBe('gercek')
    // notes bir referans değil, aynı metin olsa bile dokunulmamalı
    expect(sonuc.payload?.notes).toBe('gecici')
  })
})

describe('kalıcılık', () => {
  it('aynı depoyla yeni kuyruk örneği bekleyenleri görür', async () => {
    const depo = createMemoryStore()
    const q1 = new OfflineQueue(depo)
    await q1.kuyrugaAl({ tablo: 'vehicles', islem: 'insert', payload: { plate: 'A' } })

    // Sekme kapanıp açılmış gibi
    const q2 = new OfflineQueue(depo)
    expect(await q2.uzunluk()).toBe(1)

    // Sıra numarası çakışmamalı
    await q2.kuyrugaAl({ tablo: 'vehicles', islem: 'insert', payload: { plate: 'B' } })
    const liste = await q2.listele()
    expect(liste.map(g => g.sira)).toEqual([0, 1])
  })
})

describe('ağ durumu yardımcıları', () => {
  it('ağ hatalarını tanır', () => {
    expect(agHatasiMi(new Error('Failed to fetch'))).toBe(true)
    expect(agHatasiMi(new Error('NetworkError when attempting to fetch'))).toBe(true)
    expect(agHatasiMi(new Error('timeout of 5000ms exceeded'))).toBe(true)
  })

  it('ağ hatası olmayanları ayırt eder', () => {
    expect(agHatasiMi(new Error('duplicate key value'))).toBe(false)
    expect(agHatasiMi(null)).toBe(false)
  })

  it('navigator.onLine false ise çevrimdışı sayar', () => {
    const orijinal = navigator.onLine
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(cevrimdisiMi()).toBe(true)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(orijinal)
  })
})
