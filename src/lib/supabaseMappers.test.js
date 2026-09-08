import { describe, it, expect } from 'vitest'
import {
  vehicleFromDb,
  vehicleToDb,
  maintenanceFromDb,
  maintenanceToDb,
  fuelFromDb,
  fuelToDb,
  tireSetFromDb,
  tireSetToDb,
  tireChangeFromDb,
  tireChangeToDb,
  customIntervalToDb,
  customIntervalsFromDbRows,
  formatSupabaseError,
} from './supabaseMappers'

const USER = 'user-uuid'

describe('vehicle mapper', () => {
  it('snake_case satırı camelCase nesneye çevirir', () => {
    const nesne = vehicleFromDb({
      id: 'v1', plate: '34 ABC 1234', brand: 'BMW', model: '320i', year: 2020,
      fuel_type: 'benzin', current_km: 100000, inspection_date: '2027-01-01',
      mtv_date: '2026-07-01', insurance_date: '2026-09-01', kasko_date: '2026-10-01',
      notes: 'not', photos: ['a.jpg'], created_at: 'x', updated_at: 'y',
    })
    expect(nesne.fuelType).toBe('benzin')
    expect(nesne.currentKm).toBe(100000)
    expect(nesne.inspectionDate).toBe('2027-01-01')
    expect(nesne.kaskoDate).toBe('2026-10-01')
    expect(nesne.photos).toEqual(['a.jpg'])
  })

  it('photos null ise boş diziye düşer', () => {
    expect(vehicleFromDb({ id: 'v1', photos: null }).photos).toEqual([])
  })

  it('satır yoksa null döner', () => {
    expect(vehicleFromDb(null)).toBeNull()
  })

  it('DB e yazarken user_id ekler ve camelCase i snake_case e çevirir', () => {
    const row = vehicleToDb({ plate: '34 A 1', brand: 'BMW', model: '320i', fuelType: 'dizel', currentKm: 5 }, USER)
    expect(row.user_id).toBe(USER)
    expect(row.fuel_type).toBe('dizel')
    expect(row.current_km).toBe(5)
    expect(row).not.toHaveProperty('fuelType')
  })

  it('boş tarihleri null a çevirir (Postgres boş string i tarih olarak kabul etmez)', () => {
    const row = vehicleToDb({ inspectionDate: '', mtvDate: '', insuranceDate: '', kaskoDate: '' }, USER)
    expect(row.inspection_date).toBeNull()
    expect(row.mtv_date).toBeNull()
    expect(row.insurance_date).toBeNull()
    expect(row.kasko_date).toBeNull()
  })

  it('km verilmezse 0 a düşer', () => {
    expect(vehicleToDb({}, USER).current_km).toBe(0)
  })

  it('gidiş-dönüş anlamlı alanları korur', () => {
    const orijinal = { plate: '34 ABC 1234', brand: 'BMW', model: '320i', year: 2020, fuelType: 'benzin', currentKm: 100000 }
    const geri = vehicleFromDb({ id: 'v1', ...vehicleToDb(orijinal, USER) })
    expect(geri).toMatchObject(orijinal)
  })
})

describe('maintenance mapper', () => {
  it('photo_url alanını photo olarak açar (eski sistemle uyum)', () => {
    expect(maintenanceFromDb({ id: 'm1', photo_url: 'x.jpg' }).photo).toBe('x.jpg')
    expect(maintenanceToDb({ photo: 'x.jpg' }, USER).photo_url).toBe('x.jpg')
  })

  it('cost alanını sayıya çevirir (Postgres numeric string döndürür)', () => {
    expect(maintenanceFromDb({ id: 'm1', cost: '1234.56' }).cost).toBe(1234.56)
  })

  it('cost yoksa 0 döner', () => {
    expect(maintenanceFromDb({ id: 'm1', cost: null }).cost).toBe(0)
    expect(maintenanceToDb({}, USER).cost).toBe(0)
  })

  it('vehicle_id eşlemesini iki yönde de yapar', () => {
    expect(maintenanceFromDb({ id: 'm1', vehicle_id: 'v1' }).vehicleId).toBe('v1')
    expect(maintenanceToDb({ vehicleId: 'v1' }, USER).vehicle_id).toBe('v1')
  })
})

