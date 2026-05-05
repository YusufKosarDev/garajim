import { useMemo } from 'react'
import { getMonthlyBreakdown } from '../../utils/statisticsHelpers'

const MONTH_LABELS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

export default function SpendingHeatmap({ maintenanceRecords = [], fuelRecords = [] }) {
  const { grid, maxValue, totalByYear } = useMemo(() => {
    const breakdown = getMonthlyBreakdown(maintenanceRecords, fuelRecords, 2)

    const now = new Date()
    const currentYear = now.getFullYear()
    const previousYear = currentYear - 1

    // 2 yıl x 12 ay grid
    const grid = [previousYear, currentYear].map(year => ({
      year,
      months: Array.from({ length: 12 }, (_, i) => {
        const key = `${year}-${String(i + 1).padStart(2, '0')}`
        return {
          year,
          monthIndex: i,
          monthLabel: MONTH_LABELS[i],
          total: breakdown[key]?.total || 0,
          maintenance: breakdown[key]?.maintenance || 0,
          fuel: breakdown[key]?.fuel || 0,
          isFuture: year === currentYear && i > now.getMonth(),
        }
      }),
    }))

    // Renk yoğunluğu için en yüksek değer
    let maxValue = 0
    grid.forEach(row => row.months.forEach(m => {
      if (m.total > maxValue) maxValue = m.total
    }))

    // Yıl bazında toplam
    const totalByYear = {}
    grid.forEach(row => {
      totalByYear[row.year] = row.months.reduce((sum, m) => sum + m.total, 0)
    })

    return { grid, maxValue, totalByYear }
  }, [maintenanceRecords, fuelRecords])

  const getIntensityClass = (value, isFuture) => {
    if (isFuture) return 'bg-slate-900/50 border-slate-800'
    if (value === 0) return 'bg-slate-800/30 border-slate-800'

    const ratio = value / maxValue
    if (ratio >= 0.75) return 'bg-blue-500 border-blue-400'
    if (ratio >= 0.5) return 'bg-blue-500/70 border-blue-500/80'
    if (ratio >= 0.25) return 'bg-blue-500/40 border-blue-500/50'
    return 'bg-blue-500/20 border-blue-500/30'
  }

  if (maxValue === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
        Henüz harcama verisi yok
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        {grid.map(row => (
          <div key={row.year} className="flex items-center gap-3">
            <div className="w-12 text-xs font-semibold text-slate-400 shrink-0">
              {row.year}
            </div>
            <div className="flex gap-1 flex-1">
              {row.months.map((m, i) => (
                <div
                  key={i}
                  className={`flex-1 aspect-square min-w-[24px] rounded border ${getIntensityClass(m.total, m.isFuture)} ${
                    m.isFuture ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'
                  } transition-transform group relative`}
                  title={m.isFuture
                    ? `${m.monthLabel} ${m.year} (Gelecek)`
                    : `${m.monthLabel} ${m.year}: ${m.total.toLocaleString('tr-TR')} ₺\n🔧 Bakım: ${m.maintenance.toLocaleString('tr-TR')} ₺\n⛽ Yakıt: ${m.fuel.toLocaleString('tr-TR')} ₺`
                  }
                >
                  {!m.isFuture && m.total > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition">
                      {m.total >= 1000 ? `${(m.total / 1000).toFixed(0)}k` : m.total}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="w-16 text-xs text-right text-slate-400 shrink-0">
              {totalByYear[row.year] >= 1000
                ? `${(totalByYear[row.year] / 1000).toFixed(1)}k ₺`
                : `${totalByYear[row.year]} ₺`
              }
            </div>
          </div>
        ))}
      </div>

      {/* Ay etiketleri */}
      <div className="flex items-center gap-3 mt-2">
        <div className="w-12 shrink-0"></div>
        <div className="flex gap-1 flex-1">
          {MONTH_LABELS.map((label, i) => (
            <div key={i} className="flex-1 min-w-[24px] text-center text-[10px] text-slate-500">
              {label}
            </div>
          ))}
        </div>
        <div className="w-16 shrink-0"></div>
      </div>

      {/* Renk açıklama */}
      <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500">
        <span>Az</span>
        <div className="w-3 h-3 rounded-sm bg-slate-800/30 border border-slate-800"></div>
        <div className="w-3 h-3 rounded-sm bg-blue-500/20 border border-blue-500/30"></div>
        <div className="w-3 h-3 rounded-sm bg-blue-500/40 border border-blue-500/50"></div>
        <div className="w-3 h-3 rounded-sm bg-blue-500/70 border border-blue-500/80"></div>
        <div className="w-3 h-3 rounded-sm bg-blue-500 border border-blue-400"></div>
        <span>Çok</span>
      </div>
    </div>
  )
}