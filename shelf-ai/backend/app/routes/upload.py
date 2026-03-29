import os
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile
from app.models.schemas import UploadResponse
from app.services.pipeline import init_session
from app.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger(__name__)

UPLOAD_DIR  = Path("uploads")
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
MAX_IMAGES  = 8
MIN_IMAGES  = 2


@router.post("/upload", response_model=UploadResponse)
async def upload_images(files: List[UploadFile] = File(...)):
    """
    Upload 2–8 shelf images (sequence: empty → customer → empty).
    Returns a session_id used for all subsequent API calls.
    """
    if len(files) < MIN_IMAGES:
        raise HTTPException(400, f"At least {MIN_IMAGES} images required.")
    if len(files) > MAX_IMAGES:
        raise HTTPException(400, f"Maximum {MAX_IMAGES} images allowed.")

    session_id = str(uuid.uuid4())
    session_dir = UPLOAD_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    saved_paths = []
    for i, file in enumerate(files):
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXT:
            raise HTTPException(400, f"Unsupported file type: {ext}. Use JPG/PNG.")
        dst = session_dir / f"shelf_t{i:02d}{ext}"
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(400, f"File {file.filename} is empty.")
        dst.write_bytes(content)
        saved_paths.append(str(dst))
        logger.info(f"[{session_id}] Saved image {i+1}/{len(files)}: {dst.name}")

    init_session(session_id, saved_paths)
    logger.info(f"[{session_id}] Session initialized with {len(files)} images")

    return UploadResponse(
        session_id=session_id,
        message=f"Successfully uploaded {len(files)} images. Use session_id to trigger processing.",
        images_received=len(files),
    )
