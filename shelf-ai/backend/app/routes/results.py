from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from app.models.schemas import ResultsResponse
from app.services.pipeline import get_session
from app.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger(__name__)


@router.get("/results/{session_id}", response_model=ResultsResponse)
async def get_results(session_id: str):
    """
    Return full structured results for a completed session.
    Returns partial info (status/progress) while still processing.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")

    status = session["status"]

    if status == "failed":
        return ResultsResponse(
            session_id=session_id,
            status="failed",
            error=session.get("error", "Unknown error"),
        )

    if status in ("uploaded", "processing"):
        return ResultsResponse(
            session_id=session_id,
            status=status,
        )

    # Completed — return full results
    r = session["results"]
    m = r["metrics"]

    from app.models.schemas import ProcessingMetrics, ShelfZone, CustomerEvent

    metrics = ProcessingMetrics(
        precision=m["precision"],
        recall=m["recall"],
        f1_score=m["f1_score"],
        map_at_0_5=m["map_at_0_5"],
        avg_fps=m["avg_fps"],
        total_frames=m["total_frames"],
        avg_dets_frame=m["avg_dets_frame"],
        total_detections=m["total_detections"],
        tp=m["tp"], fp=m["fp"], fn=m["fn"],
        customer_visits=m["customer_visits"],
        total_items_taken=m["total_items_taken"],
    )

    shelf_zones = [
        ShelfZone(
            shelf_id=z["shelf_id"], name=z["name"], aisle=z["aisle"],
            y1=z["y1"], y2=z["y2"], status=z["status"],
            coverage=z["coverage"], count=z["count"], fill_pct=z["fill_pct"],
        ) for z in r["shelf_zones"]
    ]

    customer_events = [
        CustomerEvent(
            entry_frame=ev["entry_frame"],
            exit_frame=ev["exit_frame"],
            total_taken=ev["total_taken"],
            taken_per_zone={str(k): v for k, v in ev["taken_per_zone"].items()},
            counts_before={str(k): v for k, v in ev["counts_before"].items()},
            counts_after={str(k): v for k, v in ev["counts_after"].items()},
        ) for ev in r["customer_events"]
    ]

    return ResultsResponse(
        session_id=session_id,
        status="completed",
        metrics=metrics,
        shelf_zones=shelf_zones,
        customer_events=customer_events,
        stock_history=r["stock_history"],
        class_counts=r["class_counts"],
        fps_history=r.get("fps_history", []),
        det_history=r.get("det_history", []),
        n_shelves=r["n_shelves"],
        output_video_url=r["output_video_url"],
        dashboard_url=r["dashboard_url"],
        preview_url=r["preview_url"],
        chart_url=r["chart_url"],
    )


@router.get("/results/{session_id}/download/csv")
async def download_csv(session_id: str):
    path = Path(f"outputs/{session_id}/metrics.csv")
    if not path.exists():
        raise HTTPException(404, "CSV not found. Run processing first.")
    return FileResponse(str(path), filename="shelf_metrics.csv",
                        media_type="text/csv")


@router.get("/results/{session_id}/download/video")
async def download_video(session_id: str):
    path = Path(f"outputs/{session_id}/output_video.mp4")
    if not path.exists():
        raise HTTPException(404, "Video not found.")
    return FileResponse(str(path), filename="shelf_output.mp4",
                        media_type="video/mp4")
