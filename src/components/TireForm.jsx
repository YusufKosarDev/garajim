import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Info, Calendar, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVehicles } from '../context/vehicle-context'
import { TIRE_POSITIONS, SEASONS, calculateTireAge } from '../utils/tireHelpers'
import { getTodayString } from '../utils/dateValidation'
import { makeTireSetSchema } from '../lib/formSchemas'
import Modal from './Modal'
import FormField from './FormField'

const createEmptyTires = () => TIRE_POSITIONS.map(pos => ({
  position: pos.code,
  dot: '',
  treadDepth: '',
}))

export default function TireForm({ isOpen, onClose, vehicleId, editTireSet = null }) {
  const { t, i18n } = useTranslation()

  const { addTireSet, updateTireSet, tireSets } = useVehicles()
  const isEdit = !!editTireSet

  // Şema mesajları kurulum anında i18n'den okunuyor; dil değişince yeniden
  // kurulmalı. eslint i18n.language'ı gövdede görmediği için gereksiz sanıyor.
  const schema = useMemo(
    () => makeTireSetSchema({ tireSets, vehicleId, isEdit }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bkz. MaintenanceForm
    [tireSets, vehicleId, isEdit, i18n.language]
  )

  const {
    register, handleSubmit, reset, setValue, control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      season: 'summer', brand: '', size: '', purchaseDate: '', purchasePrice: '',
      hasSpare: false, notes: '', tires: createEmptyTires(),
    },
    mode: 'onSubmit',
  })

  const season = useWatch({ control, name: 'season' })
  const hasSpare = useWatch({ control, name: 'hasSpare' })
  const tires = useWatch({ control, name: 'tires' }) ?? []

  // Formu SADECE modal açılırken doldur.
  // Önceden bağımlılıklar arasında tireSets vardı; herhangi bir lastik seti
  // değişince (realtime senkron) kullanıcı formu doldururken sıfırlanıyordu.
  const wasOpenRef = useRef(false)
  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current
    wasOpenRef.current = isOpen
    if (!justOpened) return

    if (editTireSet) {
      const existingTires = editTireSet.tires || []
      reset({
        season: editTireSet.season,
        brand: editTireSet.brand || '',
        size: editTireSet.size || '',
        purchaseDate: editTireSet.purchaseDate || '',
        purchasePrice: editTireSet.purchasePrice ? String(editTireSet.purchasePrice) : '',
        hasSpare: existingTires.some(lastik => lastik.position === 'S'),
        notes: editTireSet.notes || '',
        // Eksik pozisyonları doldur
        tires: TIRE_POSITIONS.map(pos => {
          const varOlan = existingTires.find(lastik => lastik.position === pos.code)
          return varOlan
            ? { position: pos.code, dot: varOlan.dot || '', treadDepth: varOlan.treadDepth ?? '' }
            : { position: pos.code, dot: '', treadDepth: '' }
        }),
      })
    } else {
      // Yeni set — araçta hangi sezonlar zaten var, eksik olanı seç
      const existingSeasons = tireSets
        .filter(set => set.vehicleId === vehicleId)
        .map(set => set.season)

      const defaultSeason = !existingSeasons.includes('summer')
        ? 'summer'
        : (!existingSeasons.includes('winter') ? 'winter' : 'summer')

      reset({
        season: defaultSeason, brand: '', size: '', purchaseDate: '', purchasePrice: '',
        hasSpare: false, notes: '', tires: createEmptyTires(),
      })
    }
  }, [isOpen, editTireSet, tireSets, vehicleId, reset])

  const onValid = (form) => {
    // Stepney yoksa filtrele
    const filtered = form.tires
      .filter(lastik => lastik.position !== 'S' || form.hasSpare)
      .map(lastik => ({
        position: lastik.position,
        dot: (lastik.dot || '').trim(),
        treadDepth: Number(lastik.treadDepth) || 0,
      }))

    const data = {
      vehicleId,
      season: form.season,
      brand: form.brand.trim(),
      size: form.size.trim(),
      purchaseDate: form.purchaseDate,
      purchasePrice: Number(form.purchasePrice) || 0,
      tires: filtered,
      notes: form.notes.trim(),
    }

    if (isEdit) updateTireSet(editTireSet.id, data)
    else addTireSet(data)
    onClose()
  }

  const onInvalid = () => toast.error(t('tireForm.lutfen_hatalari_duzelt'))

  // DOT alanı: sadece rakam, en fazla 4 hane
  const dotChanged = (index) => (e) => {
    setValue(`tires.${index}.dot`, e.target.value.replace(/\D/g, '').slice(0, 4))
  }

  const currentSeason = SEASONS[season] ?? SEASONS.summer
  const spareIndex = TIRE_POSITIONS.findIndex(p => p.code === 'S')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('tireForm.lastik_setini_duzenle') : 'Yeni Lastik Seti'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onValid, onInvalid)} className="p-5 space-y-5">
        {/* Sezon seçimi */}
        <fieldset>
          <legend className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            {t('tireForm.sezon')}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(SEASONS).filter(([k]) => k !== 'all-season').map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => !isEdit && setValue('season', key)}
                disabled={isEdit}
                aria-pressed={season === key}
                className={`p-4 rounded-lg border-2 transition ${
                  season === key
                    ? key === 'summer'
                      ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400'
                      : 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                } ${isEdit ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="text-2xl mb-1" aria-hidden="true">{config.icon}</div>
                <div className="text-sm font-bold">{t(config.label)}</div>
              </button>
            ))}
          </div>
          {errors.season && <p className="text-xs text-red-400 mt-2" role="alert">{errors.season.message}</p>}
          {isEdit && (
            <p className="text-xs text-slate-500 mt-2">
              {t('tireForm.sezon_degistirilemez_silip_yeniden_ekle')}
            </p>
          )}
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            label={t('tireForm.marka')}
            required
            placeholder={t('tireForm.michelin_bridgestone')}
            autoFocus
            error={errors.brand?.message}
            {...register('brand')}
          />
          <FormField
            label={t('tireForm.ebat')}
            required
            placeholder="205/55 R16"
            error={errors.size?.message}
            {...register('size')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            label={<span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{t('tireForm.alim_tarihi')}</span>}
            type="date"
            max={getTodayString()}
            {...register('purchaseDate')}
          />
          <FormField
            label={<span className="inline-flex items-center gap-1"><DollarSign className="w-3 h-3" />{t('tireForm.toplam_fiyat')}</span>}
            type="number"
            placeholder="0"
            min="0"
            {...register('purchasePrice')}
          />
        </div>

        {/* Stepney toggle */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer bg-slate-800/50 p-3 rounded-lg border border-slate-700 hover:bg-slate-800 transition">
            <input type="checkbox" className="w-4 h-4 accent-blue-500" {...register('hasSpare')} />
            <div className="flex-1">
              <div className="text-sm font-semibold">{t('tireForm.stepney_dahil')}</div>
              <div className="text-xs text-slate-400">{t('tireForm.yedek_lastigi_de_takip_et')}</div>
            </div>
          </label>
        </div>

        {/* Lastikler grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {t('tireForm.lastik_detaylari')}
            </h3>
            <div className="text-[10px] text-slate-500">
              {t('tireForm.dot_kodu_hhww_or_3523_35_hafta_2023')}
            </div>
          </div>

          {/* Araç üstten görünüm */}
          <div className="bg-slate-800/30 rounded-lg p-4 mb-3">
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              {TIRE_POSITIONS.filter(p => p.code !== 'S').map((pos, index) => {
                const tire = tires[index] ?? { dot: '', treadDepth: '' }
                const dotError = errors.tires?.[index]?.dot?.message
                const depthError = errors.tires?.[index]?.treadDepth?.message
                const ageInfo = (tire.dot || '').length === 4 ? calculateTireAge(tire.dot) : null

                return (
                  <div
                    key={pos.code}
                    className={`bg-slate-900 border-2 rounded-lg p-3 transition ${
                      dotError || depthError ? 'border-red-500/50' : 'border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-400 mb-2">{t(pos.label)}</div>
                    <div className="space-y-2">
                      <div>
                        <input
                          type="text"
                          placeholder={t('tireForm.dot_3523')}
                          maxLength={4}
                          aria-label={t('tireForm.pos_dot_kodu', { pos: t(pos.label) })}
                          className={`w-full bg-slate-800 border rounded px-2 py-1.5 text-xs focus:outline-none transition ${
                            dotError ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
                          }`}
                          {...register(`tires.${index}.dot`, { onChange: dotChanged(index) })}
                        />
                        {ageInfo && (
                          <div className="text-[9px] text-slate-500 mt-0.5">
                            {ageInfo.ageYears} yaşında
                          </div>
                        )}
                        {dotError && <div className="text-[9px] text-red-400 mt-0.5" role="alert">{dotError}</div>}
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          max="15"
                          step="0.1"
                          aria-label={t('tireForm.pos_dis_derinligi', { pos: t(pos.label) })}
                          className={`w-full bg-slate-800 border rounded px-2 py-1.5 text-xs focus:outline-none transition ${
                            depthError ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
                          }`}
                          {...register(`tires.${index}.treadDepth`)}
                        />
                        <span className="text-[10px] text-slate-500">{t('tireForm.mm')}</span>
                      </div>
                      {depthError && <div className="text-[9px] text-red-400" role="alert">{depthError}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="text-center text-[10px] text-slate-500 mt-3">
              {t('tireForm.aracin_onu')}
            </div>
          </div>

          {/* Stepney */}
          {hasSpare && spareIndex >= 0 && (
            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="max-w-[180px] mx-auto">
                <div className="bg-slate-900 border-2 border-slate-700 rounded-lg p-3">
                  <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                    <span aria-hidden="true">🛞</span> {t('tireForm.stepney')}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="DOT"
                      maxLength={4}
                      aria-label={t('tireForm.stepney_dot_kodu')}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition"
                      {...register(`tires.${spareIndex}.dot`, { onChange: dotChanged(spareIndex) })}
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        max="15"
                        step="0.1"
                        aria-label={t('tireForm.stepney_dis_derinligi_mm')}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition"
                        {...register(`tires.${spareIndex}.treadDepth`)}
                      />
                      <span className="text-[10px] text-slate-500">{t('tireForm.mm')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2 text-xs text-slate-300">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p><strong>{t('tireForm.dot_kodu')}</strong> {t('tireForm.lastigin_yan_yuzunde_4_haneli_sayi_orn_3523_20')}</p>
                <p className="mt-1"><strong>{t('tireForm.dis_derinligi')}</strong> {t('tireForm.yasal_minimum_1_6mm_kis_icin')}</p>
              </div>
            </div>
          </div>
        </div>

        <FormField
          label={t('tireForm.notlar_opsiyonel')}
          as="textarea"
          rows={2}
          placeholder={t('tireForm.magaza_garanti_vb')}
          {...register('notes')}
        />

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg font-semibold transition"
          >
            {t('tireForm.iptal')}
          </button>
          <button
            type="submit"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold transition text-white ${
              season === 'summer'
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-cyan-600 hover:bg-cyan-700'
            }`}
          >
            {isEdit ? t('tireForm.guncelle') : (
              <>
                <Plus className="w-4 h-4" />
                {t('tireForm.set_ekle', { season: t(currentSeason.label) })}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
