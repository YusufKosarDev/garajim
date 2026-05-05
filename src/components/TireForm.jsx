import { useState, useEffect } from 'react'
import { Plus, X, Info, Calendar, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVehicles } from '../context/VehicleContext'
import { useAutoFocus } from '../hooks/useAutoFocus'
import { TIRE_POSITIONS, SEASONS, calculateTireAge } from '../utils/tireHelpers'
import Modal from './Modal'

const createEmptyTires = () => TIRE_POSITIONS.map(pos => ({
  position: pos.code,
  dot: '',
  treadDepth: 0,
}))

export default function TireForm({ isOpen, onClose, vehicleId, editTireSet = null }) {
  const { addTireSet, updateTireSet, tireSets } = useVehicles()
  const firstInputRef = useAutoFocus(isOpen)

  const [season, setSeason] = useState('summer')
  const [brand, setBrand] = useState('')
  const [size, setSize] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [hasSpare, setHasSpare] = useState(false)
  const [tires, setTires] = useState(createEmptyTires())
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})

  const isEdit = !!editTireSet

  // Form aç/kapa
  useEffect(() => {
    if (!isOpen) return

    if (editTireSet) {
      setSeason(editTireSet.season)
      setBrand(editTireSet.brand || '')
      setSize(editTireSet.size || '')
      setPurchaseDate(editTireSet.purchaseDate || '')
      setPurchasePrice(editTireSet.purchasePrice || '')
      setNotes(editTireSet.notes || '')

      const existingTires = editTireSet.tires || []
      const spareExists = existingTires.some(t => t.position === 'S')
      setHasSpare(spareExists)

      // Eksik pozisyonları doldur
      const filledTires = TIRE_POSITIONS.map(pos => {
        const existing = existingTires.find(t => t.position === pos.code)
        return existing || { position: pos.code, dot: '', treadDepth: 0 }
      })
      setTires(filledTires)
    } else {
      // Yeni set — araçta zaten hangi sezonlar var?
      const existingSeasons = tireSets
        .filter(t => t.vehicleId === vehicleId)
        .map(t => t.season)

      // Önce eksik sezonu seç
      if (!existingSeasons.includes('summer')) setSeason('summer')
      else if (!existingSeasons.includes('winter')) setSeason('winter')
      else setSeason('summer')

      setBrand('')
      setSize('')
      setPurchaseDate('')
      setPurchasePrice('')
      setHasSpare(false)
      setTires(createEmptyTires())
      setNotes('')
    }
    setErrors({})
  }, [isOpen, editTireSet, tireSets, vehicleId])

  const updateTire = (position, field, value) => {
    setTires(prev => prev.map(t =>
      t.position === position ? { ...t, [field]: value } : t
    ))
  }

  const validate = () => {
    const newErrors = {}

    if (!brand.trim()) newErrors.brand = 'Marka zorunlu'
    if (!size.trim()) newErrors.size = 'Ebat zorunlu'

    // Aynı sezondan 2. set eklenmeye çalışılıyor mu?
    if (!isEdit) {
      const existing = tireSets.find(
        t => t.vehicleId === vehicleId && t.season === season
      )
      if (existing) {
        newErrors.season = `Bu araç için zaten ${SEASONS[season].label} set tanımlı — düzenlemek için onu aç`
      }
    }

    // DOT kodu kontrolü (opsiyonel ama girildiyse 4 karakter olmalı)
    tires.forEach((tire, i) => {
      if (tire.position === 'S' && !hasSpare) return // Stepney yoksa kontrol etme

      if (tire.dot && tire.dot.length !== 4) {
        newErrors[`dot_${tire.position}`] = 'DOT 4 haneli olmalı'
      }

      const depth = Number(tire.treadDepth)
      if (tire.treadDepth && (isNaN(depth) || depth < 0 || depth > 15)) {
        newErrors[`depth_${tire.position}`] = '0-15 mm arası'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Lütfen hataları düzelt')
      return
    }

    // Stepney yoksa filtrele
    const filteredTires = tires
      .filter(t => t.position !== 'S' || hasSpare)
      .map(t => ({
        position: t.position,
        dot: t.dot.trim(),
        treadDepth: Number(t.treadDepth) || 0,
      }))

    const data = {
      vehicleId,
      season,
      brand: brand.trim(),
      size: size.trim(),
      purchaseDate,
      purchasePrice: Number(purchasePrice) || 0,
      tires: filteredTires,
      notes: notes.trim(),
    }

    if (isEdit) {
      updateTireSet(editTireSet.id, data)
    } else {
      addTireSet(data)
    }
    onClose()
  }

  const currentSeason = SEASONS[season]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Lastik Setini Düzenle' : 'Yeni Lastik Seti'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Sezon seçimi */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Sezon
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(SEASONS).filter(([k]) => k !== 'all-season').map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => !isEdit && setSeason(key)}
                disabled={isEdit}
                className={`p-4 rounded-lg border-2 transition ${
                  season === key
                    ? key === 'summer'
                      ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400'
                      : 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                } ${isEdit ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="text-2xl mb-1">{config.icon}</div>
                <div className="text-sm font-bold">{config.label}</div>
              </button>
            ))}
          </div>
          {errors.season && (
            <p className="text-xs text-red-400 mt-2">{errors.season}</p>
          )}
          {isEdit && (
            <p className="text-xs text-slate-500 mt-2">
              Sezon değiştirilemez — silip yeniden ekle
            </p>
          )}
        </div>

        {/* Marka ve Ebat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Marka *
            </label>
            <input
              ref={firstInputRef}
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Michelin, Bridgestone..."
              className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                errors.brand ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
              }`}
            />
            {errors.brand && <p className="text-xs text-red-400 mt-1">{errors.brand}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Ebat *
            </label>
            <input
              type="text"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="205/55 R16"
              className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                errors.size ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
              }`}
            />
            {errors.size && <p className="text-xs text-red-400 mt-1">{errors.size}</p>}
          </div>
        </div>

        {/* Alım tarihi ve fiyat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Alım Tarihi
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Toplam Fiyat (₺)
            </label>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Stepney toggle */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer bg-slate-800/50 p-3 rounded-lg border border-slate-700 hover:bg-slate-800 transition">
            <input
              type="checkbox"
              checked={hasSpare}
              onChange={(e) => setHasSpare(e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold">Stepney dahil</div>
              <div className="text-xs text-slate-400">Yedek lastiği de takip et</div>
            </div>
          </label>
        </div>

        {/* Lastikler grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Lastik Detayları
            </h3>
            <div className="text-[10px] text-slate-500">
              DOT kodu: HHWW (ör. 3523 = 35. hafta 2023)
            </div>
          </div>

          {/* Araç üstten görünüm */}
          <div className="bg-slate-800/30 rounded-lg p-4 mb-3">
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              {tires.filter(t => t.position !== 'S').map((tire) => {
                const pos = TIRE_POSITIONS.find(p => p.code === tire.position)
                const ageInfo = tire.dot.length === 4 ? calculateTireAge(tire.dot) : null
                const hasError = errors[`dot_${tire.position}`] || errors[`depth_${tire.position}`]

                return (
                  <div
                    key={tire.position}
                    className={`bg-slate-900 border-2 rounded-lg p-3 transition ${
                      hasError ? 'border-red-500/50' : 'border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-400 mb-2">
                      {pos.label}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <input
                          type="text"
                          value={tire.dot}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                            updateTire(tire.position, 'dot', val)
                          }}
                          placeholder="DOT (3523)"
                          maxLength={4}
                          className={`w-full bg-slate-800 border rounded px-2 py-1.5 text-xs focus:outline-none transition ${
                            errors[`dot_${tire.position}`] ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
                          }`}
                        />
                        {ageInfo && (
                          <div className="text-[9px] text-slate-500 mt-0.5">
                            {ageInfo.ageYears} yaşında
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={tire.treadDepth || ''}
                            onChange={(e) => updateTire(tire.position, 'treadDepth', e.target.value)}
                            placeholder="0"
                            min="0"
                            max="15"
                            step="0.1"
                            className={`w-full bg-slate-800 border rounded px-2 py-1.5 text-xs focus:outline-none transition ${
                              errors[`depth_${tire.position}`] ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
                            }`}
                          />
                          <span className="text-[10px] text-slate-500">mm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="text-center text-[10px] text-slate-500 mt-3">
              ↑ Aracın önü
            </div>
          </div>

          {/* Stepney */}
          {hasSpare && (
            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="max-w-[180px] mx-auto">
                <div className="bg-slate-900 border-2 border-slate-700 rounded-lg p-3">
                  <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                    🛞 Stepney
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={tires.find(t => t.position === 'S')?.dot || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                        updateTire('S', 'dot', val)
                      }}
                      placeholder="DOT"
                      maxLength={4}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tires.find(t => t.position === 'S')?.treadDepth || ''}
                        onChange={(e) => updateTire('S', 'treadDepth', e.target.value)}
                        placeholder="0"
                        min="0"
                        max="15"
                        step="0.1"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition"
                      />
                      <span className="text-[10px] text-slate-500">mm</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2 text-xs text-slate-300">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p><strong>DOT kodu:</strong> Lastiğin yan yüzünde 4 haneli sayı (örn. 3523 = 2023'ün 35. haftası)</p>
                <p className="mt-1"><strong>Diş derinliği:</strong> Yasal minimum 1.6mm, kış için 4mm üstü önerilir</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notlar */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
            Notlar (opsiyonel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Mağaza, garanti, vb."
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition resize-none"
          />
        </div>

        {/* Butonlar */}
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
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold transition text-white ${
              season === 'summer'
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-cyan-600 hover:bg-cyan-700'
            }`}
          >
            {isEdit ? 'Güncelle' : (
              <>
                <Plus className="w-4 h-4" />
                {currentSeason.label} Set Ekle
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}