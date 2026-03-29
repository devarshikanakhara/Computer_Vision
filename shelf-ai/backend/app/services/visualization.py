"""
VisualizationService — draw_detections + draw_customer_hud.
Logic extracted verbatim from notebook Cell 14.
"""
import cv2
import numpy as np

CLR_OK   = ( 50, 220,  50)
CLR_OOS  = (  0,  40, 220)
CLR_LOW  = (  0, 165, 255)
CLR_MIS  = (220,   0, 220)
CLR_BOX  = (  0, 210, 255)
CLR_CONF = (255, 200,   0)


def _corner_box(img, x1, y1, x2, y2, clr, thick=2, L=18):
    """Draw stylish corner-bracket detection marker. Verbatim."""
    corners = [
        ((x1, y1), ( 1,  1)),
        ((x2, y1), (-1,  1)),
        ((x1, y2), ( 1, -1)),
        ((x2, y2), (-1, -1)),
    ]
    for (cx, cy), (dx, dy) in corners:
        cv2.line(img, (cx, cy), (cx + dx*L, cy),       clr, thick)
        cv2.line(img, (cx, cy), (cx,        cy + dy*L), clr, thick)
    cv2.rectangle(img, (x1, y1), (x2, y2),
                  tuple(c // 4 for c in clr), 1)


def _dashed_rect(img, x1, y1, x2, y2, clr, thick=2, gap=18):
    """Draw a dashed rectangle border. Verbatim."""
    for x in range(x1, x2, gap*2):
        cv2.line(img, (x, y1), (min(x+gap, x2), y1), clr, thick)
        cv2.line(img, (x, y2), (min(x+gap, x2), y2), clr, thick)
    for y in range(y1, y2, gap*2):
        cv2.line(img, (x1, y), (x1, min(y+gap, y2)), clr, thick)
        cv2.line(img, (x2, y), (x2, min(y+gap, y2)), clr, thick)


def _label_pill(img, text, x, y, bg_clr):
    """Draw a filled label pill above a detection box. Verbatim."""
    fs   = 0.38
    font = cv2.FONT_HERSHEY_SIMPLEX
    (tw, th), _ = cv2.getTextSize(text, font, fs, 1)
    pad  = 4
    cv2.rectangle(img, (x, y-th-pad*2), (x+tw+pad*2, y), bg_clr, -1)
    cv2.putText(img, text, (x+pad, y-pad), font, fs, (0,0,0),     2, cv2.LINE_AA)
    cv2.putText(img, text, (x+pad, y-pad), font, fs, (255,255,255), 1, cv2.LINE_AA)


def draw_detections(frame, dets, zones, stock, oos_info,
                    misplaced_idx, fps=0.0, frame_idx=0):
    """
    Draw the complete CCTV monitoring overlay on a real shelf frame.
    Verbatim from notebook Cell 14.
    """
    vis = frame.copy()
    H, W = vis.shape[:2]
    mis  = set(misplaced_idx)

    BADGE_TEXT = {
        'OK':           '✓ IN STOCK',
        'LOW_STOCK':    '⚠ LOW STOCK',
        'OUT_OF_STOCK': '✗ OUT OF STOCK',
    }

    for z in zones:
        sid  = z['shelf_id']
        info = oos_info.get(sid, {})
        st   = info.get('status', 'OK')
        cov  = info.get('coverage', 0.0)
        cnt  = info.get('count', 0)
        clr  = (CLR_OOS if st == 'OUT_OF_STOCK'
                else CLR_LOW if st == 'LOW_STOCK'
                else CLR_OK)

        # 1. Zone tint
        if st != 'OK':
            overlay = vis.copy()
            alpha   = 0.08 if st == 'LOW_STOCK' else 0.14
            cv2.rectangle(overlay, (0, z['y1']), (W, z['y2']), clr, -1)
            cv2.addWeighted(overlay, alpha, vis, 1-alpha, 0, vis)

        # 2. Dashed zone border
        _dashed_rect(vis, 0, z['y1'], W-1, z['y2'], clr, thick=1, gap=14)

        # 3. Left info panel
        px, py = 6, z['y1']+4
        badge  = BADGE_TEXT.get(st, st)
        (bw, bh), _ = cv2.getTextSize(badge, cv2.FONT_HERSHEY_SIMPLEX, 0.40, 1)
        panel_w = max(bw+12, 160)
        panel_h = 58
        cv2.rectangle(vis, (px, py), (px+panel_w, py+panel_h),
                      (10,10,10), -1)
        cv2.rectangle(vis, (px, py), (px+panel_w, py+panel_h),
                      clr, 1)
        # Status badge strip
        cv2.rectangle(vis, (px, py), (px+panel_w, py+16), clr, -1)
        cv2.putText(vis, badge, (px+4, py+12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0,0,0), 1, cv2.LINE_AA)
        # Aisle + count
        cv2.putText(vis, f"{z['aisle']}  {z['name']}", (px+4, py+28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.33, (200,200,200), 1, cv2.LINE_AA)
        cv2.putText(vis, f"Items:{cnt}  Cov:{cov*100:.0f}%", (px+4, py+42),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.33, (180,180,180), 1, cv2.LINE_AA)
        # Coverage bar
        bar_x, bar_y = px+4, py+50
        bar_w = panel_w-8
        cv2.rectangle(vis, (bar_x, bar_y), (bar_x+bar_w, bar_y+5),
                      (40,40,40), -1)
        filled = max(2, int(bar_w * cov))
        cv2.rectangle(vis, (bar_x, bar_y), (bar_x+filled, bar_y+5),
                      clr, -1)

    # 4. Per-detection corner brackets + labels
    for idx, d in enumerate(dets):
        clr_box = CLR_MIS if idx in mis else CLR_BOX
        _corner_box(vis, d['x1'], d['y1'], d['x2'], d['y2'], clr_box)
        lbl = f"{d['label']} {d['conf']:.2f}"
        _label_pill(vis, lbl, d['x1'], d['y1'], clr_box)

    # 5. CCTV scan line
    scan_y = int((frame_idx * 3) % H)
    cv2.line(vis, (0, scan_y), (W, scan_y), (0,255,0), 1)
    cv2.line(vis, (0, min(scan_y+1,H-1)), (W, min(scan_y+1,H-1)),
             (0,120,0), 1)

    # 6. Top header bar
    cv2.rectangle(vis, (0,0), (W,28), (8,8,8), -1)
    cv2.putText(vis, "■ SHELF MONITOR — YOLOv8m", (6,20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.50, (0,220,0), 1, cv2.LINE_AA)
    cv2.putText(vis, f"FPS:{fps:.1f}  FRAME:{frame_idx}", (W-170,20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180,180,180), 1, cv2.LINE_AA)

    # 7. Right stock summary HUD
    n_oos  = sum(1 for z in zones if oos_info.get(z['shelf_id'],{}).get('status')=='OUT_OF_STOCK')
    n_low  = sum(1 for z in zones if oos_info.get(z['shelf_id'],{}).get('status')=='LOW_STOCK')
    hud_x  = W-160
    cv2.rectangle(vis, (hud_x,32), (W-2,32+80), (8,8,8), -1)
    cv2.rectangle(vis, (hud_x,32), (W-2,32+80), (50,50,50), 1)
    cv2.putText(vis, "STOCK STATUS", (hud_x+6,48),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (200,200,200), 1, cv2.LINE_AA)
    cv2.putText(vis, f"OOS: {n_oos}", (hud_x+6,66),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, CLR_OOS, 1, cv2.LINE_AA)
    cv2.putText(vis, f"LOW: {n_low}", (hud_x+6,82),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, CLR_LOW, 1, cv2.LINE_AA)
    cv2.putText(vis, f"OK : {len(zones)-n_oos-n_low}", (hud_x+6,98),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, CLR_OK, 1, cv2.LINE_AA)

    return vis


def draw_customer_hud(vis, persons, customer_info, zones, frame_idx):
    """
    Draw customer tracking HUD on top of shelf overlay.
    Logic verbatim from notebook Cell 16 context.
    """
    H, W = vis.shape[:2]

    # Draw person bounding boxes
    for p in persons:
        x1, y1, x2, y2 = p['x1'], p['y1'], p['x2'], p['y2']
        cv2.rectangle(vis, (x1,y1), (x2,y2), (0,255,255), 2)
        cv2.putText(vis, f"CUSTOMER {p['conf']:.2f}", (x1, y1-6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0,255,255), 1, cv2.LINE_AA)

    # Customer status panel (bottom-left)
    in_frame    = customer_info.get('in_frame', False)
    n_events    = customer_info.get('n_events', 0)
    total_taken = customer_info.get('total_taken', 0)

    panel_y = H - 70
    cv2.rectangle(vis, (0, panel_y), (280, H), (8,8,8), -1)
    cv2.rectangle(vis, (0, panel_y), (280, H), (80,80,80), 1)

    status_txt = "👤 CUSTOMER IN FRAME" if in_frame else "   NO CUSTOMER"
    status_clr = (0,255,255) if in_frame else (120,120,120)
    cv2.putText(vis, status_txt, (6, panel_y+18),
                cv2.FONT_HERSHEY_SIMPLEX, 0.44, status_clr, 1, cv2.LINE_AA)
    cv2.putText(vis, f"Visits: {n_events}   Items taken: {total_taken}",
                (6, panel_y+38),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, (200,200,200), 1, cv2.LINE_AA)

    return vis
