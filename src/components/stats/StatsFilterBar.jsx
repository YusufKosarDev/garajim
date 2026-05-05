import { Filter, Car } from 'lucide-react'

export default function StatsFilterBar({ vehicles, selectedVehicleId, onVehicleChange }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filtre:</span>
        </div>
        <select
          value={selectedVehicleId || 'all'}
          onChange={(e) => onVehicleChange(e.target.value === 'all' ? null : e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 min-w-[180px]"
        >
          <option value="all">🌐 Tüm Araçlar</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>
              🚗 {v.brand} {v.model} ({v.plate})
            </option>
          ))}
        </select>
      </div>

      {selectedVehicleId && (
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <Car className="w-3.5 h-3.5" />
          Sadece bu araç gösteriliyor
        </div>
      )}
    </div>
  )
}