"""
ModelService — wraps YOLOv8m loading and inference.
Logic is taken VERBATIM from the notebook; only wrapped in a class.
"""
import numpy as np
import torch
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class ModelService:
    def __init__(self):
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    async def load_model(self):
        from ultralytics import YOLO
        logger.info(f"Loading YOLOv8m on device: {self.device.upper()}")
        self.model = YOLO("yolov8m.pt")
        # Warm-up pass
        _ = self.model(np.zeros((640, 640, 3), dtype=np.uint8), verbose=False)
        logger.info("YOLOv8m warmed up ✅")

    def is_ready(self) -> bool:
        return self.model is not None
