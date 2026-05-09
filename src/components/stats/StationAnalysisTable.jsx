import { useMemo } from 'react'
import { MapPin, Trophy, TrendingDown, TrendingUp, Sparkles } from 'lucide-react'
import { getStationAnalysis } from '../../utils/statisticsHelpers'

export default function StationAnalysisTable({ fuelRecords = [] }) {
  const analysis = useMemo(() => getStationAnalysis(fuelRecords), [fuelRecords])

  // Ortalama fiyatı göre en ucuz ve en pahalı
  const { cheapest, mostExpensive } = useMemo(() => {
    const withPrice = analysis.filter(a => a.avgPrice > 0 && a.count >= 2)
    if (withPrice.length < 2) return { cheapest: null, mostExpensive: null }
    const sorted = [...withPrice].sort((a, b) => a.avgPrice - b.avgPrice)
    return {
      cheapest: sorted[0],
      mostExpensive: sorted[sorted.length - 1],
    }
  }, [analysis])

  // 🆕 Akıllı içgörü: tasarruf hesaplaması
  const smartInsight = useMemo(() => {
    if (!cheapest || !mostExpensive || cheapest === mostExpensive) return null

    const priceDiff = mostExpensive.avgPrice - cheapest.avgPrice
    const percentDiff = (priceDiff / mostExpensive.avgPrice) * 100

    // Eğer hep en ucuza gitseydi ne kadar tasarruf ederdi?
    // Toplam litreyi al, en pahalıdaki ortalamayı yerine en ucuzdakini koy
    const totalLiters = analysis.reduce((sum, a) => sum + a.liters, 0)
    const totalSpent = analysis.reduce((sum, a) => sum + a.total, 0)
    const totalIfCheapest = totalLiters * cheapest.avgPrice
    const potentialSavings = Math.max(0, totalSpent - totalIfCheapest)

    return {
      priceDiff: priceDiff.toFixed(2),
      percentDiff: percentDiff.toFixed(1),
      potentialSavings: Math.round(potentialSavings),
      totalLiters: Math.round(totalLiters),
    }
  }, [cheapest, mostExpensive, analysis])

  if (analysis.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Henüz yakıt kaydı yok
      </div>
    )
  }

  const maxTotal = analysis[0]?.total || 0

  return (
    <div>
      {/* 🆕 AKILLI İÇGÖRÜ KUTUSU */}
      {smartInsight && (
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="text-blue-300 font-semibold mb-1">
                💡 Akıllı İçgörü
              </div>
              <p className="text-slate-300 leading-relaxed">
                <strong className="text-green-400">{cheapest.station}</strong>'te ortalama
                {' '}<strong>%{smartInsight.percentDiff}</strong>{' '}
                ({smartInsight.priceDiff} ₺/L) daha ucuz!
                {smartInsight.potentialSavings > 0 && (
                  <>
                    {' '}Hep oradan alsaydın yaklaşık{' '}
                    <strong className="text-green-400">
                      {smartInsight.potentialSavings.toLocaleString('tr-TR')} ₺
                    </strong>{' '}
                    tasarruf edebilirdin 💰
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* En ucuz / en pahalı banner */}
      {cheapest && mostExpensive && cheapest !== mostExpensive && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-2 p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg">
            <TrendingDown className="w-4 h-4 text-green-400 shrink-0" />
            <div className="text-xs">
              <div className="text-green-400 font-semibold">En ucuz ortalama</div>
              <div className="text-slate-300 truncate">
                {cheapest.station} — <strong>{cheapest.avgPrice.toFixed(2)} ₺/L</strong>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <TrendingUp className="w-4 h-4 text-red-400 shrink-0" />
            <div className="text-xs">
              <div className="text-red-400 font-semibold">En pahalı ortalama</div>
              <div className="text-slate-300 truncate">
                {mostExpensive.station} — <strong>{mostExpensive.avgPrice.toFixed(2)} ₺/L</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tablo */}
      <div className="space-y-2">
        {analysis.map((station, i) => {
          const widthPercent = maxTotal > 0 ? (station.total / maxTotal) * 100 : 0
          const isCheapest = cheapest?.station === station.station
          const isMostExpensive = mostExpensive?.station === station.station

          return (
            <div
              key={station.station}
              className={`relative p-3 rounded-lg border transition ${
                isCheapest
                  ? 'border-green-500/30 bg-green-500/5'
                  : isMostExpensive
                  ? 'border-red-500/30 bg-red-500/5'
                  : 'border-slate-800 bg-slate-800/30'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isCheapest
                      ? 'bg-green-500/20'
                      : isMostExpensive
                      ? 'bg-red-500/20'
                      : 'bg-slate-700'
                  }`}>
                    {isCheapest
                      ? <Trophy className="w-3.5 h-3.5 text-green-400" />
                      : <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">
                      {station.station || 'Belirtilmemiş'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {station.count} alım • {station.liters.toFixed(1)} L
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-white">
                    {station.total.toLocaleString('tr-TR')} ₺
                  </div>
                  <div className={`text-[10px] font-semibold ${
                    isCheapest ? 'text-green-400' : isMostExpensive ? 'text-red-400' : 'text-slate-500'
                  }`}>
                    Ort. {station.avgPrice.toFixed(2)} ₺/L
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isCheapest
                      ? 'bg-green-500'
                      : isMostExpensive
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}