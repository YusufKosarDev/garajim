import { useMemo, useState } from 'react'
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

const anahtar = (vehicleId) => `garajim_alis_fiyati_${vehicleId}`

const fiyatOku = (vehicleId) => {
  try {
    const ham = localStorage.getItem(anahtar(vehicleId))
    const n = ham ? Number(ham) : 0
    return Number.isFinite(n) && n > 0 ? n : ''
  } catch {
    // Gizli sekme ya da depolama kapalı — kart fiyatsız çalışmaya devam eder
    return ''
  }
}

const GUVEN_METNI = {
  yuksek: { etiket: 'Yüksek', sinif: 'text-green-400' },
  orta: { etiket: 'Orta', sinif: 'text-yellow-400' },
  dusuk: { etiket: 'Düşük', sinif: 'text-red-400' },
}

const yuzde = (oran) => `${oran >= 0 ? '+' : ''}${(oran * 100).toFixed(1)}%`

export default function VehicleValueCard({ vehicle, maintenanceRecords = [] }) {
  const vehicleId = vehicle?.id

  // Cihazda kayıtlı fiyat. Kullanıcının yazdığı değer, AİT OLDUĞU ARAÇLA birlikte
  // tutuluyor ve render sırasında karşılaştırılıyor; başka bir araca geçildiğinde
  // önceki aracın fiyatı bir an bile görünemiyor. (Bunu bir effect'le sıfırlamak
  // basamaklı render üretirdi.)
  const kayitliFiyat = useMemo(() => (vehicleId ? fiyatOku(vehicleId) : ''), [vehicleId])
  const [girilen, setGirilen] = useState(null)
  const alisFiyati = girilen && girilen.id === vehicleId ? girilen.deger : kayitliFiyat

  const tahmin = useMemo(
    () => estimateVehicleValue(vehicle, maintenanceRecords, { alisFiyati: Number(alisFiyati) || null }),
    [vehicle, maintenanceRecords, alisFiyati]
  )

  const fiyatDegisti = (deger) => {
    setGirilen({ id: vehicleId, deger })
    try {
      if (deger) localStorage.setItem(anahtar(vehicleId), String(deger))
      else localStorage.removeItem(anahtar(vehicleId))
    } catch {
      // Yazılamadıysa hesap yine ekranda doğru; sadece kalıcı olmaz
    }
  }

  // Model yılı olmadan yaş bilinmez; uydurma bir oran göstermek yerine sebebi söyle
  if (!tahmin) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-2">
          <TrendingDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
          Değer Tahmini
        </h3>
        <p className="text-sm text-slate-400">
          Tahmin için aracın model yılı gerekiyor. Aracı düzenleyip yılı ekleyebilirsin.
        </p>
      </div>
    )
  }

  const guven = GUVEN_METNI[tahmin.guven]
  const kalanYuzde = Math.round(tahmin.kalanOran * 100)

  const bilesenSatirlari = [
    {
      ikon: CalendarClock,
      etiket: `Yaş (${tahmin.yas} yıl)`,
      deger: `${Math.round(tahmin.bilesenler.yas * 100)}% kalır`,
      renk: 'text-slate-300',
    },
    {
      ikon: Gauge,
      etiket: tahmin.kmFarki === 0
        ? 'Kilometre'
        : `Kilometre (beklenenden ${Math.abs(tahmin.kmFarki).toLocaleString('tr-TR')} km ${tahmin.kmFarki > 0 ? 'fazla' : 'az'})`,
      deger: yuzde(tahmin.bilesenler.km),
      renk: tahmin.bilesenler.km < 0 ? 'text-red-400' : tahmin.bilesenler.km > 0 ? 'text-green-400' : 'text-slate-500',
    },
    {
      ikon: Wrench,
      etiket: 'Bakım geçmişi',
      deger: yuzde(tahmin.bilesenler.bakim),
      renk: tahmin.bilesenler.bakim < 0 ? 'text-red-400' : tahmin.bilesenler.bakim > 0 ? 'text-green-400' : 'text-slate-500',
    },
  ]

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <h3 className="font-semibold flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-blue-400" aria-hidden="true" />
          Değer Tahmini
        </h3>
        <span className="text-xs text-slate-500">
          Güven: <strong className={guven.sinif}>{guven.etiket}</strong>
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold text-white">%{kalanYuzde}</span>
        <span className="text-sm text-slate-400">ilk değerini koruyor</span>
      </div>

      {tahmin.tahminiDeger !== null && (
        <div className="text-lg font-semibold text-blue-300 mb-2">
          ≈ {tahmin.tahminiDeger.toLocaleString('tr-TR')} ₺
        </div>
      )}

      {/* Dökümü göstermek zorunlu: kullanıcı tek bir sayıyı yutmak yerine
          hangi etkinin nereden geldiğini görüp yargılayabilsin. */}
      <div className="space-y-1.5 mt-4 mb-4">
        {bilesenSatirlari.map(({ ikon: Ikon, etiket, deger, renk }) => (
          <div key={etiket} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400 min-w-0">
              <Ikon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{etiket}</span>
            </span>
            <span className={`font-semibold shrink-0 ${renk}`}>{deger}</span>
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="alis-fiyati" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
          Alış fiyatı (opsiyonel)
        </label>
        <input
          id="alis-fiyati"
          type="number"
          min="0"
          inputMode="numeric"
          value={alisFiyati}
          onChange={e => fiyatDegisti(e.target.value)}
          placeholder="Örn. 850000"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
        />
        <p className="text-[11px] text-slate-500 mt-1">
          Bu rakam yalnızca bu cihazda saklanır, hesaba senkronize edilmez.
        </p>
      </div>

      {tahmin.uyarilar.length > 0 && (
        <ul className="mt-3 space-y-1">
          {tahmin.uyarilar.map(u => (
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
