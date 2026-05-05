import { Pencil, Trash2, CheckCircle, Calendar, DollarSign, AlertTriangle } from 'lucide-react'
import { SEASONS, evaluateTireSet, getAverageTreadDepth } from '../utils/tireHelpers'
import { formatDate } from '../utils/dateHelpers'
import TireDisplay from './TireDisplay'

export default function TireCard({ tireSet, isActive = false, onEdit, onDelete }) {
  const season = SEASONS[tireSet.season]
  const setEvaluation = evaluateTireSet(tireSet)
  const avgDepth = getAverageTreadDepth(tireSet)

  const seasonColors = {
    summer: {
      border: 'border-yellow-500/30',
      bg: 'from-yellow-500/10 to-slate-900',
      text: 'text-yellow-400',
      headerBg: 'bg-yellow-500/10',
    },
    winter: {
      border: 'border-cyan-500/30',
      bg: 'from-cyan-500/10 to-slate-900',
      text: 'text-cyan-400',
      headerBg: 'bg-cyan-500/10',
    },
  }

  const colors = seasonColors[tireSet.season] || seasonColors.summer

  // Lastikleri pozisyona göre düzenle
  const mainTires = tireSet.tires.filter(t => t.position !== 'S')
  const spareTire = tireSet.tires.find(t => t.position === 'S')

  return (
    <div className={`bg-gradient-to-br ${colors.bg} border-2 ${colors.border} rounded-xl overflow-hidden transition ${
      isActive ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950' : ''
    }`}>
      {/* Header */}
      <div className={`${colors.headerBg} p-4 border-b ${colors.border}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{season.icon}</div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-bold ${colors.text}`}>
                  {season.label}
                </h3>
                {isActive && (
                  <span className="flex items-center gap-1 text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                    <CheckCircle className="w-3 h-3" />
                    Takılı
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-300 mt-0.5">
                {tireSet.brand} — {tireSet.size}
              </div>
            </div>
          </div>

          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onEdit(tireSet)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-400 transition"
              title="Düzenle"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(tireSet)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition"
              title="Sil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Uyarı banner */}
      {setEvaluation.issueCount > 0 && (
        <div className={`px-4 py-2 border-b border-slate-800 flex items-center gap-2 text-xs ${
          setEvaluation.status === 'critical'
            ? 'bg-red-500/10 text-red-400'
            : setEvaluation.status === 'danger'
            ? 'bg-orange-500/10 text-orange-400'
            : 'bg-yellow-500/10 text-yellow-400'
        }`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold">
            {setEvaluation.issueCount} lastikte uyarı var — detaylar için inceleyin
          </span>
        </div>
      )}

      {/* Lastik grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
          {mainTires.map(tire => (
            <TireDisplay key={tire.position} tire={tire} />
          ))}
        </div>

        {spareTire && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <div className="max-w-[180px] mx-auto">
              <TireDisplay tire={spareTire} />
            </div>
          </div>
        )}
      </div>

      {/* Footer — Detaylar */}
      <div className="bg-slate-900/50 px-4 py-3 border-t border-slate-800">
        <div className="grid grid-cols-3 gap-3 text-xs">
          {avgDepth !== null && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Ort. Diş</div>
              <div className={`font-bold ${colors.text}`}>
                {avgDepth.toFixed(1)} mm
              </div>
            </div>
          )}
          {tireSet.purchaseDate && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" />
                Alım
              </div>
              <div className="font-semibold text-slate-300">
                {formatDate(tireSet.purchaseDate)}
              </div>
            </div>
          )}
          {tireSet.purchasePrice > 0 && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-0.5">
                <DollarSign className="w-2.5 h-2.5" />
                Fiyat
              </div>
              <div className="font-semibold text-green-400">
                {tireSet.purchasePrice.toLocaleString('tr-TR')} ₺
              </div>
            </div>
          )}
        </div>

        {tireSet.notes && (
          <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-400 italic">
            💬 {tireSet.notes}
          </div>
        )}
      </div>
    </div>
  )
}