import { useState, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Receipt } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVehicles } from '../context/VehicleContext'
import { checkMaintenanceKm } from '../utils/kmHelpers'
import { getTodayString } from '../utils/dateValidation'
import { maintenanceSchema } from '../lib/formSchemas'
import Modal from './Modal'
import FormField from './FormField'
import SingleImageUploader from './SingleImageUploader'
import ReceiptScanner from './ReceiptScanner'
import ConfirmDialog from './ConfirmDialog'

const commonMaintenanceTypes = [
  'Yağ Değişimi',
  'Yağ Filtresi',
  'Hava Filtresi',
  'Yakıt Filtresi',
  'Polen Filtresi',
  'Balata',
  'Disk',
  'Lastik',
  'Triger Seti',
  'Akü',
  'Buji',
  'Antifriz',
  'Fren Hidroliği',
  'Diğer',
]

export default function MaintenanceForm({ isOpen, onClose, vehicleId, editRecord = null, prefilledType = null }) {
  const { addMaintenance, updateMaintenance, vehicles, maintenanceRecords, fuelRecords } = useVehicles()

  const vehicle = vehicles.find(v => v.id === vehicleId)
  const currentKm = vehicle?.currentKm || 0
  const isEdit = !!editRecord

  const [pendingKmConfirm, setPendingKmConfirm] = useState(null)

  const {
    register, handleSubmit, reset, watch, control, setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      type: '', customType: '', date: getTodayString(), km: '',
      cost: '', notes: '', photo: null,
    },
    mode: 'onSubmit',
  })

  const type = watch('type')
  const km = watch('km')
  const isCustom = type === 'Diğer'

  // Formu SADECE modal açılırken doldur.
  // Önceden bağımlılıklar arasında currentKm vardı; araç km'si başka bir yerden
  // güncellenince kullanıcı formu doldururken tüm alanlar sıfırlanıyordu.
  const acikMiydiRef = useRef(false)
  useEffect(() => {
    const yeniAcildi = isOpen && !acikMiydiRef.current
    acikMiydiRef.current = isOpen
    if (!yeniAcildi) return

    if (editRecord) {
      const bilinenTur = commonMaintenanceTypes.includes(editRecord.type) ? editRecord.type : 'Diğer'
      reset({
        type: bilinenTur,
        customType: bilinenTur === 'Diğer' ? editRecord.type : '',
        date: editRecord.date || '',
        km: editRecord.km ? String(editRecord.km) : '',
        cost: editRecord.cost ? String(editRecord.cost) : '',
        notes: editRecord.notes || '',
        photo: editRecord.photo || null,
      })
    } else {
      reset({
        type: prefilledType || '',
        customType: '',
        date: getTodayString(),
        km: String(currentKm || ''),
        cost: '', notes: '', photo: null,
      })
    }
  }, [isOpen, editRecord, prefilledType, currentKm, reset])

  const buildData = (form) => ({
    vehicleId,
    type: form.type === 'Diğer' ? form.customType.trim() : form.type,
    date: form.date,
    km: Number(form.km),
    cost: Number(form.cost) || 0,
    notes: form.notes.trim(),
    photo: form.photo || null,
  })

  // Asıl kaydetme — hem doğrudan hem KM onayından sonra çağrılır
  const commit = (data) => {
    if (isEdit) {
      updateMaintenance(editRecord.id, data)
      toast.success('Bakım kaydı güncellendi 🔧')
    } else {
      addMaintenance(data)
      toast.success('Bakım kaydı eklendi 🔧')
    }
    setPendingKmConfirm(null)
    onClose()
  }

  const onValid = (form) => {
    // KM tutarlılık kontrolü — bu bir hata değil, bilinçli bir onay:
    // kullanıcı geçmişe dönük kayıt giriyor olabilir.
    const kmCheck = checkMaintenanceKm(form.km, vehicle, maintenanceRecords, fuelRecords, editRecord?.id)
    if (kmCheck.needsConfirm) {
      setPendingKmConfirm({ data: buildData(form), message: kmCheck.message })
      return
    }
    commit(buildData(form))
  }

  const onInvalid = () => toast.error('Lütfen hataları düzelt')

  // Fiş OCR'ının önerdiği ve kullanıcının onayladığı alanları forma yazar.
  // Kaydetmez — form açık kalıyor, kullanıcı her zamanki gibi "Bakım Ekle"ye
  // basana kadar hiçbir şey kaydedilmiyor. KM tutarlılık kontrolü de yerinde.
  const onFisUygula = (alanlar) => {
    if (alanlar.tutar !== undefined) setValue('cost', String(alanlar.tutar), { shouldValidate: true })
    if (alanlar.tarih !== undefined) setValue('date', alanlar.tarih, { shouldValidate: true })
    if (alanlar.km !== undefined) setValue('km', String(alanlar.km), { shouldValidate: true })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Bakım Kaydını Düzenle' : 'Yeni Bakım Kaydı'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit(onValid, onInvalid)} className="p-5 space-y-4">
        <FormField label="Bakım Türü" required error={errors.type?.message}>
          {(alanProps) => (
            <select autoFocus {...alanProps} {...register('type')}>
              <option value="">Seç...</option>
              {commonMaintenanceTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </FormField>

        {isCustom && (
          <FormField
            placeholder="Bakım türünü yaz..."
            error={errors.type?.message}
            {...register('customType')}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            label="Tarih"
            required
            type="date"
            max={getTodayString()}
            error={errors.date?.message}
            {...register('date')}
          />
          <FormField
            label="KM"
            required
            type="number"
            min="0"
            placeholder="0"
            error={errors.km?.message}
            hint={currentKm > 0 && !km ? `Aracın güncel KM'si: ${Number(currentKm).toLocaleString('tr-TR')}` : undefined}
            {...register('km')}
          />
        </div>

        <FormField
          label="Maliyet (₺)"
          type="number"
          min="0"
          placeholder="0"
          error={errors.cost?.message}
          {...register('cost')}
        />

        {/* Fatura fotoğrafı */}
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Receipt className="w-3 h-3" />
            Fatura / Fiş
          </span>
          <Controller
            name="photo"
            control={control}
            render={({ field }) => (
              <>
                <SingleImageUploader
                  photo={field.value}
                  onChange={field.onChange}
                  label="Fatura"
                  hint="Fatura, fiş veya parça fotoğrafı"
                  maxSizeMB={1}
                />
                {/* Fotoğraf varsa fişten tutar/tarih/km okumayı öner */}
                <ReceiptScanner photo={field.value} onUygula={onFisUygula} />
              </>
            )}
          />
        </div>

        <FormField
          label="Notlar (opsiyonel)"
          as="textarea"
          rows={2}
          placeholder="Servis adı, marka, ek bilgiler..."
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
                Bakım Ekle
              </>
            )}
          </button>
        </div>
      </form>

      {/* KM geriye dönük uyarısı — Modal stack'i iç içe diyaloğu destekliyor */}
      <ConfirmDialog
        isOpen={!!pendingKmConfirm}
        onClose={() => setPendingKmConfirm(null)}
        onConfirm={() => commit(pendingKmConfirm.data)}
        title="Geçmişe dönük kayıt mı?"
        message={pendingKmConfirm?.message}
        confirmText="Evet, kaydet"
        cancelText="Vazgeç"
        variant="warning"
      />
    </Modal>
  )
}
