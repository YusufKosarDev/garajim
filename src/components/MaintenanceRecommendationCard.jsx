import { Link } from 'react-router-dom'
import { Wrench, AlertTriangle, Clock, Plus } from 'lucide-react'

const statusConfig = {
  overdue: {
    icon: AlertTriangle,
    bg: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-400',
    label: 'Gecikti',
    getMessage: (km) => `${Math.abs(km).toLocaleString('tr-TR')} km gecikti`,
  },
  urgent: {
    icon: AlertTriangle,
    bg: 'bg-orange-500/10 border-orange-500/30',
    text: 'text-orange-400',
    label: 'Acil',
    getMessage: (km) => `${km.toLocaleString('tr-TR')} km kaldı`,
  },
  soon: {
    icon: Clock,
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    text: 'text-yellow-400',
    label: 'Yaklaşıyor',
    getMessage: (km) => `${km.toLocaleString('tr-TR')} km kaldı`,
  },
  ok: {
    icon: Wrench,
    bg: 'bg-green-500/10 border-green-500/30',
    text: 'text-green-400',
    label: 'Güvenli',
    getMessage: (km) => `${km.toLocaleString('tr-TR')} km sonra`,
  },
}

export default function MaintenanceRecommendationCard({ recommendation, onQuickAdd, showVehicle = true }) {
  const config = statusConfig[recommendation.status]
  const Icon = config.icon

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${config.bg} transition hover:bg-opacity-20`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.bg} border ${config.text.replace('text', 'border').replace('400', '500/30')}`}>
        <Icon className={`w-5 h-5 ${config.text}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate flex items-center gap-2">
          {recommendation.type}
          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide ${config.bg} ${config.text}`}>
            {config.label}
          </span>
        </div>
        <div className="text-xs text-slate-400 truncate">
          {showVehicle && (
            <>
              <Link
                to={`/vehicles/${recommendation.vehicle.id}`}
                className="hover:text-blue-400 transition"
              >
                {recommendation.vehicle.brand} {recommendation.vehicle.model}
              </Link>
              {' • '}
            </>
          )}
          Son: {recommendation.lastKm.toLocaleString('tr-TR')} km • Hedef: {recommendation.nextDueKm.toLocaleString('tr-TR')} km
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className={`text-xs font-semibold ${config.text} text-right hidden sm:block`}>
          {config.getMessage(recommendation.kmRemaining)}
        </div>
        {onQuickAdd && (
          <button
            onClick={() => onQuickAdd(recommendation)}
            className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-blue-400 transition"
            title="Şimdi Ekle"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}