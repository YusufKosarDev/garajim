import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getAverageMonthlySpending,
  getCurrentMonthSpending,
  getYearComparison,
  getMonthlyBreakdown,
  getVehicleCostAnalysis,
  getMaintenanceTypeBreakdown,
  getStationAnalysis,
  getSpendingTrend,
} from './statisticsHelpers'

// Bu modüldeki fonksiyonların tamamı içeride new Date() çağırıyor
const NOW = new Date(2026, 5, 15, 12, 0, 0) // 15 Haziran 2026

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

const maintenance = (date, cost, vehicleId = 'v1', type = 'Yağ Değişimi', km = 0) =>
  ({ id: `m-${date}-${cost}`, vehicleId, date, cost, type, km })

const fuel = (date, totalCost, vehicleId = 'v1', extra = {}) =>
  ({ id: `f-${date}-${totalCost}`, vehicleId, date, totalCost, liters: 40, km: 0, ...extra })

describe('getCurrentMonthSpending', () => {
  it('bu ayın bakım ve yakıt harcamalarını ayrı ayrı toplar', () => {
    const result = getCurrentMonthSpending(
      [maintenance('2026-06-10', 1000), maintenance('2026-05-10', 999)],
      [fuel('2026-06-05', 500), fuel('2026-04-05', 888)]
    )
    expect(result.maintenance).toBe(1000)
    expect(result.fuel).toBe(500)
    expect(result.total).toBe(1500)
  })

  it('kayıt yoksa sıfır döner', () => {
    expect(getCurrentMonthSpending([], [])).toEqual({ maintenance: 0, fuel: 0, total: 0 })
  })

  it('tutarı olmayan kayıtları 0 sayar', () => {
    expect(getCurrentMonthSpending([maintenance('2026-06-10', null)], []).total).toBe(0)
  })
})

describe('getAverageMonthlySpending', () => {
  it('son N ayın toplamını N e böler', () => {
    const result = getAverageMonthlySpending(
      [maintenance('2026-04-10', 3000), maintenance('2026-05-10', 3000)],
      [],
      3
    )
    expect(result.total).toBe(6000)
    expect(result.average).toBe(2000) // 6000 / 3 ay
    expect(result.count).toBe(2)
  })

  it('pencere dışındaki eski kayıtları saymaz', () => {
    const result = getAverageMonthlySpending([maintenance('2025-01-10', 99999)], [], 3)
    expect(result.count).toBe(0)
    expect(result.average).toBe(0)
  })

  it('bakım ve yakıtı birlikte hesaba katar', () => {
    const result = getAverageMonthlySpending([maintenance('2026-05-10', 300)], [fuel('2026-05-11', 600)], 3)
    expect(result.total).toBe(900)
  })
})

describe('getYearComparison', () => {
  it('bu yıl ile geçen yılı karşılaştırır', () => {
    const result = getYearComparison(
      [maintenance('2026-03-01', 1000), maintenance('2025-03-01', 500)],
      [fuel('2026-02-01', 1000), fuel('2025-02-01', 500)]
    )
    expect(result.currentYear).toBe(2026)
    expect(result.previousYear).toBe(2025)
    expect(result.current.total).toBe(2000)
    expect(result.previous.total).toBe(1000)
    expect(result.difference).toBe(1000)
    expect(result.percentChange).toBe(100)
  })

  it('geçen yıl harcama yoksa yüzde hesaplamaz (sıfıra bölme)', () => {
    const result = getYearComparison([maintenance('2026-03-01', 1000)], [])
    expect(result.percentChange).toBeNull()
  })

  it('harcama azaldığında negatif fark verir', () => {
    const result = getYearComparison(
      [maintenance('2026-03-01', 500), maintenance('2025-03-01', 1000)],
      []
    )
    expect(result.difference).toBe(-500)
    expect(result.percentChange).toBe(-50)
  })
})

describe('getMonthlyBreakdown', () => {
  it('kayıtları ay anahtarına göre gruplar', () => {
    const result = getMonthlyBreakdown(
      [maintenance('2026-06-10', 1000)],
      [fuel('2026-06-20', 500), fuel('2026-05-01', 300)]
    )
    expect(result['2026-06'].maintenance).toBe(1000)
    expect(result['2026-06'].fuel).toBe(500)
    expect(result['2026-06'].total).toBe(1500)
    expect(result['2026-05'].fuel).toBe(300)
  })

  it('yaş sınırının dışındaki kayıtları almaz', () => {
    const result = getMonthlyBreakdown([maintenance('2020-01-01', 1000)], [], 2)
    expect(Object.keys(result)).toHaveLength(0)
  })
})

