import { Wrench, Droplet, Calendar, TrendingUp, DollarSign } from 'lucide-react'
import { getCurrentMonthSpending, getYearComparison } from '../../utils/statisticsHelpers'

export default function SummaryStats({ maintenanceRecords, fuelRecords }) {
  const currentMonth = getCurrentMonthSpending(maintenanceRecords, fuelRecords)
  const yearData = getYearComparison(maintenanceRecords, fuelRecords)

  const stats = [
    {
      label: 'Bu Ay',
      value: `${currentMonth.total.toLocaleString('tr-TR')} ₺`,
      sub: `Bakım: ${currentMonth.maintenance.toLocaleString('tr-TR')} + Yakıt: ${currentMonth.fuel.toLocaleString('tr-TR')}`,
      icon: Calendar,
      color: 'blue',
    },
    {
      label: `Bu Yıl (${yearData.currentYear})`,
      value: `${yearData.current.total.toLocaleString('tr-TR')} ₺`,
      sub: `${maintenanceRecords.filter(r => new Date(r.date).getFullYear() === yearData.currentYear).length + fuelRecords.filter(r => new Date(r.date).getFullYear() === yearData.currentYear).length} kayıt`,
      icon: DollarSign,
      color: 'green',
    },
    {
      label: `Geçen Yıl (${yearData.previousYear})`,
      value: `${yearData.previous.total.toLocaleString('tr-TR')} ₺`,
      sub: yearData.percentChange !== null
        ? `${yearData.percentChange > 0 ? '+' : ''}${yearData.percentChange}% değişim`
        : 'Veri yok',
      icon: TrendingUp,
      color: yearData.percentChange > 0 ? 'red' : yearData.percentChange < 0 ? 'green' : 'slate',
    },
    {
      label: 'Toplam Kayıt',
      value: maintenanceRecords.length + fuelRecords.length,
      sub: `🔧 ${maintenanceRecords.length} bakım • ⛽ ${fuelRecords.length} yakıt`,
      icon: Wrench,
      color: 'purple',
    },
  ]

  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    slate: 'bg-slate-800/50 border-slate-700 text-slate-400',
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className={`border rounded-xl p-4 ${colorClasses[stat.color]}`}>
          <div className="flex items-start justify-between mb-2">
            <stat.icon className="w-5 h-5" />
          </div>
          <div className="text-xl font-bold text-white mb-1">{stat.value}</div>
          <div className="text-[10px] opacity-80 uppercase tracking-wide font-semibold">
            {stat.label}
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate" title={stat.sub}>
            {stat.sub}
          </div>
        </div>
      ))}
    </div>
  )
}