import { useMemo } from 'react'
import { TrendingUp, Calendar } from 'lucide-react'
import { getMonthlyBreakdown } from '../../utils/statisticsHelpers'

const MONTH_LABELS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export default function TopMonthsTable({ maintenanceRecords = [], fuelRecords = [] }) {
  const topMonths = useMemo(() => {
    const breakdown = getMonthlyBreakdown(maintenanceRecords, fuelRecords, 2)

    return Object.entries(breakdown)
      .map(([key, data]) => {
        const [year, monthNum] = key.split('-')
        return {
          key,
          year: parseInt(year),
          month: parseInt(monthNum) - 1,
          label: `${MONTH_LABELS[parseInt(monthNum) - 1]} ${year}`,
          ...data,
        }
      })
      .filter(m => m.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [maintenanceRecords, fuelRecords])

  if (topMonths.length === 0) {
    return (
      <div className="text-center text-slate-500 text-sm py-8">
        Henüz harcama verisi yok
      </div>
    )
  }

  const maxTotal = topMonths[0].total

  return (
    <div className="space-y-3">
      {topMonths.map((m, i) => {
        const percentage = (m.total / maxTotal) * 100
        const isHighest = i === 0

        return (
          <div key={m.key} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isHighest
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {i + 1}
                </div>
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-sm font-semibold">{m.label}</span>
              </div>
              <span className="text-sm font-bold text-white">
                {m.total.toLocaleString('tr-TR')} ₺
              </span>
            </div>

            {/* Progress bar */}
            <div className="ml-8 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isHighest
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="ml-8 mt-1 flex gap-4 text-[10px] text-slate-500">
              <span>🔧 {m.maintenance.toLocaleString('tr-TR')} ₺</span>
              <span>⛽ {m.fuel.toLocaleString('tr-TR')} ₺</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}