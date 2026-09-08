import { describe, it, expect } from 'vitest'
import { estimateVehicleValue, AVERAGE_KM_PER_YEAR } from './vehicleValuation'
import type { Vehicle, MaintenanceRecord } from '../types'

const BUGUN = new Date(2026, 5, 15) // 15 Haziran 2026

const vehicle = (over: Partial<Vehicle> = {}): Vehicle => ({
  id: 'v1', plate: '34 ABC 123', brand: 'BMW', model: '320i',
  year: 2020, currentKm: 90_000,
  fuelType: null, inspectionDate: null, mtvDate: null, insuranceDate: null,
  kaskoDate: null, notes: null, photos: [], ...over,
})

const maintenance = (date: string, vehicleId = 'v1'): MaintenanceRecord => ({
  id: `m-${date}`, vehicleId, type: 'Yağ Değişimi', date,
  km: null, cost: 1000, notes: null, photo: null,
})

/**
 * Geçerli girdiyle tahmin bekleyen testler için. null gelirse `!` ile susturmak
 * yerine burada patlıyor — beklenmedik bir null testin hangi satırında olduğunu
 * "Cannot read property of null" yerine açık bir mesajla söylesin.
 */
const estimate = (v: Partial<Vehicle> = {}, records: MaintenanceRecord[] = [], opts = {}) => {
  const t = estimateVehicleValue(vehicle(v), records, { today: BUGUN, ...opts })
  if (!t) throw new Error(`Geçerli araç için tahmin beklenmişti: ${JSON.stringify(v)}`)
  return t
}

describe('estimateVehicleValue — temel', () => {
  it('model yılı yoksa tahmin üretmez', () => {
    // Yaş bilinmeden bu hesabın hiçbir dayanağı kalmaz; uydurmaktansa null
    expect(estimateVehicleValue(vehicle({ year: null }), [], { today: BUGUN })).toBeNull()
    expect(estimateVehicleValue(null, [], { today: BUGUN })).toBeNull()
  })

  it('saçma model yılını reddeder', () => {
    const raw = (year: number) => estimateVehicleValue(vehicle({ year }), [], { today: BUGUN })
    expect(raw(1800)).toBeNull()
    expect(raw(2030)).toBeNull() // gelecekten araç
  })

  it('yaşı ve beklenen km\'yi hesaplar', () => {
    const t = estimate({ year: 2020 })
    expect(t.age).toBe(6)
    expect(t.expectedKm).toBe(6 * AVERAGE_KM_PER_YEAR)
  })

  it('sıfır araçta oran 1\'e yakındır', () => {
    const t = estimate({ year: 2026, currentKm: 500 })
    expect(t.age).toBe(0)
    expect(t.remainingRatio).toBeGreaterThan(0.9)
  })
})

describe('estimateVehicleValue — yaş etkisi', () => {
  it('yaş arttıkça oran monoton düşer', () => {
    const ratios = [2026, 2024, 2020, 2015, 2010, 2000]
      .map(y => estimate({ year: y, currentKm: 0 }).components.age)
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]).toBeLessThan(ratios[i - 1])
    }
  })

  it('ilk yıl kaybı sonraki yıllardan serttir', () => {
    // Sıfır araç "sıfır olma" primini bir defada kaybeder
    const y0 = estimate({ year: 2026 }).components.age
    const y1 = estimate({ year: 2025 }).components.age
    const y2 = estimate({ year: 2024 }).components.age
    expect(y0 - y1).toBeGreaterThan(y1 - y2)
  })

  it('çok eski araçta sıfıra düşmez, tabanda durur', () => {
    const t = estimate({ year: 1990, currentKm: 0 })
    expect(t.components.age).toBeGreaterThanOrEqual(0.1)
  })
})

describe('estimateVehicleValue — kilometre etkisi', () => {
  it('beklenenin üstündeki km değeri düşürür', () => {
    const az = estimate({ year: 2020, currentKm: 60_000 })
    const cok = estimate({ year: 2020, currentKm: 200_000 })
    expect(cok.remainingRatio).toBeLessThan(az.remainingRatio)
    expect(cok.components.km).toBeLessThan(0)
  })

  it('aynı km farklı yaşta farklı anlama gelir', () => {
    // 150.000 km: 10 yaşındaki araçta normal, 2 yaşındakinde çok
    const updated = estimate({ year: 2024, currentKm: 150_000 })
    const older = estimate({ year: 2016, currentKm: 150_000 })
    expect(updated.components.km).toBeLessThan(older.components.km)
  })

  it('km cezası sınırlıdır', () => {
    const t = estimate({ year: 2024, currentKm: 900_000 })
    expect(t.components.km).toBeGreaterThanOrEqual(-0.20)
  })

  it('düşük km primi cezadan küçüktür', () => {
    // Çok az kullanılmış araç her zaman artı değil: lastik, conta, akü riski
    const low = estimate({ year: 2016, currentKm: 1_000 }).components.km
    const high = estimate({ year: 2016, currentKm: 400_000 }).components.km
    expect(low).toBeLessThanOrEqual(0.10)
    expect(low).toBeLessThan(Math.abs(high))
  })

  it('km girilmemişse km etkisi sıfırlanır ve uyarı verilir', () => {
    const t = estimate({ currentKm: 0 })
    expect(t.components.km).toBe(0)
    expect(t.kmFarki).toBe(0)
    expect(t.warnings.join(' ')).toMatch(/kilometre/i)
  })
})

