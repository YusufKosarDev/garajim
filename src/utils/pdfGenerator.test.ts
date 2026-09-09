import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import i18n from '../i18n'
import type { Vehicle, MaintenanceRecord, FuelRecord } from '../types'

/**
 * PDF üreticisi DİNAMİK import ediliyor (bkz. VehicleDetail.jsx).
 *
 * Burada iki ayrı şey sınanıyor:
 *
 * 1. Modülün dinamik import edildiğinde HÂLÂ ÇÖZÜLDÜĞÜ. Statik import
 *    kaldırıldığı için başka hiçbir test bu dosyaya dokunmuyor; bozuk bir
 *    import zinciri ancak kullanıcı butona bastığında ortaya çıkardı.
 *
 * 2. Rapordaki ETİKETLERİN aktif dilde geldiği. Rapor uzun süre tamamen
 *    Türkçeydi; arayüz İngilizce'ye alındığında da öyle kalıyordu. PDF
 *    çıktısının kendisini ayrıştırmak kırılgan olurdu, o yüzden jsPDF ve
 *    jspdf-autotable taklit ediliyor ve onlara GEÇİLEN METİNLER toplanıyor.
 *
 * Kasıtlı olarak sınanmayanlar: '₺' ve tr-TR sayı gruplaması çevrilmiyor
 * (tutarlar Türk Lirası cinsinden), 'GARAJIM' ürün adı, fuelType/type ise
 * veritabanı değeri.
 */

const yazilanMetinler: string[] = []
const tabloBasliklari: unknown[] = []

vi.mock('jspdf', () => {
  class FakeJsPDF {
    internal = {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
      getNumberOfPages: () => 1,
    }
    lastAutoTable = { finalY: 60 }
    addFileToVFS() {}
    addFont() {}
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setDrawColor() {}
    setLineWidth() {}
    line() {}
    addPage() {}
    setPage() {}
    text(value: string) { yazilanMetinler.push(value) }
    save() {}
  }
  return { default: FakeJsPDF }
})

vi.mock('jspdf-autotable', () => ({
  default: (_doc: unknown, options: { head?: unknown; body?: unknown }) => {
    if (options.head) tabloBasliklari.push(options.head)
    if (options.body) tabloBasliklari.push(options.body)
  },
}))

// Fontlar fetch ile iniyor; jsdom'da gerçek istek yapamayız.
beforeEach(() => {
  yazilanMetinler.length = 0
  tabloBasliklari.length = 0
  vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(4) })))
  vi.stubGlobal('btoa', () => 'ZmFrZQ==')
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await i18n.changeLanguage('tr')
})

afterAll(async () => {
  await i18n.changeLanguage('tr')
})

const vehicle: Vehicle = {
  id: 'v1', plate: '34 ABC 123', brand: 'BMW', model: '320i', year: 2018,
  fuelType: 'Benzin', currentKm: 90000,
  inspectionDate: '2026-08-01', mtvDate: '2026-07-31',
  insuranceDate: '2026-09-10', kaskoDate: '2026-10-05',
} as Vehicle

const maintenance: MaintenanceRecord[] = [
  { id: 'm1', vehicleId: 'v1', type: 'Yağ Değişimi', date: '2026-05-01', km: 88000, cost: 3500 } as MaintenanceRecord,
]

const fuel: FuelRecord[] = [
  { id: 'f1', vehicleId: 'v1', date: '2026-06-01', km: 89000, liters: 45, pricePerLiter: 42.5, totalCost: 1912.5, fullTank: true } as FuelRecord,
]

const tumMetin = () => [...yazilanMetinler, JSON.stringify(tabloBasliklari)].join(' | ')

describe('pdfGenerator — dinamik import', () => {
  it('modül çözülür ve generateVehicleReport dışa aktarılır', async () => {
    const modul = await import('./pdfGenerator')
    expect(typeof modul.generateVehicleReport).toBe('function')
  })
})

describe('pdfGenerator — rapor etiketleri aktif dilde', () => {
  it('Türkçede Türkçe başlıklar üretir', async () => {
    const { generateVehicleReport } = await import('./pdfGenerator')
    await i18n.changeLanguage('tr')
    await generateVehicleReport(vehicle, maintenance, fuel)

    const metin = tumMetin()
    expect(metin).toContain('ÖZET')
    expect(metin).toContain('BAKIM KAYITLARI')
    expect(metin).toContain('YAKIT KAYITLARI')
    expect(metin).toContain('Araç Takip Asistanı')
    expect(metin).toContain('Marka / Model')
    expect(metin).toContain('GENEL TOPLAM')
  })

  it('İngilizcede İngilizce başlıklar üretir', async () => {
    const { generateVehicleReport } = await import('./pdfGenerator')
    await i18n.changeLanguage('en')
    await generateVehicleReport(vehicle, maintenance, fuel)

    const metin = tumMetin()
    expect(metin).toContain('SUMMARY')
    expect(metin).toContain('SERVICE RECORDS')
    expect(metin).toContain('FUEL RECORDS')
    expect(metin).toContain('Make / Model')
    expect(metin).toContain('GRAND TOTAL')
    // Türkçe başlıklardan hiçbiri sızmamalı
    expect(metin).not.toContain('ÖZET')
    expect(metin).not.toContain('BAKIM KAYITLARI')
    expect(metin).not.toContain('Marka / Model')
  })

  it('para birimi ve DB değerleri İngilizcede de değişmez', async () => {
    const { generateVehicleReport } = await import('./pdfGenerator')
    await i18n.changeLanguage('en')
    await generateVehicleReport(vehicle, maintenance, fuel)

    const metin = tumMetin()
    // ₺ ve tr-TR gruplaması kasıtlı olarak korunuyor
    expect(metin).toContain('₺')
    expect(metin).toContain('90.000 km')
    // fuelType ve bakım türü veritabanı değeri — çevrilmemeli
    expect(metin).toContain('Benzin')
    expect(metin).toContain('Yağ Değişimi')
  })
})
