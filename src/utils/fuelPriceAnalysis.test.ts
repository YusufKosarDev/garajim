import { describe, it, expect } from 'vitest'
import { analyzeFuelPrices } from './fuelPriceAnalysis'
import type { FuelRecord } from '../types'

let sayac = 0
const kayit = (
  date: string, station: string | null, pricePerLiter: number, liters = 50,
): FuelRecord => ({
  id: `f${++sayac}`, vehicleId: 'v1', date, station,
  pricePerLiter, liters, totalCost: pricePerLiter * liters,
  km: null, fullTank: true, notes: null,
})

describe('analyzeFuelPrices — enflasyon tuzağı', () => {
  it('yıllar arası fiyat artışını istasyon farkı sanmaz', () => {
    // Bu, eski getStationAnalysis mantığının düştüğü tuzak: A 2024'te 25 ₺,
    // B 2026'da 45 ₺. Ömür boyu ortalama "B %80 pahalı" der; oysa fark enflasyon.
    const a = analyzeFuelPrices([
      kayit('2024-01-10', 'A', 25),
      kayit('2024-02-10', 'A', 25),
      kayit('2026-01-10', 'B', 45),
      kayit('2026-02-10', 'B', 45),
    ])
    // Hiçbir dönemde iki istasyon yan yana yok -> karşılaştırma yapılamaz
    expect(a.istasyonlar).toEqual([])
    expect(a.yetersizVeri).toMatch(/aynı dönemde/i)
    expect(a.tasarruf).toBeNull()
  })

  it('aynı dönemde alım varsa gerçek istasyon farkını bulur', () => {
    const a = analyzeFuelPrices([
      kayit('2026-01-05', 'Ucuz', 40),
      kayit('2026-01-08', 'Pahali', 44),
      kayit('2026-01-15', 'Ucuz', 40),
      kayit('2026-01-18', 'Pahali', 44),
    ])
    const [enUcuz] = a.istasyonlar
    expect(enUcuz.station).toBe('Ucuz')
    expect(enUcuz.ortSapma).toBeLessThan(0)
    expect(a.istasyonlar[1].station).toBe('Pahali')
    expect(a.istasyonlar[1].ortSapma).toBeGreaterThan(0)
  })

  it('zam dönemine rağmen ucuz istasyonu doğru tespit eder', () => {
    // Fiyatlar genel olarak 40 -> 50'ye çıkıyor. A her zaman piyasanın 2 ₺ altında.
    const a = analyzeFuelPrices([
      kayit('2026-01-05', 'A', 38), kayit('2026-01-06', 'B', 40),
      kayit('2026-03-05', 'A', 43), kayit('2026-03-06', 'B', 45),
      kayit('2026-05-05', 'A', 48), kayit('2026-05-06', 'B', 50),
    ])
    expect(a.istasyonlar[0].station).toBe('A')
    expect(a.istasyonlar[0].ortSapma).toBeLessThan(0)
    expect(a.istasyonlar[1].ortSapma).toBeGreaterThan(0)
  })
})

describe('analyzeFuelPrices — tasarruf', () => {
  it('yalnızca aynı dönemde gerçekten daha ucuzu varken tasarruf sayar', () => {
    // 5 Ocak'ta Pahalı'dan 50 L × 44 ₺ alındı; 3 gün önce Ucuz 40 ₺'ydi.
    // Kayıp: 50 × 4 = 200 ₺. Ucuz'dan yapılan alımda kayıp yok.
    const a = analyzeFuelPrices([
      kayit('2026-01-02', 'Ucuz', 40),
      kayit('2026-01-05', 'Pahali', 44),
    ])
    expect(a.tasarruf?.toplam).toBe(200)
    expect(a.tasarruf?.karsilastirilanAlim).toBe(2)
  })

  it('alımlar zamanda uzaksa tasarruf hesaplamaz', () => {
    // 7 günlük pencerenin dışında; "o gün öbürü ucuzdu" denemez
    const a = analyzeFuelPrices([
      kayit('2026-01-02', 'Ucuz', 40),
      kayit('2026-03-05', 'Pahali', 44),
    ])
    expect(a.tasarruf).toBeNull()
  })

  it('aynı istasyonun kendi geçmişini alternatif saymaz', () => {
    // Aynı istasyonda fiyat düştüyse bu bir "seçim" değil, zamanlamadır
    const a = analyzeFuelPrices([
      kayit('2026-01-02', 'A', 44),
      kayit('2026-01-04', 'A', 40),
    ])
    expect(a.tasarruf).toBeNull()
  })

  it('karşılaştırılan tutarı da verir (oran hesabının paydası)', () => {
    const a = analyzeFuelPrices([
      kayit('2026-01-02', 'Ucuz', 40, 10),
      kayit('2026-01-05', 'Pahali', 44, 10),
    ])
    expect(a.tasarruf?.karsilastirilanTutar).toBe(40 * 10 + 44 * 10)
  })
})

