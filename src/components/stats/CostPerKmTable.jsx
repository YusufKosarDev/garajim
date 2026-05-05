import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, Trophy, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { getVehicleCostAnalysis } from '../../utils/statisticsHelpers'

export default function CostPerKmTable({ vehicles = [], maintenanceRecords = [], fuelRecords = [] }) {
  const [sortBy, setSortBy] = useState('totalCost')
  const [sortDir, setSortDir] = useState('desc')

  const analysis = useMemo(
    () => getVehicleCostAnalysis(vehicles, maintenanceRecords, fuelRecords),
    [vehicles, maintenanceRecords, fuelRecords]
  )

  const sorted = useMemo(() => {
    const result = [...analysis]
    result.sort((a, b) => {
      let aVal, bVal
      switch (sortBy) {
        case 'totalCost':
          aVal = a.totalCost
          bVal = b.totalCost
          break
        case 'costPerKm':
          aVal = a.costPerKm || 0
          bVal = b.costPerKm || 0
          break
        case 'kmRange':
          aVal = a.kmRange
          bVal = b.kmRange
          break
        case 'recordCount':
          aVal = a.recordCount
          bVal = b.recordCount
          break
        case 'avgFuelPrice':
          aVal = a.avgFuelPrice || 0
          bVal = b.avgFuelPrice || 0
          break
        default:
          aVal = a.totalCost
          bVal = b.totalCost
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
    return result
  }, [analysis, sortBy, sortDir])

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />
    return sortDir === 'desc'
      ? <ArrowDown className="w-3 h-3 text-blue-400" />
      : <ArrowUp className="w-3 h-3 text-blue-400" />
  }

  // En verimli araç — km başına maliyet en düşük (ama KM verisi olmalı)
  const mostEfficient = useMemo(() => {
    const withData = analysis.filter(a => a.costPerKm !== null && a.costPerKm > 0)
    if (withData.length === 0) return null
    return withData.reduce((min, curr) => (curr.costPerKm < min.costPerKm ? curr : min))
  }, [analysis])

  if (vehicles.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Analiz için araç gerekiyor
      </div>
    )
  }

  return (
    <div>
      {mostEfficient && vehicles.length > 1 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-slate-300">
              <strong className="text-yellow-400">En ekonomik araç:</strong>{' '}
              {mostEfficient.vehicle.brand} {mostEfficient.vehicle.model} —{' '}
              <strong className="text-white">{mostEfficient.costPerKm.toFixed(2)} ₺/km</strong>
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto -mx-5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wide text-slate-400">
              <th className="text-left py-2 px-5 font-semibold">Araç</th>
              <th className="text-right py-2 px-3 font-semibold">
                <button
                  onClick={() => toggleSort('totalCost')}
                  className="flex items-center gap-1 hover:text-white transition ml-auto"
                >
                  Toplam ₺ <SortIcon field="totalCost" />
                </button>
              </th>
              <th className="text-right py-2 px-3 font-semibold hidden md:table-cell">
                <button
                  onClick={() => toggleSort('kmRange')}
                  className="flex items-center gap-1 hover:text-white transition ml-auto"
                >
                  Kat edilen KM <SortIcon field="kmRange" />
                </button>
              </th>
              <th className="text-right py-2 px-3 font-semibold">
                <button
                  onClick={() => toggleSort('costPerKm')}
                  className="flex items-center gap-1 hover:text-white transition ml-auto"
                >
                  ₺/KM <SortIcon field="costPerKm" />
                </button>
              </th>
              <th className="text-right py-2 px-3 font-semibold hidden lg:table-cell">
                <button
                  onClick={() => toggleSort('avgFuelPrice')}
                  className="flex items-center gap-1 hover:text-white transition ml-auto"
                >
                  Ort. ₺/L <SortIcon field="avgFuelPrice" />
                </button>
              </th>
              <th className="text-right py-2 px-5 font-semibold hidden md:table-cell">
                <button
                  onClick={() => toggleSort('recordCount')}
                  className="flex items-center gap-1 hover:text-white transition ml-auto"
                >
                  Kayıt <SortIcon field="recordCount" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a, i) => {
              const isEfficient = mostEfficient?.vehicle.id === a.vehicle.id && vehicles.length > 1
              return (
                <tr
                  key={a.vehicle.id}
                  className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition ${
                    isEfficient ? 'bg-yellow-500/5' : ''
                  }`}
                >
                  <td className="py-3 px-5">
                    <Link
                      to={`/vehicles/${a.vehicle.id}`}
                      className="flex items-center gap-2 group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-blue-500/20 transition shrink-0">
                        {isEfficient ? (
                          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                        ) : (
                          <Car className="w-3.5 h-3.5 text-blue-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm group-hover:text-blue-400 transition truncate">
                          {a.vehicle.brand} {a.vehicle.model}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {a.vehicle.plate}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="text-right py-3 px-3">
                    <div className="text-sm font-bold text-white">
                      {a.totalCost.toLocaleString('tr-TR')} ₺
                    </div>
                    <div className="text-[10px] text-slate-500">
                      🔧 {a.maintenanceCost.toLocaleString('tr-TR')} + ⛽ {a.fuelCost.toLocaleString('tr-TR')}
                    </div>
                  </td>
                  <td className="text-right py-3 px-3 hidden md:table-cell">
                    {a.kmRange > 0 ? (
                      <div className="text-sm font-semibold text-slate-300">
                        {a.kmRange.toLocaleString('tr-TR')} km
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                  <td className="text-right py-3 px-3">
                    {a.costPerKm !== null ? (
                      <div className={`text-sm font-bold ${
                        isEfficient ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {a.costPerKm.toFixed(2)} ₺
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600" title="KM verisi yok">—</span>
                    )}
                  </td>
                  <td className="text-right py-3 px-3 hidden lg:table-cell">
                    {a.avgFuelPrice ? (
                      <div className="text-sm text-slate-300">
                        {a.avgFuelPrice.toFixed(2)} ₺
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                  <td className="text-right py-3 px-5 hidden md:table-cell">
                    <div className="text-sm font-semibold text-slate-300">
                      {a.recordCount}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobil açıklama */}
      <div className="mt-4 text-[10px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
        <span>💡 <strong>₺/KM</strong>: Kat edilen her km için ortalama maliyet</span>
      </div>
    </div>
  )
}