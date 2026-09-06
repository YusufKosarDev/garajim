import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { useVehicles } from '../context/VehicleContext'
import { getTodayString } from '../utils/dateValidation'
import { makeFuelSchema } from '../lib/formSchemas'
import Modal from './Modal'
import FormField from './FormField'

const bosForm = () => ({
  date: getTodayString(),
  km: '',
  liters: '',
  pricePerLiter: '',
  totalCost: '',
  fullTank: true,
  station: '',
  notes: '',
})

export default function FuelForm({ isOpen, onClose, vehicleId, editRecord = null }) {
  const { addFuel, updateFuel, vehicles, fuelRecords, updateVehicle } = useVehicles()

  const today = getTodayString()

  const vehicleFuelRecords = useMemo(
    () => fuelRecords.filter(r => r.vehicleId === vehicleId),
    [fuelRecords, vehicleId]
  )

  const schema = useMemo(
    () => makeFuelSchema({ vehicleFuelRecords, editId: editRecord?.id ?? null }),
    [vehicleFuelRecords, editRecord]
  )

  const {
    register, handleSubmit, reset, setValue, getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: bosForm(),
    mode: 'onSubmit',
  })

  // Formu SADECE modal açılırken doldur.
  // Önceden bağımlılıklar arasında araç verisi de vardı ve araç km'si başka bir
  // yerden güncellenince (realtime senkron, başka bir kayıt) kullanıcı formu
  // doldururken alanlar sıfırlanıyordu. Açılış geçişini ref ile izliyoruz.
  const acikMiydiRef = useRef(false)
  useEffect(() => {
    const yeniAcildi = isOpen && !acikMiydiRef.current
    acikMiydiRef.current = isOpen
    if (!yeniAcildi) return

    if (editRecord) {
      reset({
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
      reset({ ...bosForm(), km: vehicle?.currentKm ? String(vehicle.currentKm) : '' })
    }
  }, [isOpen, editRecord, vehicleId, vehicles, reset])

  // Litre × fiyat ↔ toplam tutar otomatik hesabı
  const hesapla = (degisen) => {
    const { liters, pricePerLiter, totalCost } = getValues()

    if (degisen === 'liters' || degisen === 'pricePerLiter') {
      const l = parseFloat(liters)
      const f = parseFloat(pricePerLiter)
      if (!isNaN(l) && !isNaN(f)) setValue('totalCost', (l * f).toFixed(2))
    } else if (degisen === 'totalCost') {
      const t = parseFloat(totalCost)
      const l = parseFloat(liters)
      if (!isNaN(t) && !isNaN(l) && l > 0) setValue('pricePerLiter', (t / l).toFixed(2))
    }
  }

  const onValid = (form) => {
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

  const onInvalid = () => toast.error('Lütfen hataları düzelt')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editRecord ? 'Yakıt Kaydını Düzenle' : 'Yakıt Alımı Ekle'}>
      <form onSubmit={handleSubmit(onValid, onInvalid)} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Tarih"
            labelStyle="plain"
            type="date"
            max={today}
            error={errors.date?.message}
            {...register('date')}
          />
          <FormField
            label="Kilometre"
            labelStyle="plain"
            type="number"
            min="0"
            placeholder="125000"
            autoFocus
            error={errors.km?.message}
            {...register('km')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Litre"
            labelStyle="plain"
            type="number"
            step="0.01"
            min="0"
            placeholder="45.50"
            error={errors.liters?.message}
            {...register('liters', { onChange: () => hesapla('liters') })}
          />
          <FormField
            label="Litre Başı Fiyat (₺)"
            labelStyle="plain"
            type="number"
            step="0.01"
            min="0"
            placeholder="42.50"
            {...register('pricePerLiter', { onChange: () => hesapla('pricePerLiter') })}
          />
        </div>

        <FormField
          label="Toplam Tutar (₺)"
          labelStyle="plain"
          type="number"
          step="0.01"
          min="0"
          placeholder="Otomatik hesaplanır"
          error={errors.totalCost?.message}
          {...register('totalCost', { onChange: () => hesapla('totalCost') })}
        />

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" className="w-4 h-4 accent-blue-500" {...register('fullTank')} />
          <span className="text-sm text-slate-300">Depo tam dolduruldu (tüketim hesabı için önemli)</span>
        </label>

        <FormField
          label="İstasyon (opsiyonel)"
          labelStyle="plain"
          placeholder="Shell, Opet, BP..."
          {...register('station')}
        />

        <FormField label="Notlar (opsiyonel)" labelStyle="plain" as="textarea" rows="2" {...register('notes')} />

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
