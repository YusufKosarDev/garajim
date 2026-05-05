import { useState } from 'react'
import { Settings2, RotateCcw, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVehicles } from '../context/VehicleContext'
import { DEFAULT_INTERVALS } from '../utils/maintenanceRecommendations'
import ConfirmDialog from './ConfirmDialog'

export default function MaintenanceIntervals() {
  const { customIntervals, setCustomInterval, resetAllIntervals } = useVehicles()
  const [editingType, setEditingType] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [isResetOpen, setIsResetOpen] = useState(false)

  const handleEdit = (type) => {
    const current = customIntervals[type] || DEFAULT_INTERVALS[type]
    setEditValue(current.toString())
    setEditingType(type)
  }

  const handleSave = (type) => {
    const value = Number(editValue)
    if (isNaN(value) || value < 500) {
      toast.error('Geçersiz değer (en az 500 km olmalı)')
      return
    }
    if (value > 500000) {
      toast.error('Çok yüksek değer (en fazla 500.000 km olabilir)')
      return
    }

    // Varsayılan ile aynıysa custom'dan çıkar
    if (value === DEFAULT_INTERVALS[type]) {
      setCustomInterval(type, null)
      toast.success(`${type} varsayılan değere dönüştürüldü`)
    } else {
      setCustomInterval(type, value)
      toast.success(`${type} periyodu güncellendi`)
    }

    setEditingType(null)
    setEditValue('')
  }

  const handleCancel = () => {
    setEditingType(null)
    setEditValue('')
  }

  const handleResetSingle = (type) => {
    setCustomInterval(type, null)
    toast.success(`${type} varsayılan değere dönüştürüldü`)
  }

  const hasAnyCustom = Object.keys(customIntervals).length > 0

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
            className="flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-3 h-3" />
            Tümünü Sıfırla
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {Object.entries(DEFAULT_INTERVALS).map(([type, defaultValue]) => {
          const customValue = customIntervals[type]
          const currentValue = customValue ?? defaultValue
          const isCustomized = customValue !== undefined && customValue !== defaultValue
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
                    className="p-1 hover:bg-green-500/20 rounded text-green-400"
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
                      className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-white transition"
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
        onConfirm={resetAllIntervals}
        title="Tüm periyotları sıfırla?"
        message="Özelleştirdiğin tüm bakım periyotları varsayılan değerlere dönecek."
        confirmText="Evet, sıfırla"
        variant="warning"
      />
    </div>
  )
}