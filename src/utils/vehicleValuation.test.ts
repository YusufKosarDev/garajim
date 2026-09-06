import { describe, it, expect } from 'vitest'
import { estimateVehicleValue, YILLIK_ORTALAMA_KM } from './vehicleValuation'
import type { Vehicle, MaintenanceRecord } from '../types'

const BUGUN = new Date(2026, 5, 15) // 15 Haziran 2026

const arac = (over: Partial<Vehicle> = {}): Vehicle => ({
  id: 'v1', plate: '34 ABC 123', brand: 'BMW', model: '320i',
  year: 2020, currentKm: 90_000,
  fuelType: null, inspectionDate: null, mtvDate: null, insuranceDate: null,
  kaskoDate: null, notes: null, photos: [], ...over,
})

const bakim = (date: string, vehicleId = 'v1'): MaintenanceRecord => ({
  id: `m-${date}`, vehicleId, type: 'Yağ Değişimi', date,
  km: null, cost: 1000, notes: null, photo: null,
})

/**
 * Geçerli girdiyle tahmin bekleyen testler için. null gelirse `!` ile susturmak
 * yerine burada patlıyor — beklenmedik bir null testin hangi satırında olduğunu
 * "Cannot read property of null" yerine açık bir mesajla söylesin.
 */
const tahmin = (v: Partial<Vehicle> = {}, kayitlar: MaintenanceRecord[] = [], opts = {}) => {
  const t = estimateVehicleValue(arac(v), kayitlar, { bugun: BUGUN, ...opts })
  if (!t) throw new Error(`Geçerli araç için tahmin beklenmişti: ${JSON.stringify(v)}`)
  return t
}

describe('estimateVehicleValue — temel', () => {
  it('model yılı yoksa tahmin üretmez', () => {
    // Yaş bilinmeden bu hesabın hiçbir dayanağı kalmaz; uydurmaktansa null
    expect(estimateVehicleValue(arac({ year: null }), [], { bugun: BUGUN })).toBeNull()
    expect(estimateVehicleValue(null, [], { bugun: BUGUN })).toBeNull()
  })

  it('saçma model yılını reddeder', () => {
    const ham = (year: number) => estimateVehicleValue(arac({ year }), [], { bugun: BUGUN })
    expect(ham(1800)).toBeNull()
    expect(ham(2030)).toBeNull() // gelecekten araç
  })

  it('yaşı ve beklenen km\'yi hesaplar', () => {
    const t = tahmin({ year: 2020 })
    expect(t.yas).toBe(6)
    expect(t.beklenenKm).toBe(6 * YILLIK_ORTALAMA_KM)
  })

  it('sıfır araçta oran 1\'e yakındır', () => {
    const t = tahmin({ year: 2026, currentKm: 500 })
    expect(t.yas).toBe(0)
    expect(t.kalanOran).toBeGreaterThan(0.9)
  })
})

describe('estimateVehicleValue — yaş etkisi', () => {
  it('yaş arttıkça oran monoton düşer', () => {
    const oranlar = [2026, 2024, 2020, 2015, 2010, 2000]
      .map(y => tahmin({ year: y, currentKm: 0 }).bilesenler.yas)
    for (let i = 1; i < oranlar.length; i++) {
      expect(oranlar[i]).toBeLessThan(oranlar[i - 1])
    }
  })

  it('ilk yıl kaybı sonraki yıllardan serttir', () => {
    // Sıfır araç "sıfır olma" primini bir defada kaybeder
    const y0 = tahmin({ year: 2026 }).bilesenler.yas
    const y1 = tahmin({ year: 2025 }).bilesenler.yas
    const y2 = tahmin({ year: 2024 }).bilesenler.yas
    expect(y0 - y1).toBeGreaterThan(y1 - y2)
  })

  it('çok eski araçta sıfıra düşmez, tabanda durur', () => {
    const t = tahmin({ year: 1990, currentKm: 0 })
    expect(t.bilesenler.yas).toBeGreaterThanOrEqual(0.1)
  })
})

describe('estimateVehicleValue — kilometre etkisi', () => {
  it('beklenenin üstündeki km değeri düşürür', () => {
    const az = tahmin({ year: 2020, currentKm: 60_000 })
    const cok = tahmin({ year: 2020, currentKm: 200_000 })
    expect(cok.kalanOran).toBeLessThan(az.kalanOran)
    expect(cok.bilesenler.km).toBeLessThan(0)
  })

  it('aynı km farklı yaşta farklı anlama gelir', () => {
    // 150.000 km: 10 yaşındaki araçta normal, 2 yaşındakinde çok
    const yeni = tahmin({ year: 2024, currentKm: 150_000 })
    const eski = tahmin({ year: 2016, currentKm: 150_000 })
    expect(yeni.bilesenler.km).toBeLessThan(eski.bilesenler.km)
  })

  it('km cezası sınırlıdır', () => {
    const t = tahmin({ year: 2024, currentKm: 900_000 })
    expect(t.bilesenler.km).toBeGreaterThanOrEqual(-0.20)
  })

  it('düşük km primi cezadan küçüktür', () => {
    // Çok az kullanılmış araç her zaman artı değil: lastik, conta, akü riski
    const dusuk = tahmin({ year: 2016, currentKm: 1_000 }).bilesenler.km
    const yuksek = tahmin({ year: 2016, currentKm: 400_000 }).bilesenler.km
    expect(dusuk).toBeLessThanOrEqual(0.10)
    expect(dusuk).toBeLessThan(Math.abs(yuksek))
  })

  it('km girilmemişse km etkisi sıfırlanır ve uyarı verilir', () => {
    const t = tahmin({ currentKm: 0 })
    expect(t.bilesenler.km).toBe(0)
    expect(t.kmFarki).toBe(0)
    expect(t.uyarilar.join(' ')).toMatch(/kilometre/i)
  })
})

