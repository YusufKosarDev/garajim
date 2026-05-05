import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { formatDate } from '../utils/dateHelpers'

const months = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export default function DashboardCalendar({ events = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  let startDay = firstDay.getDay() - 1
  if (startDay === -1) startDay = 6

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const eventsByDate = {}
  events.forEach(event => {
    const key = event.date
    if (!eventsByDate[key]) eventsByDate[key] = []
    eventsByDate[key].push(event)
  })

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const days = []
  for (let i = 0; i < startDay; i++) {
    days.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }

  const formatDateKey = (day) => {
    const d = new Date(year, month, day)
    return d.toISOString().split('T')[0]
  }

  const getDayStatus = (day) => {
    if (!day) return null
    const dateKey = formatDateKey(day)
    const dayEvents = eventsByDate[dateKey] || []
    if (dayEvents.length === 0) return null

    if (dayEvents.some(e => e.status === 'expired')) return 'expired'
    if (dayEvents.some(e => e.status === 'warning')) return 'warning'
    return 'safe'
  }

  const isToday = (day) => {
    if (!day) return false
    const d = new Date(year, month, day)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  }

  const statusColors = {
    expired: 'bg-red-500/30 text-red-300 border-red-500/50 ring-1 ring-red-500/50',
    warning: 'bg-yellow-500/30 text-yellow-300 border-yellow-500/50 ring-1 ring-yellow-500/50',
    safe: 'bg-green-500/30 text-green-300 border-green-500/50',
  }

  const selectedDate = formatDateKey(currentDate.getDate())
  const selectedEvents = eventsByDate[selectedDate] || []

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-400" />
          {months[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition"
            title="Önceki ay"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            title="Bugüne dön"
          >
            Bugün
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition"
            title="Sonraki ay"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-slate-500 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square" />

          const status = getDayStatus(day)
          const todayClass = isToday(day) ? 'ring-2 ring-blue-500' : ''
          const dayEvents = eventsByDate[formatDateKey(day)] || []

          return (
            <div
              key={i}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative group cursor-pointer transition ${
                status ? statusColors[status] : 'hover:bg-slate-800'
              } ${todayClass}`}
              title={dayEvents.map(e => `${e.type} - ${e.vehicle.brand} ${e.vehicle.model}`).join('\n')}
            >
              <span className={`font-semibold ${isToday(day) ? 'text-blue-400' : ''}`}>{day}</span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((e, idx) => (
                    <div
                      key={idx}
                      className={`w-1 h-1 rounded-full ${
                        e.status === 'expired' ? 'bg-red-400' :
                        e.status === 'warning' ? 'bg-yellow-400' : 'bg-green-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedEvents.length > 0 && (
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
          <div className="text-xs text-slate-400 mb-2">
            {formatDate(selectedDate)} tarihindeki olaylar:
          </div>
          <div className="space-y-1">
            {selectedEvents.map((e, i) => (
              <Link
                key={i}
                to={`/vehicles/${e.vehicle.id}`}
                className="flex items-center justify-between text-sm hover:bg-slate-700/50 p-1.5 rounded transition"
              >
                <span className="truncate">
                  <span className={`font-semibold ${
                    e.status === 'expired' ? 'text-red-400' :
                    e.status === 'warning' ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {e.type}
                  </span>
                  <span className="text-slate-400 ml-1">
                    — {e.vehicle.brand} {e.vehicle.model}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span>Geçmiş</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <span>Yaklaşan</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span>Güvende</span>
        </div>
      </div>
    </div>
  )
}