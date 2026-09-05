import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { createSupabaseMock } from '../test/supabaseMock'

// ---------------------------------------------------------------------------
// Mock'lar (vi.mock hoisted olduğu için vi.hoisted ile kuruluyor)
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => {
  return {
    sb: null,
    auth: { user: { id: 'user-1' }, isAuthenticated: true },
    toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => 't'), dismiss: vi.fn() }),
    storage: {
      uploadPhotoFromBase64: vi.fn(async (b64) => 'https://cdn/' + b64.slice(-4) + '.jpg'),
      uploadPhotosBatch: vi.fn(async (arr) => arr.map((b, i) => `https://cdn/yeni-${i}.jpg`)),
      deletePhotosBatch: vi.fn(async () => 1),
      deletePhotoByUrl: vi.fn(async () => true),
      isBase64: (v) => typeof v === 'string' && v.startsWith('data:'),
      BUCKETS: { VEHICLE_PHOTOS: 'vehicle-photos', MAINTENANCE_PHOTOS: 'maintenance-photos' },
    },
  }
})

vi.mock('../lib/supabase', () => ({
  get supabase() { return h.sb.client },
}))
vi.mock('./AuthContext', () => ({ useAuth: () => h.auth }))
vi.mock('react-hot-toast', () => ({ default: h.toast }))
vi.mock('../lib/storageHelpers', () => h.storage)

// Mock'lardan SONRA import edilmeli
const { VehicleProvider, useVehicles } = await import('./VehicleContext')

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------
let ctx

function Probe() {
  ctx = useVehicles()
  return (
    <div data-testid="durum">
      {ctx.isLoaded ? 'hazir' : 'yukleniyor'}|{ctx.vehicles.length}|{ctx.maintenanceRecords.length}|{ctx.fuelRecords.length}
    </div>
  )
}

const aracSatiri = (over = {}) => ({
  id: 'v1', user_id: 'user-1', plate: '34 ABC 1234', brand: 'BMW', model: '320i',
  year: 2020, fuel_type: 'benzin', current_km: 100000,
  inspection_date: null, mtv_date: null, insurance_date: null, kasko_date: null,
  notes: null, photos: [], created_at: 'x', updated_at: 'y', ...over,
})

const bakimSatiri = (over = {}) => ({
  id: 'm1', user_id: 'user-1', vehicle_id: 'v1', type: 'Yağ Değişimi',
  date: '2026-01-01', km: 95000, cost: '1000', notes: null, photo_url: null, ...over,
})

async function kur() {
  render(<VehicleProvider><Probe /></VehicleProvider>)
  await screen.findByText(/hazir/)
}

beforeEach(() => {
  h.sb = createSupabaseMock()
  h.auth = { user: { id: 'user-1' }, isAuthenticated: true }
  Object.values(h.toast).forEach(f => f.mockClear?.())
  h.toast.mockClear()
  Object.values(h.storage).forEach(f => f.mockClear?.())
  // Garaj üyeliği varsayılan
  h.sb.setResponse('garage_members', 'select', { data: [{ garage_id: 'g1' }], error: null })
})

// ===========================================================================
describe('ilk yükleme', () => {
  it('DB satırlarını camelCase state e çevirir', async () => {
    h.sb.setResponse('vehicles', 'select', { data: [aracSatiri()], error: null })
    h.sb.setResponse('maintenance_records', 'select', { data: [bakimSatiri()], error: null })
    await kur()

    expect(ctx.vehicles[0]).toMatchObject({ id: 'v1', plate: '34 ABC 1234', currentKm: 100000, fuelType: 'benzin' })
    expect(ctx.maintenanceRecords[0]).toMatchObject({ id: 'm1', vehicleId: 'v1', cost: 1000 })
  })

  it('yükleme hatasında toast gösterir ama isLoaded yine true olur (uygulama kilitlenmez)', async () => {
    h.sb.setResponse('vehicles', 'select', { data: null, error: { message: 'JWT expired' } })
    await kur()

    expect(h.toast.error).toHaveBeenCalled()
    expect(h.toast.error.mock.calls[0][0]).toContain('Oturum süresi doldu')
    expect(ctx.isLoaded).toBe(true)
  })

  it('oturum yoksa state boşalır ve sorgu yapılmaz', async () => {
    h.auth = { user: null, isAuthenticated: false }
    render(<VehicleProvider><Probe /></VehicleProvider>)
    await screen.findByText(/hazir/)

    expect(ctx.vehicles).toEqual([])
    expect(h.sb.callsFor('vehicles')).toHaveLength(0)
  })
})

