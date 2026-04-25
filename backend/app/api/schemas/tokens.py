from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import QueueStatus


class JoinQueueRequest(BaseModel):
    clinic_id: str = Field(examples=["69ec6f6ac3c51735cea88bcb"])
    doctor_id: str | None = Field(default=None, examples=["69ec6f6ac3c51735cea88bd3"])
    patient_user_id: str | None = Field(default=None, examples=["69ec6f6ac3c51735cea88bd9"])
    patient_name: str = Field(examples=["Rahul"])
    patient_phone: str = Field(examples=["+919999999999"])
    patient_age: int | None = Field(default=None, examples=[25])
    symptoms: str | None = Field(default=None, examples=["Fever and headache"])


class JoinQueueResponse(BaseModel):
    token_id: str = Field(examples=["69ec6f6ac3c51735cea88be0"])
    clinic_id: str = Field(examples=["69ec6f6ac3c51735cea88bcb"])
    doctor_id: str | None = Field(default=None, examples=["69ec6f6ac3c51735cea88bd3"])
    patient_user_id: str | None = Field(default=None, examples=["69ec6f6ac3c51735cea88bd9"])
    token_number: int = Field(examples=[14])
    status: QueueStatus = Field(examples=[QueueStatus.WAITING])
    position: int = Field(examples=[5])
    est_wait_mins: int = Field(examples=[40])
    joined_at: datetime
    updated_at: datetime


class TokenStatusResponse(BaseModel):
    token_id: str = Field(examples=["69ec6f6ac3c51735cea88be0"])
    clinic_id: str = Field(examples=["69ec6f6ac3c51735cea88bcb"])
    doctor_id: str | None = Field(default=None, examples=["69ec6f6ac3c51735cea88bd3"])
    patient_user_id: str | None = Field(default=None, examples=["69ec6f6ac3c51735cea88bd9"])
    token_number: int = Field(examples=[14])
    status: QueueStatus = Field(examples=[QueueStatus.WAITING])
    position: int = Field(examples=[5])
    est_wait_mins: int = Field(examples=[40])
    joined_at: datetime
    updated_at: datetime


class CancelTokenResponse(BaseModel):
    token_id: str = Field(examples=["69ec6f6ac3c51735cea88be0"])
    status: QueueStatus = Field(examples=[QueueStatus.CANCELLED])
    updated_at: datetime
