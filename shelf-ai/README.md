# ShelfAI — Retail Shelf Intelligence Platform

A production-grade SaaS web application that converts the YOLOv8m retail shelf monitoring
notebook into a clean, scalable full-stack system.

---

## 🧠 What It Does

| Feature | Detail |
|---|---|
| **YOLOv8m Detection** | Detects shelf products (bottles, cans, etc.) and customers (COCO class 0) |
| **Shelf Zone Auto-Detection** | Sobel-edge + peak-finding to locate shelf rows from Image 1 |
| **OOS Alerting** | Coverage < 30% → Out-of-Stock · < 65% → Low Stock |
| **Customer Tracking** | State-machine with configurable entry confirm + exit buffer |
| **Item Take Counting** | Clean image diff (Image 1 vs Image 8) — avoids occlusion errors |
| **Analytics Dashboard** | Stock fill chart, FPS graph, class distribution, heatmap |
| **Annotated Video** | CCTV HUD overlay on every frame, exported as MP4 |

---

## 🏗️ Architecture

```
shelf-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                  FastAPI app + CORS + lifespan model loading
│   │   ├── routes/
│   │   │   ├── health.py            GET  /api/health
│   │   │   ├── upload.py            POST /api/upload
│   │   │   ├── process.py           POST /api/process  ·  GET /api/process/{id}/status
│   │   │   └── results.py           GET  /api/results/{id}  ·  downloads
│   │   ├── services/
│   │   │   ├── model_service.py     YOLOv8m load + warm-up
│   │   │   ├── shelf_analytics.py   All detection functions (verbatim from notebook)
│   │   │   ├── customer_tracker.py  Entry/exit state machine (verbatim from notebook)
│   │   │   ├── visualization.py     draw_detections + draw_customer_hud (verbatim)
│   │   │   └── pipeline.py          Orchestrates full notebook pipeline
│   │   ├── models/
│   │   │   └── schemas.py           Pydantic request/response models
│   │   └── utils/
│   │       └── logger.py            Structured logging
│   ├── main.py                      Uvicorn entrypoint
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx          Upload CTA + drag-drop
│   │   │   ├── Dashboard.jsx        Processing progress tracker
│   │   │   ├── Results.jsx          Full analytics view
│   │   │   └── History.jsx          Local session history
│   │   ├── components/
│   │   │   ├── layout/Layout.jsx    Sidebar nav + API status
│   │   │   └── ui/
│   │   │       ├── KpiCard.jsx
│   │   │       ├── ShelfZoneTable.jsx
│   │   │       ├── CustomerEventsTable.jsx
│   │   │       ├── StockChart.jsx       (Recharts)
│   │   │       ├── FpsDetChart.jsx      (Recharts ComposedChart)
│   │   │       └── ClassCountChart.jsx  (Recharts horizontal bar)
│   │   ├── hooks/useSession.js      Upload → process → poll → results state
│   │   └── utils/api.js             Axios API client
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
# → http://localhost:8000
# → Swagger docs: http://localhost:8000/docs
```

> **GPU**: PyTorch + CUDA will be auto-detected. YOLOv8m runs on CPU if no GPU is available.

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 🐳 Docker (Recommended for Production)

```bash
# Build & start both services
docker-compose up --build

# Frontend → http://localhost:3000
# Backend  → http://localhost:8000
# API docs → http://localhost:8000/docs
```

GPU support: uncomment the `deploy.resources` block in `docker-compose.yml`
and ensure `nvidia-container-toolkit` is installed on the host.

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/health` | Model readiness check |
| `POST` | `/api/upload` | Upload 2–8 shelf images (multipart/form-data) |
| `POST` | `/api/process` | Trigger pipeline for a session |
| `GET`  | `/api/process/{id}/status` | Poll progress (0–100) |
| `GET`  | `/api/results/{id}` | Full structured results (JSON) |
| `GET`  | `/api/results/{id}/download/csv` | Download metrics CSV |
| `GET`  | `/api/results/{id}/download/video` | Download annotated video |

### Upload example (curl)
```bash
curl -X POST http://localhost:8000/api/upload \
  -F "files=@shelf_t00.jpg" \
  -F "files=@shelf_t01.jpg" \
  -F "files=@shelf_t02.jpg"
```

### Process example
```bash
curl -X POST http://localhost:8000/api/process \
  -H "Content-Type: application/json" \
  -d '{"session_id": "<returned-session-id>"}'
```

---

## ⚙️ Configuration

Copy `.env.example` files in both `backend/` and `frontend/` and adjust as needed.

Key backend knobs (in `app/services/shelf_analytics.py`, verbatim from notebook):

| Constant | Default | Meaning |
|---|---|---|
| `CONF_THRESH` | 0.20 | YOLO confidence threshold |
| `IOU_THRESH`  | 0.45 | YOLO IoU NMS threshold |
| `OOS_THRESH`  | 0.30 | Coverage < 30% → Out of Stock |
| `LOW_THRESH`  | 0.65 | Coverage < 65% → Low Stock |

---

## ☁️ Cloud Deployment

### Vercel (Frontend only)
```bash
cd frontend && npx vercel --prod
# Set VITE_API_BASE_URL env var to your deployed backend URL
```

### AWS / GCP / Azure
1. Build and push Docker images to ECR / Artifact Registry / ACR
2. Deploy backend on ECS / Cloud Run / ACI with ≥ 4GB RAM
3. Deploy frontend image or serve `dist/` via CloudFront / CDN
4. Point `VITE_API_BASE_URL` to backend URL

---

## 🔒 Zero Logic Changes

All notebook logic is preserved verbatim:
- `detect_products()` — filters person class, wraps YOLO boxes
- `detect_persons()` — COCO class 0 only
- `detect_out_of_stock()` — coverage ratio vs T0 baseline
- `estimate_stock()` — YOLO count + pixel boundary fallback
- `detect_misplaced_items()` — area outlier detection
- `update_customer_state()` — entry/exit state machine with buffers
- `draw_detections()` + `draw_customer_hud()` — full CCTV HUD
- `_compute_metrics()` — Precision / Recall / F1 / mAP estimation
- `_generate_dashboard()` — matplotlib dark dashboard (Cell 20)
- `_generate_preview()` — 6-frame output preview (Cell 22)
