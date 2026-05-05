import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Car, AlertTriangle, Calendar, Plus, TrendingUp, Sparkles, Droplet, Wrench, DollarSign, Clock } from 'lucide-react'
import { useVehicles } from '../context/VehicleContext'
import { daysUntil, formatDate, getDateStatus } from '../utils/dateHelpers'
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
  usePageTitle('Dashboard')
  const navigate = useNavigate()

  const { vehicles, maintenanceRecords, fuelRecords, customIntervals, isLoaded } = useVehicles()
  const [quickMaintenanceOpen, setQuickMaintenanceOpen] = useState(false)
  const [quickFuelOpen, setQuickFuelOpen] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState(null)
  const [prefilledType, setPrefilledType] = useState(null)

  // Global kısayol trigger'ları
  useEffect(() => {
    if (!globalActionsRef) return

    globalActionsRef.current.newVehicle = () => navigate('/vehicles')
    globalActionsRef.current.newMaintenance = () => {
      if (vehicles.length > 0) {
        setSelectedVehicleId(vehicles[0].id)
        setQuickMaintenanceOpen(true)
      }
    }
    globalActionsRef.current.newFuel = () => {
      if (vehicles.length > 0) {
        setSelectedVehicleId(vehicles[0].id)
        setQuickFuelOpen(true)
      }
    }

    return () => {
      globalActionsRef.current.newVehicle = null
      globalActionsRef.current.newMaintenance = null
      globalActionsRef.current.newFuel = null
    }
  }, [globalActionsRef, navigate, vehicles])

  if (!isLoaded) {
    return <DashboardSkeleton />
  }

  const upcomingDates = []
  vehicles.forEach(v => {
    const items = [
      { type: 'Muayene', date: v.inspectionDate },
      { type: 'MTV', date: v.mtvDate },
      { type: 'Sigorta', date: v.insuranceDate },
      { type: 'Kasko', date: v.kaskoDate },
    ]
    items.forEach(item => {
      if (item.date) {
        upcomingDates.push({
          ...item,
          vehicle: v,
          days: daysUntil(item.date),
          status: getDateStatus(item.date),
        })
      }
    })
  })

  const criticalDates = upcomingDates
    .filter(d => d.days !== null && d.days <= 60)
    .sort((a, b) => a.days - b.days)

  const expiredCount = upcomingDates.filter(d => d.status === 'expired').length
  const warningCount = upcomingDates.filter(d => d.status === 'warning').length

  const totalMaintenanceCost = maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0)
  const totalFuelCost = getTotalFuelCost(fuelRecords)
  const totalCost = totalMaintenanceCost + totalFuelCost

  const criticalRecommendations = getCriticalRecommendations(vehicles, maintenanceRecords, customIntervals)

  const allActivities = [
    ...maintenanceRecords.map(r => ({
      ...r,
      activityType: 'maintenance',
      vehicle: vehicles.find(v => v.id === r.vehicleId),
    })),
    ...fuelRecords.map(r => ({
      ...r,
      activityType: 'fuel',
      vehicle: vehicles.find(v => v.id === r.vehicleId),
    })),
  ]
    .filter(a => a.vehicle)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)

  const openQuickMaintenance = (vehicleId, type = null) => {
    setSelectedVehicleId(vehicleId || vehicles[0]?.id)
    setPrefilledType(type)
    setQuickMaintenanceOpen(true)
  }

  const openQuickFuel = (vehicleId) => {
    setSelectedVehicleId(vehicleId || vehicles[0]?.id)
    setQuickFuelOpen(true)
  }

  const handleQuickAddFromRecommendation = (recommendation) => {
    openQuickMaintenance(recommendation.vehicleId, recommendation.type)
  }

  if (vehicles.length === 0) {
    return (
      <PageTransition>
        <div className="p-6">
          <div className="bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-slate-900 border border-blue-500/30 rounded-2xl p-10 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-xs px-3 py-1 rounded-full mb-4 border border-blue-500/30">
              <Sparkles className="w-3 h-3" />
              Garajıma Hoş Geldin
            </div>
            <Car className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-3">Aracını Takip Etmeye Başla 🚗</h1>
            <p className="text-slate-300 mb-2 max-w-md mx-auto">
              Muayene, MTV, sigorta ve bakım tarihlerini bir daha asla unutma.
            </p>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Araçlarını ekle, tarihleri gir, biz sana hatırlatalım.
            </p>
            <Link to="/vehicles" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition">
              <Plus className="w-5 h-5" />
              İlk Aracını Ekle
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-10 text-left">
              <FeatureCard icon="📅" title="Tarih Takibi" desc="Muayene, MTV, sigorta, kasko" />
              <FeatureCard icon="🔧" title="Bakım & Yakıt" desc="Tüm harcamalar tek yerde" />
              <FeatureCard icon="🔔" title="Akıllı Bildirim" desc="Tarih yaklaşınca haber verir" />
            </div>

            <div className="mt-8 text-xs text-slate-500">
              💡 İpucu: <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">?</kbd> tuşuna basarak klavye kısayollarını görebilirsin
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
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            {vehicles.length} araç • Toplam harcama: <span className="text-green-400 font-semibold">{totalCost.toLocaleString('tr-TR')} ₺</span>
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Car} label="Toplam Araç" value={vehicles.length} color="blue" />
          <StatCard icon={AlertTriangle} label="Süresi Geçmiş" value={expiredCount} color="red" />
          <StatCard icon={Calendar} label="Yaklaşan (30 gün)" value={warningCount} color="yellow" />
          <StatCard icon={DollarSign} label="Toplam Harcama" value={`${(totalCost / 1000).toFixed(1)}k ₺`} color="green" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-lg font-bold mb-4">⚡ Hızlı Eylemler</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <QuickAction icon={Wrench} label="Bakım Ekle" color="blue" onClick={() => openQuickMaintenance()} />
            <QuickAction icon={Droplet} label="Yakıt Ekle" color="green" onClick={() => openQuickFuel()} />
            <Link to="/vehicles" className="flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 transition group">
              <Car className="w-6 h-6 text-purple-400 group-hover:scale-110 transition" />
              <span className="text-sm font-semibold">Araçlar</span>
            </Link>
            <Link to="/calendar" className="flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 transition group">
              <Calendar className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition" />
              <span className="text-sm font-semibold">Takvim</span>
            </Link>
            <Link to="/statistics" className="flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 transition group">
              <TrendingUp className="w-6 h-6 text-orange-400 group-hover:scale-110 transition" />
              <span className="text-sm font-semibold">İstatistik</span>
            </Link>
          </div>
        </div>

        {criticalRecommendations.length > 0 && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-400" />
                🧠 Akıllı Bakım Önerileri
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                  {criticalRecommendations.length}
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Geçmiş bakım kayıtlarına göre, sıradaki bakımların zamanı yaklaşıyor
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
              Yaklaşan & Geçmiş Tarihler
            </h2>

            {criticalDates.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Yaklaşan tarih yok 🎉"
                description={
                  upcomingDates.length === 0
                    ? 'Araçlarına henüz tarih bilgisi girmedin.'
                    : 'Harika! Tüm tarihler 60 günden uzakta.'
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
            <h2 className="text-lg font-bold mb-4">📋 Son Aktiviteler</h2>
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
          {item.type} — {item.vehicle.brand} {item.vehicle.model}
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