import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import VehicleValueCard from './VehicleValueCard'

const ARAC = (over = {}) => ({
  id: 'v1', plate: '34 ABC 123', brand: 'BMW', model: '320i',
  year: 2020, currentKm: 90_000, photos: [], ...over,
})

const fiyatAlani = () => screen.getByLabelText(/alış fiyatı/i)

beforeEach(() => localStorage.clear())

describe('VehicleValueCard', () => {
  it('model yılı yoksa uydurma oran göstermez, sebebini söyler', () => {
    render(<VehicleValueCard vehicle={ARAC({ year: null })} maintenanceRecords={[]} />)
    expect(screen.getByText(/model yılı gerekiyor/i)).toBeInTheDocument()
    expect(screen.queryByText(/ilk değerini koruyor/i)).not.toBeInTheDocument()
  })

  it('fiyat girilmeden de oran ve döküm gösterir', () => {
    // Asıl çıktı ₺ değil oran; fiyat opsiyonel bir girdi
    render(<VehicleValueCard vehicle={ARAC()} maintenanceRecords={[]} />)
    expect(screen.getByText(/ilk değerini koruyor/i)).toBeInTheDocument()
    expect(screen.getByText(/Bakım geçmişi/i)).toBeInTheDocument()
    expect(screen.queryByText(/₺/)).not.toBeInTheDocument()
  })

  it('fiyat girilince ₺ karşılığını gösterir ve cihaza yazar', () => {
    render(<VehicleValueCard vehicle={ARAC()} maintenanceRecords={[]} />)
    fireEvent.change(fiyatAlani(), { target: { value: '1000000' } })

    expect(screen.getByText(/₺/)).toBeInTheDocument()
    expect(localStorage.getItem('garajim_alis_fiyati_v1')).toBe('1000000')
  })

  it('her aracın fiyatı kendine aittir', () => {
    // Bu kart araçlar arasında geziliyor; başka aracın fiyatını göstermek
    // kullanıcıya sessizce yanlış bir değer okutur
    localStorage.setItem('garajim_alis_fiyati_v1', '1000000')
    localStorage.setItem('garajim_alis_fiyati_v2', '500000')

    const { rerender } = render(<VehicleValueCard vehicle={ARAC()} maintenanceRecords={[]} />)
    expect(fiyatAlani()).toHaveValue(1000000)

    rerender(<VehicleValueCard vehicle={ARAC({ id: 'v2' })} maintenanceRecords={[]} />)
    expect(fiyatAlani()).toHaveValue(500000)
  })

  it('araç değişince önceki araca yazılan değer taşınmaz', () => {
    const { rerender } = render(<VehicleValueCard vehicle={ARAC()} maintenanceRecords={[]} />)
    fireEvent.change(fiyatAlani(), { target: { value: '1000000' } })

    rerender(<VehicleValueCard vehicle={ARAC({ id: 'v2' })} maintenanceRecords={[]} />)
    expect(fiyatAlani()).toHaveValue(null) // v2'nin kayıtlı fiyatı yok
  })

  it('fiyat silinince cihazdan da siler', () => {
    localStorage.setItem('garajim_alis_fiyati_v1', '1000000')
    render(<VehicleValueCard vehicle={ARAC()} maintenanceRecords={[]} />)

    fireEvent.change(fiyatAlani(), { target: { value: '' } })
    expect(localStorage.getItem('garajim_alis_fiyati_v1')).toBeNull()
  })

  it('yalnızca bu aracın bakım kayıtlarını dikkate alır', () => {
    // Başka araca ait kayıtlar sayılsaydı "bakım kaydı yok" uyarısı kaybolurdu
    render(
      <VehicleValueCard
        vehicle={ARAC()}
        maintenanceRecords={[{ id: 'm1', vehicleId: 'BASKA', date: '2026-01-01', type: 'Yağ', cost: 100 }]}
      />
    )
    expect(screen.getByText(/bakım kaydı yok/i)).toBeInTheDocument()
  })

  it('tahminin sınırlarını gizlemez', () => {
    render(<VehicleValueCard vehicle={ARAC()} maintenanceRecords={[]} />)
    expect(screen.getByText(/ekspertiz yerine geçmez/i)).toBeInTheDocument()
    expect(screen.getByText(/yalnızca bu cihazda saklanır/i)).toBeInTheDocument()
  })
})
