import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e',
  '#06b6d4', '#eab308', '#ef4444', '#14b8a6', '#a855f7',
  '#f59e0b', '#10b981', '#6366f1', '#84cc16', '#f43f5e',
]

export default function MaintenanceTypeChart({ maintenanceRecords = [] }) {
  if (!maintenanceRecords || maintenanceRecords.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
        Henüz bakım kaydı yok
      </div>
    )
  }

  // Tür bazında grupla
  const byType = {}
  maintenanceRecords.forEach(r => {
    const type = r.type || 'Diğer'
    if (!byType[type]) byType[type] = { name: type, value: 0, count: 0 }
    byType[type].value += r.cost || 0
    byType[type].count += 1
  })

  const data = Object.values(byType)
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
        Bakım kayıtlarında maliyet bilgisi yok
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#fff',
          }}
          formatter={(value, name, props) => [
            `${Number(value).toLocaleString('tr-TR')} ₺ (${props.payload.count} kayıt)`,
            name,
          ]}
        />
        <Legend
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  )
}