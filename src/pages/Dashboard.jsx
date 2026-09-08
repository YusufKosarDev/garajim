import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Car, AlertTriangle, Calendar, Plus, TrendingUp, Sparkles, Droplet, Wrench, DollarSign, Clock } from 'lucide-react'
import { useVehicles } from '../context/vehicle-context'
import { buildVehicleEvents } from '../utils/calendarEvents'
import { formatDate } from '../utils/dateHelpers'
import { getTotalFuelCost } from '../utils/fuelHelpers'
import { getCriticalRecommendations } from '../utils/maintenanceRecommendations'
import { usePageTitle } from '../hooks/usePageTitle'
import EmptyState from '../components/EmptyState'
import PageTransition from '../components/PageTransition'
import DashboardCalendar from '../components/DashboardCalendar'
import MaintenanceForm from '../components/MaintenanceForm'
import FuelForm from '../components/FuelForm'
import MaintenanceRecommendationCard from '../components/MaintenanceRecommendationCard'
import DashboardSkeleton from '../components/skeletons/DashboardSkeleton'

export default function Dashboard({ globalActionsRef }) {
  const { t } = useTranslation()

  usePageTitle(t('dashboard.dashboard'))
  const navigate = useNavigate()

  const { vehicles, maintenanceRecords, fuelRecords, customIntervals, isLoaded } = useVehicles()
  const [quickMaintenanceOpen, setQuickMaintenanceOpen] = useState(false)
  const [quickFuelOpen, setQuickFuelOpen] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState(null)
  const [prefilledType, setPrefilledType] = useState(null)

  // Global kısayol trigger'ları
  useEffect(() => {
    if (!globalActionsRef) return

    // Ref'in .current'ı temizlik fonksiyonu çalışana kadar değişebilir;
    // efekt kurulurken yakalanan nesneyi temizlemek doğru olan.
    const actions = globalActionsRef.current
    actions.newVehicle = () => navigate('/vehicles')
    actions.newMaintenance = () => {
      if (vehicles.length > 0) {
        setSelectedVehicleId(vehicles[0].id)
        setQuickMaintenanceOpen(true)
      }
    }
    actions.newFuel = () => {
      if (vehicles.length > 0) {
        setSelectedVehicleId(vehicles[0].id)
        setQuickFuelOpen(true)
      }
    }

    return () => {
      actions.newVehicle = null
      actions.newMaintenance = null
      actions.newFuel = null
    }
  }, [globalActionsRef, navigate, vehicles])

  // NOT: Hesaplamalar erken dönüşün ÜSTÜNDE olmalı — aksi halde hook sırası bozulur.
  // Önceden bunların hepsi her render'da baştan çalışıyordu; sayfada tek useMemo yoktu.

  // Etkinlik üretimi artık utils/calendarEvents'te tek yerde (madde 28).
  // Burada ve Calendar.jsx'te iki ayrı kopya vardı ve iki farklı şekil üretiyorlardı.
  const upcomingDates = useMemo(() => buildVehicleEvents(vehicles), [vehicles])

  const { criticalDates, expiredCount, warningCount } = useMemo(() => ({
    criticalDates: upcomingDates
      .filter(d => d.days !== null && d.days <= 60)
      .sort((a, b) => a.days - b.days),
    expiredCount: upcomingDates.filter(d => d.status === 'expired').length,
    warningCount: upcomingDates.filter(d => d.status === 'warning').length,
  }), [upcomingDates])

  const totalCost = useMemo(() => {
    const maintenance = maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0)
    return maintenance + getTotalFuelCost(fuelRecords)
  }, [maintenanceRecords, fuelRecords])

  // Sayfadaki en pahalı hesap: araç × bakım türü × geçmiş kayıt taraması
  const criticalRecommendations = useMemo(
    () => getCriticalRecommendations(vehicles, maintenanceRecords, customIntervals),
    [vehicles, maintenanceRecords, customIntervals]
  )

  const allActivities = useMemo(() => {
    // Önceden her kayıt için vehicles.find() çağrılıyordu -> O((M+F) × V).
    // Map ile araç araması O(1)'e iniyor.
    const vehicleById = new Map(vehicles.map(v => [v.id, v]))
    return [
      ...maintenanceRecords.map(r => ({
        ...r,
        activityType: 'maintenance',
        vehicle: vehicleById.get(r.vehicleId),
      })),
      ...fuelRecords.map(r => ({
        ...r,
        activityType: 'fuel',
        vehicle: vehicleById.get(r.vehicleId),
      })),
    ]
      .filter(a => a.vehicle)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
  }, [vehicles, maintenanceRecords, fuelRecords])

  // useCallback şart: bu handler'lar memo()'lu kart bileşenlerine prop olarak
  // gidiyor; her render'da yeni referans üretilirse memo hiçbir işe yaramaz.
  const openQuickMaintenance = useCallback((vehicleId, type = null) => {
    setSelectedVehicleId(vehicleId || vehicles[0]?.id)
    setPrefilledType(type)
    setQuickMaintenanceOpen(true)
  }, [vehicles])

  const openQuickFuel = useCallback((vehicleId) => {
    setSelectedVehicleId(vehicleId || vehicles[0]?.id)
    setQuickFuelOpen(true)
  }, [vehicles])

  const handleQuickAddFromRecommendation = useCallback((recommendation) => {
    openQuickMaintenance(recommendation.vehicleId, recommendation.type)
  }, [openQuickMaintenance])

  if (!isLoaded) {
    return <DashboardSkeleton />
  }

  if (vehicles.length === 0) {
    return (
      <PageTransition>
        <div className="p-6">
          <div className="bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-slate-900 border border-blue-500/30 rounded-2xl p-10 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-xs px-3 py-1 rounded-full mb-4 border border-blue-500/30">
              <Sparkles className="w-3 h-3" />
              {t('dashboard.garajima_hos_geldin')}
            </div>
            <Car className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-3">{t('dashboard.aracini_takip_etmeye_basla')}</h1>
            <p className="text-slate-300 mb-2 max-w-md mx-auto">
              {t('dashboard.muayene_mtv_sigorta_ve_bakim_tarihlerini')}
            </p>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              {t('dashboard.araclarini_ekle_tarihleri_gir_biz_sana')}
            </p>
            <Link to="/vehicles" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition">
              <Plus className="w-5 h-5" />
              {t('dashboard.ilk_aracini_ekle')}
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-10 text-left">
              <FeatureCard icon="📅" title={t('dashboard.tarih_takibi')} desc="Muayene, MTV, sigorta, kasko" />
              <FeatureCard icon="🔧" title={t('dashboard.bakim_yakit')} desc="Tüm harcamalar tek yerde" />
              <FeatureCard icon="🔔" title={t('dashboard.akilli_bildirim')} desc="Tarih yaklaşınca haber verir" />
            </div>

            <div className="mt-8 text-xs text-slate-500">
              {t('dashboard.ipucu')} <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">?</kbd> {t('dashboard.tusuna_basarak_klavye_kisayollarini_gorebilirsin')}
            </div>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.dashboard')}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {vehicles.length} araç • Toplam harcama: <span className="text-green-400 font-semibold">{totalCost.toLocaleString('tr-TR')} ₺</span>
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Car} label={t('dashboard.toplam_arac')} value={vehicles.length} color="blue" />
          <StatCard icon={AlertTriangle} label={t('dashboard.suresi_gecmis')} value={expiredCount} color="red" />
          <StatCard icon={Calendar} label={t('dashboard.yaklasan_30_gun')} value={warningCount} color="yellow" />
          <StatCard icon={DollarSign} label={t('dashboard.toplam_harcama')} value={`${(totalCost / 1000).toFixed(1)}k ₺`} color="green" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-lg font-bold mb-4">{t('dashboard.hizli_eylemler')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <QuickAction icon={Wrench} label={t('dashboard.bakim_ekle')} color="blue" onClick={() => openQuickMaintenance()} />
            <QuickAction icon={Droplet} label={t('dashboard.yakit_ekle')} color="green" onClick={() => openQuickFuel()} />
            <Link to="/vehicles" className="flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 transition group">
              <Car className="w-6 h-6 text-purple-400 group-hover:scale-110 transition" />
              <span className="text-sm font-semibold">{t('dashboard.araclar')}</span>
            </Link>
            <Link to="/calendar" className="flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 transition group">
              <Calendar className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition" />
              <span className="text-sm font-semibold">{t('dashboard.takvim')}</span>
            </Link>
            <Link to="/statistics" className="flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 transition group">
              <TrendingUp className="w-6 h-6 text-orange-400 group-hover:scale-110 transition" />
              <span className="text-sm font-semibold">{t('dashboard.istatistik')}</span>
            </Link>
          </div>
        </div>

        {criticalRecommendations.length > 0 && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-400" />
                {t('dashboard.akilli_bakim_onerileri')}
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                  {criticalRecommendations.length}
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              {t('dashboard.gecmis_bakim_kayitlarina_gore_siradaki_bakimlari')}
            </p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {criticalRecommendations.slice(0, 8).map((rec) => (
                <MaintenanceRecommendationCard
                  key={`${rec.vehicleId}-${rec.type}`}
                  recommendation={rec}
                  onQuickAdd={handleQuickAddFromRecommendation}
                />
              ))}
              {criticalRecommendations.length > 8 && (
                <div className="text-center text-xs text-slate-500 pt-2">
                  ...ve {criticalRecommendations.length - 8} öneri daha
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              {t('dashboard.yaklasan_gecmis_tarihler')}
            </h2>

            {criticalDates.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={t('dashboard.yaklasan_tarih_yok')}
                description={
                  upcomingDates.length === 0
                    ? t('dashboard.araclarina_henuz_tarih_bilgisi_girmedin')
                    : t('dashboard.harika_tum_tarihler_60_gunden_uzakta')
                }
              />
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {criticalDates.map((item, i) => (
                  <DateRow key={i} item={item} />
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <DashboardCalendar events={upcomingDates} />
            <div className="mt-3 text-center">
              <Link
                to="/calendar"
                className="text-xs text-blue-400 hover:text-blue-300 transition inline-flex items-center gap-1"
              >
                Tam takvimi aç →
              </Link>
            </div>
          </div>
        </div>

        {allActivities.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-bold mb-4">{t('dashboard.son_aktiviteler')}</h2>
            <div className="space-y-2">
              {allActivities.map(a => (
                <Link
                  key={`${a.activityType}-${a.id}`}
                  to={`/vehicles/${a.vehicle.id}`}
                  className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    a.activityType === 'maintenance' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {a.activityType === 'maintenance' ? <Wrench className="w-5 h-5" /> : <Droplet className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {a.activityType === 'maintenance' ? a.type : `${a.liters} L yakıt`}
                    </div>
                    <div className="text-xs text-slate-400">
                      {a.vehicle.brand} {a.vehicle.model} • {formatDate(a.date)}
                    </div>
                  </div>
                  {(a.cost > 0 || a.totalCost > 0) && (
                    <div className={`text-sm font-semibold ${a.activityType === 'maintenance' ? 'text-green-400' : 'text-orange-400'}`}>
                      {(a.cost || a.totalCost).toLocaleString('tr-TR')} ₺
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {quickMaintenanceOpen && selectedVehicleId && (
          <MaintenanceForm
            isOpen={quickMaintenanceOpen}
            onClose={() => {
              setQuickMaintenanceOpen(false)
              setPrefilledType(null)
            }}
            vehicleId={selectedVehicleId}
            prefilledType={prefilledType}
          />
        )}
        {quickFuelOpen && selectedVehicleId && (
          <FuelForm
            isOpen={quickFuelOpen}
            onClose={() => setQuickFuelOpen(false)}
            vehicleId={selectedVehicleId}
          />
        )}
      </div>
    </PageTransition>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
  }
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <Icon className="w-6 h-6 mb-2" />
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  )
}

function QuickAction({ icon: Icon, label, color, onClick }) {
  const colors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
  }
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 transition group"
    >
      <Icon className={`w-6 h-6 ${colors[color]} group-hover:scale-110 transition`} />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  )
}

function DateRow({ item }) {
  const statusStyles = {
    expired: 'border-red-500/40 bg-red-500/10',
    warning: 'border-yellow-500/40 bg-yellow-500/10',
    safe: 'border-slate-700 bg-slate-800/50',
  }
  const statusText = {
    expired: `${Math.abs(item.days)} gün geçti`,
    warning: `${item.days} gün kaldı`,
    safe: `${item.days} gün kaldı`,
  }
  const textColor = {
    expired: 'text-red-400',
    warning: 'text-yellow-400',
    safe: 'text-slate-300',
  }

  return (
    <Link
      to={`/vehicles/${item.vehicle.id}`}
      className={`flex items-center justify-between p-3 rounded-lg border hover:bg-slate-800/80 transition ${statusStyles[item.status]}`}
    >
      <div className="min-w-0 flex-1">
        <div className="font-semibold truncate">
          {item.label} — {item.vehicle.brand} {item.vehicle.model}
        </div>
        <div className="text-xs text-slate-400">
          {item.vehicle.plate} • {formatDate(item.date)}
        </div>
      </div>
      <div className={`text-sm font-semibold shrink-0 ml-2 ${textColor[item.status]}`}>
        {statusText[item.status]}
      </div>
    </Link>
  )
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-semibold text-white text-sm mb-1">{title}</div>
      <div className="text-xs text-slate-400">{desc}</div>
    </div>
  )
}