import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { getVehicleCostAnalysis } from '../../utils/statisticsHelpers'

const metrics = [
  { id: 'totalCost', label: 'Toplam Harcama', unit: '₺', color: '#22c55e' },
  { id: 'costPerKm', label: 'KM Başına Maliyet', unit: '₺/km', color: '#3b82f6' },
  { id: 'recordCount', label: 'Kayıt Sayısı', unit: '', color: '#a855f7' },
  { id: 'kmRange', label: 'Kat Edilen KM', unit: 'km', color: '#f97316' },
]

export default function VehicleRankingChart({ vehicles = [], maintenanceRecords = [], fuelRecords = [] }) {
  const [selectedMetric, setSelectedMetric] = useState('totalCost')

  const analysis = useMemo(
    () => getVehicleCostAnalysis(vehicles, maintenanceRecords, fuelRecords),
    [vehicles, maintenanceRecords, fuelRecords]
  )

  const metric = metrics.find(m => m.id === selectedMetric)

  const data = useMemo(() => {
    return analysis
      .map(a => ({
        name: `${a.vehicle.brand} ${a.vehicle.model}`,
        shortName: a.vehicle.plate || a.vehicle.model,
        value: a[selectedMetric] || 0,
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [analysis, selectedMetric])

  if (vehicles.length < 2) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Karşılaştırma için en az 2 araç gerekiyor
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Bu metrik için yeterli veri yok
      </div>
    )
  }

  return (
    <div>
      {/* Metric seçici */}
      <div className="flex flex-wrap gap-2 mb-4">
        {metrics.map(m => (
          <button
            key={m.id}
            onClick={() => setSelectedMetric(m.id)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition border ${
              selectedMetric === m.id
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis
            type="number"
            stroke="#64748b"
            style={{ fontSize: '11px' }}
            tickFormatter={(value) => {
              if (selectedMetric === 'totalCost' || selectedMetric === 'kmRange') {
                return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
              }
              return value.toFixed(selectedMetric === 'costPerKm' ? 2 : 0)
            }}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            stroke="#64748b"
            style={{ fontSize: '11px' }}
            width={90}
          />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value) => {
              const formatted = selectedMetric === 'costPerKm'
                ? value.toFixed(2)
                : Number(value).toLocaleString('tr-TR')
              return [`${formatted} ${metric.unit}`, metric.label]
            }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={i === 0 ? metric.color : `${metric.color}80`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}