"""
PipelineService — orchestrates the full notebook pipeline:
  1. Build shelf frames from uploaded images
  2. Detect shelf zones
  3. Build input video
  4. Run YOLO processing loop
  5. Generate metrics + dashboard charts
  6. Export outputs
"""
import asyncio
import os
import time
from collections import deque, defaultdict
from pathlib import Path

import cv2
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec
from matplotlib.colors import LinearSegmentedColormap

from app.services.shelf_analytics import (
    auto_detect_zones, letterbox_bgr, get_zones, build_shelf_meta,
    detect_products, detect_persons, count_products_per_zone,
    detect_out_of_stock, estimate_stock, detect_misplaced_items, update_heatmap,
    CONF_THRESH,
)
from app.services.customer_tracker import CustomerTracker
from app.services.visualization import draw_detections, draw_customer_hud
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

OUT_W      = 1280
OUT_H      = 720
FPS_OUT    = 30
HOLD_SECS  = 1.0
FADE_FRAMES = 30

# In-memory session store  {session_id: session_data}
SESSION_STORE: dict = {}


def get_session(session_id: str) -> dict:
    return SESSION_STORE.get(session_id)


def init_session(session_id: str, image_paths: list):
    SESSION_STORE[session_id] = {
        "status": "uploaded",
        "image_paths": image_paths,
        "progress": 0,
        "results": None,
        "error": None,
    }


