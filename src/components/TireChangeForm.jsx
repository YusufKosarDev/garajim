import { useState, useEffect } from 'react'
import { ArrowLeftRight, Calendar, Gauge, DollarSign, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVehicles } from '../context/VehicleContext'
import { useAutoFocus } from '../hooks/useAutoFocus'
import { SEASONS } from '../utils/tireHelpers'
import Modal from './Modal'

export default function TireChangeForm({ isOpen, onClose, vehicleId, currentSeason, targetSeason }) {
  const { addTireChange, vehicles } = useVehicles()
  const firstInputRef = useAutoFocus(isOpen)

  const vehicle = vehicles.find(v => v.id === vehicleId)
  const currentKm = vehicle?.currentKm || 0

  const [date, setDate] = useState('')
  const [km, setKm] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isOpen) return
    setDate(new Date().toISOString().split('T')[0])
    setKm(String(currentKm))
    setCost('')
    setNotes('')
    setErrors({})
  }, [isOpen, currentKm])

  const validate = () => {
    const newErrors = {}

    if (!date) newErrors.date = 'Tarih zorunlu'
    if (!km || Number(km) <= 0) newErrors.km = 'Geçerli KM gir'

    // Tarih gelecekte olmamalı
    const selected = new Date(date)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (selected > today) newErrors.date = 'Gelecek tarih olamaz'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Lütfen hataları düzelt')
      return
    }

    addTireChange({
      vehicleId,
      date,
      fromSeason: currentSeason,
      toSeason: targetSeason,
      km: Number(km),
      cost: Number(cost) || 0,
      notes: notes.trim(),
    })

    onClose()
  }

  const fromConfig = SEASONS[currentSeason]
  const toConfig = SEASONS[targetSeason]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mevsim Değişimi" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Sezon değişim görseli */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-around gap-3">
            <div className="text-center flex-1">
              <div className="text-3xl mb-1">{fromConfig.icon}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Çıkar</div>
              <div className="text-sm font-bold text-slate-300">{fromConfig.label}</div>
            </div>

            <ArrowLeftRight className="w-5 h-5 text-blue-400 shrink-0" />

            <div className="text-center flex-1">
              <div className="text-3xl mb-1">{toConfig.icon}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Tak</div>
              <div className={`text-sm font-bold ${
                targetSeason === 'summer' ? 'text-yellow-400' : 'text-cyan-400'
              }`}>
                {toConfig.label}
              </div>
            </div>
          </div>
        </div>

        {/* Tarih */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Değişim Tarihi *
          </label>
          <input
            ref={firstInputRef}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
              errors.date ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
            }`}
          />
          {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
        </div>

        {/* KM */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Gauge className="w-3 h-3" />
            KM (değişim anındaki) *
          </label>
          <input
            type="number"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            placeholder="0"
            min="0"
            className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
              errors.km ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
            }`}
          />
          {errors.km && <p className="text-xs text-red-400 mt-1">{errors.km}</p>}
          {currentKm > 0 && (
            <p className="text-[10px] text-slate-500 mt-1">
              Aracın güncel KM'si: {Number(currentKm).toLocaleString('tr-TR')} — buradan farklıysa düzeltebilirsin
            </p>
          )}
        </div>

        {/* İşçilik fiyatı */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            İşçilik Ücreti (₺)
          </label>
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0"
            min="0"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Lastik tamiri/balansı ödediğin tutar (opsiyonel)
          </p>
        </div>

        {/* Notlar */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
            Notlar
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Lastik bakım yeri, balans, vb."
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition resize-none"
          />
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2 text-xs text-slate-300">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p>
              Bu kayıt seninle araç arasında bir <strong>değişim notu</strong>. Mevcut lastik setlerini değiştirmiyor — sadece geçişi belgeliyor.
            </p>
          </div>
        </div>

        {/* Butonlar */}
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
            Değişimi Kaydet
          </button>
        </div>
      </form>
    </Modal>
  )
}