describe('fuel mapper', () => {
  it('numeric alanları sayıya çevirir', () => {
    const nesne = fuelFromDb({ id: 'f1', liters: '40.5', price_per_liter: '45.20', total_cost: '1830.60' })
    expect(nesne.liters).toBe(40.5)
    expect(nesne.pricePerLiter).toBe(45.2)
    expect(nesne.totalCost).toBe(1830.6)
  })

  it('full_tank <-> fullTank eşlemesi', () => {
    expect(fuelFromDb({ id: 'f1', full_tank: true }).fullTank).toBe(true)
    expect(fuelToDb({ fullTank: true }, USER).full_tank).toBe(true)
  })

  it('fullTank belirtilmezse false a düşer', () => {
    expect(fuelToDb({}, USER).full_tank).toBe(false)
  })
})

describe('tire mapper', () => {
  it('tire set alanlarını çevirir', () => {
    const nesne = tireSetFromDb({ id: 't1', vehicle_id: 'v1', season: 'winter', purchase_date: '2025-01-01', purchase_price: '8000', tires: [{ code: 'FL' }] })
    expect(nesne.vehicleId).toBe('v1')
    expect(nesne.purchaseDate).toBe('2025-01-01')
    expect(nesne.purchasePrice).toBe(8000)
    expect(nesne.tires).toHaveLength(1)
  })

  it('tires null ise boş dizi', () => {
    expect(tireSetFromDb({ id: 't1', tires: null }).tires).toEqual([])
    expect(tireSetToDb({}, USER).tires).toEqual([])
  })

  it('tire change sezon alanlarını çevirir', () => {
    const nesne = tireChangeFromDb({ id: 'c1', from_season: 'summer', to_season: 'winter', cost: '500' })
    expect(nesne.fromSeason).toBe('summer')
    expect(nesne.toSeason).toBe('winter')
    expect(nesne.cost).toBe(500)
  })

  it('fromSeason boşsa null yazar (ilk takılışta önceki sezon yok)', () => {
    expect(tireChangeToDb({ toSeason: 'winter' }, USER).from_season).toBeNull()
  })
})

describe('custom interval mapper', () => {
  it('DB satırlarını "vehicleId-tür" anahtarlı haritaya çevirir', () => {
    const harita = customIntervalsFromDbRows([
      { vehicle_id: 'v1', maintenance_type: 'Yağ Değişimi', kilometers: 7500, months: 12 },
      { vehicle_id: 'v2', maintenance_type: 'Buji', kilometers: 25000, months: null },
    ])
    expect(harita['v1-Yağ Değişimi']).toEqual({ kilometers: 7500, months: 12 })
    expect(harita['v2-Buji']).toEqual({ kilometers: 25000, months: null })
  })

  it('boş/geçersiz girdide boş harita döner', () => {
    expect(customIntervalsFromDbRows(null)).toEqual({})
    expect(customIntervalsFromDbRows([])).toEqual({})
    expect(customIntervalsFromDbRows('dizi değil')).toEqual({})
  })

  it('tek ayarı DB satırına çevirir', () => {
    const row = customIntervalToDb('v1', 'Yağ Değişimi', { kilometers: 7500 }, USER)
    expect(row).toEqual({
      vehicle_id: 'v1', user_id: USER, maintenance_type: 'Yağ Değişimi',
      kilometers: 7500, months: null,
    })
  })
})

describe('formatSupabaseError', () => {
  it('yaygın Postgres hatalarını Türkçeleştirir', () => {
    expect(formatSupabaseError({ message: 'duplicate key value violates...' })).toBe('Bu kayıt zaten var')
    expect(formatSupabaseError({ message: 'insert violates foreign key constraint' })).toBe('Geçersiz referans')
    expect(formatSupabaseError({ message: 'violates check constraint' })).toBe('Geçersiz değer')
    expect(formatSupabaseError({ message: 'null value violates not-null constraint' })).toBe('Eksik alan')
    expect(formatSupabaseError({ message: 'JWT expired' })).toBe('Oturum süresi doldu, tekrar giriş yapın')
    expect(formatSupabaseError({ message: 'Network request failed' })).toBe('İnternet bağlantısı yok')
  })

  it('tanımadığı hatayı olduğu gibi geçirir', () => {
    expect(formatSupabaseError({ message: 'beklenmedik bir şey' })).toBe('beklenmedik bir şey')
  })

  it('hata yoksa genel mesaj döner', () => {
    expect(formatSupabaseError(null)).toBe('Bilinmeyen hata')
  })
})
