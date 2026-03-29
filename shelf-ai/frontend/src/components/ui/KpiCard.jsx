import clsx from 'clsx'

export default function KpiCard({ label, value, sub, accent = false, className }) {
  return (
    <div className={clsx('kpi-card', className)}>
      <span className="text-xs text-slate-400 font-display uppercase tracking-wider">{label}</span>
      <span className={clsx(
        'font-display font-bold text-2xl',
        accent ? 'text-accent-cyan' : 'text-white'
      )}>
        {value ?? '–'}
      </span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  )
}
