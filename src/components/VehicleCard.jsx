import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Pencil, Trash2, Car, Calendar, Fuel, Gauge, AlertTriangle, ImageIcon } from 'lucide-react'
import { formatDate, getDateStatus, daysUntil } from '../utils/dateHelpers'

export default function VehicleCard({ vehicle, onEdit, onDelete }) {
  // Çoklu fotoğraf desteği — eski `photo` ile uyumlu
  const photos = Array.isArray(vehicle.photos) ? vehicle.photos : (vehicle.photo ? [vehicle.photo] : [])
  const mainPhoto = photos[0] || null

  // En kritik tarih (kart üstüne rozet için)
  const criticalDates = [
    { label: 'Muayene', date: vehicle.inspectionDate },
    { label: 'MTV', date: vehicle.mtvDate },
    { label: 'Sigorta', date: vehicle.insuranceDate },
    { label: 'Kasko', date: vehicle.kaskoDate },
  ]
    .filter(d => d.date)
    .map(d => ({
      ...d,
      days: daysUntil(d.date),
      status: getDateStatus(d.date),
    }))
    .filter(d => d.days !== null)
    .sort((a, b) => a.days - b.days)

  const mostUrgent = criticalDates[0]
  const hasAlert = mostUrgent && (mostUrgent.status === 'expired' || mostUrgent.status === 'warning')

  const handleDeleteClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete(vehicle)
  }

  const handleEditClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onEdit(vehicle)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        to={`/vehicles/${vehicle.id}`}
        className="block bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl overflow-hidden transition group"
      >
        {/* Fotoğraf alanı */}
        <div className="relative aspect-video bg-slate-800 overflow-hidden">
          {mainPhoto ? (
            <img
              src={mainPhoto}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              <Car className="w-16 h-16 text-slate-700" />
            </div>
          )}

          {/* Çoklu fotoğraf rozeti */}
          {photos.length > 1 && (
            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              {photos.length}
            </div>
          )}

          {/* Aksiyon butonları */}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={handleEditClick}
              className="p-1.5 bg-black/70 hover:bg-blue-500/80 backdrop-blur-sm rounded-md text-white transition"
              title="Düzenle"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDeleteClick}
              className="p-1.5 bg-black/70 hover:bg-red-500/80 backdrop-blur-sm rounded-md text-white transition"
              title="Sil"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Uyarı rozeti */}
          {hasAlert && (
            <div className={`absolute bottom-2 left-2 backdrop-blur-sm text-[10px] px-2 py-1 rounded-full flex items-center gap-1 font-semibold ${
              mostUrgent.status === 'expired'
                ? 'bg-red-500/90 text-white'
                : 'bg-yellow-500/90 text-yellow-950'
            }`}>
              <AlertTriangle className="w-3 h-3" />
              {mostUrgent.label}: {
                mostUrgent.days < 0
                  ? `${Math.abs(mostUrgent.days)}g geçti`
                  : mostUrgent.days === 0
                  ? 'Bugün'
                  : `${mostUrgent.days}g`
              }
            </div>
          )}
        </div>

        {/* Bilgiler */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-white truncate group-hover:text-blue-400 transition">
                {vehicle.brand} {vehicle.model}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{vehicle.plate}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-slate-400">{vehicle.year}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800">
            {vehicle.fuelType && (
              <span className="flex items-center gap-1">
                <Fuel className="w-3 h-3" />
                {vehicle.fuelType}
              </span>
            )}
            {vehicle.currentKm && (
              <span className="flex items-center gap-1">
                <Gauge className="w-3 h-3" />
                {Number(vehicle.currentKm).toLocaleString('tr-TR')}
              </span>
            )}
            {vehicle.inspectionDate && !hasAlert && (
              <span className="flex items-center gap-1 ml-auto text-green-400">
                <Calendar className="w-3 h-3" />
                {formatDate(vehicle.inspectionDate)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}