// ===========================================================================
describe('addVehicle', () => {
  it('base64 fotoğrafları Storage a yükler ve DB ye URL yazar', async () => {
    await kur()
    h.sb.setResponse('vehicles', 'insert', { data: aracSatiri({ photos: ['https://cdn/yeni-0.jpg'] }), error: null })

    await act(async () => {
      await ctx.addVehicle({ plate: '34 ABC 1234', brand: 'BMW', model: '320i', photos: ['data:image/jpeg;base64,AAA'] })
    })

    expect(h.storage.uploadPhotosBatch).toHaveBeenCalledTimes(1)
    const insert = h.sb.callsFor('vehicles', 'insert')[0]
    expect(insert.payload[0].photos).toEqual(['https://cdn/yeni-0.jpg'])
    expect(insert.payload[0].user_id).toBe('user-1')
    expect(ctx.vehicles).toHaveLength(1)
    expect(h.toast.success).toHaveBeenCalled()
  })

  it('fotoğraf yoksa Storage a hiç gitmez', async () => {
    await kur()
    h.sb.setResponse('vehicles', 'insert', { data: aracSatiri(), error: null })

    await act(async () => { await ctx.addVehicle({ plate: '34 A 1', brand: 'BMW', model: '3' }) })

    expect(h.storage.uploadPhotosBatch).not.toHaveBeenCalled()
  })

  it('DB hatasında state bozulmaz, null döner ve hata toast ı çıkar', async () => {
    await kur()
    h.sb.setResponse('vehicles', 'insert', { data: null, error: { message: 'duplicate key value' } })

    let sonuc
    await act(async () => { sonuc = await ctx.addVehicle({ plate: '34 A 1', brand: 'BMW', model: '3' }) })

    expect(sonuc).toBeNull()
    expect(ctx.vehicles).toHaveLength(0)
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('Bu kayıt zaten var'))
  })
})

// ===========================================================================
describe('updateVehicle', () => {
  it('listeden çıkarılan fotoğrafları Storage dan siler', async () => {
    h.sb.setResponse('vehicles', 'select', {
      data: [aracSatiri({ photos: ['https://cdn/a.jpg', 'https://cdn/b.jpg'] })], error: null,
    })
    await kur()
    h.sb.setResponse('vehicles', 'update', { data: aracSatiri({ photos: ['https://cdn/a.jpg'] }), error: null })

    await act(async () => {
      await ctx.updateVehicle('v1', { plate: '34 ABC 1234', photos: ['https://cdn/a.jpg'] })
    })

    expect(h.storage.deletePhotosBatch).toHaveBeenCalledWith(['https://cdn/b.jpg'], 'vehicle-photos')
  })

  it('DB ye user_id göndermez (RLS sahipliği değiştirilemez)', async () => {
    h.sb.setResponse('vehicles', 'select', { data: [aracSatiri()], error: null })
    await kur()
    h.sb.setResponse('vehicles', 'update', { data: aracSatiri(), error: null })

    await act(async () => { await ctx.updateVehicle('v1', { plate: '34 ABC 1234' }) })

    expect(h.sb.callsFor('vehicles', 'update')[0].payload).not.toHaveProperty('user_id')
  })
})

// ===========================================================================
describe('deleteVehicle', () => {
  it('aracın ve ilgili bakımların fotoğraflarını Storage dan siler, bağlı state i temizler', async () => {
    h.sb.setResponse('vehicles', 'select', { data: [aracSatiri({ photos: ['https://cdn/a.jpg'] })], error: null })
    h.sb.setResponse('maintenance_records', 'select', {
      data: [bakimSatiri({ photo_url: 'https://cdn/fatura.jpg' })], error: null,
    })
    h.sb.setResponse('fuel_records', 'select', {
      data: [{ id: 'f1', vehicle_id: 'v1', date: '2026-01-01', km: 1, liters: '10', total_cost: '100' }], error: null,
    })
    await kur()
    expect(ctx.fuelRecords).toHaveLength(1)

    await act(async () => { await ctx.deleteVehicle('v1') })

    expect(h.storage.deletePhotosBatch).toHaveBeenCalledWith(['https://cdn/a.jpg'], 'vehicle-photos')
    expect(h.storage.deletePhotosBatch).toHaveBeenCalledWith(['https://cdn/fatura.jpg'], 'maintenance-photos')
    // CASCADE DB'de siler; state de temizlenmeli
    expect(ctx.vehicles).toHaveLength(0)
    expect(ctx.maintenanceRecords).toHaveLength(0)
    expect(ctx.fuelRecords).toHaveLength(0)
  })
})

