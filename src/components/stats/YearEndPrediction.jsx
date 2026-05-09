import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, Sparkles, Calendar } from 'lucide-react'

/**
 * YearEndPrediction — Yıl sonu maliyet tahmini
 * 
 * Hesaplar:
 *   - Bu yıl şu ana kadar toplam harcama
 *   - Linear extrapolation ile yıl sonu tahmini
 *   - Geçen yıl aynı tarihe kadar harcamayla karşılaştırma
 *   - Aylık ortalama
 *   - Yılın yüzde kaçı tamamlandı
 */
export default function YearEndPrediction({ maintenanceRecords = [], fuelRecords = [] }) {
  const prediction = useMemo(() => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const lastYear = currentYear - 1

    // Yılın başı
    const yearStart = new Date(currentYear, 0, 1)
    const lastYearStart = new Date(lastYear, 0, 1)

    // Yılın bugüne kadar geçen gün sayısı
    const dayOfYear = Math.floor((today - yearStart) / (1000 * 60 * 60 * 24)) + 1
    const totalDaysInYear = isLeapYear(currentYear) ? 366 : 365
    const yearProgress = (dayOfYear / totalDaysInYear) * 100

    // Bu yıl bugüne kadar harcanan
    let currentYearSpent = 0
    let currentYearMaintenance = 0
    let currentYearFuel = 0
    
    for (const record of maintenanceRecords) {
      const date = new Date(record.date)
      if (date.getFullYear() === currentYear && date <= today) {
        currentYearMaintenance += Number(record.cost) || 0
      }
    }
    
    for (const record of fuelRecords) {
      const date = new Date(record.date)
      if (date.getFullYear() === currentYear && date <= today) {
        currentYearFuel += Number(record.totalCost) || 0
      }
    }
    
    currentYearSpent = currentYearMaintenance + currentYearFuel

    // Geçen yıl aynı tarihe kadar harcanan
    const lastYearSameDate = new Date(lastYear, today.getMonth(), today.getDate())
    let lastYearSpent = 0
    
    for (const record of maintenanceRecords) {
      const date = new Date(record.date)
      if (date.getFullYear() === lastYear && date <= lastYearSameDate) {
        lastYearSpent += Number(record.cost) || 0
      }
    }
    
    for (const record of fuelRecords) {
      const date = new Date(record.date)
      if (date.getFullYear() === lastYear && date <= lastYearSameDate) {
        lastYearSpent += Number(record.totalCost) || 0
      }
    }

    // Geçen yıl tam toplam (karşılaştırma için)
    let lastYearTotal = 0
    for (const record of maintenanceRecords) {
      const date = new Date(record.date)
      if (date.getFullYear() === lastYear) {
        lastYearTotal += Number(record.cost) || 0
      }
    }
    for (const record of fuelRecords) {
      const date = new Date(record.date)
      if (date.getFullYear() === lastYear) {
        lastYearTotal += Number(record.totalCost) || 0
      }
    }

    // Linear extrapolation: yıl sonu tahmini
    let yearEndPrediction = 0
    if (dayOfYear > 0 && currentYearSpent > 0) {
      yearEndPrediction = Math.round((currentYearSpent / dayOfYear) * totalDaysInYear)
    }

    // Aylık ortalama
    const monthsElapsed = today.getMonth() + 1 // Ocak = 1, ... Aralık = 12
    const monthlyAvg = monthsElapsed > 0 ? Math.round(currentYearSpent / monthsElapsed) : 0

    // Geçen yıl aynı dönemle karşılaştırma (yüzde fark)
    let yearOverYearPercent = null
    let yearOverYearTrend = 'flat' // up | down | flat
    if (lastYearSpent > 0) {
      yearOverYearPercent = ((currentYearSpent - lastYearSpent) / lastYearSpent) * 100
      if (Math.abs(yearOverYearPercent) < 1) {
        yearOverYearTrend = 'flat'
      } else if (yearOverYearPercent > 0) {
        yearOverYearTrend = 'up'
      } else {
        yearOverYearTrend = 'down'
      }
    }

    return {
      currentYear,
      lastYear,
      currentYearSpent,
      currentYearMaintenance,
      currentYearFuel,
      lastYearSpent,
      lastYearTotal,
      yearEndPrediction,
      monthlyAvg,
      dayOfYear,
      totalDaysInYear,
      yearProgress,
      monthsElapsed,
      yearOverYearPercent,
      yearOverYearTrend,
    }
  }, [maintenanceRecords, fuelRecords])

  // Boş state
  if (prediction.currentYearSpent === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          {prediction.currentYear} Yıl Sonu Tahmini
        </h3>
        <p className="text-sm text-slate-500 text-center py-6">
          Bu yıl için henüz kayıt yok. Bakım/yakıt kaydı ekleyince tahmin görünecek.
        </p>
      </div>
    )
  }

  // Format helpers
  const formatTL = (n) => `${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺`

  // Trend ikonu ve rengi
  const trendIcon = prediction.yearOverYearTrend === 'up' 
    ? <TrendingUp className="w-4 h-4 text-orange-400" />
    : prediction.yearOverYearTrend === 'down'
    ? <TrendingDown className="w-4 h-4 text-green-400" />
    : <Minus className="w-4 h-4 text-slate-400" />

  const trendColor = prediction.yearOverYearTrend === 'up' ? 'text-orange-400'
    : prediction.yearOverYearTrend === 'down' ? 'text-green-400'
    : 'text-slate-400'

  const trendBg = prediction.yearOverYearTrend === 'up' ? 'bg-orange-500/10 border-orange-500/30'
    : prediction.yearOverYearTrend === 'down' ? 'bg-green-500/10 border-green-500/30'
    : 'bg-slate-700/30 border-slate-600/30'

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-bold">{prediction.currentYear} Yıl Sonu Tahmini</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Mevcut harcama temposuyla yılı nasıl bitireceğin
      </p>

      {/* Ana metrikler */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Şu ana kadar */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Bu yıl şu ana kadar</div>
          <div className="text-2xl font-bold text-white">
            {formatTL(prediction.currentYearSpent)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            🔧 {formatTL(prediction.currentYearMaintenance)} bakım • ⛽ {formatTL(prediction.currentYearFuel)} yakıt
          </div>
        </div>

        {/* Yıl sonu tahmini */}
        <div className={`rounded-lg p-4 border ${trendBg}`}>
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Yıl sonu tahmini
          </div>
          <div className="text-2xl font-bold text-white flex items-baseline gap-2">
            {formatTL(prediction.yearEndPrediction)}
          </div>
          {prediction.yearOverYearPercent !== null && (
            <div className={`text-xs mt-1 flex items-center gap-1 ${trendColor}`}>
              {trendIcon}
              <span>
                {prediction.yearOverYearTrend === 'flat' 
                  ? 'Geçen yılla aynı tempoda'
                  : prediction.yearOverYearTrend === 'up'
                  ? `Geçen yıldan %${Math.abs(prediction.yearOverYearPercent).toFixed(0)} daha çok`
                  : `Geçen yıldan %${Math.abs(prediction.yearOverYearPercent).toFixed(0)} daha az`
                }
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Aylık ortalama + Geçen yıl karşılaştırma */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-slate-900/30 rounded-lg">
          <div className="text-xs text-slate-400 mb-1">Aylık ortalama</div>
          <div className="text-base font-bold text-white">{formatTL(prediction.monthlyAvg)}</div>
        </div>
        {prediction.lastYearSpent > 0 && (
          <div className="text-center p-3 bg-slate-900/30 rounded-lg">
            <div className="text-xs text-slate-400 mb-1">Geçen yıl aynı dönem</div>
            <div className="text-base font-bold text-white">{formatTL(prediction.lastYearSpent)}</div>
          </div>
        )}
        {prediction.lastYearTotal > 0 && (
          <div className="text-center p-3 bg-slate-900/30 rounded-lg">
            <div className="text-xs text-slate-400 mb-1">{prediction.lastYear} toplam</div>
            <div className="text-base font-bold text-white">{formatTL(prediction.lastYearTotal)}</div>
          </div>
        )}
      </div>

      {/* Year progress bar */}
      <div className="bg-slate-900/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-300 font-medium">Yıl ilerlemesi</span>
          </div>
          <span className="text-xs font-bold text-white">
            %{prediction.yearProgress.toFixed(0)}
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
            style={{ width: `${prediction.yearProgress}%` }}
          />
        </div>
        <div className="text-[10px] text-slate-500 mt-1.5 text-center">
          {prediction.dayOfYear} / {prediction.totalDaysInYear} gün geçti
        </div>
      </div>

      {/* Akıllı not (eğer trend up ise uyarı) */}
      {prediction.yearOverYearTrend === 'up' && Math.abs(prediction.yearOverYearPercent) > 15 && (
        <div className="mt-3 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
          <p className="text-xs text-slate-300">
            ⚠️ Bu yıl harcamaların geçen yıla göre belirgin artmış. 
            Tasarruf için Yakıt İstasyonu Analizi'ni kontrol etmek isteyebilirsin.
          </p>
        </div>
      )}
    </div>
  )
}

// Helper: Artık yıl mı?
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
}