import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, List, Grid, Wrench, Droplet, Shield, FileCheck, Receipt, X } from 'lucide-react'
import { useVehicles } from '../context/VehicleContext'
import { formatDate, getDateStatus, daysUntil } from '../utils/dateHelpers'
import { usePageTitle } from '../hooks/usePageTitle'
import PageTransition from '../components/PageTransition'
import EmptyState from '../components/EmptyState'

const months = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]
const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const weekDaysFull = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

// Olay tipleri ve özellikleri
const eventTypeConfig = {
  inspection: { label: 'Muayene', icon: FileCheck, color: 'blue', dot: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  mtv: { label: 'MTV', icon: Receipt, color: 'purple', dot: 'bg-purple-400', text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  insurance: { label: 'Sigorta', icon: Shield, color: 'cyan', dot: 'bg-cyan-400', text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  kasko: { label: 'Kasko', icon: Shield, color: 'indigo', dot: 'bg-indigo-400', text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
  maintenance: { label: 'Bakım', icon: Wrench, color: 'orange', dot: 'bg-orange-400', text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  fuel: { label: 'Yakıt', icon: Droplet, color: 'green', dot: 'bg-green-400', text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
}

export default function Calendar() {
  usePageTitle('Takvim')

  const { vehicles, maintenanceRecords, fuelRecords } = useVehicles()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month') // 'month' | 'list'
  const [selectedDay, setSelectedDay] = useState(null)
  const [enabledTypes, setEnabledTypes] = useState(
    Object.keys(eventTypeConfig).reduce((acc, key) => ({ ...acc, [key]: true }), {})
  )

  // Tüm olayları tek diziye topla
  const allEvents = useMemo(() => {
    const events = []

    // Araç tarihleri (muayene, MTV, sigorta, kasko)
    vehicles.forEach(v => {
      if (v.inspectionDate) events.push({ type: 'inspection', date: v.inspectionDate, vehicle: v, label: 'Muayene' })
      if (v.mtvDate) events.push({ type: 'mtv', date: v.mtvDate, vehicle: v, label: 'MTV Son Ödeme' })
      if (v.insuranceDate) events.push({ type: 'insurance', date: v.insuranceDate, vehicle: v, label: 'Trafik Sigortası' })
      if (v.kaskoDate) events.push({ type: 'kasko', date: v.kaskoDate, vehicle: v, label: 'Kasko' })
    })

    // Bakım kayıtları
    maintenanceRecords.forEach(r => {
      const vehicle = vehicles.find(v => v.id === r.vehicleId)
      if (vehicle) {
        events.push({ type: 'maintenance', date: r.date, vehicle, label: r.type, record: r })
      }
    })

    // Yakıt kayıtları
    fuelRecords.forEach(r => {
      const vehicle = vehicles.find(v => v.id === r.vehicleId)
      if (vehicle) {
        events.push({
          type: 'fuel',
          date: r.date,
          vehicle,
          label: `${r.liters} L - ${r.totalCost.toLocaleString('tr-TR')} ₺`,
          record: r,
        })
      }
    })

    return events
  }, [vehicles, maintenanceRecords, fuelRecords])

  // Aktif filtrelere göre olaylar
  const filteredEvents = useMemo(() => {
    return allEvents.filter(e => enabledTypes[e.type])
  }, [allEvents, enabledTypes])

  // Tarihe göre grupla
  const eventsByDate = useMemo(() => {
    const map = {}
    filteredEvents.forEach(e => {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    })
    return map
  }, [filteredEvents])

  // Takvim günleri
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  let startDay = firstDay.getDay() - 1
  if (startDay === -1) startDay = 6

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = []
  for (let i = 0; i < startDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const formatDateKey = (day) => {
    const d = new Date(year, month, day)
    return d.toISOString().split('T')[0]
  }

  const isToday = (day) => {
    if (!day) return false
    const d = new Date(year, month, day)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDay(null)
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDay(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDay(new Date().toISOString().split('T')[0])
  }

  const toggleType = (type) => {
    setEnabledTypes({ ...enabledTypes, [type]: !enabledTypes[type] })
  }

  const toggleAll = (value) => {
    setEnabledTypes(
      Object.keys(eventTypeConfig).reduce((acc, key) => ({ ...acc, [key]: value }), {})
    )
  }

  // Liste görünümü için — gelecek ve yakın geçmiş olayları sırala
  const listEvents = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    return filteredEvents
      .map(e => ({ ...e, dateObj: new Date(e.date), days: daysUntil(e.date) }))
      .sort((a, b) => a.dateObj - b.dateObj)
      .reverse() // En yeni en üstte
  }, [filteredEvents])

  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] || []) : []
  const activeFilterCount = Object.values(enabledTypes).filter(Boolean).length

  return (
    <PageTransition>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-8 h-8 text-blue-400" />
              Takvim
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {filteredEvents.length} olay gösteriliyor • {allEvents.length - filteredEvents.length} gizli
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold transition ${
                  viewMode === 'month' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span className="hidden sm:inline">Ay</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold transition ${
                  viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Liste</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filtreler */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-300">
              <Filter className="w-4 h-4" />
              Filtreler ({activeFilterCount}/6 aktif)
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAll(true)}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                Tümünü Aç
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => toggleAll(false)}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                Tümünü Kapat
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(eventTypeConfig).map(([type, config]) => {
              const Icon = config.icon
              const isActive = enabledTypes[type]
              const count = allEvents.filter(e => e.type === type).length
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition border ${
                    isActive
                      ? `${config.bg} ${config.text} ${config.border}`
                      : 'bg-slate-800/50 text-slate-500 border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {config.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isActive ? 'bg-black/20' : 'bg-slate-700/50'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {vehicles.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="Henüz olay yok"
            description="Araç ekledikçe tarihleri burada görebilirsin."
            action={
              <Link
                to="/vehicles"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-semibold transition"
              >
                İlk Aracını Ekle
              </Link>
            }
          />
        ) : viewMode === 'month' ? (
          <>
            {/* Ay Navigasyonu */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-2xl font-bold">
                  {months[month]} {year}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-slate-800 rounded-lg transition"
                    title="Önceki ay"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition text-sm font-semibold"
                  >
                    Bugün
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-slate-800 rounded-lg transition"
                    title="Sonraki ay"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Hafta günleri */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Günler */}
              <div className="grid grid-cols-7 gap-2">
                {days.map((day, i) => {
                  if (!day) return <div key={i} className="aspect-square" />

                  const dateKey = formatDateKey(day)
                  const dayEvents = eventsByDate[dateKey] || []
                  const hasEvents = dayEvents.length > 0
                  const isSelected = selectedDay === dateKey
                  const todayBorder = isToday(day) ? 'ring-2 ring-blue-500' : ''

                  // Olay durumu (en kritik olanı al)
                  let dominantStatus = null
                  if (hasEvents) {
                    const statuses = dayEvents
                      .filter(e => ['inspection', 'mtv', 'insurance', 'kasko'].includes(e.type))
                      .map(e => getDateStatus(e.date))

                    if (statuses.includes('expired')) dominantStatus = 'expired'
                    else if (statuses.includes('warning')) dominantStatus = 'warning'
                  }

                  const bgColor = dominantStatus === 'expired'
                    ? 'bg-red-500/10 hover:bg-red-500/20'
                    : dominantStatus === 'warning'
                    ? 'bg-yellow-500/10 hover:bg-yellow-500/20'
                    : hasEvents
                    ? 'bg-slate-800 hover:bg-slate-700'
                    : 'hover:bg-slate-800/50'

                  const selectedClass = isSelected ? 'ring-2 ring-blue-400' : ''

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(dateKey)}
                      className={`aspect-square min-h-[70px] md:min-h-[80px] p-2 rounded-lg text-left transition ${bgColor} ${todayBorder} ${selectedClass}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className={`text-sm font-semibold ${isToday(day) ? 'text-blue-400' : ''}`}>
                          {day}
                        </span>
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] bg-slate-700 text-slate-300 px-1 rounded">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-0.5">
                        {dayEvents.slice(0, 3).map((e, idx) => {
                          const config = eventTypeConfig[e.type]
                          return (
                            <div
                              key={idx}
                              className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
                              title={`${config.label} - ${e.vehicle.brand} ${e.vehicle.model}`}
                            />
                          )
                        })}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Seçili gün detayı */}
            {selectedDay && (
              <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">
                    {formatDate(selectedDay)}
                    <span className="text-sm text-slate-400 font-normal ml-2">
                      ({weekDaysFull[(new Date(selectedDay).getDay() + 6) % 7]})
                    </span>
                  </h3>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Bu tarihte olay yok
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((e, i) => {
                      const config = eventTypeConfig[e.type]
                      const Icon = config.icon
                      const isExpiry = ['inspection', 'mtv', 'insurance', 'kasko'].includes(e.type)
                      const days = isExpiry ? daysUntil(e.date) : null
                      const status = isExpiry ? getDateStatus(e.date) : null

                      return (
                        <Link
                          key={i}
                          to={`/vehicles/${e.vehicle.id}`}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${config.bg} ${config.border} hover:bg-opacity-20 transition`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                            <Icon className={`w-5 h-5 ${config.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                              <span className={config.text}>{config.label}</span>
                              <span className="text-slate-400 font-normal">— {e.label}</span>
                            </div>
                            <div className="text-xs text-slate-400 truncate">
                              {e.vehicle.brand} {e.vehicle.model} ({e.vehicle.plate})
                            </div>
                          </div>
                          {isExpiry && days !== null && (
                            <div className={`text-xs font-semibold shrink-0 ${
                              status === 'expired' ? 'text-red-400' :
                              status === 'warning' ? 'text-yellow-400' :
                              'text-slate-400'
                            }`}>
                              {days < 0 ? `${Math.abs(days)}g geçti` : days === 0 ? 'Bugün' : `${days}g kaldı`}
                            </div>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Liste Görünümü */
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-bold mb-4">Tüm Olaylar (Kronolojik)</h2>

            {listEvents.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Filtrelerine uyan olay yok
              </p>
            ) : (
              <div className="space-y-2">
                {listEvents.map((e, i) => {
                  const config = eventTypeConfig[e.type]
                  const Icon = config.icon
                  const isExpiry = ['inspection', 'mtv', 'insurance', 'kasko'].includes(e.type)
                  const days = isExpiry ? daysUntil(e.date) : null
                  const status = isExpiry ? getDateStatus(e.date) : null

                  return (
                    <Link
                      key={i}
                      to={`/vehicles/${e.vehicle.id}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${config.bg} ${config.border} hover:bg-opacity-20 transition`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                        <Icon className={`w-5 h-5 ${config.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                          <span className={config.text}>{config.label}</span>
                          <span className="text-slate-400 font-normal">— {e.label}</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatDate(e.date)} • {e.vehicle.brand} {e.vehicle.model} ({e.vehicle.plate})
                        </div>
                      </div>
                      {isExpiry && days !== null && (
                        <div className={`text-xs font-semibold shrink-0 ${
                          status === 'expired' ? 'text-red-400' :
                          status === 'warning' ? 'text-yellow-400' :
                          'text-slate-400'
                        }`}>
                          {days < 0 ? `${Math.abs(days)}g geçti` : days === 0 ? 'Bugün' : `${days}g`}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  )
}