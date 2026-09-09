import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import i18n from '../i18n'
import { evaluateTire, getSeasonChangeSuggestion } from './tireHelpers'
import { estimateVehicleValue } from './vehicleValuation'
import { buildVehicleEvents } from './calendarEvents'
import { validatePastDate, validateVehicleYear } from './dateValidation'
import { checkFuelKm } from './kmHelpers'
import { makeVehicleSchema, makeMaintenanceSchema } from '../lib/formSchemas'
import type { Vehicle, FuelRecord } from '../types'

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

describe('dateHelpers — tarih biçimi aktif dile uyar', () => {
  it('Türkçede Türkçe ay adı', async () => {
    const { formatDate } = await import('./dateHelpers')
    await i18n.changeLanguage('tr')
    expect(formatDate('2026-06-15')).toBe('15 Haziran 2026')
  })

  it('İngilizcede İngilizce ay adı', async () => {
    const { formatDate } = await import('./dateHelpers')
    await i18n.changeLanguage('en')
    expect(formatDate('2026-06-15')).toBe('15 June 2026')
  })

  it('göreli tarih ifadeleri de çevrilir', async () => {
    const { formatRelative } = await import('./dateHelpers')
    await i18n.changeLanguage('en')
    expect(formatRelative('2026-06-15')).toBe('today')
    expect(formatRelative('2026-06-16')).toBe('tomorrow')
    expect(formatRelative('2026-06-18')).toBe('in 3 days')
    expect(formatRelative('2026-06-12')).toBe('3 days ago')
  })

  it('para birimi ÇEVRİLMEZ — ₺ ve tr-TR gruplaması veri özelliği', async () => {
    // Bilinçli karar: tutarlar Türk Lirası cinsinden, arayüz dili ne olursa
    // olsun ₺ ve "1.234,56" gruplaması korunuyor. Tarih biçimi ise saf sunum
    // olduğu için dile uyuyor. Bu testin varlık sebebi ayrımı belgelemek.
    await i18n.changeLanguage('en')
    expect((1234.5).toLocaleString('tr-TR')).toBe('1.234,5')
  })
})

describe('form doğrulama katmanı — hatalar aktif dilde gelir', () => {
  it('dateValidation: alan adı ve mesaj İngilizce', async () => {
    await i18n.changeLanguage('en')
    expect(validatePastDate('2026-06-16', 'Service date').message)
      .toBe('Service date cannot be in the future')
    expect(validateVehicleYear(1900).message).toBe('Year cannot be earlier than 1950')
  })

  it('dateValidation: varsayılan alan adı da çevrilir', async () => {
    await i18n.changeLanguage('en')
    // Varsayılan çağrı anında çözülüyor; modül seviyesinde olsaydı 'Tarih' donardı
    expect(validatePastDate('2026-06-16').message).toBe('Date cannot be in the future')
  })

  it('kmHelpers: yakıt km hatası İngilizce, sayılar korunur', async () => {
    await i18n.changeLanguage('en')
    const records = [{ id: 'f1', vehicleId: 'v1', date: '2026-06-01', km: 50000 }] as FuelRecord[]
    const result = checkFuelKm(40000, records)
    expect(result.isValid).toBe(false)
    expect(result.message).toContain('50.000')
    expect(result.message).toMatch(/must be higher than that/)
  })

  it('formSchemas: zorunlu alan hataları İngilizce', async () => {
    await i18n.changeLanguage('en')
    const parsed = makeVehicleSchema().safeParse({
      plate: '', brand: '', model: '', year: '', fuelType: '',
      currentKm: '', inspectionDate: '', mtvDate: '', insuranceDate: '',
      kaskoDate: '', notes: '', photos: [],
    })
    expect(parsed.success).toBe(false)
    const messages = parsed.error!.issues.map(i => i.message)
    expect(messages).toContain('Plate is required')
    expect(messages).toContain('Brand is required')
    expect(messages).toContain('Model is required')
  })

  it('formSchemas: şema HER ÇAĞRIDA kurulur, dile donmaz', async () => {
    // maintenanceSchema eskiden modül seviyesinde bir sabitti; mesajları
    // uygulamanın açılış diline donuyordu. Fabrikaya çevrilmesinin sebebi bu.
    const bos = { type: '', customType: '', date: '', km: '', cost: '', notes: '', photo: null }

    await i18n.changeLanguage('tr')
    const tr = makeMaintenanceSchema().safeParse(bos)
    expect(tr.error!.issues.map(i => i.message)).toContain('Tarih zorunlu')

    await i18n.changeLanguage('en')
    const en = makeMaintenanceSchema().safeParse(bos)
    expect(en.error!.issues.map(i => i.message)).toContain('Date is required')
  })
})
