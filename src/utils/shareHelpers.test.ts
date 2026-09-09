import { describe, it, expect, vi, afterEach } from 'vitest'
import LZString from 'lz-string'
import { encodeShareData, decodeShareData, getShareUrlSize } from './shareHelpers'
import type { Vehicle, MaintenanceRecord, FuelRecord } from '../types'

/**
 * `/share/:encodedData` kimlik doğrulaması olmayan TEK rota ve içeriği tamamen
 * URL'den geliyor. Eskiden yalnızca `version` alanına bakılıyor, gerisi olduğu
 * gibi bileşene veriliyordu; uydurulmuş bir link beklenen alanların yerine
 * herhangi bir şeyi koyabiliyordu.
 *
 * Bu testler iki yönü birlikte tutuyor: gerçek yük hâlâ çözülüyor (gidiş-dönüş)
 * VE bozuk/uydurma yük sessizce null dönüyor.
 */

const vehicle = {
  id: 'v1', plate: '34 ABC 123', brand: 'BMW', model: '320i', year: 2018,
  fuelType: 'Benzin', currentKm: 90000,
  inspectionDate: '2026-08-01', mtvDate: '2026-07-31',
  insuranceDate: '2026-09-10', kaskoDate: '2026-10-05',
  notes: 'Not', photos: ['https://ornek/foto.jpg'],
} as Vehicle

const maintenance = [
  { id: 'm1', vehicleId: 'v1', type: 'Yağ Değişimi', date: '2026-05-01', km: 88000, cost: 3500, notes: '' },
] as MaintenanceRecord[]

const fuel = [
  { id: 'f1', vehicleId: 'v1', date: '2026-06-01', km: 89000, liters: 45, pricePerLiter: 42.5, totalCost: 1912.5, fullTank: true, station: 'Shell' },
] as FuelRecord[]

const paketle = (obj: unknown) => LZString.compressToEncodedURIComponent(JSON.stringify(obj))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('shareHelpers — gidiş dönüş', () => {
  it('kodlanan yük aynen çözülür', () => {
    const decoded = decodeShareData(encodeShareData(vehicle, maintenance, fuel))
    expect(decoded).not.toBeNull()
    expect(decoded!.vehicle.plate).toBe('34 ABC 123')
    expect(decoded!.maintenance).toHaveLength(1)
    expect(decoded!.fuel[0].liters).toBe(45)
  })

  it('fotoğraflar yüke dahil edilmez — URL şişmesin', () => {
    const encoded = encodeShareData(vehicle, maintenance, fuel)
    expect(encoded).not.toContain('foto.jpg')
    expect(getShareUrlSize(encoded).chars).toBeGreaterThan(0)
  })

  it('boş kayıt listeleriyle de çalışır', () => {
    const decoded = decodeShareData(encodeShareData(vehicle, [], []))
    expect(decoded!.maintenance).toEqual([])
    expect(decoded!.fuel).toEqual([])
  })
})

describe('shareHelpers — güvensiz girdi reddedilir', () => {
  it('bozuk dizge null döner', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(decodeShareData('bu-gecerli-bir-lz-payload-degil!!!')).toBeNull()
    expect(decodeShareData('')).toBeNull()
  })

  it('desteklenmeyen versiyon null döner', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(decodeShareData(paketle({ version: 2, vehicle: {}, maintenance: [], fuel: [] }))).toBeNull()
    expect(decodeShareData(paketle({ vehicle: {}, maintenance: [], fuel: [] }))).toBeNull()
  })

  it('eksik üst düzey alanlar null döner', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(decodeShareData(paketle({ version: 1, vehicle: {}, maintenance: [] }))).toBeNull()
    expect(decodeShareData(paketle({ version: 1, maintenance: [], fuel: [] }))).toBeNull()
  })

  it('YANLIŞ TİPTE alanlar null döner — eskiden bileşene kadar geçiyordu', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // fuel bir dizi değil: SharedReport'ta fuel.map(...) patlardı
    expect(decodeShareData(paketle({ version: 1, vehicle: {}, maintenance: [], fuel: 'hop' }))).toBeNull()
    // vehicle bir obje değil
    expect(decodeShareData(paketle({ version: 1, vehicle: 'hop', maintenance: [], fuel: [] }))).toBeNull()
    // kayıt içindeki alan beklenmedik tipte
    expect(decodeShareData(paketle({
      version: 1, vehicle: {}, maintenance: [{ type: { kotu: true } }], fuel: [],
    }))).toBeNull()
  })

  it('null ve eksik alanlara TOLERANSLI — eski linkler çalışmaya devam eder', () => {
    // Şema kasıtlı olarak nullish'e izin veriyor: daha önce paylaşılmış
    // linklerde bu alanlar boş olabilir.
    const decoded = decodeShareData(paketle({
      version: 1,
      sharedAt: null,
      vehicle: { plate: 'AA', brand: null, year: '2010', currentKm: null },
      maintenance: [{ id: 'm', type: 'X', date: '2026-01-01', km: null, cost: null }],
      fuel: [],
    }))
    expect(decoded).not.toBeNull()
    expect(decoded!.vehicle.plate).toBe('AA')
    expect(decoded!.vehicle.year).toBe('2010')
  })
})
