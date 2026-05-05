import { Link } from 'react-router-dom'
import { Car, Wrench, Droplet, Gauge, Hash, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { getVehicleCostAnalysis } from '../../utils/statisticsHelpers'

export default function VehicleBreakdownCards({ vehicles = [], maintenanceRecords = [], fuelRecords = [] }) {
  const analysis = useMemo(
    () => getVehicleCostAnalysis(vehicles, maintenanceRecords, fuelRecords),
    [vehicles, maintenanceRecords, fuelRecords]
  )

  if (analysis.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {analysis.map(a => {
        const v = a.vehicle
        // Bakım vs yakıt oranı (progress bar için)
        const maintenancePercent = a.totalCost > 0
          ? (a.maintenanceCost / a.totalCost) * 100
          : 0
        const fuelPercent = 100 - maintenancePercent

        return (
          <Link
            key={v.id}
            to={`/vehicles/${v.id}`}
            className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl p-5 transition group"
          >
            {/* Üst: araç bilgisi */}
            <div className="flex items-center gap-3 mb-4">
              {v.photo ? (
                <img
                  src={v.photo}
                  alt={`${v.brand} ${v.model}`}
                  className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                />
              ) : (
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <Car className="w-6 h-6 text-blue-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white group-hover:text-blue-400 transition">
                  {v.brand} {v.model}
                </div>
                <div className="text-xs text-slate-400">
                  {v.plate} • {v.year}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">
                  {a.totalCost >= 1000
                    ? `${(a.totalCost / 1000).toFixed(1)}k`
                    : a.totalCost
                  } ₺
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                  Toplam
                </div>
              </div>
            </div>

            {/* Bakım vs yakıt oranı */}
            {a.totalCost > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-blue-400 flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    Bakım {maintenancePercent.toFixed(0)}%
                  </span>
                  <span className="text-orange-400 flex items-center gap-1">
                    Yakıt {fuelPercent.toFixed(0)}%
                    <Droplet className="w-3 h-3" />
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                    style={{ width: `${maintenancePercent}%` }}
                  />
                  <div
                    className="bg-gradient-to-r from-orange-400 to-orange-500 transition-all"
                    style={{ width: `${fuelPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Metrikler */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">
                  <Hash className="w-3 h-3" />
                  Kayıt
                </div>
                <div className="text-sm font-bold text-white">
                  {a.recordCount}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">
                  <Gauge className="w-3 h-3" />
                  KM Aralığı
                </div>
                <div className="text-sm font-bold text-white">
                  {a.kmRange > 0
                    ? `${a.kmRange.toLocaleString('tr-TR')} km`
                    : <span className="text-slate-600">—</span>
                  }
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">
                  <TrendingUp className="w-3 h-3" />
                  ₺/KM
                </div>
                <div className="text-sm font-bold text-blue-400">
                  {a.costPerKm !== null
                    ? `${a.costPerKm.toFixed(2)} ₺`
                    : <span className="text-slate-600">—</span>
                  }
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">
                  <Droplet className="w-3 h-3" />
                  Ort. ₺/L
                </div>
                <div className="text-sm font-bold text-orange-400">
                  {a.avgFuelPrice
                    ? `${a.avgFuelPrice.toFixed(2)} ₺`
                    : <span className="text-slate-600">—</span>
                  }
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}