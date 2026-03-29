from pydantic import BaseModel
from typing import Optional, Dict, List, Any


class UploadResponse(BaseModel):
    session_id: str
    message: str
    images_received: int


class ShelfZone(BaseModel):
    shelf_id: int
    name: str
    aisle: str
    y1: int
    y2: int
    status: str
    coverage: float
    count: int
    fill_pct: float


class CustomerEvent(BaseModel):
    entry_frame: int
    exit_frame: int
    total_taken: int
    taken_per_zone: Dict[str, int]
    counts_before: Dict[str, int]
    counts_after: Dict[str, int]


class ProcessingMetrics(BaseModel):
    precision: float
    recall: float
    f1_score: float
    map_at_0_5: float
    avg_fps: float
    total_frames: int
    avg_dets_frame: float
    total_detections: int
    tp: int
    fp: int
    fn: int
    customer_visits: int
    total_items_taken: int


class ProcessResponse(BaseModel):
    session_id: str
    status: str
    message: str
    progress: Optional[int] = None


class ResultsResponse(BaseModel):
    session_id: str
    status: str
    metrics: Optional[ProcessingMetrics] = None
    shelf_zones: Optional[List[ShelfZone]] = None
    customer_events: Optional[List[CustomerEvent]] = None
    stock_history: Optional[Dict[str, List[float]]] = None
    class_counts: Optional[Dict[str, int]] = None
    fps_history: Optional[List[float]] = None
    det_history: Optional[List[int]] = None
    n_shelves: Optional[int] = None
    output_video_url: Optional[str] = None
    dashboard_url: Optional[str] = None
    preview_url: Optional[str] = None
    chart_url: Optional[str] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str
