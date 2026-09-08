import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Trophy, TrendingDown, TrendingUp, Sparkles, Info, LineChart } from 'lucide-react'
import { getStationAnalysis } from '../../utils/statisticsHelpers'
import { analyzeFuelPrices } from '../../utils/fuelPriceAnalysis'

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

/** "2026-01" -> "Oca 2026" */
const monthLabel = (month) => {
  const [year, no] = month.split('-')
  return `${MONTH_NAMES[Number(no) - 1] ?? month} ${year}`
}

export default function StationAnalysisTable({ fuelRecords = [] }) {
  const { t } = useTranslation()

  const analysis = useMemo(() => getStationAnalysis(fuelRecords), [fuelRecords])

  // Zaman farkındalıklı fiyat analizi (madde 27).
  //
  // ÖNEMLİ: "en ucuz istasyon" artık ömür boyu ortalama fiyata göre seçilmiyor.
  // O yöntem enflasyonu istasyon farkı sanıyordu: 2024'te alışveriş yapılan bir
  // istasyon, 2026'da alışveriş yapılana göre otomatik olarak "ucuz" çıkıyordu.
  // analyzeFuelPrices her alımı AYNI DÖNEMDEKİ alımlarla kıyaslıyor.
  const fiyat = useMemo(() => analyzeFuelPrices(fuelRecords), [fuelRecords])

  const { cheapest, mostExpensive } = useMemo(() => {
    const s = fiyat.stations
    if (s.length < 2) return { cheapest: null, mostExpensive: null }
    return { cheapest: s[0], mostExpensive: s[s.length - 1] }
  }, [fiyat])

  // Kendi verinden fiyat seyri: ilk aydan son aya değişim
  const trend = useMemo(() => {
    const a = fiyat.monthlyPrices
    if (a.length < 2) return null
    const first = a[0]
    const sonAy = a[a.length - 1]
    if (first.ortFiyat <= 0) return null
    return {
      first,
      last: sonAy,
      yuzde: ((sonAy.ortFiyat - first.ortFiyat) / first.ortFiyat) * 100,
    }
  }, [fiyat])

  if (analysis.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        {t('stats.stationAnalysisTable.henuz_yakit_kaydi_yok')}
      </div>
    )
  }

  const maxTotal = analysis[0]?.total || 0

  return (
    <div>
      {/* Tasarruf: yalnızca GERÇEKTEN gözlemlenebilir fark.
          "O dönemde başka bir istasyonda daha ucuzu vardı" durumu sayılıyor;
          varsayımsal fiyat üretilmiyor. */}
      {fiyat.savings && fiyat.savings.total > 0 && (
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs">
              <div className="text-blue-300 font-semibold mb-1">{t('stats.stationAnalysisTable.kacirilan_tasarruf')}</div>
              <p className="text-slate-300 leading-relaxed">
                Her alımda o günlerde açık ara en ucuz olan istasyonu seçseydin yaklaşık{' '}
                <strong className="text-green-400">
                  {Math.round(fiyat.savings.total).toLocaleString('tr-TR')} ₺
                </strong>
                {fiyat.savings.comparedAmount > 0 && (
                  <> (%{((fiyat.savings.total / fiyat.savings.comparedAmount) * 100).toFixed(1)})</>
                )}
                {' '}daha az öderdin.
              </p>
              {/* Yöntem açıkça yazılıyor: kullanıcı sayının nereden geldiğini bilmeli */}
              <p className="text-[11px] text-slate-500 mt-1">
                {fiyat.savings.comparedFillUps} alım, aynı haftadaki diğer istasyon
                fiyatlarıyla karşılaştırıldı. Yol farkı ve marka tercihi hesaba katılmadı.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Yeterli veri yoksa uydurma içgörü yerine sebebini söyle */}
      {fiyat.insufficientData && (
        <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-800/40 border border-slate-700 rounded-lg p-3 mb-4">
          <Info className="w-4 h-4 shrink-0 mt-px text-slate-500" aria-hidden="true" />
          <p>{fiyat.insufficientData}</p>
        </div>
      )}

      {/* Piyasaya göre sapma. Fiyatın kendisi değil FARKI gösteriliyor:
          ₺/L mutlak değeri zamanla değişir, fark istasyonun kendi özelliğidir. */}
      {cheapest && mostExpensive && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-2 p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg">
            <TrendingDown className="w-4 h-4 text-green-400 shrink-0" aria-hidden="true" />
            <div className="text-xs min-w-0">
              <div className="text-green-400 font-semibold">{t('stats.stationAnalysisTable.donemin_piyasasina_gore_en_ucuz')}</div>
              <div className="text-slate-300 truncate">
                {cheapest.station} — <strong>{Math.abs(cheapest.avgDeviation).toFixed(2)} ₺/L altında</strong>
                <span className="text-slate-500"> ({cheapest.count} alım)</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <TrendingUp className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
            <div className="text-xs min-w-0">
              <div className="text-red-400 font-semibold">{t('stats.stationAnalysisTable.donemin_piyasasina_gore_en_pahali')}</div>
              <div className="text-slate-300 truncate">
                {mostExpensive.station} — <strong>{mostExpensive.avgDeviation.toFixed(2)} ₺/L üstünde</strong>
                <span className="text-slate-500"> ({mostExpensive.count} alım)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fiyat seyri — dış API yok, tamamen kullanıcının kendi alımlarından */}
      {trend && (
        <div className="flex items-center gap-2 p-2.5 mb-4 bg-slate-800/40 border border-slate-700 rounded-lg text-xs">
          <LineChart className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <span className="text-slate-400">{t('stats.stationAnalysisTable.senin_odedigin_fiyat')} </span>
            <strong className="text-white">{monthLabel(trend.first.month)}</strong>
            {' '}{trend.first.ortFiyat.toFixed(2)} ₺/L
            {' → '}
            <strong className="text-white">{monthLabel(trend.last.month)}</strong>
            {' '}{trend.last.ortFiyat.toFixed(2)} ₺/L
            <span className={trend.yuzde >= 0 ? ' text-red-400' : ' text-green-400'}>
              {' '}({trend.yuzde >= 0 ? '+' : ''}%{trend.yuzde.toFixed(1)})
            </span>
          </div>
        </div>
      )}

      {/* Tablo */}
      <div className="space-y-2">
        {analysis.map((station) => {
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
                      {station.station || t('stats.stationAnalysisTable.belirtilmemis')}
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