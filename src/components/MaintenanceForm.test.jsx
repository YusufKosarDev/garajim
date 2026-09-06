import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

// react-hook-form'un handleSubmit'i asenkron
const gonder = async () => {
  fireEvent.click(alan.kaydet())
  await waitFor(() => {})
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
  it('km tutarlıysa onay sormadan kaydeder', async () => {
    ac()
    doldur(alan.tur(), 'Yağ Değişimi')
    await gonder()

    await waitFor(() => expect(addMaintenance).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Geçmişe dönük kayıt mı?')).not.toBeInTheDocument()
  })

  it('kayıtlardaki en yüksek km den düşük girilirse onay diyaloğu açar ve HENÜZ kaydetmez', async () => {
    mockCtx.fuelRecords = [{ id: 'f1', vehicleId: 'v1', km: 150000, liters: 40, totalCost: 1800 }]
    ac()
    doldur(alan.tur(), 'Yağ Değişimi')
    doldur(alan.km(), '120000')
    fireEvent.click(alan.kaydet())

    // Önceden bu window.confirm ile soruluyordu — artık erişilebilir bir diyalog
    expect(await screen.findByRole('dialog', { name: 'Geçmişe dönük kayıt mı?' })).toBeInTheDocument()
    expect(screen.getByText(/150\.000/)).toBeInTheDocument()
    expect(addMaintenance).not.toHaveBeenCalled()
  })

  it('onaylanınca kaydeder', async () => {
    mockCtx.fuelRecords = [{ id: 'f1', vehicleId: 'v1', km: 150000, liters: 40, totalCost: 1800 }]
    ac()
    doldur(alan.tur(), 'Yağ Değişimi')
    doldur(alan.km(), '120000')
    fireEvent.click(alan.kaydet())

    fireEvent.click(await screen.findByRole('button', { name: 'Evet, kaydet' }))

    await waitFor(() => expect(addMaintenance).toHaveBeenCalledTimes(1))
    expect(addMaintenance.mock.calls[0][0]).toMatchObject({ vehicleId: 'v1', km: 120000, type: 'Yağ Değişimi' })
  })

  it('vazgeçilirse kaydetmez ve form açık kalır', async () => {
    mockCtx.fuelRecords = [{ id: 'f1', vehicleId: 'v1', km: 150000, liters: 40, totalCost: 1800 }]
    ac()
    doldur(alan.tur(), 'Yağ Değişimi')
    doldur(alan.km(), '120000')
    fireEvent.click(alan.kaydet())

    fireEvent.click(await screen.findByRole('button', { name: 'Vazgeç' }))

    expect(addMaintenance).not.toHaveBeenCalled()
    // Ana form hâlâ açık
    expect(screen.getByRole('dialog', { name: 'Yeni Bakım Kaydı' })).toBeInTheDocument()
  })

  it('zorunlu alan boşken kaydetmez', async () => {
    ac()
    fireEvent.click(alan.kaydet())

    expect(await screen.findByText('Bakım türü seç veya yaz')).toBeInTheDocument()
    expect(addMaintenance).not.toHaveBeenCalled()
  })
})

describe('MaintenanceForm — kullanıcı yazarken sıfırlanma', () => {
  it('aracın km si değişince açık formdaki girdiler KORUNMALI', () => {
    const { rerender } = ac()

    doldur(alan.tur(), 'Balata')
    doldur(alan.km(), '123456')
    expect(alan.km()).toHaveValue(123456)

    // Başka bir yerden (realtime senkron, yakıt kaydı ekleme vs.) aracın
    // currentKm'si güncellenirse form açıkken sıfırlanmamalı.
    mockCtx = { ...mockCtx, vehicles: [{ ...ARAC, currentKm: 111111 }] }
    rerender(<MaintenanceForm isOpen onClose={vi.fn()} vehicleId="v1" />)

    expect(alan.km()).toHaveValue(123456)
    expect(alan.tur()).toHaveValue('Balata')
  })
})
