import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Wrench, AlertTriangle, Clock, Plus } from 'lucide-react'

const statusConfig = {
  overdue: {
    icon: AlertTriangle,
    bg: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-400',
    label: 'maintenanceRecommendationCard.gecikti',
    messageKey: 'maintenanceRecommendationCard.km_gecikti',
  },
  urgent: {
    icon: AlertTriangle,
    bg: 'bg-orange-500/10 border-orange-500/30',
    text: 'text-orange-400',
    label: 'maintenanceRecommendationCard.acil',
    messageKey: 'maintenanceRecommendationCard.km_kaldi',
  },
  soon: {
    icon: Clock,
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    text: 'text-yellow-400',
    label: 'maintenanceRecommendationCard.yaklasiyor',
    messageKey: 'maintenanceRecommendationCard.km_kaldi',
  },
  ok: {
    icon: Wrench,
    bg: 'bg-green-500/10 border-green-500/30',
    text: 'text-green-400',
    label: 'maintenanceRecommendationCard.guvenli',
    messageKey: 'maintenanceRecommendationCard.km_sonra',
  },
}

function MaintenanceRecommendationCard({ recommendation, onQuickAdd, showVehicle = true }) {
  const { t } = useTranslation()

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
            {t(config.label)}
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
          {t('maintenanceRecommendationCard.son_hedef', {
            last: recommendation.lastKm.toLocaleString('tr-TR'),
            target: recommendation.nextDueKm.toLocaleString('tr-TR'),
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className={`text-xs font-semibold ${config.text} text-right hidden sm:block`}>
          {t(config.messageKey, { km: Math.abs(recommendation.kmRemaining).toLocaleString('tr-TR') })}
        </div>
        {onQuickAdd && (
          <button
            onClick={() => onQuickAdd(recommendation)}
            className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-blue-400 transition"
            title={t('maintenanceRecommendationCard.simdi_ekle')}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
// Dashboard'da 8 adede kadar render ediliyor.
export default memo(MaintenanceRecommendationCard)
