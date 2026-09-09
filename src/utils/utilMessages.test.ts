import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import i18n from '../i18n'
import { evaluateTire, getSeasonChangeSuggestion } from './tireHelpers'
import { estimateVehicleValue } from './vehicleValuation'
import { buildVehicleEvents } from './calendarEvents'
import type { Vehicle } from '../types'

/**
 * Util'lerin döndürdüğü KULLANICIYA GÖRÜNEN metinler aktif dile uyuyor mu?
 *
 * NEDEN GEREKLİ: tireHelpers, vehicleValuation ve calendarEvents uzun süre
 * sabit Türkçe dizge döndürdü. Bileşenler bu dizgeleri olduğu gibi bastığı için
 * arayüz İngilizce'ye alındığında lastik uyarıları, değer tahmini notları,
 * takvim etiketleri ve .ics çıktısı Türkçe kalıyordu.
 *
 * Bu dosyadaki testler dili AÇIKÇA 'en'e alıyor. Projedeki diğer tüm testler
 * src/test/setup.js sayesinde 'tr'de koşuyor ve o yüzden bu hatayı göremezler:
 * t() Türkçe döndürdüğünde assertion'lar mutlu olur. Dil değiştirmeyi buraya
 * hapsedip her testin sonunda 'tr'ye dönüyoruz ki başka dosyaları etkilemesin.
 */

const NOW = new Date(2026, 5, 15, 12, 0, 0) // 15 Haziran 2026

const vehicle = (over: Partial<Vehicle> = {}): Vehicle => ({
  id: 'v1',
  plate: '34 ABC 123',
  brand: 'BMW',
  model: '320i',
  year: 2018,
  currentKm: 90000,
  inspectionDate: '2026-08-01',
  mtvDate: '2026-07-31',
  insuranceDate: '2026-09-10',
  kaskoDate: '2026-10-05',
  ...over,
} as Vehicle)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(async () => {
  vi.useRealTimers()
  await i18n.changeLanguage('tr')
})

afterAll(async () => {
  await i18n.changeLanguage('tr')
})

describe('tireHelpers — uyarılar aktif dilde gelir', () => {
  it('diş derinliği uyarısı İngilizce', async () => {
    await i18n.changeLanguage('en')
    const { warnings } = evaluateTire({ treadDepth: 1.5 })
    expect(warnings[0].message).toBe('Below the legal minimum (1.5mm)')
  })

  it('yaş uyarısı İngilizce ve yıl değeri korunur', async () => {
    await i18n.changeLanguage('en')
    // 2013'te üretilmiş: 2026'da 10+ yaşında
    const { warnings } = evaluateTire({ dot: '0113' })
    expect(warnings[0].message).toMatch(/^13(\.\d)? years old — replace it$/)
  })

  it('mevsim değişim önerisi İngilizce', async () => {
    vi.setSystemTime(new Date(2026, 10, 10)) // 10 Kasım — kış lastiği vakti
    await i18n.changeLanguage('en')
    expect(getSeasonChangeSuggestion('summer')?.message)
      .toBe('Winter tires are due — time is running out')
  })

  it('Türkçeye dönünce aynı uyarı Türkçe gelir', async () => {
    await i18n.changeLanguage('en')
    await i18n.changeLanguage('tr')
    const { warnings } = evaluateTire({ treadDepth: 1.5 })
    expect(warnings[0].message).toBe('Minimum yasal sınırın altında (1.5mm)')
  })
})

describe('vehicleValuation — uyarılar aktif dilde gelir', () => {
  it('bakım kaydı yok uyarısı İngilizce', async () => {
    await i18n.changeLanguage('en')
    const uyarilar = estimateVehicleValue(vehicle(), [], { today: NOW })!.warnings.join(' ')
    expect(uyarilar).toMatch(/No service records for this vehicle/)
    expect(uyarilar).not.toMatch(/bakım kaydı yok/i)
  })

  it('km girilmemiş uyarısı İngilizce', async () => {
    await i18n.changeLanguage('en')
    const uyarilar = estimateVehicleValue(vehicle({ currentKm: 0 }), [], { today: NOW })!.warnings.join(' ')
    expect(uyarilar).toMatch(/odometer reading is missing/)
  })
})

describe('calendarEvents — etiketler aktif dilde gelir', () => {
  it('yasal tarih etiketleri İngilizce', async () => {
    await i18n.changeLanguage('en')
    const events = buildVehicleEvents([vehicle()])
    expect(events.map(e => e.label)).toEqual(['Inspection', 'MTV', 'Insurance', 'Comprehensive Cover'])
  })

  it('etiketler modül yüklenirken DONMUYOR — dil değişince güncellenir', async () => {
    // Bu testin varlık sebebi: i18n.t() modül seviyesinde çağrılsaydı etiketler
    // ilk import anındaki dile sabitlenirdi ve bu assertion kırılırdı.
    await i18n.changeLanguage('tr')
    expect(buildVehicleEvents([vehicle()])[0].label).toBe('Muayene')
    await i18n.changeLanguage('en')
    expect(buildVehicleEvents([vehicle()])[0].label).toBe('Inspection')
  })
})