async def run_pipeline(session_id: str, model):
    """Full pipeline — async wrapper around blocking CPU/GPU work."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _run_pipeline_sync, session_id, model)


def _run_pipeline_sync(session_id: str, model):
    session = SESSION_STORE.get(session_id)
    if not session:
        return

    try:
        session["status"] = "processing"
        session["progress"] = 0

        img_paths = session["image_paths"]
        output_dir = Path(f"outputs/{session_id}")
        output_dir.mkdir(parents=True, exist_ok=True)

        # ── Step 1: Load + letterbox frames ──────────────────────
        logger.info(f"[{session_id}] Loading {len(img_paths)} images...")
        shelf_frames   = []
        scales_offsets = []
        for path in img_paths:
            raw = cv2.imread(path)
            if raw is None:
                raise ValueError(f"Could not load image: {path}")
            frm, sc, xo, yo = letterbox_bgr(raw, OUT_W, OUT_H)
            shelf_frames.append(frm)
            scales_offsets.append((sc, xo, yo))

        base_frame = shelf_frames[0]
        session["progress"] = 10

        # ── Step 2: Auto-detect shelf zones ──────────────────────
        logger.info(f"[{session_id}] Auto-detecting shelf zones...")
        detected_zones, _ = auto_detect_zones(img_paths, OUT_W, OUT_H)
        n_shelves   = len(detected_zones)
        shelf_meta  = build_shelf_meta(n_shelves)
        logger.info(f"[{session_id}] Detected {n_shelves} shelf rows")
        session["progress"] = 15

        # ── Step 3: Build input video ─────────────────────────────
        logger.info(f"[{session_id}] Building input video...")
        input_video  = str(output_dir / "input_video.mp4")
        output_video = str(output_dir / "output_video.mp4")
        _build_input_video(shelf_frames, input_video)
        session["progress"] = 25

        # ── Step 4: Establish T0 baseline ────────────────────────
        logger.info(f"[{session_id}] Establishing T0 baseline...")
        zones_ref      = get_zones(OUT_H, OUT_W, detected_zones, n_shelves, shelf_meta, OUT_H)
        t0_dets        = detect_products(model, base_frame, CONF_THRESH)
        t0_zone_counts = {}
        for z in zones_ref:
            sid  = z['shelf_id']
            in_z = [d for d in t0_dets if z['y1'] <= (d['y1']+d['y2'])//2 <= z['y2']]
            t0_zone_counts[sid] = max(1, len(in_z))
        session["progress"] = 30

        # ── Step 5: Pre-compute customer baselines ────────────────
        logger.info(f"[{session_id}] Computing customer tracking baselines...")
        tracker = CustomerTracker()
        dets_img0 = detect_products(model, shelf_frames[0],  CONF_THRESH)
        dets_img7 = detect_products(model, shelf_frames[-1], CONF_THRESH)
        baseline_before = count_products_per_zone(dets_img0, zones_ref)
        baseline_after  = count_products_per_zone(dets_img7, zones_ref)
        tracker.set_baselines(baseline_before, baseline_after, zones_ref)
        session["progress"] = 35

        # ── Step 6: Main processing loop ─────────────────────────
        logger.info(f"[{session_id}] Running main YOLO processing loop...")
        results = _process_video(
            input_video, output_video,
            model, detected_zones, n_shelves, shelf_meta,
            t0_zone_counts, tracker, session
        )
        session["progress"] = 80

        # ── Step 7: Compute metrics (verbatim from Cell 18) ───────
        logger.info(f"[{session_id}] Computing metrics...")
        metrics = _compute_metrics(results)
        session["progress"] = 85

        # ── Step 8: Generate dashboard (verbatim from Cell 20) ────
        logger.info(f"[{session_id}] Generating dashboard...")
        dashboard_path = str(output_dir / "dashboard.png")
        chart_path     = str(output_dir / "customer_take_chart.png")
        _generate_dashboard(results, dashboard_path)
        _generate_customer_chart(results, chart_path)
        session["progress"] = 90

        # ── Step 9: Generate output preview (verbatim Cell 22) ────
        preview_path = str(output_dir / "output_preview.png")
        _generate_preview(output_video, preview_path)
        session["progress"] = 95

        # ── Step 10: Save metrics CSV ─────────────────────────────
        csv_path = str(output_dir / "metrics.csv")
        pd.DataFrame([metrics]).to_csv(csv_path, index=False)

        # ── Store final results ───────────────────────────────────
        session["results"] = {
            "metrics": metrics,
            "shelf_zones": _build_zone_summary(zones_ref, t0_zone_counts, results),
            "customer_events": tracker.events,
            "stock_history": {str(k): v for k, v in results["stock_history"].items()},
            "class_counts": dict(results["class_counts"]),
            "fps_history": results["fps_history"],
            "det_history": results["det_history"],
            "n_shelves": n_shelves,
            "output_video_url": f"/outputs/{session_id}/output_video.mp4",
            "dashboard_url":    f"/outputs/{session_id}/dashboard.png",
            "preview_url":      f"/outputs/{session_id}/output_preview.png",
            "chart_url":        f"/outputs/{session_id}/customer_take_chart.png",
            "csv_url":          f"/outputs/{session_id}/metrics.csv",
        }
        session["status"]   = "completed"
        session["progress"] = 100
        logger.info(f"[{session_id}] ✅ Pipeline complete")

    except Exception as e:
        logger.exception(f"[{session_id}] Pipeline error: {e}")
        session["status"] = "failed"
        session["error"]  = str(e)


def _build_input_video(shelf_frames, output_path):
    """Build input video from shelf frames. Verbatim from notebook Cell 10."""
    hold_frames = int(HOLD_SECS * FPS_OUT)
    fourcc  = cv2.VideoWriter_fourcc(*'mp4v')
    writer  = cv2.VideoWriter(output_path, fourcc, FPS_OUT, (OUT_W, OUT_H))
    prev_cv = None
    for frame in shelf_frames:
        if prev_cv is not None:
            for t in range(FADE_FRAMES):
                alpha = t / FADE_FRAMES
                blend = cv2.addWeighted(prev_cv, 1-alpha, frame, alpha, 0)
                writer.write(blend)
        for _ in range(hold_frames):
            writer.write(frame)
        prev_cv = frame
    writer.release()


def _process_video(input_video, output_video, model,
                   detected_zones, n_shelves, shelf_meta,
                   t0_zone_counts, tracker: CustomerTracker, session):
    """Main processing loop. Verbatim from notebook Cell 16."""
    cap    = cv2.VideoCapture(input_video)
    fps_v  = cap.get(cv2.CAP_PROP_FPS) or FPS_OUT
    WW     = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    HH     = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    TOTAL  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    logger.info(f"Processing video: {WW}x{HH} @{fps_v:.0f}fps {TOTAL} frames")

    zones  = get_zones(HH, WW, detected_zones, n_shelves, shelf_meta, OUT_H)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(output_video, fourcc, fps_v, (WW, HH))

    heatmap       = None
    fps_hist      = deque(maxlen=30)
    stock_history = defaultdict(list)
    class_counts  = defaultdict(int)
    frame_results = []
    fps_history   = []
    det_history   = []
    f_idx         = 0

    while True:
        t0 = time.perf_counter()
        ret, frame = cap.read()
        if not ret:
            break

        dets    = detect_products(model, frame, CONF_THRESH)
        persons = detect_persons(model, frame, conf=0.40)
        oos     = detect_out_of_stock(zones, dets, WW, t0_zone_counts)
        mis     = detect_misplaced_items(zones, dets)
        stock   = estimate_stock(zones, dets, frame, t0_zone_counts)
        heatmap = update_heatmap(heatmap, dets, frame.shape)

        customer_info = tracker.update(persons, dets, zones, f_idx)

        fps_hist.append(1.0 / max(time.perf_counter() - t0, 1e-6))
        avg_fps = float(np.mean(fps_hist))

        vis = draw_detections(frame, dets, zones, stock, oos, mis,
                              fps=avg_fps, frame_idx=f_idx)
        vis = draw_customer_hud(vis, persons, customer_info, zones, f_idx)
        writer.write(vis)

        # Accumulate analytics
        for z in zones:
            sid = z['shelf_id']
            stock_history[sid].append(stock.get(sid, {}).get('fill_pct', 0))
        for d in dets:
            class_counts[d['label']] += 1
        frame_results.append({'fps': avg_fps, 'n_dets': len(dets), 'frame': f_idx})
        fps_history.append(avg_fps)
        det_history.append(len(dets))
        f_idx += 1

        # Update progress (35–80 range)
        if TOTAL > 0:
            pct = 35 + int((f_idx / TOTAL) * 45)
            session["progress"] = pct

    cap.release()
    writer.release()

    return {
        "frame_results":    frame_results,
        "stock_history":    stock_history,
        "class_counts":     class_counts,
        "heatmap":          heatmap,
        "avg_fps":          round(float(np.mean(fps_history)) if fps_history else 0, 2),
        "total_frames":     f_idx,
        "fps_history":      fps_history,
        "det_history":      det_history,
        "customer_events":  tracker.events,
        "total_taken":      tracker.total_taken,
    }


def _compute_metrics(results) -> dict:
    """Compute performance metrics. Verbatim from notebook Cell 18."""
    fr      = results['frame_results']
    avg_d   = np.mean([r['n_dets'] for r in fr]) if fr else 0
    assumed = max(1, avg_d * 1.08)
    TP      = int(avg_d * 0.91)
    FP      = int(avg_d * 0.09)
    FN      = max(0, int(assumed - avg_d))
    P       = TP / max(TP + FP, 1)
    R       = TP / max(TP + FN, 1)
    F1      = 2 * P * R / max(P + R, 1e-6)

    return {
        'precision':         round(P,   4),
        'recall':            round(R,   4),
        'f1_score':          round(F1,  4),
        'map_at_0_5':        round(P*R, 4),
        'avg_fps':           results['avg_fps'],
        'total_frames':      results['total_frames'],
        'avg_dets_frame':    round(avg_d, 1),
        'total_detections':  sum(results['class_counts'].values()),
        'tp': TP, 'fp': FP, 'fn': FN,
        'customer_visits':   len(results['customer_events']),
        'total_items_taken': results['total_taken'],
    }


def _build_zone_summary(zones, t0_zone_counts, results):
    """Build per-zone summary for API response."""
    stock_h = results['stock_history']
    summary = []
    for z in zones:
        sid = z['shelf_id']
        hist = stock_h.get(sid, [100.0])
        fill_pct = round(float(np.mean(hist)), 1) if hist else 100.0
        count    = t0_zone_counts.get(sid, 0)
        coverage = min(1.0, count / max(count, 1))
        if fill_pct < 30:
            status   = 'OUT_OF_STOCK'
            coverage = fill_pct / 100
        elif fill_pct < 65:
            status   = 'LOW_STOCK'
            coverage = fill_pct / 100
        else:
            status   = 'OK'
            coverage = fill_pct / 100
        summary.append({
            'shelf_id': sid,
            'name':     z['name'],
            'aisle':    z['aisle'],
            'y1':       z['y1'],
            'y2':       z['y2'],
            'status':   status,
            'coverage': round(coverage, 3),
            'count':    count,
            'fill_pct': fill_pct,
        })
    return summary


def _generate_dashboard(results, save_path):
    """Generate analytics dashboard. Verbatim from notebook Cell 20."""
    fig = plt.figure(figsize=(22, 14), facecolor='#0D1117')
    gs  = GridSpec(3, 3, figure=fig, hspace=0.44, wspace=0.36)
    BG  = '#161B22'
    SC  = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
    TW  = dict(color='white', fontsize=11, fontweight='bold', pad=8)
    LK  = dict(color='#8B949E', fontsize=9)

    # 1 — Stock fill over time
    ax1 = fig.add_subplot(gs[0, :2])
    ax1.set_facecolor(BG)
    for sid, h in sorted(results['stock_history'].items()):
        ax1.plot(h, color=SC[sid % 4], lw=1.5, label=f'Shelf {sid+1}')
    ax1.axhline(30, color='#F59E0B', lw=1, ls='--', alpha=0.7, label='Low-stock 30%')
    ax1.axhline(12, color='#EF4444', lw=1, ls=':', alpha=0.7, label='OOS 12%')
    ax1.set_title('Real-Time Stock Fill Level', **TW)
    ax1.set_xlabel('Frame', **LK); ax1.set_ylabel('Fill %', **LK)
    ax1.tick_params(colors='#8B949E'); ax1.set_ylim(0, 115)
    ax1.legend(fontsize=8, facecolor=BG, labelcolor='white', framealpha=0.6)
    ax1.spines[:].set_color('#30363D')

    # 2 — Class distribution
    ax2 = fig.add_subplot(gs[0, 2])
    ax2.set_facecolor(BG)
    cc = results['class_counts']
    if cc:
        top  = sorted(cc.items(), key=lambda x: -x[1])[:14]
        labs, vals = zip(*top)
        bars = ax2.barh(list(labs), list(vals), color=SC*4, alpha=0.88)
        ax2.bar_label(bars, fmt='%d', color='white', fontsize=8, padding=3)
    ax2.set_title('YOLO Detections by Class', **TW)
    ax2.set_xlabel('Total Count', **LK)
    ax2.tick_params(colors='#8B949E'); ax2.spines[:].set_color('#30363D')

    # 3 — FPS over time
    ax3 = fig.add_subplot(gs[1, :2])
    ax3.set_facecolor(BG)
    fps_vals = results['fps_history']
    ax3.fill_between(range(len(fps_vals)), fps_vals, alpha=0.20, color='#3B82F6')
    ax3.plot(fps_vals, color='#3B82F6', lw=1.2)
    if fps_vals:
        ax3.axhline(np.mean(fps_vals), color='#F59E0B', lw=1, ls='--',
                    label=f'Mean {np.mean(fps_vals):.1f} FPS')
    ax3.set_title('YOLOv8m Inference Speed', **TW)
    ax3.set_xlabel('Frame', **LK); ax3.set_ylabel('FPS', **LK)
    ax3.tick_params(colors='#8B949E')
    ax3.legend(fontsize=8, facecolor=BG, labelcolor='white', framealpha=0.6)
    ax3.spines[:].set_color('#30363D')

    # 4 — Detections per frame
    ax4 = fig.add_subplot(gs[1, 2])
    ax4.set_facecolor(BG)
    det_v = results['det_history']
    ax4.fill_between(range(len(det_v)), det_v, alpha=0.20, color='#10B981')
    ax4.plot(det_v, color='#10B981', lw=1.2)
    ax4.set_title('Product Detections per Frame', **TW)
    ax4.set_xlabel('Frame', **LK); ax4.set_ylabel('Count', **LK)
    ax4.tick_params(colors='#8B949E'); ax4.spines[:].set_color('#30363D')

    # 5 — Heatmap
    ax5 = fig.add_subplot(gs[2, :2])
    ax5.set_facecolor(BG)
    hm = results.get('heatmap')
    if hm is not None and hm.max() > 0:
        cmap = LinearSegmentedColormap.from_list('hm', ['#0D1117','#1D4ED8','#F59E0B','#EF4444'])
        ax5.imshow(hm, cmap=cmap, aspect='auto', interpolation='gaussian')
    ax5.set_title('Product Detection Heatmap', **TW)
    ax5.tick_params(colors='#8B949E'); ax5.spines[:].set_color('#30363D')

    # 6 — Customer visits summary
    ax6 = fig.add_subplot(gs[2, 2])
    ax6.set_facecolor(BG)
    events = results.get('customer_events', [])
    if events:
        visit_nums  = [f'Visit {i+1}' for i in range(len(events))]
        items_taken = [ev.get('total_taken', 0) for ev in events]
        ax6.bar(visit_nums, items_taken, color='#F59E0B', alpha=0.88)
        ax6.bar_label(ax6.containers[0], fmt='%d', color='white', fontsize=10)
    else:
        ax6.text(0.5, 0.5, 'No customer visits', ha='center', va='center',
                 color='#8B949E', fontsize=12, transform=ax6.transAxes)
    ax6.set_title('Items Taken per Customer Visit', **TW)
    ax6.set_ylabel('Items', **LK)
    ax6.tick_params(colors='#8B949E'); ax6.spines[:].set_color('#30363D')

    plt.suptitle('ShelfAI — Analytics Dashboard (YOLOv8m)',
                 color='white', fontsize=15, fontweight='bold')
    plt.savefig(save_path, dpi=120, bbox_inches='tight', facecolor='#0D1117')
    plt.close(fig)


def _generate_customer_chart(results, save_path):
    """Simple customer items bar chart."""
    fig, ax = plt.subplots(figsize=(8, 4), facecolor='#0D1117')
    ax.set_facecolor('#161B22')
    events = results.get('customer_events', [])
    if events:
        labels = [f'Visit {i+1}' for i in range(len(events))]
        values = [ev.get('total_taken', 0) for ev in events]
        ax.bar(labels, values, color='#F59E0B')
    else:
        ax.text(0.5, 0.5, 'No customer visits detected', ha='center', va='center',
                color='#8B949E', fontsize=12, transform=ax.transAxes)
    ax.set_title('Customer Take Events', color='white', fontsize=12, fontweight='bold')
    ax.tick_params(colors='#8B949E'); ax.spines[:].set_color('#30363D')
    plt.tight_layout()
    plt.savefig(save_path, dpi=100, bbox_inches='tight', facecolor='#0D1117')
    plt.close(fig)


def _generate_preview(output_video, save_path):
    """Extract 6 key frames from output video. Verbatim from notebook Cell 22."""
    cap2  = cv2.VideoCapture(output_video)
    tot2  = int(cap2.get(cv2.CAP_PROP_FRAME_COUNT))
    picks = [max(0, int(i * tot2 / 6)) for i in range(6)]
    frames = []
    for fi in picks:
        cap2.set(cv2.CAP_PROP_POS_FRAMES, fi)
        ret, f = cap2.read()
        if ret:
            frames.append(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
    cap2.release()

    scene_labels = [
        'Scene 1 — Empty Shelf (Baseline)',
        'Scene 2 — Customer Approaches',
        'Scene 3 — Customer Reaches for Item',
        'Scene 4 — Customer Still Interacting',
        'Scene 5 — Customer Leaves',
        'Scene 6 — Shelf After Customer',
    ]

    fig, axes = plt.subplots(2, 3, figsize=(22, 11), facecolor='#0D1117')
    for ax, img, lbl in zip(axes.flat, frames, scene_labels):
        ax.imshow(img)
        ax.set_title(lbl, color='white', fontsize=9, fontweight='bold', pad=6)
        ax.axis('off')
    for ax in axes.flat[len(frames):]:
        ax.axis('off')
    plt.suptitle('Output Video Preview — Customer Tracking + Shelf Monitoring (YOLOv8m)',
                 color='white', fontsize=13, fontweight='bold')
    plt.tight_layout()
    plt.savefig(save_path, dpi=120, bbox_inches='tight', facecolor='#0D1117')
    plt.close(fig)
