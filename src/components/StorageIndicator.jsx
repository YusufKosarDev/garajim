import { useState, useEffect } from 'react'
import { HardDrive, AlertTriangle, CheckCircle } from 'lucide-react'
import { getStorageInfo } from '../utils/storage'

export default function StorageIndicator() {
  const [info, setInfo] = useState(null)

  useEffect(() => {
    const updateInfo = () => {
      const data = getStorageInfo()
      setInfo(data)
    }

    updateInfo()

    // Her 10 saniyede bir güncelle (veri değişirse yansısın)
    const interval = setInterval(updateInfo, 10000)

    // Storage event — başka sekme kaydederse
    window.addEventListener('storage', updateInfo)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', updateInfo)
    }
  }, [])

  // Veri yoksa hiç gösterme
  if (!info) return null

  const usagePercent = Number(info.usagePercent) || 0
  const mb = Number(info.mb) || 0
  const kb = Number(info.kb) || 0
  const estimatedTotalMB = Number(info.estimatedTotalMB) || 5

  // Durum belirleme
  const isWarning = usagePercent > 70
  const isCritical = usagePercent > 90

  const colorClass = isCritical
    ? 'border-red-500/40 bg-red-500/10'
    : isWarning
    ? 'border-yellow-500/40 bg-yellow-500/10'
    : 'border-slate-800 bg-slate-900'

  const textColor = isCritical
    ? 'text-red-400'
    : isWarning
    ? 'text-yellow-400'
    : 'text-blue-400'

  const barColor = isCritical
    ? 'bg-red-500'
    : isWarning
    ? 'bg-yellow-500'
    : 'bg-blue-500'

  // Kullanım metni
  const usageText = mb >= 1
    ? `${mb.toFixed(2)} MB`
    : `${kb.toFixed(1)} KB`

  return (
    <div className={`border rounded-xl p-5 mb-6 ${colorClass}`}>
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        <HardDrive className={`w-5 h-5 ${textColor}`} />
        Depolama Alanı
      </h2>

      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-slate-300">
          Kullanılan: <strong className="text-white">{usageText}</strong>
        </span>
        <span className={`font-semibold ${textColor}`}>
          %{usagePercent.toFixed(1)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(usagePercent, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">
          Tahmini kapasite: ~{estimatedTotalMB} MB
        </span>
        <div className="flex items-center gap-1.5">
          {isCritical ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-400 font-semibold">Kritik — yedek al</span>
            </>
          ) : isWarning ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-yellow-400 font-semibold">Dikkat</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">Yeterli alan</span>
            </>
          )}
        </div>
      </div>

      {isCritical && (
        <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300">
          <strong className="text-red-400">Uyarı:</strong> Depolama alanı %90'ı geçti. Gerekirse eski verileri dışa aktarıp silebilirsin. Ayarlar &gt; Yedekleme'den yedek alabilirsin.
        </div>
      )}
    </div>
  )
}