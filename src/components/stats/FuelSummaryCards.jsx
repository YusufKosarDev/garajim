import { Droplet, TrendingUp, DollarSign, Gauge } from 'lucide-react'
import { useMemo } from 'react'
import { getAverageConsumption, getAveragePrice, getTotalFuelCost } from '../../utils/fuelHelpers'

export default function FuelSummaryCards({ fuelRecords = [] }) {
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
      label: 'Toplam Harcama',
      value: `${stats.totalCost.toLocaleString('tr-TR')} ₺`,
      sub: `${stats.recordCount} yakıt alımı`,
      icon: DollarSign,
      color: 'green',
    },
    {
      label: 'Toplam Litre',
      value: `${stats.totalLiters.toFixed(1)} L`,
      sub: stats.totalLiters >= 1000 ? `${(stats.totalLiters / 1000).toFixed(2)} bin litre` : '—',
      icon: Droplet,
      color: 'orange',
    },
    {
      label: 'Ortalama ₺/L',
      value: stats.avgPrice ? `${stats.avgPrice.toFixed(2)} ₺` : '—',
      sub: 'Tüm zamanlar ortalaması',
      icon: TrendingUp,
      color: 'blue',
    },
    {
      label: 'Ort. Tüketim',
      value: stats.avgConsumption ? `${stats.avgConsumption.toFixed(1)}` : '—',
      sub: stats.avgConsumption ? 'L/100km' : 'Veri yetersiz',
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
            {card.label}
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate" title={card.sub}>
            {card.sub}
          </div>
        </div>
      ))}
    </div>
  )
}