import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#06b6d4', '#eab308', '#ef4444']

export default function VehicleCostChart({ vehicles = [], maintenanceRecords = [], fuelRecords = [] }) {
  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
        Araç yok
      </div>
    )
  }

  // Her araç için toplam harcama hesapla
  const data = vehicles.map(v => {
    const maintenance = maintenanceRecords
      .filter(r => r.vehicleId === v.id)
      .reduce((sum, r) => sum + (r.cost || 0), 0)

    const fuel = fuelRecords
      .filter(r => r.vehicleId === v.id)
      .reduce((sum, r) => sum + (r.totalCost || 0), 0)

    return {
      name: `${v.brand} ${v.model}`,
      shortName: v.plate || v.model,
      maintenance,
      fuel,
      total: maintenance + fuel,
    }
  })
  .filter(d => d.total > 0)
  .sort((a, b) => b.total - a.total)

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
        Araçlar için harcama kaydı yok
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="shortName"
          stroke="#64748b"
          style={{ fontSize: '11px' }}
          angle={-20}
          textAnchor="end"
          height={60}
        />
        <YAxis
          stroke="#64748b"
          style={{ fontSize: '11px' }}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#fff',
          }}
          formatter={(value) => `${Number(value).toLocaleString('tr-TR')} ₺`}
          labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="maintenance" name="Bakım" stackId="a" fill="#3b82f6" />
        <Bar dataKey="fuel" name="Yakıt" stackId="a" fill="#f97316">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill="#f97316" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}