import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-lg px-3 py-2 text-xs font-mono shadow-lg">
      <p className="text-slate-400 mb-1">Frame {label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function FpsDetChart({ fpsHistory = [], detHistory = [] }) {
  const maxLen = Math.max(fpsHistory.length, detHistory.length)
  const step   = Math.max(1, Math.floor(maxLen / 200))
  const data   = []
  for (let i = 0; i < maxLen; i += step) {
    data.push({
      frame: i,
      FPS:   +(fpsHistory[i] ?? 0).toFixed(1),
      Dets:  detHistory[i] ?? 0,
    })
  }

  if (!data.length) return null

  return (
    <div className="card">
      <h2 className="section-title">Inference Speed & Detections per Frame</h2>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis dataKey="frame" tick={{ fill: '#8b949e', fontSize: 11 }} tickLine={false} />
          <YAxis yAxisId="fps" orientation="left"  tick={{ fill: '#3b82f6', fontSize: 11 }} tickLine={false} unit=" fps" />
          <YAxis yAxisId="det" orientation="right" tick={{ fill: '#10b981', fontSize: 11 }} tickLine={false} unit=" det" />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
          <Bar  yAxisId="det" dataKey="Dets" fill="#10b981" opacity={0.4} radius={[2,2,0,0]} />
          <Line yAxisId="fps" type="monotone" dataKey="FPS" stroke="#3b82f6" dot={false} strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
