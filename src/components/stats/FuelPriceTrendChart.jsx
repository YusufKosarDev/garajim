import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { useMemo } from 'react'

export default function FuelPriceTrendChart({ fuelRecords = [] }) {
  const data = useMemo(() => {
    const sorted = [...fuelRecords]
      .filter(r => r.pricePerLiter > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    return sorted.map((r, i) => ({
      index: i,
      date: r.date,
      price: r.pricePerLiter,
      station: r.station || '—',
      label: new Date(r.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
    }))
  }, [fuelRecords])

  const avgPrice = useMemo(() => {
    if (data.length === 0) return 0
    return data.reduce((sum, d) => sum + d.price, 0) / data.length
  }, [data])

  if (data.length < 2) {
    return (
      <div className="h-[250px] flex items-center justify-center text-slate-500 text-sm">
        Trend için en az 2 yakıt kaydı gerekiyor
      </div>
    )
  }

  const minPrice = Math.min(...data.map(d => d.price))
  const maxPrice = Math.max(...data.map(d => d.price))

  return (
    <div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="label"
            stroke="#64748b"
            style={{ fontSize: '10px' }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '11px' }}
            tickFormatter={(value) => `${value.toFixed(2)}`}
            domain={[minPrice * 0.95, maxPrice * 1.05]}
          />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12px',
            }}
            formatter={(value, name, props) => [
              `${Number(value).toFixed(2)} ₺/L`,
              props.payload.station,
            ]}
            labelFormatter={(label) => label}
          />
          <ReferenceLine
            y={avgPrice}
            stroke="#f59e0b"
            strokeDasharray="3 3"
            label={{
              value: `Ortalama: ${avgPrice.toFixed(2)} ₺`,
              position: 'right',
              fill: '#f59e0b',
              fontSize: 10,
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ fill: '#f97316', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
        <span>
          En düşük: <strong className="text-green-400">{minPrice.toFixed(2)} ₺</strong>
        </span>
        <span>
          Ortalama: <strong className="text-yellow-400">{avgPrice.toFixed(2)} ₺</strong>
        </span>
        <span>
          En yüksek: <strong className="text-red-400">{maxPrice.toFixed(2)} ₺</strong>
        </span>
      </div>
    </div>
  )
}