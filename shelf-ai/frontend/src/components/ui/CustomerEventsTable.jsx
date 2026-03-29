import { User, Package } from 'lucide-react'

export default function CustomerEventsTable({ events = [] }) {
  if (!events.length) {
    return (
      <div className="card flex flex-col items-center justify-center py-10 text-center gap-3">
        <User size={28} className="text-slate-600" />
        <p className="font-display font-medium text-slate-400">No customer visits detected</p>
        <p className="text-xs text-slate-500">The model found no person entries in the video sequence</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="section-title flex items-center gap-2">
        <User size={16} className="text-accent-cyan" />
        Customer Visit Log
      </h2>
      <div className="space-y-3">
        {events.map((ev, i) => (
          <div key={i} className="bg-surface-1 border border-surface-4 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold text-white text-sm">Visit {i + 1}</span>
              <span className="font-mono text-xs text-slate-400">
                Frames {ev.entry_frame} → {ev.exit_frame}
              </span>
            </div>

            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-accent-amber">
                <Package size={13} />
                <span className="font-mono font-semibold">{ev.total_taken}</span>
                <span className="text-slate-400">items taken</span>
              </div>
              <div className="text-slate-400">
                Duration: <span className="text-white font-mono">{ev.exit_frame - ev.entry_frame} frames</span>
              </div>
            </div>

            {/* Per-zone breakdown */}
            {Object.entries(ev.taken_per_zone).some(([, v]) => v > 0) && (
              <div className="pt-2 border-t border-surface-4">
                <p className="text-[11px] text-slate-500 mb-2 font-display uppercase tracking-wide">Per-zone breakdown</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ev.taken_per_zone).map(([sid, cnt]) => cnt > 0 && (
                    <span key={sid} className="px-2 py-0.5 rounded bg-accent-amber/10 border border-accent-amber/30 text-accent-amber text-xs font-mono">
                      Shelf {parseInt(sid)+1}: {cnt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
