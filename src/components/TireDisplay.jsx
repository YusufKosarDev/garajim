import { AlertTriangle, AlertOctagon } from 'lucide-react'
import { evaluateTire, TIRE_POSITIONS } from '../utils/tireHelpers'

export default function TireDisplay({ tire, showWarning = true }) {
  const evaluation = evaluateTire(tire)
  const pos = TIRE_POSITIONS.find(p => p.code === tire.position)

  const statusColors = {
    ok: 'border-slate-700 bg-slate-800/50',
    warning: 'border-yellow-500/40 bg-yellow-500/10',
    danger: 'border-orange-500/40 bg-orange-500/10',
    critical: 'border-red-500/50 bg-red-500/10',
  }

  const textColors = {
    ok: 'text-slate-300',
    warning: 'text-yellow-400',
    danger: 'text-orange-400',
    critical: 'text-red-400',
  }

  const depth = Number(tire.treadDepth) || 0

  return (
    <div className={`border rounded-lg p-2.5 ${statusColors[evaluation.status]}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] font-bold text-slate-400 uppercase">
          {pos?.label || tire.position}
        </div>
        {showWarning && evaluation.status !== 'ok' && (
          <>
            {evaluation.status === 'critical' ? (
              <AlertOctagon className="w-3 h-3 text-red-400" />
            ) : (
              <AlertTriangle className={`w-3 h-3 ${textColors[evaluation.status]}`} />
            )}
          </>
        )}
      </div>

      <div className="space-y-0.5">
        {depth > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-500">Diş</span>
            <span className={`text-xs font-bold ${textColors[evaluation.status]}`}>
              {depth} mm
            </span>
          </div>
        )}
        {tire.dot && (
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-500">DOT</span>
            <span className="text-xs font-mono text-slate-300">
              {tire.dot}
            </span>
          </div>
        )}
        {evaluation.age && (
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-500">Yaş</span>
            <span className={`text-xs font-semibold ${textColors[evaluation.status]}`}>
              {evaluation.age.ageYears}y
            </span>
          </div>
        )}
      </div>
    </div>
  )
}