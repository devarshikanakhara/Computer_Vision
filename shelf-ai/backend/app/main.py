"""
ShelfAI — FastAPI Backend
Customer & Shelf Monitoring via YOLOv8m
"""
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes import upload, process, results, health
from app.services.model_service import ModelService
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load YOLOv8m model at startup, release at shutdown."""
    logger.info("🚀 Starting ShelfAI backend...")
    app.state.model_service = ModelService()
    await app.state.model_service.load_model()
    logger.info("✅ YOLOv8m model loaded and ready")
    yield
    logger.info("🛑 Shutting down ShelfAI backend...")


app = FastAPI(
    title="ShelfAI API",
    description="Retail shelf monitoring with customer tracking using YOLOv8m",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static output directory
import os
os.makedirs("outputs", exist_ok=True)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

# Register routes
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(process.router, prefix="/api", tags=["Process"])
app.include_router(results.router, prefix="/api", tags=["Results"])


@app.middleware("http")
async def log_requests(request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({duration}ms)")
    return response
