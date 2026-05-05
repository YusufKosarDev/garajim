import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { calculateConsumption } from '../../utils/fuelHelpers'
import { formatDate } from '../../utils/dateHelpers'

export default function FuelConsumptionChart({ fuelRecords }) {
  // Kronolojik sırala ve tüketim hesapla
  const sorted = [...fuelRecords].sort((a, b) => a.km - b.km)

  const chartData = sorted
    .map((record, i) => {
      if (i === 0) return null // İlk dolumun tüketimi hesaplanamaz
      const consumption = calculateConsumption(sorted[i - 1], record)
      return {
        name: formatDate(record.date).split(' ').slice(0, 2).join(' '),
        Tüketim: consumption ? parseFloat(consumption.toFixed(2)) : null,
      }
    })
    .filter(Boolean)

  if (chartData.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        Tüketim hesabı için en az 2 yakıt kaydı gerekir
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v}L`} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#fff',
          }}
          formatter={(value) => [`${value} L/100km`, 'Tüketim']}
        />
        <Line
          type="monotone"
          dataKey="Tüketim"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ fill: '#10b981', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}