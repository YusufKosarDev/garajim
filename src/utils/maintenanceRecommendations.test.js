import { describe, it, expect } from 'vitest'
import {
  DEFAULT_INTERVALS,
  buildIntervalKey,
  parseIntervalKey,
  resolveInterval,
  getRecommendationStatus,
  getMaintenanceRecommendation,
  getAllRecommendations,
  getCriticalRecommendations,
  getVehicleRecommendations,
} from './maintenanceRecommendations'

const UUID = '550e8400-e29b-41d4-a716-446655440000'
const UUID2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

const vehicle = (id = UUID, currentKm = 100000) => ({ id, currentKm, brand: 'BMW', model: '320i', plate: '34 ABC 1234' })
const maintenance = (vehicleId, type, km) => ({ id: `${type}-${km}`, vehicleId, type, km })

// ============================================================
// ANAHTAR SÖZLEŞMESİ — Faz 1'de düzeltilen asıl bug buradaydı
// ============================================================
describe('interval anahtar sözleşmesi', () => {
  it('UUID araç id + tire içeren tür adını doğru ayrıştırır', () => {
    const key = buildIntervalKey(UUID, 'Yağ Değişimi')
    expect(parseIntervalKey(key)).toEqual({ vehicleId: UUID, maintenanceType: 'Yağ Değişimi' })
  })

  it('eski split("-") yaklaşımı bu anahtarda gerçekten bozuktu', () => {
    // Regresyon koruması: vehicleId UUID olduğu için kendisi de tire içeriyor,
    // split('-')[0] yalnızca ilk 8 karakteri veriyordu ve DB'ye geçersiz UUID gidiyordu.
    const key = buildIntervalKey(UUID, 'Yağ Değişimi')
    expect(key.split('-')[0]).not.toBe(UUID)
    expect(parseIntervalKey(key).vehicleId).toBe(UUID)
  })

  it('DEFAULT_INTERVALS içindeki her türü ayrıştırabilir', () => {
    for (const tur of Object.keys(DEFAULT_INTERVALS)) {
      expect(parseIntervalKey(buildIntervalKey(UUID, tur))).toEqual({
        vehicleId: UUID,
        maintenanceType: tur,
      })
    }
  })

  it('eski localStorage yedeklerindeki sayısal id ile çalışır', () => {
    expect(parseIntervalKey('1717325432123-Buji')).toEqual({
      vehicleId: '1717325432123',
      maintenanceType: 'Buji',
    })
  })

  it('DEFAULT_INTERVALS dışındaki türü UUID ön ekiyle çözer', () => {
    expect(parseIntervalKey(`${UUID}-Özel Bakım`)).toEqual({
      vehicleId: UUID,
      maintenanceType: 'Özel Bakım',
    })
  })

  it('ayrıştırılamayan anahtarda null döner', () => {
    expect(parseIntervalKey('bozuk')).toBeNull()
    expect(parseIntervalKey('')).toBeNull()
    expect(parseIntervalKey(null)).toBeNull()
  })
})

describe('resolveInterval', () => {
  it('özel değer varsa onu kullanır', () => {
    const ozel = { [buildIntervalKey(UUID, 'Buji')]: { kilometers: 25000 } }
    expect(resolveInterval(ozel, UUID, 'Buji')).toBe(25000)
  })

  it('özel değer yoksa varsayılana düşer', () => {
    expect(resolveInterval({}, UUID, 'Buji')).toBe(DEFAULT_INTERVALS['Buji'])
  })

  it('bir aracın ayarı başka araca sızmaz', () => {
    const ozel = { [buildIntervalKey(UUID2, 'Buji')]: { kilometers: 25000 } }
    expect(resolveInterval(ozel, UUID, 'Buji')).toBe(DEFAULT_INTERVALS['Buji'])
  })

  it('eski yedeklerdeki düz sayı biçimini de kabul eder', () => {
    const older = { [buildIntervalKey(UUID, 'Buji')]: 22000 }
    expect(resolveInterval(older, UUID, 'Buji')).toBe(22000)
  })

  it('customIntervals verilmezse çökmez', () => {
    expect(resolveInterval(undefined, UUID, 'Buji')).toBe(DEFAULT_INTERVALS['Buji'])
  })
})

// ============================================================
// ÖNERİ MOTORU
// ============================================================
describe('getRecommendationStatus', () => {
  it('kalan km negatifse gecikmiş', () => {
    expect(getRecommendationStatus(-1, 10000)).toBe('overdue')
  })

  it('%10 ve altı kalmışsa acil', () => {
    expect(getRecommendationStatus(1000, 10000)).toBe('urgent')
    expect(getRecommendationStatus(500, 10000)).toBe('urgent')
  })

  it('%20 ve altı kalmışsa yaklaşıyor', () => {
    expect(getRecommendationStatus(2000, 10000)).toBe('soon')
  })

  it('bolca km kalmışsa sorun yok', () => {
    expect(getRecommendationStatus(5000, 10000)).toBe('ok')
  })
})

