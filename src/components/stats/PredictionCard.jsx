import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react'
import { getAverageMonthlySpending, getCurrentMonthSpending, getSpendingTrend } from '../../utils/statisticsHelpers'

export default function PredictionCard({ maintenanceRecords, fuelRecords }) {
  const avgData = getAverageMonthlySpending(maintenanceRecords, fuelRecords, 3)
  const currentMonth = getCurrentMonthSpending(maintenanceRecords, fuelRecords)
  const trend = getSpendingTrend(maintenanceRecords, fuelRecords)

  // Ay ortası tahmin — güncel harcama × kalan gün çarpanı
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysPassed = now.getDate()
  const monthProgress = daysPassed / daysInMonth

  // Tahmin: Bu ay şu ana kadar harcanan × (ay sonu / şu an) — veya ortalama
  const projectedByCurrent = monthProgress > 0.1
    ? Math.round(currentMonth.total / monthProgress)
    : null

  // Tahmin: Ortalamayı da al, ikisinin ortalamasını bul (hibrit tahmin)
  const finalPrediction = projectedByCurrent !== null
    ? Math.round((projectedByCurrent + avgData.average) / 2)
    : avgData.average

  const TrendIcon = trend.trend === 'up' ? TrendingUp : trend.trend === 'down' ? TrendingDown : Minus
  const trendColor = trend.trend === 'up' ? 'text-red-400' : trend.trend === 'down' ? 'text-green-400' : 'text-slate-400'
  const trendLabel = trend.trend === 'up' ? 'Artıyor' : trend.trend === 'down' ? 'Azalıyor' : 'Stabil'

  if (avgData.count < 3) {
    // Yeterli veri yoksa
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4" />
          Bu Ay Tahmini
        </h3>
        <div className="text-center py-6">
          <p className="text-sm text-slate-500">
            Tahmin için en az 3 aylık veri gerekiyor
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Daha fazla kayıt ekledikçe akıllı tahminler göreceksin
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-slate-900 border border-blue-500/30 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-blue-400" />
        Bu Ay Tahmini
      </h3>

      <div className="mb-4">
        <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          {finalPrediction.toLocaleString('tr-TR')} ₺
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Son 3 ay ortalaması ve güncel harcama baz alındı
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800">
        <div>
          <div className="text-xs text-slate-500 mb-1">Şu ana kadar</div>
          <div className="text-sm font-bold text-white">
            {currentMonth.total.toLocaleString('tr-TR')} ₺
          </div>
          <div className="text-[10px] text-slate-500">
            %{Math.round(monthProgress * 100)} tamamlandı
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Trend (son 3 ay)</div>
          <div className={`flex items-center gap-1 text-sm font-bold ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trendLabel}
          </div>
          <div className="text-[10px] text-slate-500">
            {trend.change > 0 ? '+' : ''}{Math.round(trend.change)}% değişim
          </div>
        </div>
      </div>
    </div>
  )
}