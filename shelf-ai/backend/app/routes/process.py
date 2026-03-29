import asyncio
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.models.schemas import ProcessResponse
from app.services.pipeline import SESSION_STORE, run_pipeline, get_session
from app.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger(__name__)


class ProcessRequest(BaseModel):
    session_id: str


@router.post("/process", response_model=ProcessResponse)
async def trigger_processing(body: ProcessRequest, request: Request):
    """
    Trigger the full YOLOv8m pipeline for a session.
    Processing runs in the background; poll /results for status.
    """
    session = get_session(body.session_id)
    if not session:
        raise HTTPException(404, "Session not found. Upload images first.")

    if session["status"] == "processing":
        return ProcessResponse(
            session_id=body.session_id,
            status="processing",
            message="Pipeline is already running.",
            progress=session.get("progress", 0),
        )

    if session["status"] == "completed":
        return ProcessResponse(
            session_id=body.session_id,
            status="completed",
            message="Processing already complete. Fetch /results.",
            progress=100,
        )

    model_svc = getattr(request.app.state, "model_service", None)
    if not model_svc or not model_svc.is_ready():
        raise HTTPException(503, "Model not yet loaded. Retry in a moment.")

    logger.info(f"[{body.session_id}] Launching pipeline...")
    asyncio.create_task(run_pipeline(body.session_id, model_svc.model))

    return ProcessResponse(
        session_id=body.session_id,
        status="processing",
        message="Pipeline started. Poll /api/results for updates.",
        progress=0,
    )


@router.get("/process/{session_id}/status")
async def get_status(session_id: str):
    """Quick status + progress check."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")
    return {
        "session_id": session_id,
        "status": session["status"],
        "progress": session.get("progress", 0),
        "error": session.get("error"),
    }
