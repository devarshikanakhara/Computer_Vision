import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-lg px-3 py-2 text-xs font-mono shadow-lg">
      <p className="text-slate-400 mb-1">Frame {label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value?.toFixed(1)}%</p>
      ))}
    </div>
  )
}

export default function StockChart({ stockHistory = {} }) {
  // Build recharts data array: [{frame:0, 'Shelf 1': 95, ...}, ...]
  const shelfIds = Object.keys(stockHistory).map(Number).sort((a, b) => a - b)
  const maxLen   = Math.max(...shelfIds.map(sid => stockHistory[sid]?.length ?? 0), 0)

  // Downsample to max 300 points for performance
  const step = Math.max(1, Math.floor(maxLen / 300))
  const data = []
  for (let i = 0; i < maxLen; i += step) {
    const row = { frame: i }
    shelfIds.forEach(sid => { row[`Shelf ${sid+1}`] = stockHistory[sid]?.[i] ?? 0 })
    data.push(row)
  }

  if (!data.length) return (
    <div className="card flex items-center justify-center h-56 text-slate-500 text-sm">
      No stock history data
    </div>
  )

  return (
    <div className="card">
      <h2 className="section-title">Stock Fill Level Over Time</h2>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis dataKey="frame" tick={{ fill: '#8b949e', fontSize: 11 }} tickLine={false} />
          <YAxis domain={[0, 110]} tick={{ fill: '#8b949e', fontSize: 11 }} tickLine={false} unit="%" />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
          <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}
            label={{ value: 'OOS 30%', fill: '#ef4444', fontSize: 10 }} />
          <ReferenceLine y={65} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5}
            label={{ value: 'Low 65%', fill: '#f59e0b', fontSize: 10 }} />
          {shelfIds.map((sid, i) => (
            <Line
              key={sid}
              type="monotone"
              dataKey={`Shelf ${sid+1}`}
              stroke={COLORS[i % COLORS.length]}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
