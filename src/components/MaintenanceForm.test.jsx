import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MaintenanceForm from './MaintenanceForm'

const addMaintenance = vi.fn()
const updateMaintenance = vi.fn()
let mockCtx

vi.mock('../context/VehicleContext', () => ({ useVehicles: () => mockCtx }))
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }))

const ARAC = { id: 'v1', brand: 'BMW', model: '320i', plate: '34 ABC 1234', currentKm: 100000 }

const doldur = (input, value) => fireEvent.change(input, { target: { value } })

const alan = {
  tur: () => document.querySelector('select'),
  tarih: () => document.querySelector('input[type="date"]'),
  // km ve maliyet alanlarının ikisi de placeholder="0" — ilki km
  km: () => screen.getAllByPlaceholderText('0')[0],
  kaydet: () => screen.getByRole('button', { name: /bakım ekle|güncelle/i }),
}

beforeEach(() => {
  addMaintenance.mockClear()
  updateMaintenance.mockClear()
  mockCtx = {
    addMaintenance, updateMaintenance,
    vehicles: [ARAC], maintenanceRecords: [], fuelRecords: [],
  }
})

const ac = (props = {}) =>
  render(<MaintenanceForm isOpen onClose={vi.fn()} vehicleId="v1" {...props} />)

describe('MaintenanceForm — geçmişe dönük km onayı', () => {
  it('km tutarlıysa onay sormadan kaydeder', () => {
    ac()
    doldur(alan.tur(), 'Yağ Değişimi')
    fireEvent.click(alan.kaydet())

    expect(addMaintenance).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Geçmişe dönük kayıt mı?')).not.toBeInTheDocument()
  })

  it('kayıtlardaki en yüksek km den düşük girilirse onay diyaloğu açar ve HENÜZ kaydetmez', () => {
    mockCtx.fuelRecords = [{ id: 'f1', vehicleId: 'v1', km: 150000, liters: 40, totalCost: 1800 }]
    ac()
    doldur(alan.tur(), 'Yağ Değişimi')
    doldur(alan.km(), '120000')
    fireEvent.click(alan.kaydet())

    // Önceden bu window.confirm ile soruluyordu — artık erişilebilir bir diyalog
    expect(screen.getByRole('dialog', { name: 'Geçmişe dönük kayıt mı?' })).toBeInTheDocument()
    expect(screen.getByText(/150\.000/)).toBeInTheDocument()
    expect(addMaintenance).not.toHaveBeenCalled()
  })

  it('onaylanınca kaydeder', () => {
    mockCtx.fuelRecords = [{ id: 'f1', vehicleId: 'v1', km: 150000, liters: 40, totalCost: 1800 }]
    ac()
    doldur(alan.tur(), 'Yağ Değişimi')
    doldur(alan.km(), '120000')
    fireEvent.click(alan.kaydet())

    fireEvent.click(screen.getByRole('button', { name: 'Evet, kaydet' }))

    expect(addMaintenance).toHaveBeenCalledTimes(1)
    expect(addMaintenance.mock.calls[0][0]).toMatchObject({ vehicleId: 'v1', km: 120000, type: 'Yağ Değişimi' })
  })

  it('vazgeçilirse kaydetmez ve form açık kalır', () => {
    mockCtx.fuelRecords = [{ id: 'f1', vehicleId: 'v1', km: 150000, liters: 40, totalCost: 1800 }]
    ac()
    doldur(alan.tur(), 'Yağ Değişimi')
    doldur(alan.km(), '120000')
    fireEvent.click(alan.kaydet())

    fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }))

    expect(addMaintenance).not.toHaveBeenCalled()
    // Ana form hâlâ açık
    expect(screen.getByRole('dialog', { name: 'Yeni Bakım Kaydı' })).toBeInTheDocument()
  })

  it('zorunlu alan boşken kaydetmez', () => {
    ac()
    fireEvent.click(alan.kaydet())
    expect(screen.getByText('Bakım türü seç veya yaz')).toBeInTheDocument()
    expect(addMaintenance).not.toHaveBeenCalled()
  })
})
