import { useEffect, useMemo, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVehicles } from '../context/VehicleContext'
import { formatPlate } from '../utils/plateHelpers'
import { makeVehicleSchema } from '../lib/formSchemas'
import Modal from './Modal'
import FormField from './FormField'
import MultiImageUploader from './MultiImageUploader'

const fuelTypes = ['Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrik']

const bosForm = () => ({
  plate: '', brand: '', model: '', year: '', fuelType: 'Benzin', currentKm: '',
  photos: [], inspectionDate: '', mtvDate: '', insuranceDate: '', kaskoDate: '', notes: '',
})

export default function VehicleForm({ isOpen, onClose, editVehicle = null }) {
  const { addVehicle, updateVehicle, vehicles } = useVehicles()
  const isEdit = !!editVehicle

  const schema = useMemo(
    () => makeVehicleSchema({ vehicles, editId: editVehicle?.id ?? null }),
    [vehicles, editVehicle]
  )

  const {
    register, handleSubmit, reset, setValue, control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: bosForm(),
    mode: 'onSubmit',
  })

  // Formu SADECE modal açılırken doldur — araç listesi değişince (realtime
  // senkron, başka bir araç eklenmesi) kullanıcının girdileri silinmesin.
  const acikMiydiRef = useRef(false)
  useEffect(() => {
    const yeniAcildi = isOpen && !acikMiydiRef.current
    acikMiydiRef.current = isOpen
    if (!yeniAcildi) return

    if (editVehicle) {
      reset({
        plate: editVehicle.plate || '',
        brand: editVehicle.brand || '',
        model: editVehicle.model || '',
        year: editVehicle.year ? String(editVehicle.year) : '',
        fuelType: editVehicle.fuelType || 'Benzin',
        currentKm: editVehicle.currentKm ? String(editVehicle.currentKm) : '',
        // Eski uyumluluk: photo varsa photos'a taşı
        photos: editVehicle.photos || (editVehicle.photo ? [editVehicle.photo] : []),
        inspectionDate: editVehicle.inspectionDate || '',
        mtvDate: editVehicle.mtvDate || '',
        insuranceDate: editVehicle.insuranceDate || '',
        kaskoDate: editVehicle.kaskoDate || '',
        notes: editVehicle.notes || '',
      })
    } else {
      reset(bosForm())
    }
  }, [isOpen, editVehicle, reset])

  const onValid = (form) => {
    const data = {
      plate: formatPlate(form.plate),
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      fuelType: form.fuelType,
      currentKm: form.currentKm ? Number(form.currentKm) : null,
      photos: form.photos,
      // Eski uyumluluk için photo'yu photos[0] ile sync tut
      photo: form.photos[0] || null,
      inspectionDate: form.inspectionDate,
      mtvDate: form.mtvDate,
      insuranceDate: form.insuranceDate,
      kaskoDate: form.kaskoDate,
      notes: form.notes.trim(),
    }

    if (isEdit) {
      updateVehicle(editVehicle.id, data)
      toast.success('Araç güncellendi 🚗')
    } else {
      addVehicle(data)
      toast.success('Araç eklendi 🚗')
    }
    onClose()
  }

  const onInvalid = () => toast.error('Lütfen hataları düzelt')

  const tarihAlanlari = [
    ['inspectionDate', 'Muayene'],
    ['mtvDate', 'MTV'],
    ['insuranceDate', 'Trafik Sigortası'],
    ['kaskoDate', 'Kasko'],
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Aracı Düzenle' : 'Yeni Araç'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onValid, onInvalid)} className="p-5 space-y-5">
        <FormField
          label="Plaka"
          required
          placeholder="34 ABC 123"
          autoFocus
          error={errors.plate?.message}
          {...register('plate', {
            // Yazarken büyük harfe çevir, alandan çıkınca biçimlendir
            onChange: (e) => setValue('plate', e.target.value.toUpperCase()),
            onBlur: (e) => setValue('plate', formatPlate(e.target.value)),
          })}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Marka" required placeholder="BMW" error={errors.brand?.message} {...register('brand')} />
          <FormField label="Model" required placeholder="320i" error={errors.model?.message} {...register('model')} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField
            label="Yıl"
            required
            type="number"
            placeholder="2020"
            min="1950"
            max={new Date().getFullYear() + 1}
            error={errors.year?.message}
            {...register('year')}
          />
          <FormField label="Yakıt">
            {(alanProps) => (
              <select {...alanProps} {...register('fuelType')}>
                {fuelTypes.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
          </FormField>
          <FormField
            label="Güncel KM"
            type="number"
            placeholder="0"
            min="0"
            error={errors.currentKm?.message}
            {...register('currentKm')}
          />
        </div>

        {/* Fotoğraflar */}
        <div>
          <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Fotoğraflar
          </span>
          <Controller
            name="photos"
            control={control}
            render={({ field }) => (
              <MultiImageUploader photos={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        {/* Tarihler */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Önemli Tarihler (opsiyonel)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tarihAlanlari.map(([ad, etiket]) => (
              <FormField
                key={ad}
                label={etiket}
                labelStyle="plain"
                type="date"
                error={errors[ad]?.message}
                {...register(ad)}
              />
            ))}
          </div>
        </div>

        <FormField
          label="Notlar (opsiyonel)"
          as="textarea"
          rows={2}
          placeholder="Ek bilgiler..."
          {...register('notes')}
        />

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg font-semibold transition"
          >
            İptal
          </button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg font-semibold transition"
          >
            {isEdit ? 'Güncelle' : (
              <>
                <Plus className="w-4 h-4" />
                Araç Ekle
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
