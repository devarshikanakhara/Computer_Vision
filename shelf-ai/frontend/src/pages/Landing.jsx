import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { Upload, ImagePlus, X, ChevronRight, ShieldCheck, Zap, Eye } from 'lucide-react'
import clsx from 'clsx'

const FEATURES = [
  { icon: Zap,        title: 'YOLOv8m Detection',    desc: 'Real-time product & person detection on every frame' },
  { icon: Eye,        title: 'Customer Tracking',     desc: 'State-machine entry/exit with item-take counting'    },
  { icon: ShieldCheck,title: 'OOS Alerts',            desc: 'Auto-flagged Out-of-Stock & Low-Stock shelf zones'   },
]

export default function Landing({ session }) {
  const navigate = useNavigate()
  const [files, setFiles]     = useState([])
  const [previews, setPreviews] = useState([])

  const onDrop = useCallback((accepted) => {
    if (accepted.length + files.length > 8) {
      accepted = accepted.slice(0, 8 - files.length)
    }
    const newFiles    = [...files, ...accepted]
    const newPreviews = newFiles.map(f => URL.createObjectURL(f))
    setFiles(newFiles)
    setPreviews(newPreviews)
  }, [files])

  const remove = (idx) => {
    setFiles(f  => f.filter((_,i) => i !== idx))
    setPreviews(p => p.filter((_,i) => i !== idx))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg','.jpeg','.png','.webp'] },
    multiple: true,
  })

  const handleAnalyse = async () => {
    if (files.length < 2) return
    navigate('/dashboard')
    await session.upload(files)
    if (session.stage === 'completed' || session.stage === 'processing') {
      navigate('/dashboard')
    }
  }

  return (
    <div className="fade-up space-y-10">
      {/* Hero */}
      <div className="text-center pt-4 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-xs font-mono mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
          YOLOv8m · COCO · Real-time
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white leading-tight">
          Retail Shelf Intelligence<br />
          <span className="text-accent-cyan">Powered by Computer Vision</span>
        </h1>
        <p className="mt-4 text-slate-400 max-w-xl mx-auto text-base leading-relaxed">
          Upload 2–8 sequential shelf images. ShelfAI detects out-of-stock zones,
          tracks customer interactions, and delivers actionable metrics in seconds.
        </p>
      </div>

      {/* Feature pills */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card flex gap-3 items-start hover:border-accent-cyan/30 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 flex items-center justify-center shrink-0">
              <Icon size={15} className="text-accent-cyan" />
            </div>
            <div>
              <p className="font-display font-semibold text-sm text-white">{title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <div className="card space-y-4">
        <h2 className="section-title flex items-center gap-2">
          <ImagePlus size={18} className="text-accent-cyan" />
          Upload Shelf Images
        </h2>
        <p className="text-sm text-slate-400 -mt-2">
          Upload <strong className="text-white">2–8 images</strong> in sequence: empty shelf → customer present → empty shelf.
        </p>

        <div
          {...getRootProps()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200',
            isDragActive
              ? 'border-accent-cyan bg-accent-cyan/5'
              : 'border-surface-4 hover:border-accent-cyan/50 hover:bg-surface-3/30'
          )}
        >
          <input {...getInputProps()} />
          <Upload size={32} className={clsx('mx-auto mb-3', isDragActive ? 'text-accent-cyan' : 'text-slate-500')} />
          <p className="font-display font-medium text-white">
            {isDragActive ? 'Drop images here…' : 'Drag & drop images, or click to browse'}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">JPG, PNG, WEBP · Max 8 images</p>
        </div>

        {/* Preview grid */}
        {previews.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-surface-4 aspect-video bg-surface-3">
                <img src={src} alt={`shelf-${i+1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-surface-0/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <button onClick={() => remove(i)}
                    className="w-7 h-7 rounded-full bg-accent-red flex items-center justify-center">
                    <X size={13} />
                  </button>
                </div>
                <span className="absolute bottom-1 left-1 text-[10px] bg-surface-0/80 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                  T{i}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-slate-400">
            {files.length} / 8 images selected
            {files.length < 2 && <span className="text-accent-amber ml-2">· Minimum 2 required</span>}
          </span>
          <button
            onClick={handleAnalyse}
            disabled={files.length < 2 || session.stage === 'uploading' || session.stage === 'processing'}
            className="btn-primary flex items-center gap-2"
          >
            Analyse Shelf
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
