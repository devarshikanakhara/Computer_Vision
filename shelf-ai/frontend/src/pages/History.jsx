import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History as HistoryIcon, Clock, Trash2 } from 'lucide-react'

const KEY = 'shelfai_history'

export function saveToHistory(sessionId, summary) {
  try {
    const existing = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    const entry = {
      sessionId,
      timestamp: new Date().toISOString(),
      ...summary,
    }
    const updated = [entry, ...existing].slice(0, 20)
    localStorage.setItem(KEY, JSON.stringify(updated))
  } catch {}
}

export default function History() {
  const [entries, setEntries] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    try {
      setEntries(JSON.parse(localStorage.getItem(KEY) ?? '[]'))
    } catch { setEntries([]) }
  }, [])

  const remove = (id) => {
    const updated = entries.filter(e => e.sessionId !== id)
    setEntries(updated)
    localStorage.setItem(KEY, JSON.stringify(updated))
  }

  return (
    <div className="fade-up space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
          <HistoryIcon size={20} className="text-accent-cyan" />
          Analysis History
        </h1>
        <p className="text-slate-400 text-sm mt-1">Previous sessions stored in your browser</p>
      </div>

      {!entries.length ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center gap-4">
          <Clock size={32} className="text-slate-600" />
          <div>
            <p className="font-display font-medium text-slate-400">No history yet</p>
            <p className="text-xs text-slate-500 mt-1">Completed analyses will appear here</p>
          </div>
          <button onClick={() => navigate('/')} className="btn-primary text-sm">
            Start an Analysis
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(e => (
            <div key={e.sessionId}
              className="card flex items-center justify-between hover:border-accent-cyan/30 transition-colors">
              <div className="space-y-0.5">
                <p className="font-mono text-xs text-slate-400">{e.sessionId}</p>
                <p className="text-sm text-white font-display font-medium">
                  {new Date(e.timestamp).toLocaleString()}
                </p>
                {e.customer_visits !== undefined && (
                  <p className="text-xs text-slate-400">
                    {e.customer_visits} visit(s) · {e.total_items_taken} items taken ·{' '}
                    {e.avg_fps} fps
                  </p>
                )}
              </div>
              <button onClick={() => remove(e.sessionId)}
                className="text-slate-500 hover:text-accent-red transition-colors p-1.5">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
