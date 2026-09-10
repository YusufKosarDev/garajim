import { describe, it, expect } from 'vitest'
import {
  calculateConsumption,
  getAverageConsumption,
  getTotalFuelCost,
  getAveragePrice,
} from './fuelHelpers'

const record = (km, liters, totalCost = 0) => ({ km, liters, totalCost })

describe('calculateConsumption', () => {
  it('L/100km hesaplar', () => {
    // 500 km'de 40 litre -> 8 L/100km
    expect(calculateConsumption(record(1000, 0), record(1500, 40))).toBe(8)
  })

  it('km farkı yoksa veya geriye gidiyorsa null döner', () => {
    expect(calculateConsumption(record(1000, 0), record(1000, 40))).toBeNull()
    expect(calculateConsumption(record(1500, 0), record(1000, 40))).toBeNull()
  })

  it('kayıt eksikse null döner', () => {
    expect(calculateConsumption(null, record(1500, 40))).toBeNull()
    expect(calculateConsumption(record(1000, 0), null)).toBeNull()
  })
})

describe('getAverageConsumption', () => {
  it('ilk dolumu hariç tutarak ortalama tüketimi verir', () => {
    // İlk kayıt referans; sonraki 2 dolum toplam 80 L, toplam mesafe 1000 km
    const records = [record(1000, 50), record(1500, 40), record(2000, 40)]
    expect(getAverageConsumption(records)).toBe(8)
  })

  it('sıralamadan bağımsız çalışır', () => {
    const karisik = [record(2000, 40), record(1000, 50), record(1500, 40)]
    expect(getAverageConsumption(karisik)).toBe(8)
  })

  it('tek kayıtla hesaplanamaz', () => {
    expect(getAverageConsumption([record(1000, 50)])).toBeNull()
    expect(getAverageConsumption([])).toBeNull()
  })

  it('tüm kayıtlar aynı km ise null döner', () => {
    expect(getAverageConsumption([record(1000, 50), record(1000, 40)])).toBeNull()
  })

  // ============================================================
  // ÇOKLU ARAÇ
  //
  // Araçların kilometre sayaçları birbirinden bağımsız. Tüm kayıtlar tek küme
  // sayıldığında "en yüksek km − en düşük km" gidilen yol sanılıyor ve filo
  // ortalaması gerçeğin çok altına düşüyordu. Demo hesabında bu, 5,4 ve 7,6
  // L/100km tüketen iki araç için 6,0 gibi anlamsız bir sayı üretiyordu.
  // ============================================================
  describe('çoklu araç', () => {
    const kayit = (vehicleId, km, liters) => ({ vehicleId, km, liters, totalCost: 0 })

    it('her aracın km aralığı AYRI hesaplanır', () => {
      // A: 1000->2000 km, ilk hariç 80 L  -> 8 L/100km
      // B: 50000->51000 km, ilk hariç 40 L -> 4 L/100km
      // Filo: 120 L / 2000 km = 6 L/100km
      const records = [
        kayit('A', 1000, 50), kayit('A', 1500, 40), kayit('A', 2000, 40),
        kayit('B', 50000, 30), kayit('B', 50500, 20), kayit('B', 51000, 20),
      ]
      expect(getAverageConsumption(records)).toBe(6)
    })

    it('REGRESYON: sayaçlar tek aralık sayılmaz', () => {
      // İki araç da 10 L/100km tüketiyor ama sayaçları çok uzak.
      // Tek küme sayılsaydı: 30 L / (90500-1000) km = 0,03 L/100km.
      const records = [
        kayit('A', 1000, 12), kayit('A', 1100, 10),
        kayit('B', 90000, 12), kayit('B', 90200, 20),
      ]
      expect(getAverageConsumption(records)).toBeCloseTo(10, 5)
    })

    it('hesaplanamayan araç toplama katılmaz, diğeri bozulmaz', () => {
      const records = [
        kayit('A', 1000, 50), kayit('A', 1500, 40),   // 8 L/100km
        kayit('B', 7000, 45),                          // tek kayıt: atlanır
        kayit('C', 9000, 30), kayit('C', 9000, 30),    // aynı km: atlanır
      ]
      expect(getAverageConsumption(records)).toBe(8)
    })

    it('vehicleId olmayan eski kayıtlar tek araç gibi ele alınır', () => {
      const records = [record(1000, 50), record(1500, 40), record(2000, 40)]
      expect(getAverageConsumption(records)).toBe(8)
    })
  })
})

describe('getTotalFuelCost', () => {
  it('toplam tutarı toplar', () => {
    expect(getTotalFuelCost([record(0, 0, 100), record(0, 0, 250.5)])).toBe(350.5)
  })

  it('eksik totalCost alanlarını 0 sayar', () => {
    expect(getTotalFuelCost([{ km: 1 }, record(0, 0, 100)])).toBe(100)
  })

  it('boş listede 0 döner', () => {
    expect(getTotalFuelCost([])).toBe(0)
  })
})

describe('getAveragePrice', () => {
  it('litre başına ortalama fiyatı verir', () => {
    // 100 litre, toplam 4500 TL -> 45 TL/L
    expect(getAveragePrice([record(0, 60, 2700), record(0, 40, 1800)])).toBe(45)
  })

  it('litre toplamı sıfırsa null döner', () => {
    expect(getAveragePrice([record(0, 0, 100)])).toBeNull()
  })

  it('boş listede null döner', () => {
    expect(getAveragePrice([])).toBeNull()
  })
})
