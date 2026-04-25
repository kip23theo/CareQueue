from fastapi import APIRouter

from app.api.schemas.tokens import (
    CancelTokenResponse,
    JoinQueueRequest,
    JoinQueueResponse,
    TokenStatusResponse,
)
from app.models.enums import QueueStatus

router = APIRouter()


@router.post(
    "/join",
    response_model=JoinQueueResponse,
    summary="Join clinic queue",
    description="Placeholder endpoint for patient queue join. Database logic comes later.",
)
async def join_queue(request: JoinQueueRequest) -> JoinQueueResponse:
    return JoinQueueResponse(
        token_id="placeholder_token_id",
        clinic_id=request.clinic_id,
        doctor_id=request.doctor_id,
        token_number=0,
        status=QueueStatus.WAITING,
        position=0,
        est_wait_mins=0,
        joined_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z",
    )


@router.get(
    "/{token_id}/status",
    response_model=TokenStatusResponse,
    summary="Get token status",
    description="Placeholder endpoint for live patient token status. Database logic comes later.",
)
async def get_token_status(token_id: str) -> TokenStatusResponse:
    return TokenStatusResponse(
        token_id=token_id,
        clinic_id="placeholder_clinic_id",
        doctor_id=None,
        token_number=0,
        status=QueueStatus.WAITING,
        position=0,
        est_wait_mins=0,
        joined_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z",
    )


@router.patch(
    "/{token_id}/cancel",
    response_model=CancelTokenResponse,
    summary="Cancel token",
    description="Placeholder endpoint for patient token cancellation. Database logic comes later.",
)
async def cancel_token(token_id: str) -> CancelTokenResponse:
    return CancelTokenResponse(
        token_id=token_id,
        status=QueueStatus.CANCELLED,
        updated_at="2026-01-01T00:00:00Z",
    )
