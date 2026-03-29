"""
ShelfAnalyticsService — all shelf/product detection logic extracted
verbatim from the notebook. Zero logic changes.
"""
import cv2
import numpy as np
from collections import defaultdict
from scipy.ndimage import gaussian_filter1d
from scipy.signal import find_peaks
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

# ── Thresholds (identical to notebook Cell 8) ────────────────
CONF_THRESH  = 0.20
IOU_THRESH   = 0.45
OOS_THRESH   = 0.30
LOW_THRESH   = 0.65
CAPACITY     = 15

# ── Colours (identical to notebook) ──────────────────────────
CLR_OK   = ( 50, 220,  50)
CLR_OOS  = (  0,  40, 220)
CLR_LOW  = (  0, 165, 255)
CLR_MIS  = (220,   0, 220)
CLR_BOX  = (  0, 210, 255)
CLR_CONF = (255, 200,   0)

_NAMES  = ['Top Shelf','Second Shelf','Third Shelf','Bottom Shelf',
           'Fifth Shelf','Sixth Shelf','Seventh Shelf','Eighth Shelf']
_AISLES = ['A1','A2','A3','A4','A5','A6','A7','A8']
_COLORS = [(40,160,40),(30,110,200),(160,40,160),
           (180,90,20),(20,180,180),(180,180,20),(255,0,0),(0,0,255)]

PERSON_CLASS_ID = 0


# ─────────────────────────────────────────────────────────────
#  Zone helpers (verbatim from notebook Cell 3 + Cell 8)
# ─────────────────────────────────────────────────────────────

