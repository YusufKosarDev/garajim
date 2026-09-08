import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import {
  ArrowLeft,
  AlertTriangle,
  Car,
  Fuel,
  Gauge,
  Calendar,
  Wrench,
  Droplet,
  DollarSign,
  Lock,
  Sparkles,
  ExternalLink,
  Clock,
  TrendingDown,
} from 'lucide-react'
import { decodeShareData } from '../utils/shareHelpers'
import { formatDate, formatDateTime, getDateStatus, daysUntil } from '../utils/dateHelpers'
import { getAverageConsumption, getTotalFuelCost, getAveragePrice } from '../utils/fuelHelpers'

export default function SharedReport() {
  const { t } = useTranslation()

  const { encodedData } = useParams()

  // Çözümleme TAMAMEN SENKRON (lz-string, ağ yok) — yani bu bir state değil,
  // URL parametresinin saf bir türevi. Efekt + üç ayrı state ile yapıldığında
  // sayfa önce "yükleniyor" render'ı yapıp hemen ikinci bir render'a giriyordu;
  // oysa beklenen bir iş yok.
  const { data, error } = useMemo(() => {
    if (!encodedData) {
      return { data: null, error: t('sharedReport.gecersiz_paylasim_linki') }
    }
    const decoded = decodeShareData(encodedData)
    if (!decoded) {
      return { data: null, error: t('sharedReport.bu_link_bozuk_veya_gecersiz') }
    }
    return { data: decoded, error: null }
  }, [encodedData, t])

  // Hata
  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">{t('sharedReport.rapor_bulunamadi')}</h1>
          <p className="text-slate-400 text-sm mb-6">
            {error || t('sharedReport.bu_paylasim_linki_bozuk_eski_veya')}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('sharedReport.garajim_a_don')}
          </Link>
        </div>
      </div>
    )
  }

  // Veri başarıyla decode edildi — rapor render
  const { vehicle, maintenance, fuel, sharedAt } = data

  // Hesaplamalar
  const totalMaintenanceCost = maintenance.reduce((sum, r) => sum + (r.cost || 0), 0)
  const totalFuelCost = getTotalFuelCost(fuel)
  const totalCost = totalMaintenanceCost + totalFuelCost
  const avgConsumption = getAverageConsumption(fuel)
  const avgPrice = getAveragePrice(fuel)

  // Tarihler
  const dates = [
    { label: 'Muayene', date: vehicle.inspectionDate },
    { label: t('sharedReport.mtv_son_odeme'), date: vehicle.mtvDate },
    { label: t('sharedReport.trafik_sigortasi'), date: vehicle.insuranceDate },
    { label: 'Kasko', date: vehicle.kaskoDate },
  ].filter(d => d.date)

  const statusColors = {
    expired: 'bg-red-500/20 text-red-400 border-red-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    safe: 'bg-green-500/20 text-green-400 border-green-500/30',
    none: 'bg-slate-700/50 text-slate-400 border-slate-600',
  }

  // Sıralama: en yeni üstte
  const sortedMaintenance = [...maintenance].sort((a, b) => new Date(b.date) - new Date(a.date))
  const sortedFuel = [...fuel].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Mini header */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="" className="w-8 h-8" />
            <div>
              <div className="text-base font-bold leading-none">Garajım</div>
              <div className="text-[10px] text-slate-400 leading-none mt-0.5">{t('sharedReport.paylasilan_rapor')}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] bg-slate-800/80 border border-slate-700 px-2 py-1 rounded-full text-slate-400">
              <Lock className="w-3 h-3" />
              {t('sharedReport.salt_okunur')}
            </span>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg font-semibold transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('sharedReport.garajim_i_tani')}</span>
              <span className="sm:hidden">{t('sharedReport.tani')}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 pb-12">
        {/* Üst banner — Read-only bilgi */}
        <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-2">
          <Lock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300">
            <p>
              <strong className="text-blue-400">{t('sharedReport.bu_salt_okunur_bir_rapor')}</strong> {t('sharedReport.bilgileri_goruntuleyebilirsin_ama_duzenleyemezsi')}
            </p>
            {sharedAt && (
              <p className="text-slate-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Paylaşım Tarihi: {formatDateTime(sharedAt)}
              </p>
            )}
          </div>
        </div>

        {/* Araç hero card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Car className="w-10 h-10 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">{vehicle.brand} {vehicle.model}</h1>
              <p className="text-slate-400 mt-1">{vehicle.plate} • {vehicle.year}</p>
              <div className="flex gap-4 mt-3 text-sm text-slate-400 flex-wrap">
                {vehicle.fuelType && (
                  <span className="flex items-center gap-1">
                    <Fuel className="w-4 h-4" />
                    {vehicle.fuelType}
                  </span>
                )}
                {vehicle.currentKm && (
                  <span className="flex items-center gap-1">
                    <Gauge className="w-4 h-4" />
                    {Number(vehicle.currentKm).toLocaleString('tr-TR')} km
                  </span>
                )}
              </div>
              {vehicle.notes && (
                <div className="mt-3 pt-3 border-t border-slate-800 text-sm text-slate-400 italic">
                  💬 {vehicle.notes}
                </div>
              )}
            </div>
          </div>

          {/* Özet stat'lar */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-800">
            <SummaryStat
              label={t('sharedReport.toplam_harcama')}
              value={`${totalCost.toLocaleString('tr-TR')} ₺`}
              color="emerald"
              icon={DollarSign}
              highlighted
            />
            <SummaryStat
              label={t('sharedReport.bakim')}
              value={`${totalMaintenanceCost.toLocaleString('tr-TR')} ₺`}
              color="blue"
              icon={Wrench}
            />
            <SummaryStat
              label={t('sharedReport.yakit')}
              value={`${totalFuelCost.toLocaleString('tr-TR')} ₺`}
              color="orange"
              icon={Droplet}
            />
            <SummaryStat
              label={t('sharedReport.ort_tuketim')}
              value={avgConsumption ? `${avgConsumption.toFixed(1)} L/100km` : '-'}
              color="purple"
            />
            <SummaryStat
              label={t('sharedReport.ort_litre_fiyati')}
              value={avgPrice ? `${avgPrice.toFixed(2)} ₺` : '-'}
              color="slate"
            />
          </div>
        </div>

        {/* Önemli tarihler */}
        {dates.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              {t('sharedReport.onemli_tarihler')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dates.map(({ label, date }) => {
                const status = getDateStatus(date)
                const days = daysUntil(date)
                return (
                  <div key={label} className={`p-4 rounded-lg border ${statusColors[status]}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{label}</div>
                        <div className="text-sm opacity-80">{formatDate(date)}</div>
                      </div>
                      {days !== null && (
                        <div className="text-sm font-bold">
                          {days < 0 ? `${Math.abs(days)} gün geçti` : `${days} gün kaldı`}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Bakım kayıtları */}
        {maintenance.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-400" />
              {t('sharedReport.bakim_kayitlari')}
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-normal">
                {maintenance.length} kayıt
              </span>
            </h2>
            <div className="space-y-2">
              {sortedMaintenance.map(r => (
                <div
                  key={r.id}
                  className="p-3 bg-slate-800/50 rounded-lg border border-slate-800"
                >
                  <div className="font-semibold">{r.type}</div>
                  <div className="text-xs text-slate-400 flex flex-wrap gap-3 mt-1">
                    <span>📅 {formatDate(r.date)}</span>
                    <span>🎯 {Number(r.km).toLocaleString('tr-TR')} km</span>
                    {r.cost > 0 && (
                      <span className="text-green-400">💰 {r.cost.toLocaleString('tr-TR')} ₺</span>
                    )}
                  </div>
                  {r.notes && (
                    <div className="text-xs text-slate-500 mt-1 italic">{r.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Yakıt kayıtları */}
        {fuel.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-green-400" />
              {t('sharedReport.yakit_kayitlari')}
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-normal">
                {fuel.length} kayıt
              </span>
            </h2>
            <div className="space-y-2">
              {sortedFuel.map(r => (
                <div
                  key={r.id}
                  className="p-3 bg-slate-800/50 rounded-lg border border-slate-800"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{r.liters} L</span>
                    {r.fullTank && (
                      <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded">DOLU</span>
                    )}
                    {r.station && <span className="text-xs text-slate-400">• {r.station}</span>}
                  </div>
                  <div className="text-xs text-slate-400 flex flex-wrap gap-3 mt-1">
                    <span>📅 {formatDate(r.date)}</span>
                    <span>🎯 {Number(r.km).toLocaleString('tr-TR')} km</span>
                    {r.pricePerLiter > 0 && (
                      <span>⛽ {r.pricePerLiter.toFixed(2)} ₺/L</span>
                    )}
                    <span className="text-orange-400 font-semibold">
                      💰 {r.totalCost.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  {r.notes && (
                    <div className="text-xs text-slate-500 mt-1 italic">{r.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Boş durum */}
        {maintenance.length === 0 && fuel.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center mb-6">
            <div className="text-5xl mb-3">📭</div>
            <h3 className="text-lg font-bold mb-1">{t('sharedReport.henuz_kayit_yok')}</h3>
            <p className="text-sm text-slate-400">
              {t('sharedReport.bu_arac_icin_bakim_veya_yakit')}
            </p>
          </div>
        )}

        {/* CTA — Garajım'ı tanı */}
        <div className="bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 border border-blue-500/30 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold">{t('sharedReport.sen_de_aracini_takip_et')}</h3>
          </div>
          <p className="text-sm text-slate-300 mb-4 max-w-md mx-auto">
            <strong className="text-white">Garajım</strong> {t('sharedReport.ile_muayene_mtv_sigorta_bakim_ve')}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <Sparkles className="w-4 h-4" />
            {t('sharedReport.garajim_i_kesfet')}
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            {t('sharedReport.bu_rapor')} <strong className="text-slate-400">{t('sharedReport.garajim_arac_takip_asistani')}</strong> {t('sharedReport.ile_olusturulmustur')}
          </p>
          <p className="text-[10px] text-slate-600 mt-1">
            {t('sharedReport.veriler_url_icinde_gomuludur_hicbir_sunucuda')}
          </p>
        </div>
      </main>
    </div>
  )
}

// Özet stat bileşeni
function SummaryStat({ label, value, color, highlighted = false, icon: Icon }) {
  const colors = {
    emerald: 'text-emerald-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    slate: 'text-slate-300',
  }

  // Tailwind dinamik sınıf adı üretemez (`bg-${color}-500` derlemede taranmaz),
  // o yüzden aşağıda sınıflar açıkça yazılıyor.
  const bgClass = highlighted
    ? color === 'emerald'
      ? 'bg-emerald-500/10 border border-emerald-500/30'
      : 'bg-slate-800/50'
    : 'bg-slate-800/50'

  return (
    <div className={`rounded-lg p-3 ${bgClass}`}>
      {Icon && <Icon className={`w-4 h-4 ${colors[color]} mb-1`} />}
      <div className={`text-base md:text-lg font-bold ${colors[color]}`}>{value}</div>
      <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  )
}