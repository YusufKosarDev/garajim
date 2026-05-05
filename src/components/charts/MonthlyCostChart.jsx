import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

export default function MonthlyCostChart({ maintenanceRecords = [], fuelRecords = [] }) {
  // Son 12 ay için ay-yıl anahtarları oluştur
  const now = new Date()
  const months = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
      maintenance: 0,
      fuel: 0,
      total: 0,
    })
  }

  // Bakım kayıtlarını ekle
  maintenanceRecords.forEach(r => {
    const d = new Date(r.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const month = months.find(m => m.key === key)
    if (month) {
      month.maintenance += r.cost || 0
      month.total += r.cost || 0
    }
  })

  // Yakıt kayıtlarını ekle
  fuelRecords.forEach(r => {
    const d = new Date(r.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const month = months.find(m => m.key === key)
    if (month) {
      month.fuel += r.totalCost || 0
      month.total += r.totalCost || 0
    }
  })

  const hasData = months.some(m => m.total > 0)

  if (!hasData) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
        Henüz grafiklenecek veri yok
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="maintenanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="label"
          stroke="#64748b"
          style={{ fontSize: '11px' }}
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
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Area
          type="monotone"
          dataKey="maintenance"
          name="Bakım"
          stroke="#3b82f6"
          fillOpacity={1}
          fill="url(#maintenanceGradient)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="fuel"
          name="Yakıt"
          stroke="#f97316"
          fillOpacity={1}
          fill="url(#fuelGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}