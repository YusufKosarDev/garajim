import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { useVehicles } from '../context/vehicle-context'
import { getTodayString } from '../utils/dateValidation'
import { makeFuelSchema } from '../lib/formSchemas'
import Modal from './Modal'
import FormField from './FormField'

const emptyForm = () => ({
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
  const { t } = useTranslation()

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
    defaultValues: emptyForm(),
    mode: 'onSubmit',
  })

  // Formu SADECE modal açılırken doldur.
  // Önceden bağımlılıklar arasında araç verisi de vardı ve araç km'si başka bir
  // yerden güncellenince (realtime senkron, başka bir kayıt) kullanıcı formu
  // doldururken alanlar sıfırlanıyordu. Açılış geçişini ref ile izliyoruz.
  const wasOpenRef = useRef(false)
  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current
    wasOpenRef.current = isOpen
    if (!justOpened) return

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
      reset({ ...emptyForm(), km: vehicle?.currentKm ? String(vehicle.currentKm) : '' })
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
      const tutar = parseFloat(totalCost)
      const l = parseFloat(liters)
      if (!isNaN(tutar) && !isNaN(l) && l > 0) setValue('pricePerLiter', (tutar / l).toFixed(2))
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

  const onInvalid = () => toast.error(t('fuelForm.lutfen_hatalari_duzelt'))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editRecord ? t('fuelForm.yakit_kaydini_duzenle') : t('fuelForm.yakit_alimi_ekle')}>
      <form onSubmit={handleSubmit(onValid, onInvalid)} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label={t('fuelForm.tarih')}
            labelStyle="plain"
            type="date"
            max={today}
            error={errors.date?.message}
            {...register('date')}
          />
          <FormField
            label={t('fuelForm.kilometre')}
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
            label={t('fuelForm.litre')}
            labelStyle="plain"
            type="number"
            step="0.01"
            min="0"
            placeholder="45.50"
            error={errors.liters?.message}
            {...register('liters', { onChange: () => hesapla('liters') })}
          />
          <FormField
            label={t('fuelForm.litre_basi_fiyat')}
            labelStyle="plain"
            type="number"
            step="0.01"
            min="0"
            placeholder="42.50"
            {...register('pricePerLiter', { onChange: () => hesapla('pricePerLiter') })}
          />
        </div>

        <FormField
          label={t('fuelForm.toplam_tutar')}
          labelStyle="plain"
          type="number"
          step="0.01"
          min="0"
          placeholder={t('fuelForm.otomatik_hesaplanir')}
          error={errors.totalCost?.message}
          {...register('totalCost', { onChange: () => hesapla('totalCost') })}
        />

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" className="w-4 h-4 accent-blue-500" {...register('fullTank')} />
          <span className="text-sm text-slate-300">{t('fuelForm.depo_tam_dolduruldu_tuketim_hesabi_icin')}</span>
        </label>

        <FormField
          label={t('fuelForm.istasyon_opsiyonel')}
          labelStyle="plain"
          placeholder={t('fuelForm.shell_opet_bp')}
          {...register('station')}
        />

        <FormField label={t('fuelForm.notlar_opsiyonel')} labelStyle="plain" as="textarea" rows="2" {...register('notes')} />

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg transition">
            {t('fuelForm.iptal')}
          </button>
          <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg transition font-semibold">
            {editRecord ? t('fuelForm.guncelle') : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
