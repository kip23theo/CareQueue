import hashlib
import hmac
import secrets

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.models.enums import UserRole
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password), password_hash)


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthUserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    clinic_id: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserResponse


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class RefreshResponse(BaseModel):
    access_token: str


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Staff login",
    description="Login for admin, doctor, and receptionist demo users.",
)
async def login(payload: LoginRequest) -> LoginResponse:
    email = payload.email.strip().lower()
    user = await User.find_one(User.email == email)

    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = secrets.token_urlsafe(32)

    return LoginResponse(
        access_token=token,
        user=AuthUserResponse(
            id=str(user.id),
            name=user.name,
            email=user.email,
            role=user.role,
            clinic_id=str(user.clinic_id),
        ),
    )


@router.post(
    "/refresh",
    response_model=RefreshResponse,
    summary="Refresh access token",
    description="Returns a new access token for existing sessions.",
)
async def refresh_token(_: RefreshRequest) -> RefreshResponse:
    return RefreshResponse(access_token=secrets.token_urlsafe(32))