describe('getMaintenanceRecommendation', () => {
  it('son bakımdan itibaren sonraki bakım km sini hesaplar', () => {
    const v = vehicle(UUID, 100000)
    const records = [maintenance(UUID, 'Yağ Değişimi', 95000)]
    const rec = getMaintenanceRecommendation(v, 'Yağ Değişimi', records)

    expect(rec.lastKm).toBe(95000)
    expect(rec.interval).toBe(10000)
    expect(rec.nextDueKm).toBe(105000)
    expect(rec.kmRemaining).toBe(5000)
    expect(rec.status).toBe('ok')
    expect(rec.hasHistory).toBe(true)
  })

  it('özel periyot uygulanır (Faz 1 öncesi bu HİÇ çalışmıyordu)', () => {
    const v = vehicle(UUID, 100000)
    const records = [maintenance(UUID, 'Yağ Değişimi', 95000)]
    const ozel = { [buildIntervalKey(UUID, 'Yağ Değişimi')]: { kilometers: 7500 } }

    const rec = getMaintenanceRecommendation(v, 'Yağ Değişimi', records, ozel)
    expect(rec.interval).toBe(7500)
    expect(rec.nextDueKm).toBe(102500)
    expect(rec.kmRemaining).toBe(2500)
  })

  it('gecikmiş bakımı işaretler', () => {
    const v = vehicle(UUID, 120000)
    const rec = getMaintenanceRecommendation(v, 'Yağ Değişimi', [maintenance(UUID, 'Yağ Değişimi', 95000)])
    expect(rec.status).toBe('overdue')
    expect(rec.kmRemaining).toBeLessThan(0)
  })

  it('başka aracın bakım kaydını karıştırmaz', () => {
    const v = vehicle(UUID, 100000)
    const otherVehicleRecord = [maintenance(UUID2, 'Yağ Değişimi', 95000)]
    const rec = getMaintenanceRecommendation(v, 'Yağ Değişimi', otherVehicleRecord)
    expect(rec.hasHistory).toBe(false)
  })

  it('periyodu olmayan tür için null döner', () => {
    expect(getMaintenanceRecommendation(vehicle(), 'Genel Bakım', [])).toBeNull()
  })

  it('km bilgisi olmayan araç için öneri üretmez', () => {
    expect(getMaintenanceRecommendation(vehicle(UUID, 0), 'Yağ Değişimi', [])).toBeNull()
  })

  it('birden fazla kayıt varsa en yüksek km lisini baz alır', () => {
    const records = [
      maintenance(UUID, 'Yağ Değişimi', 80000),
      maintenance(UUID, 'Yağ Değişimi', 95000),
      maintenance(UUID, 'Yağ Değişimi', 88000),
    ]
    expect(getMaintenanceRecommendation(vehicle(UUID, 100000), 'Yağ Değişimi', records).lastKm).toBe(95000)
  })
})

describe('getAllRecommendations', () => {
  it('sadece geçmişi olan bakım türlerini döner', () => {
    const v = vehicle(UUID, 100000)
    const records = [maintenance(UUID, 'Yağ Değişimi', 95000), maintenance(UUID, 'Buji', 90000)]
    const all = getAllRecommendations([v], records)

    expect(all).toHaveLength(2)
    expect(all.map(r => r.type).sort()).toEqual(['Buji', 'Yağ Değişimi'])
  })

  it('birden fazla aracı birlikte işler', () => {
    const records = [maintenance(UUID, 'Buji', 90000), maintenance(UUID2, 'Buji', 90000)]
    const all = getAllRecommendations([vehicle(UUID), vehicle(UUID2)], records)
    expect(all).toHaveLength(2)
  })

  it('hiç kayıt yoksa boş döner', () => {
    expect(getAllRecommendations([vehicle()], [])).toEqual([])
  })
})

describe('getCriticalRecommendations', () => {
  it('sorunsuzları eler ve aciliyete göre sıralar', () => {
    const v = vehicle(UUID, 120000)
    const records = [
      maintenance(UUID, 'Yağ Değişimi', 95000),  // 120k > 105k -> overdue
      maintenance(UUID, 'Buji', 119000),         // 119k+30k = 149k -> ok, elenir
      maintenance(UUID, 'Polen Filtresi', 106000), // 121k, 1000 kaldı -> urgent
    ]

    const kritik = getCriticalRecommendations([v], records)
    expect(kritik.map(r => r.type)).toEqual(['Yağ Değişimi', 'Polen Filtresi'])
    expect(kritik[0].status).toBe('overdue')
    expect(kritik[1].status).toBe('urgent')
  })

  it('aynı statüde en az km kalan öne gelir', () => {
    const v = vehicle(UUID, 120000)
    const records = [
      maintenance(UUID, 'Yağ Değişimi', 90000),   // 100k -> 20k gecikmiş
      maintenance(UUID, 'Yağ Filtresi', 105000),  // 115k -> 5k gecikmiş
    ]
    const kritik = getCriticalRecommendations([v], records)
    expect(kritik[0].type).toBe('Yağ Değişimi') // daha çok gecikmiş, kmRemaining daha küçük
  })
})

describe('getVehicleRecommendations', () => {
  it('tek araç için km kalanına göre sıralar', () => {
    const v = vehicle(UUID, 100000)
    const records = [
      maintenance(UUID, 'Buji', 99000),          // 30k periyot -> 29k kaldı
      maintenance(UUID, 'Yağ Değişimi', 95000),  // 10k periyot -> 5k kaldı
    ]
    const result = getVehicleRecommendations(v, records)
    expect(result.map(r => r.type)).toEqual(['Yağ Değişimi', 'Buji'])
  })
})
