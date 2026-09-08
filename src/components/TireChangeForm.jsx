import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeftRight, Calendar, Gauge, DollarSign, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVehicles } from '../context/vehicle-context'
import { SEASONS } from '../utils/tireHelpers'
import { getTodayString } from '../utils/dateValidation'
import { tireChangeSchema } from '../lib/formSchemas'
import Modal from './Modal'
import FormField from './FormField'

export default function TireChangeForm({ isOpen, onClose, vehicleId, currentSeason, targetSeason }) {
  const { t } = useTranslation()

  const { addTireChange, vehicles } = useVehicles()

  const vehicle = vehicles.find(v => v.id === vehicleId)
  const currentKm = vehicle?.currentKm || 0

  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(tireChangeSchema),
    defaultValues: { date: getTodayString(), km: '', cost: '', notes: '' },
    mode: 'onSubmit',
  })

  // Formu SADECE modal açılırken doldur — currentKm bağımlılığı yüzünden
  // araç km'si başka bir yerden güncellenince alanlar sıfırlanıyordu.
  const wasOpenRef = useRef(false)
  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current
    wasOpenRef.current = isOpen
    if (!justOpened) return

    reset({ date: getTodayString(), km: String(currentKm), cost: '', notes: '' })
  }, [isOpen, currentKm, reset])

  const onValid = (form) => {
    addTireChange({
      vehicleId,
      date: form.date,
      fromSeason: currentSeason,
      toSeason: targetSeason,
      km: Number(form.km),
      cost: Number(form.cost) || 0,
      notes: form.notes.trim(),
    })
    onClose()
  }

  const onInvalid = () => toast.error(t('tireChangeForm.lutfen_hatalari_duzelt'))

  const fromConfig = SEASONS[currentSeason]
  const toConfig = SEASONS[targetSeason]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('tireChangeForm.mevsim_degisimi')} maxWidth="max-w-md">
      <form onSubmit={handleSubmit(onValid, onInvalid)} className="p-5 space-y-4">
        {/* Sezon değişim görseli */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-around gap-3">
            <div className="text-center flex-1">
              <div className="text-3xl mb-1" aria-hidden="true">{fromConfig.icon}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">{t('tireChangeForm.cikar')}</div>
              <div className="text-sm font-bold text-slate-300">{fromConfig.label}</div>
            </div>

            <ArrowLeftRight className="w-5 h-5 text-blue-400 shrink-0" aria-hidden="true" />

            <div className="text-center flex-1">
              <div className="text-3xl mb-1" aria-hidden="true">{toConfig.icon}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">{t('tireChangeForm.tak')}</div>
              <div className={`text-sm font-bold ${
                targetSeason === 'summer' ? 'text-yellow-400' : 'text-cyan-400'
              }`}>
                {toConfig.label}
              </div>
            </div>
          </div>
        </div>

        <FormField
          label={<span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{t('tireChangeForm.degisim_tarihi')}</span>}
          required
          type="date"
          max={getTodayString()}
          autoFocus
          error={errors.date?.message}
          {...register('date')}
        />

        <FormField
          label={<span className="inline-flex items-center gap-1"><Gauge className="w-3 h-3" />{t('tireChangeForm.km_degisim_anindaki')}</span>}
          required
          type="number"
          placeholder="0"
          min="0"
          error={errors.km?.message}
          hint={currentKm > 0
            ? `Aracın güncel KM'si: ${Number(currentKm).toLocaleString('tr-TR')} — buradan farklıysa düzeltebilirsin`
            : undefined}
          {...register('km')}
        />

        <FormField
          label={<span className="inline-flex items-center gap-1"><DollarSign className="w-3 h-3" />{t('tireChangeForm.iscilik_ucreti')}</span>}
          type="number"
          placeholder="0"
          min="0"
          hint={t('tireChangeForm.lastik_tamiri_balansi_odedigin_tutar_opsiyonel')}
          {...register('cost')}
        />

        <FormField
          label={t('tireChangeForm.notlar')}
          as="textarea"
          rows={2}
          placeholder={t('tireChangeForm.lastik_bakim_yeri_balans_vb')}
          {...register('notes')}
        />

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2 text-xs text-slate-300">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              {t('tireChangeForm.bu_kayit_seninle_arac_arasinda_bir')} <strong>{t('tireChangeForm.degisim_notu')}</strong>{t('tireChangeForm.mevcut_lastik_setlerini_degistirmiyor_sadece_gec')}
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
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
            <ArrowLeftRight className="w-4 h-4" />
            {t('tireChangeForm.degisimi_kaydet')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