def auto_detect_zones(shelf_img_paths: list, out_w=1280, out_h=720):
    """Auto-detect shelf rows from the first image (T0). Returns detected zones."""
    raw0 = cv2.imread(shelf_img_paths[0])
    H_raw, W_raw = raw0.shape[:2]
    gray     = cv2.cvtColor(raw0, cv2.COLOR_BGR2GRAY)
    sobel_h  = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=5)
    row_sig  = np.abs(sobel_h).mean(axis=1)
    smoothed = gaussian_filter1d(row_sig, sigma=max(1, H_raw // 80))
    peaks, _ = find_peaks(smoothed, height=smoothed.mean() * 1.0, distance=H_raw // 6)
    margin   = int(H_raw * 0.03)
    peaks    = [p for p in peaks if margin < p < H_raw - margin]
    board_y  = [0] + list(peaks) + [H_raw]
    all_zones = [(board_y[i], board_y[i+1]) for i in range(len(board_y)-1)
                 if board_y[i+1] - board_y[i] > H_raw * 0.05]
    heights  = [y2-y1 for y1,y2 in all_zones]
    median_h = sorted(heights)[len(heights)//2]
    zones_raw = [z for z,h in zip(all_zones,heights) if h >= median_h*0.80][:6]

    # Scale to output resolution
    raw_frame, sc, xo, yo = letterbox_bgr(raw0, out_w, out_h)
    zones_scaled = [(int(y1*sc)+yo, int(y2*sc)+yo) for y1,y2 in zones_raw]
    return zones_scaled, raw_frame


def letterbox_bgr(img_bgr, W, H, pad=(40, 40, 40)):
    """Letterbox resize — verbatim from notebook Cell 3."""
    h, w   = img_bgr.shape[:2]
    scale  = min(W/w, H/h)
    nw, nh = int(w*scale), int(h*scale)
    out    = np.full((H, W, 3), pad, dtype=np.uint8)
    xo, yo = (W-nw)//2, (H-nh)//2
    out[yo:yo+nh, xo:xo+nw] = cv2.resize(img_bgr, (nw, nh))
    return out, scale, xo, yo


def get_zones(H, W, detected_zones, n_shelves, shelf_meta, out_h=720):
    """Build zone dicts — verbatim from notebook Cell 8."""
    h_scale = H / out_h
    return [{
        'shelf_id': i,
        'y1': int(detected_zones[i][0] * h_scale),
        'y2': int(detected_zones[i][1] * h_scale),
        'name':  shelf_meta[i]['name'],
        'col':   shelf_meta[i]['col'],
        'aisle': shelf_meta[i]['aisle'],
    } for i in range(n_shelves)]


def build_shelf_meta(n_shelves):
    return [{'name':_NAMES[i],'aisle':_AISLES[i],'col':_COLORS[i]}
            for i in range(n_shelves)]


# ─────────────────────────────────────────────────────────────
#  Detection functions (verbatim from notebook Cell 12)
# ─────────────────────────────────────────────────────────────

def detect_products(model, frame, conf=CONF_THRESH):
    """Detect shelf products only — persons (class 0) excluded. Verbatim."""
    results = model(frame, conf=conf, iou=IOU_THRESH, verbose=False)[0]
    dets = []
    if results.boxes is None:
        return dets
    for box, c, cid in zip(
        results.boxes.xyxy.cpu().numpy(),
        results.boxes.conf.cpu().numpy(),
        results.boxes.cls.cpu().numpy().astype(int)
    ):
        if int(cid) == PERSON_CLASS_ID:
            continue
        x1, y1, x2, y2 = map(int, box)
        if (x2-x1) < 12 or (y2-y1) < 12:
            continue
        label = results.names.get(int(cid), f'cls{cid}')
        dets.append({'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2,
                     'conf': float(c), 'label': label, 'class_id': int(cid)})
    return dets


def detect_persons(model, frame, conf=0.35):
    """Detect only persons (COCO class 0). Verbatim from notebook."""
    results = model(frame, conf=conf, iou=IOU_THRESH, verbose=False)[0]
    persons = []
    if results.boxes is None:
        return persons
    for box, c, cid in zip(
        results.boxes.xyxy.cpu().numpy(),
        results.boxes.conf.cpu().numpy(),
        results.boxes.cls.cpu().numpy().astype(int)
    ):
        if int(cid) == PERSON_CLASS_ID:
            x1, y1, x2, y2 = map(int, box)
            persons.append({'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2, 'conf': float(c)})
    return persons


def count_products_per_zone(dets, zones):
    """Returns {shelf_id: product_count}. Verbatim."""
    counts = {}
    for z in zones:
        sid = z['shelf_id']
        in_z = [d for d in dets if z['y1'] <= (d['y1']+d['y2'])//2 <= z['y2']]
        counts[sid] = len(in_z)
    return counts


def detect_out_of_stock(zones, dets, W, t0_zone_counts):
    """YOLO-count based OOS detection. Verbatim from notebook."""
    status = {}
    for z in zones:
        sid  = z['shelf_id']
        in_z = [d for d in dets if z['y1'] <= (d['y1']+d['y2'])//2 <= z['y2']]
        t0_cnt = t0_zone_counts.get(sid, 1)
        cov    = min(1.0, len(in_z) / t0_cnt)
        if   cov < OOS_THRESH: st = 'OUT_OF_STOCK'
        elif cov < LOW_THRESH: st = 'LOW_STOCK'
        else:                  st = 'OK'
        status[sid] = {'status': st, 'coverage': cov, 'count': len(in_z)}
    return status


def count_items_pixel(frame, zone):
    """Pixel boundary item counting. Verbatim from notebook."""
    y1, y2 = zone['y1'], zone['y2']
    H_z = y2 - y1
    if H_z < 10: return 0
    crop_y1 = y1 + int(H_z * 0.20)
    crop_y2 = y2 - int(H_z * 0.20)
    if crop_y2 <= crop_y1: return 0
    crop = frame[crop_y1:crop_y2, :].astype(np.float32)
    col_color  = crop.mean(axis=0)
    color_diff = np.zeros(col_color.shape[0], dtype=np.float32)
    for x in range(1, col_color.shape[0]):
        color_diff[x] = np.abs(col_color[x] - col_color[x-1]).mean()
    BOUNDARY_THRESH = 18.0
    boundaries = np.where(color_diff > BOUNDARY_THRESH)[0]
    CLUSTER_GAP = 5
    if len(boundaries) == 0:
        return 0
    clusters = 1
    for i in range(1, len(boundaries)):
        if boundaries[i] - boundaries[i-1] > CLUSTER_GAP:
            clusters += 1
    return max(0, clusters + 1) if clusters > 0 else 0


def estimate_stock(zones, dets, frame, t0_zone_counts):
    """Per-zone item count and fill %. Verbatim from notebook."""
    stock = {}
    for z in zones:
        sid  = z['shelf_id']
        in_z = [d for d in dets if z['y1'] <= (d['y1']+d['y2'])//2 <= z['y2']]
        yolo_count  = len(in_z)
        pixel_count = count_items_pixel(frame, z)
        total_count = max(yolo_count, pixel_count)
        t0_cnt   = t0_zone_counts.get(sid, 1)
        fill_pct = min(100.0, round(total_count / t0_cnt * 100, 1))
        stock[sid] = {'count': total_count, 'fill_pct': fill_pct}
    return stock


def detect_misplaced_items(zones, dets):
    """Flag YOLO detections that are size outliers within their zone. Verbatim."""
    zone_dets = defaultdict(list)
    for idx, d in enumerate(dets):
        cy = (d['y1']+d['y2'])//2
        for z in zones:
            if z['y1'] <= cy <= z['y2']:
                area = (d['x2']-d['x1'])*(d['y2']-d['y1'])
                zone_dets[z['shelf_id']].append((idx, area))
                break
    misplaced = set()
    for sid, items in zone_dets.items():
        if len(items) < 3: continue
        areas  = np.array([a for _,a in items])
        median = np.median(areas)
        for idx, area in items:
            if area > 2.5*median and area > 4000:
                misplaced.add(idx)
    return misplaced


def update_heatmap(hm, dets, shape):
    """Accumulate detection heatmap. Verbatim from notebook."""
    H, W = shape[:2]
    if hm is None:
        hm = np.zeros((H, W), np.float32)
    for d in dets:
        hm[max(0,d['y1']):min(H,d['y2']),
           max(0,d['x1']):min(W,d['x2'])] += 1.0
    return hm