describe('getVehicleCostAnalysis', () => {
  const vehicles = [
    { id: 'v1', brand: 'BMW', model: '320i', currentKm: 100000 },
    { id: 'v2', brand: 'Audi', model: 'A4', currentKm: 50000 },
  ]

  it('araç başına maliyeti toplar ve pahalıdan ucuza sıralar', () => {
    const result = getVehicleCostAnalysis(
      vehicles,
      [maintenance('2026-01-01', 500, 'v1'), maintenance('2026-01-01', 3000, 'v2')],
      [fuel('2026-01-01', 200, 'v1')]
    )
    expect(result[0].vehicle.id).toBe('v2') // 3000 > 700
    expect(result[0].totalCost).toBe(3000)
    expect(result[1].totalCost).toBe(700)
  })

  it('km aralığından km başına maliyeti hesaplar', () => {
    const result = getVehicleCostAnalysis(
      [vehicles[0]],
      [maintenance('2026-01-01', 1000, 'v1', 'Yağ Değişimi', 90000)],
      [fuel('2026-02-01', 1000, 'v1', { km: 100000 })]
    )
    expect(result[0].kmRange).toBe(10000)
    expect(result[0].costPerKm).toBeCloseTo(0.2) // 2000 TL / 10000 km
  })

  it('tek kayıt varsa km aralığı oluşmaz ve km başına maliyet null olur', () => {
    const result = getVehicleCostAnalysis(
      [vehicles[0]],
      [maintenance('2026-01-01', 1000, 'v1', 'Yağ Değişimi', 90000)],
      []
    )
    expect(result[0].kmRange).toBe(0)
    expect(result[0].costPerKm).toBeNull()
  })

  it('hiç kayıt yokken aralık aracın güncel km si olur, maliyet de 0 olduğu için sonuç 0 çıkar', () => {
    // Davranışı belgeliyoruz: kayıt yokken minKm=0, maxKm=currentKm alınıyor.
    // Toplam maliyet de 0 olduğundan pratikte zararsız ama tutarsız bir dal.
    const result = getVehicleCostAnalysis([vehicles[0]], [], [])
    expect(result[0].kmRange).toBe(100000)
    expect(result[0].costPerKm).toBe(0)
  })

  it('ortalama yakıt fiyatını litreden türetir', () => {
    const result = getVehicleCostAnalysis(
      [vehicles[0]], [], [fuel('2026-01-01', 2000, 'v1', { liters: 40 })]
    )
    expect(result[0].avgFuelPrice).toBe(50) // 2000 / 40
  })
})

describe('getMaintenanceTypeBreakdown', () => {
  it('türe göre gruplar ve tutara göre sıralar', () => {
    const result = getMaintenanceTypeBreakdown([
      maintenance('2026-01-01', 100, 'v1', 'Yağ Değişimi'),
      maintenance('2026-02-01', 200, 'v1', 'Yağ Değişimi'),
      maintenance('2026-03-01', 5000, 'v1', 'Balata Değişimi'),
    ])
    expect(result[0].type).toBe('Balata Değişimi')
    expect(result[0].total).toBe(5000)
    expect(result[1].type).toBe('Yağ Değişimi')
    expect(result[1].count).toBe(2)
    expect(result[1].total).toBe(300)
  })

  it('türü olmayan kaydı "Diğer" sayar', () => {
    const result = getMaintenanceTypeBreakdown([{ id: 'x', date: '2026-01-01', cost: 50 }])
    expect(result[0].type).toBe('Diğer')
  })
})

describe('getStationAnalysis', () => {
  it('istasyona göre gruplar ve ortalama litre fiyatı hesaplar', () => {
    const result = getStationAnalysis([
      fuel('2026-01-01', 2000, 'v1', { station: 'Shell', liters: 40 }),
      fuel('2026-02-01', 2000, 'v1', { station: 'Shell', liters: 40 }),
      fuel('2026-03-01', 900, 'v1', { station: 'BP', liters: 20 }),
    ])
    const shell = result.find(s => s.station === 'Shell')
    expect(shell.count).toBe(2)
    expect(shell.total).toBe(4000)
    expect(shell.avgPrice).toBe(50)

    const bp = result.find(s => s.station === 'BP')
    expect(bp.avgPrice).toBe(45)
  })

  it('istasyon adı yoksa "Belirtilmemiş" grubuna koyar', () => {
    const result = getStationAnalysis([fuel('2026-01-01', 100, 'v1', { station: '  ' })])
    expect(result[0].station).toBe('Belirtilmemiş')
  })

  it('toplam harcamaya göre sıralar', () => {
    const result = getStationAnalysis([
      fuel('2026-01-01', 100, 'v1', { station: 'Az' }),
      fuel('2026-01-01', 900, 'v1', { station: 'Çok' }),
    ])
    expect(result[0].station).toBe('Çok')
  })
})

describe('getSpendingTrend', () => {
  it('artan harcamayı up olarak işaretler', () => {
    const result = getSpendingTrend(
      [maintenance('2026-06-10', 2000), maintenance('2026-05-10', 1000)],
      []
    )
    expect(result.current).toBe(2000)
    expect(result.previous).toBe(1000)
    expect(result.trend).toBe('up')
  })

  it('azalan harcamayı down olarak işaretler', () => {
    const result = getSpendingTrend(
      [maintenance('2026-06-10', 500), maintenance('2026-05-10', 1000)],
      []
    )
    expect(result.trend).toBe('down')
  })

  it('%10 içindeki değişimi stable sayar', () => {
    const result = getSpendingTrend(
      [maintenance('2026-06-10', 1050), maintenance('2026-05-10', 1000)],
      []
    )
    expect(result.trend).toBe('stable')
  })

  it('geçmiş ay harcaması yoksa stable döner (sıfıra bölme)', () => {
    expect(getSpendingTrend([maintenance('2026-06-10', 1000)], []).trend).toBe('stable')
  })
})
