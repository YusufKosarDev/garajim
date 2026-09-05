import { describe, it, expect } from 'vitest'
import {
  getHighestKm,
  getLastFuelKm,
  checkMaintenanceKm,
  checkFuelKm,
} from './kmHelpers'

const arac = { id: 'v1', currentKm: 50000 }

describe('getHighestKm', () => {
  it('araç, bakım ve yakıt kayıtlarının en yükseğini bulur', () => {
    const bakim = [{ id: 'm1', km: 48000 }]
    const yakit = [{ id: 'f1', km: 52000 }]
    expect(getHighestKm(arac, bakim, yakit)).toBe(52000)
  })

  it('araç km en yüksekse onu döner', () => {
    expect(getHighestKm(arac, [{ id: 'm1', km: 10000 }], [])).toBe(50000)
  })

  it('düzenlenen kaydı hesaba katmaz', () => {
    const yakit = [{ id: 'f1', km: 90000 }]
    // f1 hariç tutulunca en yüksek araç km'si kalır
    expect(getHighestKm(arac, [], yakit, 'f1')).toBe(50000)
  })

  it('hiç veri yoksa 0 döner', () => {
    expect(getHighestKm({}, [], [])).toBe(0)
    expect(getHighestKm(null, [], [])).toBe(0)
  })

  it('km alanı olmayan kayıtları atlar', () => {
    expect(getHighestKm({ currentKm: 100 }, [{ id: 'm1' }], [{ id: 'f1', km: null }])).toBe(100)
  })
})

describe('getLastFuelKm', () => {
  it('en yüksek yakıt km değerini verir', () => {
    const yakit = [{ id: 'f1', km: 1000 }, { id: 'f2', km: 3000 }, { id: 'f3', km: 2000 }]
    expect(getLastFuelKm(yakit)).toBe(3000)
  })

  it('düzenlenen kaydı dışlar', () => {
    const yakit = [{ id: 'f1', km: 1000 }, { id: 'f2', km: 3000 }]
    expect(getLastFuelKm(yakit, 'f2')).toBe(1000)
  })

  it('kayıt yoksa 0 döner', () => {
    expect(getLastFuelKm([])).toBe(0)
    expect(getLastFuelKm([{ id: 'f1', km: 100 }], 'f1')).toBe(0)
  })
})

describe('checkMaintenanceKm', () => {
  it('en yüksek km üstündeki değeri sorunsuz kabul eder', () => {
    expect(checkMaintenanceKm(60000, arac, [], []).needsConfirm).toBe(false)
  })

  it('düşük km girilirse onay ister (hata değil — geçmişe dönük kayıt olabilir)', () => {
    const sonuc = checkMaintenanceKm(40000, arac, [], [])
    expect(sonuc.needsConfirm).toBe(true)
    expect(sonuc.message).toContain('40.000')
    expect(sonuc.message).toContain('50.000')
  })

  it('en yüksek km ile aynı değer onay gerektirmez', () => {
    expect(checkMaintenanceKm(50000, arac, [], []).needsConfirm).toBe(false)
  })
})

describe('checkFuelKm', () => {
  const yakit = [{ id: 'f1', km: 50000 }]

  it('artan km değerini kabul eder', () => {
    expect(checkFuelKm(50500, yakit).isValid).toBe(true)
  })

  it('aynı km değerini reddeder (tüketim hesabını bozar)', () => {
    expect(checkFuelKm(50000, yakit).isValid).toBe(false)
  })

  it('azalan km değerini reddeder ve son km bilgisini verir', () => {
    const sonuc = checkFuelKm(49000, yakit)
    expect(sonuc.isValid).toBe(false)
    expect(sonuc.message).toContain('50.000')
  })

  it('ilk yakıt kaydında kısıt yoktur', () => {
    expect(checkFuelKm(1000, []).isValid).toBe(true)
  })

  it('düzenlenen kaydı kendisiyle karşılaştırmaz', () => {
    expect(checkFuelKm(50000, yakit, 'f1').isValid).toBe(true)
  })
})
