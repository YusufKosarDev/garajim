import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { useMemo } from 'react'

const MONTH_LABELS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

export default function YearComparisonChart({ maintenanceRecords = [], fuelRecords = [] }) {
  const data = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const previousYear = currentYear - 1

    // 12 ay için 2 yıllık karşılaştırma
    const months = MONTH_LABELS.map((label, i) => ({
      month: label,
      monthIndex: i,
      [previousYear]: 0,
      [currentYear]: 0,
    }))

    const addToMonth = (dateString, amount) => {
      const d = new Date(dateString)
      const year = d.getFullYear()
      const monthIdx = d.getMonth()
      if (year === currentYear || year === previousYear) {
        months[monthIdx][year] += amount
      }
    }

    maintenanceRecords.forEach(r => addToMonth(r.date, r.cost || 0))
    fuelRecords.forEach(r => addToMonth(r.date, r.totalCost || 0))

    return { data: months, currentYear, previousYear }
  }, [maintenanceRecords, fuelRecords])

  const hasCurrentData = data.data.some(m => m[data.currentYear] > 0)
  const hasPreviousData = data.data.some(m => m[data.previousYear] > 0)

  if (!hasCurrentData && !hasPreviousData) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
        Karşılaştırma için yeterli veri yok
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data.data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="month"
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
        <Bar
          dataKey={data.previousYear}
          name={`${data.previousYear}`}
          fill="#64748b"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey={data.currentYear}
          name={`${data.currentYear}`}
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}