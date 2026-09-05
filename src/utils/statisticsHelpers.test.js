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

const bakim = (date, cost, vehicleId = 'v1', type = 'Yağ Değişimi', km = 0) =>
  ({ id: `m-${date}-${cost}`, vehicleId, date, cost, type, km })

const yakit = (date, totalCost, vehicleId = 'v1', extra = {}) =>
  ({ id: `f-${date}-${totalCost}`, vehicleId, date, totalCost, liters: 40, km: 0, ...extra })

describe('getCurrentMonthSpending', () => {
  it('bu ayın bakım ve yakıt harcamalarını ayrı ayrı toplar', () => {
    const sonuc = getCurrentMonthSpending(
      [bakim('2026-06-10', 1000), bakim('2026-05-10', 999)],
      [yakit('2026-06-05', 500), yakit('2026-04-05', 888)]
    )
    expect(sonuc.maintenance).toBe(1000)
    expect(sonuc.fuel).toBe(500)
    expect(sonuc.total).toBe(1500)
  })

  it('kayıt yoksa sıfır döner', () => {
    expect(getCurrentMonthSpending([], [])).toEqual({ maintenance: 0, fuel: 0, total: 0 })
  })

  it('tutarı olmayan kayıtları 0 sayar', () => {
    expect(getCurrentMonthSpending([bakim('2026-06-10', null)], []).total).toBe(0)
  })
})

describe('getAverageMonthlySpending', () => {
  it('son N ayın toplamını N e böler', () => {
    const sonuc = getAverageMonthlySpending(
      [bakim('2026-04-10', 3000), bakim('2026-05-10', 3000)],
      [],
      3
    )
    expect(sonuc.total).toBe(6000)
    expect(sonuc.average).toBe(2000) // 6000 / 3 ay
    expect(sonuc.count).toBe(2)
  })

  it('pencere dışındaki eski kayıtları saymaz', () => {
    const sonuc = getAverageMonthlySpending([bakim('2025-01-10', 99999)], [], 3)
    expect(sonuc.count).toBe(0)
    expect(sonuc.average).toBe(0)
  })

  it('bakım ve yakıtı birlikte hesaba katar', () => {
    const sonuc = getAverageMonthlySpending([bakim('2026-05-10', 300)], [yakit('2026-05-11', 600)], 3)
    expect(sonuc.total).toBe(900)
  })
})

describe('getYearComparison', () => {
  it('bu yıl ile geçen yılı karşılaştırır', () => {
    const sonuc = getYearComparison(
      [bakim('2026-03-01', 1000), bakim('2025-03-01', 500)],
      [yakit('2026-02-01', 1000), yakit('2025-02-01', 500)]
    )
    expect(sonuc.currentYear).toBe(2026)
    expect(sonuc.previousYear).toBe(2025)
    expect(sonuc.current.total).toBe(2000)
    expect(sonuc.previous.total).toBe(1000)
    expect(sonuc.difference).toBe(1000)
    expect(sonuc.percentChange).toBe(100)
  })

  it('geçen yıl harcama yoksa yüzde hesaplamaz (sıfıra bölme)', () => {
    const sonuc = getYearComparison([bakim('2026-03-01', 1000)], [])
    expect(sonuc.percentChange).toBeNull()
  })

  it('harcama azaldığında negatif fark verir', () => {
    const sonuc = getYearComparison(
      [bakim('2026-03-01', 500), bakim('2025-03-01', 1000)],
      []
    )
    expect(sonuc.difference).toBe(-500)
    expect(sonuc.percentChange).toBe(-50)
  })
})

describe('getMonthlyBreakdown', () => {
  it('kayıtları ay anahtarına göre gruplar', () => {
    const sonuc = getMonthlyBreakdown(
      [bakim('2026-06-10', 1000)],
      [yakit('2026-06-20', 500), yakit('2026-05-01', 300)]
    )
    expect(sonuc['2026-06'].maintenance).toBe(1000)
    expect(sonuc['2026-06'].fuel).toBe(500)
    expect(sonuc['2026-06'].total).toBe(1500)
    expect(sonuc['2026-05'].fuel).toBe(300)
  })

  it('yaş sınırının dışındaki kayıtları almaz', () => {
    const sonuc = getMonthlyBreakdown([bakim('2020-01-01', 1000)], [], 2)
    expect(Object.keys(sonuc)).toHaveLength(0)
  })
})

