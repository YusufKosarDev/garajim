import { useTranslation } from 'react-i18next'
import { Wrench, Droplet, Calendar, TrendingUp, DollarSign } from 'lucide-react'
import { getCurrentMonthSpending, getYearComparison } from '../../utils/statisticsHelpers'

export default function SummaryStats({ maintenanceRecords, fuelRecords }) {
  const { t } = useTranslation()
  const currentMonth = getCurrentMonthSpending(maintenanceRecords, fuelRecords)
  const yearData = getYearComparison(maintenanceRecords, fuelRecords)

  const stats = [
    // `label` her satırda ÇEVİRİ ANAHTARI; parametre gerekenler `labelParams`
    // veriyor. Eskiden iki satır anahtar, iki satır önceden çevrilmiş metin
    // tutuyordu ve tüketici ikisine birden t() uyguluyordu.
    {
      label: 'stats.summaryStats.bu_ay',
      value: `${currentMonth.total.toLocaleString('tr-TR')} ₺`,
      sub: t('stats.summaryStats.sub.bakim_yakit', {
        maintenance: currentMonth.maintenance.toLocaleString('tr-TR'),
        fuel: currentMonth.fuel.toLocaleString('tr-TR'),
      }),
      icon: Calendar,
      color: 'blue',
    },
    {
      label: 'stats.summaryStats.bu_yil',
      labelParams: { year: yearData.currentYear },
      value: `${yearData.current.total.toLocaleString('tr-TR')} ₺`,
      sub: t('stats.summaryStats.sub.kayit', {
        count: maintenanceRecords.filter(r => new Date(r.date).getFullYear() === yearData.currentYear).length
          + fuelRecords.filter(r => new Date(r.date).getFullYear() === yearData.currentYear).length,
      }),
      icon: DollarSign,
      color: 'green',
    },
    {
      label: 'stats.summaryStats.gecen_yil',
      labelParams: { year: yearData.previousYear },
      value: `${yearData.previous.total.toLocaleString('tr-TR')} ₺`,
      sub: yearData.percentChange !== null
        ? t('stats.summaryStats.sub.degisim', {
            sign: yearData.percentChange > 0 ? '+' : '',
            percent: yearData.percentChange,
          })
        : t('stats.summaryStats.sub.veri_yok'),
      icon: TrendingUp,
      color: yearData.percentChange > 0 ? 'red' : yearData.percentChange < 0 ? 'green' : 'slate',
    },
    {
      label: 'stats.summaryStats.toplam_kayit',
      value: maintenanceRecords.length + fuelRecords.length,
      sub: t('stats.summaryStats.sub.bakim_yakit_sayi', {
        maintenance: maintenanceRecords.length,
        fuel: fuelRecords.length,
      }),
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
            {t(stat.label, stat.labelParams)}
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate" title={stat.sub}>
            {stat.sub}
          </div>
        </div>
      ))}
    </div>
  )
}