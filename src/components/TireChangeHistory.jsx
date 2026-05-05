import { ArrowRight, X, Calendar, Gauge, History } from 'lucide-react'
import { SEASONS } from '../utils/tireHelpers'
import { formatDate } from '../utils/dateHelpers'

export default function TireChangeHistory({ tireChanges, onDelete }) {
  if (!tireChanges || tireChanges.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        <History className="w-8 h-8 text-slate-700 mx-auto mb-2" />
        Henüz mevsim değişimi yok
      </div>
    )
  }

  // Yeni → eski sıralama
  const sorted = [...tireChanges].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="space-y-2">
      {sorted.map((change, index) => {
        const fromConfig = SEASONS[change.fromSeason]
        const toConfig = SEASONS[change.toSeason]
        const isLatest = index === 0

        return (
          <div
            key={change.id}
            className={`p-3 rounded-lg border transition ${
              isLatest
                ? 'bg-blue-500/5 border-blue-500/20'
                : 'bg-slate-800/30 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Sezon ikonları */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xl" title={fromConfig?.label || change.fromSeason}>
                    {fromConfig?.icon || '?'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="text-xl" title={toConfig?.label || change.toSeason}>
                    {toConfig?.icon || '?'}
                  </span>
                </div>

                {/* Detay */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">
                      {fromConfig?.label || '?'} → {toConfig?.label || '?'}
                    </span>
                    {isLatest && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                        En son
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(change.date)}
                    </span>
                    {change.km > 0 && (
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        {Number(change.km).toLocaleString('tr-TR')} km
                      </span>
                    )}
                    {change.cost > 0 && (
                      <span className="text-green-400">
                        💰 {Number(change.cost).toLocaleString('tr-TR')} ₺
                      </span>
                    )}
                  </div>
                  {change.notes && (
                    <div className="text-[11px] text-slate-500 italic mt-1 truncate">
                      💬 {change.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Sil butonu */}
              <button
                onClick={() => onDelete(change)}
                className="p-1.5 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition shrink-0"
                title="Sil"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}