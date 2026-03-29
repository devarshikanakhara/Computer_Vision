import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#a855f7',
                '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1']

export default function ClassCountChart({ classCounts = {} }) {
  const data = Object.entries(classCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }))

  if (!data.length) return null

  return (
    <div className="card">
      <h2 className="section-title">Top Detected Classes</h2>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 11 }} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#c9d1d9', fontSize: 11 }} tickLine={false} width={58} />
          <Tooltip
            contentStyle={{ background: '#21262d', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#f0f6fc' }}
            itemStyle={{ color: '#8b949e' }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
