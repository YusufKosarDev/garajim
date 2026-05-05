import { useState, useEffect } from 'react'
import { useVehicles } from '../context/VehicleContext'
import { checkFuelKm } from '../utils/kmHelpers'
import { validatePastDate, getTodayString } from '../utils/dateValidation'
import { useAutoFocus } from '../hooks/useAutoFocus'
import Modal from './Modal'

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  km: '',
  liters: '',
  pricePerLiter: '',
  totalCost: '',
  fullTank: true,
  station: '',
  notes: '',
}

export default function FuelForm({ isOpen, onClose, vehicleId, editRecord = null }) {
  const { addFuel, updateFuel, vehicles, fuelRecords, updateVehicle } = useVehicles()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  const today = getTodayString()
  const kmInputRef = useAutoFocus(isOpen)
  const vehicleFuelRecords = fuelRecords.filter(r => r.vehicleId === vehicleId)

  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setForm({
          date: editRecord.date,
          km: editRecord.km?.toString() || '',
          liters: editRecord.liters?.toString() || '',
          pricePerLiter: editRecord.pricePerLiter?.toString() || '',
          totalCost: editRecord.totalCost?.toString() || '',
          fullTank: editRecord.fullTank ?? true,
          station: editRecord.station || '',
          notes: editRecord.notes || '',
        })
      } else {
        const vehicle = vehicles.find(v => v.id === vehicleId)
        setForm({ ...emptyForm, km: vehicle?.currentKm || '' })
      }
      setErrors({})
    }
  }, [isOpen, vehicleId, editRecord])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const newForm = { ...form, [name]: type === 'checkbox' ? checked : value }

    if (name === 'liters' || name === 'pricePerLiter') {
      const liters = name === 'liters' ? parseFloat(value) : parseFloat(newForm.liters)
      const price = name === 'pricePerLiter' ? parseFloat(value) : parseFloat(newForm.pricePerLiter)
      if (!isNaN(liters) && !isNaN(price)) {
        newForm.totalCost = (liters * price).toFixed(2)
      }
    }
    if (name === 'totalCost') {
      const total = parseFloat(value)
      const liters = parseFloat(newForm.liters)
      if (!isNaN(total) && !isNaN(liters) && liters > 0) {
        newForm.pricePerLiter = (total / liters).toFixed(2)
      }
    }

    if (errors[name]) {
      setErrors({ ...errors, [name]: null })
    }

    setForm(newForm)
  }

  const validate = () => {
    const err = {}

    if (!form.date) {
      err.date = 'Tarih zorunlu'
    } else {
      const dateCheck = validatePastDate(form.date, 'Yakıt alım tarihi')
      if (!dateCheck.isValid) err.date = dateCheck.message
    }

    if (!form.km) {
      err.km = 'Kilometre zorunlu'
    } else {
      const kmCheck = checkFuelKm(form.km, vehicleFuelRecords, editRecord?.id)
      if (!kmCheck.isValid) err.km = kmCheck.message
    }

    if (!form.liters) err.liters = 'Litre zorunlu'
    if (!form.totalCost) err.totalCost = 'Toplam tutar zorunlu'

    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    const recordData = {
      date: form.date,
      km: Number(form.km),
      liters: Number(form.liters),
      pricePerLiter: Number(form.pricePerLiter) || 0,
      totalCost: Number(form.totalCost),
      fullTank: form.fullTank,
      station: form.station,
      notes: form.notes,
    }

    if (editRecord) {
      updateFuel(editRecord.id, recordData)
    } else {
      addFuel({ vehicleId, ...recordData })
      const vehicle = vehicles.find(v => v.id === vehicleId)
      if (vehicle && Number(form.km) > Number(vehicle.currentKm || 0)) {
        updateVehicle(vehicleId, { ...vehicle, currentKm: form.km })
      }
    }

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editRecord ? 'Yakıt Kaydını Düzenle' : 'Yakıt Alımı Ekle'}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Tarih</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              max={today}
              className={`w-full bg-slate-800 border rounded-lg px-3 py-2 focus:outline-none ${
                errors.date ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
              }`}
            />
            {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Kilometre</label>
            <input
              ref={kmInputRef}
              type="number"
              name="km"
              min="0"
              value={form.km}
              onChange={handleChange}
              placeholder="125000"
              className={`w-full bg-slate-800 border rounded-lg px-3 py-2 focus:outline-none ${
                errors.km ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
              }`}
            />
            {errors.km && <p className="text-red-400 text-xs mt-1">{errors.km}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Litre" name="liters" type="number" step="0.01" min="0" value={form.liters} onChange={handleChange} error={errors.liters} placeholder="45.50" />
          <Field label="Litre Başı Fiyat (₺)" name="pricePerLiter" type="number" step="0.01" min="0" value={form.pricePerLiter} onChange={handleChange} placeholder="42.50" />
        </div>

        <Field
          label="Toplam Tutar (₺)"
          name="totalCost"
          type="number"
          step="0.01"
          min="0"
          value={form.totalCost}
          onChange={handleChange}
          error={errors.totalCost}
          placeholder="Otomatik hesaplanır"
        />

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            name="fullTank"
            checked={form.fullTank}
            onChange={handleChange}
            className="w-4 h-4 accent-blue-500"
          />
          <span className="text-sm text-slate-300">Depo tam dolduruldu (tüketim hesabı için önemli)</span>
        </label>

        <Field label="İstasyon (opsiyonel)" name="station" value={form.station} onChange={handleChange} placeholder="Shell, Opet, BP..." />

        <div>
          <label className="block text-sm text-slate-300 mb-1">Notlar (opsiyonel)</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows="2"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg transition">
            İptal
          </button>
          <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg transition font-semibold">
            {editRecord ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, error, ...props }) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <input
        {...props}
        className={`w-full bg-slate-800 border rounded-lg px-3 py-2 focus:outline-none ${
          error ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
        }`}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}