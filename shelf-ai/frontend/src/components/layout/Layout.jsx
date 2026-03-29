import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Upload, BarChart3, History, Cpu, Activity } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getHealth } from '../../utils/api'
import clsx from 'clsx'

const NAV = [
  { to: '/',          icon: Upload,          label: 'Upload'    },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/results',   icon: BarChart3,       label: 'Results'   },
  { to: '/history',   icon: History,         label: 'History'   },
]

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const [apiStatus, setApiStatus] = useState('checking')

  useEffect(() => {
    getHealth()
      .then(({ data }) => setApiStatus(data.model_loaded ? 'ready' : 'loading'))
      .catch(() => setApiStatus('offline'))
    const t = setInterval(() => {
      getHealth()
        .then(({ data }) => setApiStatus(data.model_loaded ? 'ready' : 'loading'))
        .catch(() => setApiStatus('offline'))
    }, 15000)
    return () => clearInterval(t)
  }, [])

  const statusColor = {
    ready:    'bg-accent-green',
    loading:  'bg-accent-amber animate-pulse',
    checking: 'bg-slate-500 animate-pulse',
    offline:  'bg-accent-red',
  }[apiStatus]

  const statusText = {
    ready:    'Model Ready',
    loading:  'Loading Model…',
    checking: 'Connecting…',
    offline:  'API Offline',
  }[apiStatus]

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-surface-1 border-r border-surface-4 flex flex-col py-6 px-4 gap-2 fixed h-full z-40">
        {/* Logo */}
        <div className="mb-6 px-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-cyan flex items-center justify-center">
              <Cpu size={15} className="text-surface-0" />
            </div>
            <span className="font-display font-bold text-white text-lg tracking-tight">ShelfAI</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 px-0.5">Retail Intelligence</p>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = pathname === to
            return (
              <Link key={to} to={to}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display font-medium transition-all duration-150',
                  active
                    ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30'
                    : 'text-slate-400 hover:text-white hover:bg-surface-3'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* API Status */}
        <div className="mt-auto px-2 py-3 rounded-lg bg-surface-3 border border-surface-4">
          <div className="flex items-center gap-2">
            <Activity size={13} className="text-slate-400" />
            <span className="text-xs text-slate-400 font-mono">API Status</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={clsx('w-2 h-2 rounded-full', statusColor)} />
            <span className="text-xs text-slate-300">{statusText}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 min-h-screen bg-surface-0 grid-bg">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
