import { useState } from 'react'
import { Wrench, ChevronDown, ChevronUp } from 'lucide-react'
import { getVehicleRecommendations } from '../utils/maintenanceRecommendations'
import { useVehicles } from '../context/VehicleContext'
import MaintenanceRecommendationCard from './MaintenanceRecommendationCard'

export default function VehicleMaintenanceOverview({ vehicle, maintenanceRecords, onQuickAdd }) {
  const { customIntervals } = useVehicles()
  const [isExpanded, setIsExpanded] = useState(false)

  const allRecommendations = getVehicleRecommendations(vehicle, maintenanceRecords, customIntervals)
  const criticalCount = allRecommendations.filter(r => r.status !== 'ok').length

  if (allRecommendations.length === 0) {
    return null
  }

  const criticalRecs = allRecommendations.filter(r => r.status !== 'ok')
  const okRecs = allRecommendations.filter(r => r.status === 'ok')

  const displayedRecs = isExpanded
    ? allRecommendations
    : criticalRecs.length > 0
      ? criticalRecs
      : allRecommendations.slice(0, 3)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Wrench className="w-5 h-5 text-blue-400" />
          🧠 Bakım Önerileri
          {criticalCount > 0 ? (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
              {criticalCount} dikkat gerekli
            </span>
          ) : (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
              ✓ Hepsi güvende
            </span>
          )}
        </h2>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Geçmiş bakım kayıtlarına ve ayarlardaki periyotlara göre hesaplanmıştır
      </p>

      <div className="space-y-2">
        {displayedRecs.map(rec => (
          <MaintenanceRecommendationCard
            key={`${rec.vehicleId}-${rec.type}`}
            recommendation={rec}
            onQuickAdd={onQuickAdd}
            showVehicle={false}
          />
        ))}
      </div>

      {allRecommendations.length > displayedRecs.length && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition text-sm text-slate-400 hover:text-white"
        >
          <ChevronDown className="w-4 h-4" />
          Tümünü Göster ({okRecs.length} güvenli bakım da görünür)
        </button>
      )}

      {isExpanded && criticalRecs.length > 0 && (
        <button
          onClick={() => setIsExpanded(false)}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition text-sm text-slate-400 hover:text-white"
        >
          <ChevronUp className="w-4 h-4" />
          Sadece Dikkat Gerekenleri Göster
        </button>
      )}
    </div>
  )
}