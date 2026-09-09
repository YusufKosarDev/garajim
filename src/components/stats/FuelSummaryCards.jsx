import { useTranslation } from 'react-i18next'
import { Droplet, TrendingUp, DollarSign, Gauge } from 'lucide-react'
import { useMemo } from 'react'
import { getAverageConsumption, getAveragePrice, getTotalFuelCost } from '../../utils/fuelHelpers'

export default function FuelSummaryCards({ fuelRecords = [] }) {
  const { t } = useTranslation()

  const stats = useMemo(() => {
    const totalCost = getTotalFuelCost(fuelRecords)
    const totalLiters = fuelRecords.reduce((sum, r) => sum + (Number(r.liters) || 0), 0)
    const avgPrice = getAveragePrice(fuelRecords)
    const avgConsumption = getAverageConsumption(fuelRecords)

    return {
      totalCost,
      totalLiters,
      avgPrice,
      avgConsumption,
      recordCount: fuelRecords.length,
    }
  }, [fuelRecords])

  const cards = [
    {
      label: 'stats.fuelSummaryCards.toplam_harcama',
      value: `${stats.totalCost.toLocaleString('tr-TR')} ₺`,
      sub: t('stats.fuelSummaryCards.sub.yakit_alimi', { count: stats.recordCount }),
      icon: DollarSign,
      color: 'green',
    },
    {
      label: 'stats.fuelSummaryCards.toplam_litre',
      value: `${stats.totalLiters.toFixed(1)} L`,
      sub: stats.totalLiters >= 1000
        ? t('stats.fuelSummaryCards.sub.bin_litre', { value: (stats.totalLiters / 1000).toFixed(2) })
        : '—',
      icon: Droplet,
      color: 'orange',
    },
    {
      label: 'stats.fuelSummaryCards.ortalama_l',
      value: stats.avgPrice ? `${stats.avgPrice.toFixed(2)} ₺` : '—',
      sub: t('stats.fuelSummaryCards.sub.tum_zamanlar'),
      icon: TrendingUp,
      color: 'blue',
    },
    {
      label: 'stats.fuelSummaryCards.ort_tuketim',
      value: stats.avgConsumption ? `${stats.avgConsumption.toFixed(1)}` : '—',
      sub: stats.avgConsumption ? 'L/100km' : t('stats.fuelSummaryCards.sub.veri_yetersiz'),
      icon: Gauge,
      color: 'purple',
    },
  ]

  const colorClasses = {
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div key={i} className={`border rounded-xl p-4 ${colorClasses[card.color]}`}>
          <card.icon className="w-5 h-5 mb-2" />
          <div className="text-xl font-bold text-white">{card.value}</div>
          <div className="text-[10px] uppercase tracking-wide font-semibold opacity-80 mt-0.5">
            {t(card.label)}
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate" title={card.sub}>
            {card.sub}
          </div>
        </div>
      ))}
    </div>
  )
}