describe('analyzeFuelPrices — aylık fiyat seyri', () => {
  it('litre ağırlıklı aylık ortalama üretir', () => {
    // 10 L × 40 + 90 L × 50 = 4900 / 100 L = 49 ₺/L. Basit ortalama 45 derdi.
    const a = analyzeFuelPrices([
      kayit('2026-01-05', 'A', 40, 10),
      kayit('2026-01-20', 'A', 50, 90),
      kayit('2026-02-05', 'B', 52, 50),
    ])
    expect(a.aylikFiyatlar).toHaveLength(2)
    expect(a.aylikFiyatlar[0]).toMatchObject({ ay: '2026-01', litre: 100 })
    expect(a.aylikFiyatlar[0].ortFiyat).toBeCloseTo(49, 6)
    expect(a.aylikFiyatlar[1].ay).toBe('2026-02')
  })

  it('tek istasyon olsa bile fiyat seyrini verir', () => {
    const a = analyzeFuelPrices([
      kayit('2026-01-05', 'A', 40),
      kayit('2026-02-05', 'A', 45),
    ])
    expect(a.aylikFiyatlar).toHaveLength(2)
    expect(a.istasyonlar).toEqual([])
    expect(a.yetersizVeri).toMatch(/iki farklı istasyon/i)
  })
})

describe('analyzeFuelPrices — dayanıklılık', () => {
  it('yetersiz veride sebebini söyler, boş kutu göstermez', () => {
    expect(analyzeFuelPrices([]).yetersizVeri).toMatch(/en az iki/i)
    expect(analyzeFuelPrices([kayit('2026-01-01', 'A', 40)]).yetersizVeri).toMatch(/en az iki/i)
  })

  it('bozuk kayıtları eler', () => {
    const a = analyzeFuelPrices([
      kayit('2026-01-02', 'A', 40),
      kayit('2026-01-03', 'B', 44),
      { ...kayit('gecersiz-tarih', 'C', 99), date: 'abc' },
      { ...kayit('2026-01-04', 'D', 0, 0), pricePerLiter: 0, liters: 0, totalCost: 0 },
    ])
    expect(a.istasyonlar.map(i => i.station).sort()).toEqual(['A', 'B'])
  })

  it('pricePerLiter boşsa toplam tutardan türetir', () => {
    // Eski kayıtlarda bu alan boş kalabiliyor
    const a = analyzeFuelPrices([
      { ...kayit('2026-01-02', 'A', 40, 10), pricePerLiter: 0, totalCost: 400 },
      kayit('2026-01-03', 'B', 44, 10),
    ])
    expect(a.istasyonlar[0].station).toBe('A')
    expect(a.tasarruf?.toplam).toBeCloseTo(40, 6) // (44-40) × 10
  })

  it('tek bir hatalı fiyat piyasa seviyesini kaydırmaz (ortanca)', () => {
    // 400 ₺/L açıkça yanlış girilmiş bir kayıt. Ortalama alsaydık piyasa ~120 olur,
    // normal istasyonların hepsi "çok ucuz" görünürdü.
    const a = analyzeFuelPrices([
      kayit('2026-01-02', 'A', 40),
      kayit('2026-01-03', 'B', 42),
      kayit('2026-01-04', 'A', 41),
      kayit('2026-01-05', 'Hatali', 400),
    ])
    const normalSapmalar = a.istasyonlar
      .filter(i => i.station !== 'Hatali')
      .map(i => i.ortSapma)
    expect(Math.max(...normalSapmalar.map(Math.abs))).toBeLessThan(5)
  })

  it('istasyonu boş kayıtları tek grupta toplar', () => {
    const a = analyzeFuelPrices([
      { ...kayit('2026-01-02', 'A', 40), station: null },
      { ...kayit('2026-01-03', 'B', 44), station: '   ' },
      kayit('2026-01-04', 'A', 40),
    ])
    expect(a.istasyonlar.some(i => i.station === 'Belirtilmemiş')).toBe(true)
  })
})