describe('getVehicleCostAnalysis', () => {
  const araclar = [
    { id: 'v1', brand: 'BMW', model: '320i', currentKm: 100000 },
    { id: 'v2', brand: 'Audi', model: 'A4', currentKm: 50000 },
  ]

  it('araç başına maliyeti toplar ve pahalıdan ucuza sıralar', () => {
    const sonuc = getVehicleCostAnalysis(
      araclar,
      [bakim('2026-01-01', 500, 'v1'), bakim('2026-01-01', 3000, 'v2')],
      [yakit('2026-01-01', 200, 'v1')]
    )
    expect(sonuc[0].vehicle.id).toBe('v2') // 3000 > 700
    expect(sonuc[0].totalCost).toBe(3000)
    expect(sonuc[1].totalCost).toBe(700)
  })

  it('km aralığından km başına maliyeti hesaplar', () => {
    const sonuc = getVehicleCostAnalysis(
      [araclar[0]],
      [bakim('2026-01-01', 1000, 'v1', 'Yağ Değişimi', 90000)],
      [yakit('2026-02-01', 1000, 'v1', { km: 100000 })]
    )
    expect(sonuc[0].kmRange).toBe(10000)
    expect(sonuc[0].costPerKm).toBeCloseTo(0.2) // 2000 TL / 10000 km
  })

  it('tek kayıt varsa km aralığı oluşmaz ve km başına maliyet null olur', () => {
    const sonuc = getVehicleCostAnalysis(
      [araclar[0]],
      [bakim('2026-01-01', 1000, 'v1', 'Yağ Değişimi', 90000)],
      []
    )
    expect(sonuc[0].kmRange).toBe(0)
    expect(sonuc[0].costPerKm).toBeNull()
  })

  it('hiç kayıt yokken aralık aracın güncel km si olur, maliyet de 0 olduğu için sonuç 0 çıkar', () => {
    // Davranışı belgeliyoruz: kayıt yokken minKm=0, maxKm=currentKm alınıyor.
    // Toplam maliyet de 0 olduğundan pratikte zararsız ama tutarsız bir dal.
    const sonuc = getVehicleCostAnalysis([araclar[0]], [], [])
    expect(sonuc[0].kmRange).toBe(100000)
    expect(sonuc[0].costPerKm).toBe(0)
  })

  it('ortalama yakıt fiyatını litreden türetir', () => {
    const sonuc = getVehicleCostAnalysis(
      [araclar[0]], [], [yakit('2026-01-01', 2000, 'v1', { liters: 40 })]
    )
    expect(sonuc[0].avgFuelPrice).toBe(50) // 2000 / 40
  })
})

describe('getMaintenanceTypeBreakdown', () => {
  it('türe göre gruplar ve tutara göre sıralar', () => {
    const sonuc = getMaintenanceTypeBreakdown([
      bakim('2026-01-01', 100, 'v1', 'Yağ Değişimi'),
      bakim('2026-02-01', 200, 'v1', 'Yağ Değişimi'),
      bakim('2026-03-01', 5000, 'v1', 'Balata Değişimi'),
    ])
    expect(sonuc[0].type).toBe('Balata Değişimi')
    expect(sonuc[0].total).toBe(5000)
    expect(sonuc[1].type).toBe('Yağ Değişimi')
    expect(sonuc[1].count).toBe(2)
    expect(sonuc[1].total).toBe(300)
  })

  it('türü olmayan kaydı "Diğer" sayar', () => {
    const sonuc = getMaintenanceTypeBreakdown([{ id: 'x', date: '2026-01-01', cost: 50 }])
    expect(sonuc[0].type).toBe('Diğer')
  })
})

describe('getStationAnalysis', () => {
  it('istasyona göre gruplar ve ortalama litre fiyatı hesaplar', () => {
    const sonuc = getStationAnalysis([
      yakit('2026-01-01', 2000, 'v1', { station: 'Shell', liters: 40 }),
      yakit('2026-02-01', 2000, 'v1', { station: 'Shell', liters: 40 }),
      yakit('2026-03-01', 900, 'v1', { station: 'BP', liters: 20 }),
    ])
    const shell = sonuc.find(s => s.station === 'Shell')
    expect(shell.count).toBe(2)
    expect(shell.total).toBe(4000)
    expect(shell.avgPrice).toBe(50)

    const bp = sonuc.find(s => s.station === 'BP')
    expect(bp.avgPrice).toBe(45)
  })

  it('istasyon adı yoksa "Belirtilmemiş" grubuna koyar', () => {
    const sonuc = getStationAnalysis([yakit('2026-01-01', 100, 'v1', { station: '  ' })])
    expect(sonuc[0].station).toBe('Belirtilmemiş')
  })

  it('toplam harcamaya göre sıralar', () => {
    const sonuc = getStationAnalysis([
      yakit('2026-01-01', 100, 'v1', { station: 'Az' }),
      yakit('2026-01-01', 900, 'v1', { station: 'Çok' }),
    ])
    expect(sonuc[0].station).toBe('Çok')
  })
})

describe('getSpendingTrend', () => {
  it('artan harcamayı up olarak işaretler', () => {
    const sonuc = getSpendingTrend(
      [bakim('2026-06-10', 2000), bakim('2026-05-10', 1000)],
      []
    )
    expect(sonuc.current).toBe(2000)
    expect(sonuc.previous).toBe(1000)
    expect(sonuc.trend).toBe('up')
  })

  it('azalan harcamayı down olarak işaretler', () => {
    const sonuc = getSpendingTrend(
      [bakim('2026-06-10', 500), bakim('2026-05-10', 1000)],
      []
    )
    expect(sonuc.trend).toBe('down')
  })

  it('%10 içindeki değişimi stable sayar', () => {
    const sonuc = getSpendingTrend(
      [bakim('2026-06-10', 1050), bakim('2026-05-10', 1000)],
      []
    )
    expect(sonuc.trend).toBe('stable')
  })

  it('geçmiş ay harcaması yoksa stable döner (sıfıra bölme)', () => {
    expect(getSpendingTrend([bakim('2026-06-10', 1000)], []).trend).toBe('stable')
  })
})
