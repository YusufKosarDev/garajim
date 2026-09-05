import { useState } from 'react'
import { Settings2, RotateCcw, Check, X, Car } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVehicles } from '../context/VehicleContext'
import {
  DEFAULT_INTERVALS,
  buildIntervalKey,
  resolveInterval,
} from '../utils/maintenanceRecommendations'
import ConfirmDialog from './ConfirmDialog'

export default function MaintenanceIntervals() {
  const { vehicles, customIntervals, updateCustomIntervals } = useVehicles()
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [editingType, setEditingType] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Periyotlar araç bazlı tutulur; seçim yoksa ilk araç varsayılan
  const activeVehicleId = selectedVehicleId || vehicles[0]?.id || ''

  const handleEdit = (type) => {
    setEditValue(String(resolveInterval(customIntervals, activeVehicleId, type)))
    setEditingType(type)
  }

  const handleCancel = () => {
    setEditingType(null)
    setEditValue('')
  }

  // updateCustomIntervals tüm haritayı değiştirir — mevcut haritadan türetip gönderiyoruz
  const commit = async (nextIntervals) => {
    setSaving(true)
    try {
      await updateCustomIntervals(nextIntervals)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (type) => {
    const value = Number(editValue)
    if (!Number.isFinite(value) || value < 500) {
      toast.error('Geçersiz değer (en az 500 km olmalı)')
      return
    }
    if (value > 500000) {
      toast.error('Çok yüksek değer (en fazla 500.000 km olabilir)')
      return
    }

    const key = buildIntervalKey(activeVehicleId, type)
    const next = { ...customIntervals }

    // Varsayılan ile aynıysa özel kaydı tut, sadece sil
    if (value === DEFAULT_INTERVALS[type]) {
      delete next[key]
    } else {
      next[key] = { kilometers: value, months: next[key]?.months ?? null }
    }

    setEditingType(null)
    setEditValue('')
    await commit(next)
  }

  const handleResetSingle = async (type) => {
    const next = { ...customIntervals }
    delete next[buildIntervalKey(activeVehicleId, type)]
    await commit(next)
  }

  const handleResetAll = async () => {
    // Sadece seçili aracın kayıtlarını çıkar, diğer araçlarınkine dokunma
    const prefix = `${activeVehicleId}-`
    const next = {}
    Object.keys(customIntervals).forEach(key => {
      if (!key.startsWith(prefix)) next[key] = customIntervals[key]
    })
    setIsResetOpen(false)
    await commit(next)
  }

  const hasAnyCustom = Object.keys(customIntervals).some(key =>
    key.startsWith(`${activeVehicleId}-`)
  )

  if (vehicles.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-1">
          <Settings2 className="w-5 h-5 text-blue-400" />
          Bakım Periyotları
        </h2>
        <p className="text-sm text-slate-400">
          Periyotlar araç bazlı ayarlanır — önce bir araç ekle.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-400" />
            Bakım Periyotları
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Akıllı öneri sistemine göre kendi km periyotlarını belirle
          </p>
        </div>
        {hasAnyCustom && (
          <button
            onClick={() => setIsResetOpen(true)}
            disabled={saving}
            className="flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition text-slate-400 hover:text-white disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            Tümünü Sıfırla
          </button>
        )}
      </div>

      {/* Araç seçici — periyotlar her araç için ayrı tutulur */}
      <div className="mb-4">
        <label
          htmlFor="interval-vehicle"
          className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1"
        >
          Araç
        </label>
        <div className="relative">
          <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            id="interval-vehicle"
            value={activeVehicleId}
            onChange={(e) => {
              setSelectedVehicleId(e.target.value)
              handleCancel()
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.brand} {v.model} — {v.plate}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {Object.entries(DEFAULT_INTERVALS).map(([type, defaultValue]) => {
          const currentValue = resolveInterval(customIntervals, activeVehicleId, type)
          const isCustomized = currentValue !== defaultValue
          const isEditing = editingType === type

          return (
            <div
              key={type}
              className={`flex items-center justify-between p-3 rounded-lg border transition ${
                isCustomized
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-slate-800/50 border-slate-800'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{type}</div>
                {isCustomized ? (
                  <div className="text-xs text-blue-400 mt-0.5">
                    Özel • Varsayılan: {defaultValue.toLocaleString('tr-TR')} km
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mt-0.5">Varsayılan</div>
                )}
              </div>

              {isEditing ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave(type)
                      if (e.key === 'Escape') handleCancel()
                    }}
                    autoFocus
                    className="w-24 bg-slate-900 border border-blue-500 rounded px-2 py-1 text-sm focus:outline-none"
                    min="500"
                    max="500000"
                    step="500"
                  />
                  <span className="text-xs text-slate-400">km</span>
                  <button
                    onClick={() => handleSave(type)}
                    disabled={saving}
                    className="p-1 hover:bg-green-500/20 rounded text-green-400 disabled:opacity-50"
                    title="Kaydet"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="p-1 hover:bg-red-500/20 rounded text-red-400"
                    title="İptal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                      isCustomized
                        ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {currentValue.toLocaleString('tr-TR')} km
                  </button>
                  {isCustomized && (
                    <button
                      onClick={() => handleResetSingle(type)}
                      disabled={saving}
                      className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-white transition disabled:opacity-50"
                      title="Varsayılana dön"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-slate-300">
        💡 <strong>İpucu:</strong> Değerleri aracının kullanım şekline göre ayarla. Şehir içi sık kullanım varsa yağı daha sık değiştirmen önerilir (7.500-8.000 km).
      </div>

      <ConfirmDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onConfirm={handleResetAll}
        title="Tüm periyotları sıfırla?"
        message="Bu araç için özelleştirdiğin tüm bakım periyotları varsayılan değerlere dönecek."
        confirmText="Evet, sıfırla"
        variant="warning"
      />
    </div>
  )
}