describe('estimateVehicleValue — bakım geçmişi', () => {
  it('kayıt yoksa değeri düşürür ve uyarır', () => {
    const t = tahmin({}, [])
    expect(t.bilesenler.bakim).toBeLessThan(0)
    expect(t.uyarilar.join(' ')).toMatch(/bakım kaydı yok/i)
  })

  it('düzenli ve güncel bakım geçmişi değeri artırır', () => {
    const t = tahmin({}, [bakim('2026-03-01'), bakim('2025-06-01'), bakim('2024-06-01')])
    expect(t.bilesenler.bakim).toBeGreaterThan(0)
    expect(t.uyarilar.join(' ')).not.toMatch(/bakım kaydı yok/i)
  })

  it('bakım primi sınırlıdır', () => {
    const cok = Array.from({ length: 50 }, (_, i) => bakim(`2026-0${(i % 5) + 1}-01`))
    expect(tahmin({}, cok).bilesenler.bakim).toBeLessThanOrEqual(0.05)
  })

  it('başka araca ait bakım kayıtlarını saymaz', () => {
    // vehicleId filtresi olmasaydı garajdaki her bakım her aracın değerini artırırdı
    const t = tahmin({}, [bakim('2026-03-01', 'BASKA'), bakim('2025-06-01', 'BASKA')])
    expect(t.bilesenler.bakim).toBeLessThan(0)
    expect(t.uyarilar.join(' ')).toMatch(/bakım kaydı yok/i)
  })

  it('yalnızca çok eski bakım kaydı güncellik primi vermez', () => {
    const eski = tahmin({}, [bakim('2019-01-01'), bakim('2018-01-01'), bakim('2017-01-01')])
    const guncel = tahmin({}, [bakim('2026-03-01'), bakim('2025-06-01'), bakim('2024-06-01')])
    expect(eski.bilesenler.bakim).toBeLessThan(guncel.bilesenler.bakim)
  })
})

describe('estimateVehicleValue — oran ve fiyat', () => {
  it('oran her zaman makul aralıkta kalır', () => {
    const senaryolar = [
      tahmin({ year: 2026, currentKm: 0 }, [bakim('2026-05-01'), bakim('2026-04-01'), bakim('2026-03-01')]),
      tahmin({ year: 1995, currentKm: 900_000 }, []),
      tahmin({ year: 2010, currentKm: 150_000 }, [bakim('2026-01-01')]),
    ]
    for (const t of senaryolar) {
      expect(t.kalanOran).toBeGreaterThanOrEqual(0.05)
      expect(t.kalanOran).toBeLessThanOrEqual(1)
    }
  })

  it('alış fiyatı verilmezse ₺ tahmini üretmez', () => {
    // Piyasa verisi olmadan mutlak fiyat uydurmak yanlış olur
    expect(tahmin().tahminiDeger).toBeNull()
  })

  it('alış fiyatı verilirse oranı ₺\'ye çevirir', () => {
    const t = tahmin({}, [], { alisFiyati: 1_000_000 })
    expect(t.tahminiDeger).toBe(Math.round(1_000_000 * t.kalanOran))
  })

  it('geçersiz alış fiyatını yok sayar', () => {
    expect(tahmin({}, [], { alisFiyati: 0 }).tahminiDeger).toBeNull()
    expect(tahmin({}, [], { alisFiyati: -5 }).tahminiDeger).toBeNull()
    expect(tahmin({}, [], { alisFiyati: NaN }).tahminiDeger).toBeNull()
  })
})

describe('estimateVehicleValue — güven seviyesi', () => {
  it('km ve bakım varken güven yüksektir', () => {
    expect(tahmin({ currentKm: 90_000 }, [bakim('2026-03-01')]).guven).toBe('yuksek')
  })

  it('bir veri eksikse orta, ikisi de eksikse düşüktür', () => {
    expect(tahmin({ currentKm: 0 }, [bakim('2026-03-01')]).guven).toBe('orta')
    expect(tahmin({ currentKm: 90_000 }, []).guven).toBe('orta')
    expect(tahmin({ currentKm: 0 }, []).guven).toBe('dusuk')
  })

  it('çok eski araçta güven her koşulda düşüktür', () => {
    // 20 yaş üstünde fiyatı yaş değil model ve durum belirler
    const t = tahmin({ year: 2000, currentKm: 200_000 }, [bakim('2026-03-01'), bakim('2025-03-01'), bakim('2024-03-01')])
    expect(t.guven).toBe('dusuk')
    expect(t.uyarilar.join(' ')).toMatch(/20 yaş/i)
  })
})
