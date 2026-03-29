from fastapi import APIRouter, Request
from app.models.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    model_svc = getattr(request.app.state, "model_service", None)
    loaded    = model_svc.is_ready() if model_svc else False
    return HealthResponse(
        status="ok" if loaded else "model_loading",
        model_loaded=loaded,
        version="1.0.0",
    )
