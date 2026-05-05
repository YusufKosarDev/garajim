import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getYearComparison } from '../../utils/statisticsHelpers'

export default function YearSummaryCards({ maintenanceRecords = [], fuelRecords = [] }) {
  const data = getYearComparison(maintenanceRecords, fuelRecords)

  const percentChange = data.percentChange
  const isIncrease = percentChange > 0
  const isDecrease = percentChange < 0
  const isStable = percentChange === 0 || percentChange === null

  const TrendIcon = isIncrease ? TrendingUp : isDecrease ? TrendingDown : Minus
  const trendColor = isIncrease ? 'text-red-400' : isDecrease ? 'text-green-400' : 'text-slate-400'
  const trendBg = isIncrease ? 'bg-red-500/10 border-red-500/20' : isDecrease ? 'bg-green-500/10 border-green-500/20' : 'bg-slate-800/50 border-slate-700'

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Bu yıl */}
      <div className="bg-gradient-to-br from-blue-600/20 to-slate-900 border border-blue-500/30 rounded-xl p-5">
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
          Bu Yıl ({data.currentYear})
        </div>
        <div className="text-3xl font-bold text-white mb-1">
          {data.current.total.toLocaleString('tr-TR')} ₺
        </div>
        <div className="text-xs text-slate-400">
          🔧 {data.current.maintenance.toLocaleString('tr-TR')} • ⛽ {data.current.fuel.toLocaleString('tr-TR')}
        </div>
      </div>

      {/* Geçen yıl */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
          Geçen Yıl ({data.previousYear})
        </div>
        <div className="text-3xl font-bold text-slate-300 mb-1">
          {data.previous.total.toLocaleString('tr-TR')} ₺
        </div>
        <div className="text-xs text-slate-500">
          🔧 {data.previous.maintenance.toLocaleString('tr-TR')} • ⛽ {data.previous.fuel.toLocaleString('tr-TR')}
        </div>
      </div>

      {/* Değişim */}
      <div className={`border rounded-xl p-5 ${trendBg}`}>
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
          Değişim
        </div>
        <div className={`flex items-center gap-2 mb-1 ${trendColor}`}>
          <TrendIcon className="w-6 h-6" />
          <span className="text-3xl font-bold">
            {percentChange !== null ? `${isIncrease ? '+' : ''}${percentChange}%` : '—'}
          </span>
        </div>
        <div className="text-xs text-slate-400">
          {isIncrease && `${Math.abs(data.difference).toLocaleString('tr-TR')} ₺ daha fazla`}
          {isDecrease && `${Math.abs(data.difference).toLocaleString('tr-TR')} ₺ daha az`}
          {isStable && 'Geçen yılla aynı'}
        </div>
      </div>
    </div>
  )
}