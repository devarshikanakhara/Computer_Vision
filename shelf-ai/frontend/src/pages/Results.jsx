import { useNavigate } from 'react-router-dom'
import {
  Download, RefreshCw, Video, ImageIcon,
  TrendingUp, Users, Package, Zap, Target, Activity,
} from 'lucide-react'
import KpiCard           from '../components/ui/KpiCard'
import ShelfZoneTable    from '../components/ui/ShelfZoneTable'
import CustomerEventsTable from '../components/ui/CustomerEventsTable'
import StockChart        from '../components/ui/StockChart'
import FpsDetChart       from '../components/ui/FpsDetChart'
import ClassCountChart   from '../components/ui/ClassCountChart'
import { downloadCSV, downloadVideo } from '../utils/api'

const API_BASE = 'http://localhost:8000'

function imgUrl(path) {
  if (!path) return null
  return path.startsWith('http') ? path : `${API_BASE}${path}`
}

export default function Results({ session }) {
  const navigate = useNavigate()
  const { results, sessionId, reset } = session

  if (!results) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-slate-400">No results available.</p>
      </div>
    )
  }

  const m  = results.metrics ?? {}
  const zones    = results.shelf_zones    ?? []
  const events   = results.customer_events ?? []
  const stockH   = results.stock_history  ?? {}
  const classC   = results.class_counts   ?? {}
  const fpsH     = results.fps_history    ?? []
  const detH     = results.det_history    ?? []

  const nOos = zones.filter(z => z.status === 'OUT_OF_STOCK').length
  const nLow = zones.filter(z => z.status === 'LOW_STOCK').length

  return (
    <div className="fade-up space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Analysis Results</h1>
          <p className="text-slate-400 text-sm mt-1 font-mono">{sessionId}</p>
        </div>
        <div className="flex gap-2">
          <a href={downloadCSV(sessionId)} download className="btn-ghost flex items-center gap-2 text-sm">
            <Download size={14} /> CSV
          </a>
          <a href={downloadVideo(sessionId)} download className="btn-ghost flex items-center gap-2 text-sm">
            <Video size={14} /> Video
          </a>
          <button onClick={() => { reset(); navigate('/') }} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> New Analysis
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Avg FPS"          value={m.avg_fps}           sub="YOLOv8m inference speed" accent />
        <KpiCard label="Total Frames"     value={m.total_frames}      sub="Processed" />
        <KpiCard label="Total Detections" value={m.total_detections}  sub="Across all frames" />
        <KpiCard label="Avg Dets / Frame" value={m.avg_dets_frame}    sub="Products per frame" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Precision"     value={`${((m.precision ?? 0)*100).toFixed(1)}%`} accent />
        <KpiCard label="Recall"        value={`${((m.recall    ?? 0)*100).toFixed(1)}%`} />
        <KpiCard label="F1 Score"      value={`${((m.f1_score  ?? 0)*100).toFixed(1)}%`} />
        <KpiCard label="mAP@0.5"       value={`${((m.map_at_0_5 ?? 0)*100).toFixed(1)}%`} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Customer Visits"   value={m.customer_visits}   sub="Detected sessions" accent />
        <KpiCard label="Items Taken"       value={m.total_items_taken} sub="Total across visits" />
        <KpiCard label="Out-of-Stock"      value={nOos}                sub={`of ${zones.length} shelves`} />
        <KpiCard label="Low Stock"         value={nLow}                sub={`of ${zones.length} shelves`} />
      </div>

      {/* TP/FP/FN */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Target size={16} className="text-accent-cyan" />
          Detection Breakdown
        </h2>
        <div className="flex gap-6">
          <div className="text-center">
            <p className="font-display font-bold text-2xl text-accent-green">{m.tp}</p>
            <p className="text-xs text-slate-400 mt-0.5">True Positives</p>
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-2xl text-accent-amber">{m.fp}</p>
            <p className="text-xs text-slate-400 mt-0.5">False Positives</p>
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-2xl text-accent-red">{m.fn}</p>
            <p className="text-xs text-slate-400 mt-0.5">False Negatives</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <StockChart stockHistory={stockH} />
      <div className="grid md:grid-cols-2 gap-4">
        <FpsDetChart   fpsHistory={fpsH} detHistory={detH} />
        <ClassCountChart classCounts={classC} />
      </div>

      {/* Shelf zone table */}
      <ShelfZoneTable zones={zones} />

      {/* Customer events */}
      <CustomerEventsTable events={events} />

      {/* Output images */}
      <div className="space-y-4">
        <h2 className="section-title flex items-center gap-2">
          <ImageIcon size={16} className="text-accent-cyan" />
          Generated Outputs
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {results.dashboard_url && (
            <div className="card space-y-2">
              <p className="font-display font-medium text-sm text-white">Analytics Dashboard</p>
              <img src={imgUrl(results.dashboard_url)} alt="Dashboard"
                className="rounded-lg w-full border border-surface-4" />
              <a href={imgUrl(results.dashboard_url)} download className="btn-ghost text-xs flex items-center gap-1.5 w-fit">
                <Download size={12} /> Download PNG
              </a>
            </div>
          )}
          {results.preview_url && (
            <div className="card space-y-2">
              <p className="font-display font-medium text-sm text-white">Video Frame Preview</p>
              <img src={imgUrl(results.preview_url)} alt="Preview"
                className="rounded-lg w-full border border-surface-4" />
              <a href={imgUrl(results.preview_url)} download className="btn-ghost text-xs flex items-center gap-1.5 w-fit">
                <Download size={12} /> Download PNG
              </a>
            </div>
          )}
        </div>
        {results.chart_url && (
          <div className="card space-y-2">
            <p className="font-display font-medium text-sm text-white">Customer Take Chart</p>
            <img src={imgUrl(results.chart_url)} alt="Customer chart"
              className="rounded-lg border border-surface-4 max-w-lg" />
          </div>
        )}
      </div>

      {/* Output video player */}
      {results.output_video_url && (
        <div className="card space-y-3">
          <h2 className="section-title flex items-center gap-2">
            <Video size={16} className="text-accent-cyan" />
            Annotated Output Video
          </h2>
          <video
            controls
            className="w-full rounded-lg border border-surface-4 bg-surface-1"
            src={imgUrl(results.output_video_url)}
          />
          <a href={downloadVideo(sessionId)} download className="btn-ghost text-sm flex items-center gap-2 w-fit">
            <Download size={14} /> Download Video
          </a>
        </div>
      )}
    </div>
  )
}
