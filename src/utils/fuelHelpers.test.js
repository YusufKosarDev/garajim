import { describe, it, expect } from 'vitest'
import {
  calculateConsumption,
  getAverageConsumption,
  getTotalFuelCost,
  getAveragePrice,
} from './fuelHelpers'

const kayit = (km, liters, totalCost = 0) => ({ km, liters, totalCost })

describe('calculateConsumption', () => {
  it('L/100km hesaplar', () => {
    // 500 km'de 40 litre -> 8 L/100km
    expect(calculateConsumption(kayit(1000, 0), kayit(1500, 40))).toBe(8)
  })

  it('km farkı yoksa veya geriye gidiyorsa null döner', () => {
    expect(calculateConsumption(kayit(1000, 0), kayit(1000, 40))).toBeNull()
    expect(calculateConsumption(kayit(1500, 0), kayit(1000, 40))).toBeNull()
  })

  it('kayıt eksikse null döner', () => {
    expect(calculateConsumption(null, kayit(1500, 40))).toBeNull()
    expect(calculateConsumption(kayit(1000, 0), null)).toBeNull()
  })
})

describe('getAverageConsumption', () => {
  it('ilk dolumu hariç tutarak ortalama tüketimi verir', () => {
    // İlk kayıt referans; sonraki 2 dolum toplam 80 L, toplam mesafe 1000 km
    const kayitlar = [kayit(1000, 50), kayit(1500, 40), kayit(2000, 40)]
    expect(getAverageConsumption(kayitlar)).toBe(8)
  })

  it('sıralamadan bağımsız çalışır', () => {
    const karisik = [kayit(2000, 40), kayit(1000, 50), kayit(1500, 40)]
    expect(getAverageConsumption(karisik)).toBe(8)
  })

  it('tek kayıtla hesaplanamaz', () => {
    expect(getAverageConsumption([kayit(1000, 50)])).toBeNull()
    expect(getAverageConsumption([])).toBeNull()
  })

  it('tüm kayıtlar aynı km ise null döner', () => {
    expect(getAverageConsumption([kayit(1000, 50), kayit(1000, 40)])).toBeNull()
  })
})

describe('getTotalFuelCost', () => {
  it('toplam tutarı toplar', () => {
    expect(getTotalFuelCost([kayit(0, 0, 100), kayit(0, 0, 250.5)])).toBe(350.5)
  })

  it('eksik totalCost alanlarını 0 sayar', () => {
    expect(getTotalFuelCost([{ km: 1 }, kayit(0, 0, 100)])).toBe(100)
  })

  it('boş listede 0 döner', () => {
    expect(getTotalFuelCost([])).toBe(0)
  })
})

describe('getAveragePrice', () => {
  it('litre başına ortalama fiyatı verir', () => {
    // 100 litre, toplam 4500 TL -> 45 TL/L
    expect(getAveragePrice([kayit(0, 60, 2700), kayit(0, 40, 1800)])).toBe(45)
  })

  it('litre toplamı sıfırsa null döner', () => {
    expect(getAveragePrice([kayit(0, 0, 100)])).toBeNull()
  })

  it('boş listede null döner', () => {
    expect(getAveragePrice([])).toBeNull()
  })
})
