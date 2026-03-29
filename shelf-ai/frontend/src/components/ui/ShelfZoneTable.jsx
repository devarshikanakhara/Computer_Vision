import clsx from 'clsx'

const STATUS_META = {
  OK:            { label: 'In Stock',     cls: 'badge-ok'  },
  LOW_STOCK:     { label: 'Low Stock',    cls: 'badge-low' },
  OUT_OF_STOCK:  { label: 'Out of Stock', cls: 'badge-oos' },
}

export default function ShelfZoneTable({ zones = [] }) {
  return (
    <div className="card">
      <h2 className="section-title">Shelf Zone Status</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-4 text-xs text-slate-400 font-display uppercase tracking-wider">
              <th className="pb-2 text-left">Shelf</th>
              <th className="pb-2 text-left">Aisle</th>
              <th className="pb-2 text-left">Status</th>
              <th className="pb-2 text-right">Items</th>
              <th className="pb-2 text-right">Fill %</th>
              <th className="pb-2 text-left pl-4">Coverage Bar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-4">
            {zones.map(z => {
              const meta = STATUS_META[z.status] ?? STATUS_META.OK
              return (
                <tr key={z.shelf_id} className="hover:bg-surface-3/30 transition-colors">
                  <td className="py-2.5 font-display font-medium text-white">{z.name}</td>
                  <td className="py-2.5 font-mono text-xs text-slate-400">{z.aisle}</td>
                  <td className="py-2.5">
                    <span className={clsx('px-2 py-0.5 rounded text-[11px] font-mono', meta.cls)}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono text-white">{z.count}</td>
                  <td className="py-2.5 text-right font-mono text-white">{z.fill_pct}%</td>
                  <td className="py-2.5 pl-4 w-40">
                    <div className="h-1.5 bg-surface-4 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all',
                          z.status === 'OK'           ? 'bg-accent-green'
                          : z.status === 'LOW_STOCK'  ? 'bg-accent-amber'
                          : 'bg-accent-red'
                        )}
                        style={{ width: `${Math.max(2, z.coverage * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