describe('estimateVehicleValue — bakım geçmişi', () => {
  it('kayıt yoksa değeri düşürür ve uyarır', () => {
    const t = estimate({}, [])
    expect(t.components.maintenance).toBeLessThan(0)
    expect(t.warnings.join(' ')).toMatch(/bakım kaydı yok/i)
  })

  it('düzenli ve güncel bakım geçmişi değeri artırır', () => {
    const t = estimate({}, [maintenance('2026-03-01'), maintenance('2025-06-01'), maintenance('2024-06-01')])
    expect(t.components.maintenance).toBeGreaterThan(0)
    expect(t.warnings.join(' ')).not.toMatch(/bakım kaydı yok/i)
  })

  it('bakım primi sınırlıdır', () => {
    const cok = Array.from({ length: 50 }, (_, i) => maintenance(`2026-0${(i % 5) + 1}-01`))
    expect(estimate({}, cok).components.maintenance).toBeLessThanOrEqual(0.05)
  })

  it('başka araca ait bakım kayıtlarını saymaz', () => {
    // vehicleId filtresi olmasaydı garajdaki her bakım her aracın değerini artırırdı
    const t = estimate({}, [maintenance('2026-03-01', 'BASKA'), maintenance('2025-06-01', 'BASKA')])
    expect(t.components.maintenance).toBeLessThan(0)
    expect(t.warnings.join(' ')).toMatch(/bakım kaydı yok/i)
  })

  it('yalnızca çok eski bakım kaydı güncellik primi vermez', () => {
    const older = estimate({}, [maintenance('2019-01-01'), maintenance('2018-01-01'), maintenance('2017-01-01')])
    const guncel = estimate({}, [maintenance('2026-03-01'), maintenance('2025-06-01'), maintenance('2024-06-01')])
    expect(older.components.maintenance).toBeLessThan(guncel.components.maintenance)
  })
})

describe('estimateVehicleValue — oran ve fiyat', () => {
  it('oran her zaman makul aralıkta kalır', () => {
    const scenarios = [
      estimate({ year: 2026, currentKm: 0 }, [maintenance('2026-05-01'), maintenance('2026-04-01'), maintenance('2026-03-01')]),
      estimate({ year: 1995, currentKm: 900_000 }, []),
      estimate({ year: 2010, currentKm: 150_000 }, [maintenance('2026-01-01')]),
    ]
    for (const t of scenarios) {
      expect(t.remainingRatio).toBeGreaterThanOrEqual(0.05)
      expect(t.remainingRatio).toBeLessThanOrEqual(1)
    }
  })

  it('alış fiyatı verilmezse ₺ tahmini üretmez', () => {
    // Piyasa verisi olmadan mutlak fiyat uydurmak yanlış olur
    expect(estimate().estimatedValue).toBeNull()
  })

  it('alış fiyatı verilirse oranı ₺\'ye çevirir', () => {
    const t = estimate({}, [], { purchasePrice: 1_000_000 })
    expect(t.estimatedValue).toBe(Math.round(1_000_000 * t.remainingRatio))
  })

  it('geçersiz alış fiyatını yok sayar', () => {
    expect(estimate({}, [], { purchasePrice: 0 }).estimatedValue).toBeNull()
    expect(estimate({}, [], { purchasePrice: -5 }).estimatedValue).toBeNull()
    expect(estimate({}, [], { purchasePrice: NaN }).estimatedValue).toBeNull()
  })
})

describe('estimateVehicleValue — güven seviyesi', () => {
  it('km ve bakım varken güven yüksektir', () => {
    expect(estimate({ currentKm: 90_000 }, [maintenance('2026-03-01')]).confidence).toBe('high')
  })

  it('bir veri eksikse orta, ikisi de eksikse düşüktür', () => {
    expect(estimate({ currentKm: 0 }, [maintenance('2026-03-01')]).confidence).toBe('medium')
    expect(estimate({ currentKm: 90_000 }, []).confidence).toBe('medium')
    expect(estimate({ currentKm: 0 }, []).confidence).toBe('low')
  })

  it('çok eski araçta güven her koşulda düşüktür', () => {
    // 20 yaş üstünde fiyatı yaş değil model ve durum belirler
    const t = estimate({ year: 2000, currentKm: 200_000 }, [maintenance('2026-03-01'), maintenance('2025-03-01'), maintenance('2024-03-01')])
    expect(t.confidence).toBe('low')
    expect(t.warnings.join(' ')).toMatch(/20 yaş/i)
  })
})