// ===========================================================================
describe('bakım fotoğrafı yaşam döngüsü', () => {
  it('fotoğraf değişince eskisini Storage dan siler', async () => {
    h.sb.setResponse('maintenance_records', 'select', {
      data: [bakimSatiri({ photo_url: 'https://cdn/eski.jpg' })], error: null,
    })
    await kur()
    h.sb.setResponse('maintenance_records', 'update', {
      data: bakimSatiri({ photo_url: 'https://cdn/AAA.jpg' }), error: null,
    })

    await act(async () => {
      await ctx.updateMaintenance('m1', { vehicleId: 'v1', type: 'Yağ Değişimi', date: '2026-01-01', photo: 'data:image/jpeg;base64,AAA' })
    })

    expect(h.storage.uploadPhotoFromBase64).toHaveBeenCalled()
    expect(h.storage.deletePhotoByUrl).toHaveBeenCalledWith('https://cdn/eski.jpg', 'maintenance-photos')
  })

  it('bakım silinince fotoğrafı da silinir', async () => {
    h.sb.setResponse('maintenance_records', 'select', {
      data: [bakimSatiri({ photo_url: 'https://cdn/fis.jpg' })], error: null,
    })
    await kur()

    await act(async () => { await ctx.deleteMaintenance('m1') })

    expect(h.storage.deletePhotoByUrl).toHaveBeenCalledWith('https://cdn/fis.jpg', 'maintenance-photos')
    expect(ctx.maintenanceRecords).toHaveLength(0)
  })
})

// ===========================================================================
describe('realtime', () => {
  it('garaj üyeliği varsa garage_id ile filtreler', async () => {
    await kur()
    await waitFor(() => expect(h.sb.filterFor('vehicles')).toBeDefined())
    expect(h.sb.filterFor('vehicles')).toBe('garage_id=in.(g1)')
  })

  it('üyelik okunamazsa user_id filtresine düşer', async () => {
    h.sb.setResponse('garage_members', 'select', { data: [], error: { message: 'RLS' } })
    await kur()
    await waitFor(() => expect(h.sb.filterFor('vehicles')).toBeDefined())
    expect(h.sb.filterFor('vehicles')).toBe('user_id=eq.user-1')
  })

  it('başka cihazdan gelen INSERT state e eklenir', async () => {
    await kur()
    await waitFor(() => expect(h.sb.filterFor('vehicles')).toBeDefined())

    act(() => {
      h.sb.emit('vehicles', { eventType: 'INSERT', new: aracSatiri({ id: 'v-uzak' }) })
    })

    expect(ctx.vehicles.map(v => v.id)).toContain('v-uzak')
  })

  it('kendi eklediğimiz kaydın echo su tekrar eklenmez', async () => {
    h.sb.setResponse('vehicles', 'select', { data: [aracSatiri()], error: null })
    await kur()
    await waitFor(() => expect(h.sb.filterFor('vehicles')).toBeDefined())
    expect(ctx.vehicles).toHaveLength(1)

    act(() => { h.sb.emit('vehicles', { eventType: 'INSERT', new: aracSatiri() }) })

    expect(ctx.vehicles).toHaveLength(1)
  })

  it('UPDATE ve DELETE olayları state e uygulanır', async () => {
    h.sb.setResponse('vehicles', 'select', { data: [aracSatiri()], error: null })
    await kur()
    await waitFor(() => expect(h.sb.filterFor('vehicles')).toBeDefined())

    act(() => { h.sb.emit('vehicles', { eventType: 'UPDATE', new: aracSatiri({ plate: '06 XYZ 99' }) }) })
    expect(ctx.vehicles[0].plate).toBe('06 XYZ 99')

    act(() => { h.sb.emit('vehicles', { eventType: 'DELETE', old: { id: 'v1' } }) })
    expect(ctx.vehicles).toHaveLength(0)
  })
})

// ===========================================================================
describe('updateCustomIntervals', () => {
  it('UUID araç id li anahtarı doğru ayrıştırır (eski split kırıktı)', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    await kur()

    await act(async () => {
      await ctx.updateCustomIntervals({ [`${uuid}-Yağ Değişimi`]: { kilometers: 7500, months: null } })
    })

    const insert = h.sb.callsFor('custom_intervals', 'insert')[0]
    expect(insert.payload[0]).toMatchObject({
      vehicle_id: uuid,
      maintenance_type: 'Yağ Değişimi',
      kilometers: 7500,
    })
  })

  it('değeri olmayan girdileri DB ye yazmaz', async () => {
    await kur()
    await act(async () => {
      await ctx.updateCustomIntervals({ 'v1-Buji': { kilometers: null, months: null } })
    })
    expect(h.sb.callsFor('custom_intervals', 'insert')).toHaveLength(0)
  })
})
