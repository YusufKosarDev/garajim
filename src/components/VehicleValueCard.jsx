import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingDown, Info, Gauge, Wrench, CalendarClock } from 'lucide-react'
import { estimateVehicleValue } from '../utils/vehicleValuation'

/**
 * Aracın tahmini değer koruma oranı.
 *
 * Alış fiyatı VERİTABANINDA YOK ve şema değişikliği bu oturumda yapılamıyor.
 * Bu yüzden fiyat cihazda (localStorage) tutuluyor ve kullanıcıya bu açıkça
 * söyleniyor — girilen rakamın buluta gittiğini sanmasın. Fiyat girilmese de
 * kart çalışıyor: asıl çıktı ₺ değil, korunan değerin ORANI.
 */

const key = (vehicleId) => `garajim_alis_fiyati_${vehicleId}`

const fiyatOku = (vehicleId) => {
  try {
    const raw = localStorage.getItem(key(vehicleId))
    const n = raw ? Number(raw) : 0
    return Number.isFinite(n) && n > 0 ? n : ''
  } catch {
    // Gizli sekme ya da depolama kapalı — kart fiyatsız çalışmaya devam eder
    return ''
  }
}

const CONFIDENCE_LABELS = {
  high: { label: 'Yüksek', className: 'text-green-400' },
  medium: { label: 'Orta', className: 'text-yellow-400' },
  low: { label: 'Düşük', className: 'text-red-400' },
}

const yuzde = (oran) => `${oran >= 0 ? '+' : ''}${(oran * 100).toFixed(1)}%`

export default function VehicleValueCard({ vehicle, maintenanceRecords = [] }) {
  const { t } = useTranslation()

  const vehicleId = vehicle?.id

  // Cihazda kayıtlı fiyat. Kullanıcının yazdığı değer, AİT OLDUĞU ARAÇLA birlikte
  // tutuluyor ve render sırasında karşılaştırılıyor; başka bir araca geçildiğinde
  // önceki aracın fiyatı bir an bile görünemiyor. (Bunu bir effect'le sıfırlamak
  // basamaklı render üretirdi.)
  const storedPrice = useMemo(() => (vehicleId ? fiyatOku(vehicleId) : ''), [vehicleId])
  const [girilen, setGirilen] = useState(null)
  const purchasePrice = girilen && girilen.id === vehicleId ? girilen.value : storedPrice

  const estimate = useMemo(
    () => estimateVehicleValue(vehicle, maintenanceRecords, { purchasePrice: Number(purchasePrice) || null }),
    [vehicle, maintenanceRecords, purchasePrice]
  )

  const priceChanged = (value) => {
    setGirilen({ id: vehicleId, value })
    try {
      if (value) localStorage.setItem(key(vehicleId), String(value))
      else localStorage.removeItem(key(vehicleId))
    } catch {
      // Yazılamadıysa hesap yine ekranda doğru; sadece kalıcı olmaz
    }
  }

  // Model yılı olmadan yaş bilinmez; uydurma bir oran göstermek yerine sebebi söyle
  if (!estimate) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-2">
          <TrendingDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
          {t('vehicleValueCard.deger_tahmini')}
        </h3>
        <p className="text-sm text-slate-400">
          {t('vehicleValueCard.tahmin_icin_aracin_model_yili_gerekiyor')}
        </p>
      </div>
    )
  }

  const confidence = CONFIDENCE_LABELS[estimate.confidence]
  const remainingPercent = Math.round(estimate.remainingRatio * 100)

  const componentRows = [
    {
      ikon: CalendarClock,
      label: `Yaş (${estimate.age} yıl)`,
      value: `${Math.round(estimate.components.age * 100)}% kalır`,
      renk: 'text-slate-300',
    },
    {
      ikon: Gauge,
      label: estimate.kmFarki === 0
        ? 'Kilometre'
        : `Kilometre (beklenenden ${Math.abs(estimate.kmFarki).toLocaleString('tr-TR')} km ${estimate.kmFarki > 0 ? 'fazla' : 'az'})`,
      value: yuzde(estimate.components.km),
      renk: estimate.components.km < 0 ? 'text-red-400' : estimate.components.km > 0 ? 'text-green-400' : 'text-slate-500',
    },
    {
      ikon: Wrench,
      label: t('vehicleValueCard.bakim_gecmisi'),
      value: yuzde(estimate.components.maintenance),
      renk: estimate.components.maintenance < 0 ? 'text-red-400' : estimate.components.maintenance > 0 ? 'text-green-400' : 'text-slate-500',
    },
  ]

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <h3 className="font-semibold flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-blue-400" aria-hidden="true" />
          {t('vehicleValueCard.deger_tahmini')}
        </h3>
        <span className="text-xs text-slate-500">
          {t('vehicleValueCard.guven')} <strong className={confidence.className}>{confidence.label}</strong>
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold text-white">%{remainingPercent}</span>
        <span className="text-sm text-slate-400">{t('vehicleValueCard.ilk_degerini_koruyor')}</span>
      </div>

      {estimate.estimatedValue !== null && (
        <div className="text-lg font-semibold text-blue-300 mb-2">
          ≈ {estimate.estimatedValue.toLocaleString('tr-TR')} ₺
        </div>
      )}

      {/* Dökümü göstermek zorunlu: kullanıcı tek bir sayıyı yutmak yerine
          hangi etkinin nereden geldiğini görüp yargılayabilsin. */}
      <div className="space-y-1.5 mt-4 mb-4">
        {componentRows.map(({ ikon: Ikon, label, value, renk }) => (
          <div key={label} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400 min-w-0">
              <Ikon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </span>
            <span className={`font-semibold shrink-0 ${renk}`}>{value}</span>
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="alis-fiyati" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
          {t('vehicleValueCard.alis_fiyati_opsiyonel')}
        </label>
        <input
          id="alis-fiyati"
          type="number"
          min="0"
          inputMode="numeric"
          value={purchasePrice}
          onChange={e => priceChanged(e.target.value)}
          placeholder={t('vehicleValueCard.orn_850000')}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
        />
        <p className="text-[11px] text-slate-500 mt-1">
          {t('vehicleValueCard.bu_rakam_yalnizca_bu_cihazda_saklanir')}
        </p>
      </div>

      {estimate.warnings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {estimate.warnings.map(u => (
            <li key={u} className="flex items-start gap-1.5 text-[11px] text-amber-400/90">
              <Info className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" />
              {u}
            </li>
          ))}
        </ul>
      )}

      {/* Kapsam sınırı gizlenmiyor */}
      <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
        Kaba bir tahmindir; piyasa ilanlarına bakmaz. Hasar kaydı, donanım paketi,
        renk ve bölge farkı hesaba katılmaz. Satış kararı için ekspertiz yerine geçmez.
      </p>
    </div>
  )
}
