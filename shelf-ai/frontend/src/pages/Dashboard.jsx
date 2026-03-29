import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2, AlertCircle, UploadCloud, Cpu, Film, BarChart3, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

const STEPS = [
  { id: 'upload',    label: 'Uploading Images',         icon: UploadCloud },
  { id: 'zones',     label: 'Detecting Shelf Zones',    icon: Cpu         },
  { id: 'yolo',      label: 'Running YOLOv8m Pipeline', icon: Film        },
  { id: 'analytics', label: 'Computing Analytics',      icon: BarChart3   },
]

function getActiveStep(progress) {
  if (progress < 25)  return 0
  if (progress < 35)  return 1
  if (progress < 80)  return 2
  return 3
}

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const { stage, uploadPct, progress, error } = session

  useEffect(() => {
    if (stage === 'completed') navigate('/results')
  }, [stage, navigate])

  const isIdle = stage === 'idle'
  const activeStep = getActiveStep(
    stage === 'uploading' ? Math.round(uploadPct * 0.25)
    : stage === 'processing' ? progress
    : stage === 'completed' ? 100 : 0
  )

  if (isIdle) {
    return (
      <div className="fade-up flex flex-col items-center justify-center py-32 text-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-surface-4 flex items-center justify-center">
          <UploadCloud size={28} className="text-slate-500" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-xl text-white">No active session</h2>
          <p className="text-slate-400 mt-1 text-sm">Upload shelf images to start an analysis</p>
        </div>
        <button onClick={() => navigate('/')} className="btn-primary flex items-center gap-2">
          Go to Upload <ChevronRight size={15} />
        </button>
      </div>
    )
  }

  return (
    <div className="fade-up space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Processing Pipeline</h1>
        <p className="text-slate-400 text-sm mt-1">
          {stage === 'uploading'  && 'Uploading images to the backend…'}
          {stage === 'processing' && 'YOLOv8m is analysing your shelf sequence…'}
          {stage === 'error'      && 'An error occurred during processing.'}
        </p>
      </div>

      {/* Overall progress bar */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-display font-medium text-sm text-white">Overall Progress</span>
          <span className="font-mono text-sm text-accent-cyan">{progress}%</span>
        </div>
        <div className="h-2 bg-surface-4 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-cyan rounded-full transition-all duration-500 progress-pulse"
            style={{ width: `${stage === 'uploading' ? uploadPct * 0.25 : progress}%` }}
          />
        </div>
      </div>

      {/* Step tracker */}
      <div className="card">
        <h2 className="section-title">Pipeline Steps</h2>
        <div className="space-y-3">
          {STEPS.map(({ id, label, icon: Icon }, i) => {
            const done    = i < activeStep || stage === 'completed'
            const active  = i === activeStep && stage !== 'completed' && stage !== 'error'
            const pending = i > activeStep && stage !== 'completed'
            return (
              <div key={id} className={clsx(
                'flex items-center gap-4 p-3 rounded-lg border transition-colors',
                done   ? 'border-accent-green/30  bg-accent-green/5'
                : active ? 'border-accent-cyan/40 bg-accent-cyan/5'
                : 'border-surface-4 bg-surface-3/30'
              )}>
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  done   ? 'bg-accent-green/20'
                  : active ? 'bg-accent-cyan/20'
                  : 'bg-surface-4'
                )}>
                  {done
                    ? <CheckCircle2 size={16} className="text-accent-green" />
                    : active
                    ? <Loader2 size={16} className="text-accent-cyan animate-spin" />
                    : <Icon size={16} className="text-slate-500" />
                  }
                </div>
                <span className={clsx(
                  'font-display font-medium text-sm',
                  done   ? 'text-accent-green'
                  : active ? 'text-accent-cyan'
                  : 'text-slate-500'
                )}>
                  {label}
                </span>
                {active && (
                  <span className="ml-auto font-mono text-xs text-accent-cyan">{progress}%</span>
                )}
                {done && (
                  <span className="ml-auto font-mono text-xs text-accent-green">Done</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Error state */}
      {stage === 'error' && (
        <div className="card border-accent-red/40 bg-accent-red/5 flex gap-3">
          <AlertCircle size={20} className="text-accent-red shrink-0 mt-0.5" />
          <div>
            <p className="font-display font-semibold text-accent-red text-sm">Processing Error</p>
            <p className="text-slate-300 text-sm mt-1">{error}</p>
            <button onClick={session.reset} className="btn-ghost mt-3 text-sm">
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Log / info */}
      <div className="card">
        <h2 className="section-title">Processing Log</h2>
        <div className="bg-surface-1 rounded-lg p-4 font-mono text-xs text-slate-400 space-y-1.5 max-h-52 overflow-y-auto border border-surface-4">
          <p><span className="text-accent-cyan">→</span> Session: <span className="text-white">{session.sessionId ?? '–'}</span></p>
          <p><span className="text-accent-cyan">→</span> Model: YOLOv8m (COCO pretrained)</p>
          <p><span className="text-accent-cyan">→</span> Approach: Person detection + before/after product diff</p>
          <p><span className="text-accent-cyan">→</span> Output: annotated video + dashboard + CSV</p>
          {stage === 'processing' && <p className="text-accent-amber animate-pulse">⟳ Processing frames… {progress}%</p>}
          {stage === 'completed'  && <p className="text-accent-green">✓ Pipeline complete — redirecting to results</p>}
          {stage === 'error'      && <p className="text-accent-red">✗ Error: {error}</p>}
        </div>
      </div>
    </div>
  )
}
