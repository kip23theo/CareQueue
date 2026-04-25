import hashlib
import hmac
import secrets
from typing import Literal

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.enums import ClinicVerificationStatus, UserRole
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password), password_hash)


def _parse_object_id(value: str, field_name: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except (InvalidId, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        ) from exc


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthUserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    clinic_id: str | None = None
    phone: str | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserResponse


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class RefreshResponse(BaseModel):
    access_token: str


class RegisterStaffInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["doctor", "receptionist"]
    doctor_image: str | None = Field(default=None, max_length=2000)
    specialization: str | None = Field(default=None, max_length=120)
    avg_consult_mins: int | None = Field(default=10, ge=1, le=120)


class RegisterClinicRequest(BaseModel):
    clinic_name: str = Field(min_length=2, max_length=160)
    clinic_image: str | None = Field(default=None, max_length=2000)
    address: str = Field(min_length=2, max_length=260)
    phone: str = Field(min_length=5, max_length=40)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    specializations: list[str] = Field(default_factory=list)
    opening_hours: dict[str, object] = Field(default_factory=dict)
    avg_consult_time: int = Field(default=10, ge=1, le=120)
    delay_buffer: int = Field(default=0, ge=0, le=240)
    admin_name: str = Field(min_length=2, max_length=120)
    admin_email: EmailStr
    admin_password: str = Field(min_length=6)
    staff: list[RegisterStaffInput] = Field(default_factory=list)


class RegisterClinicResponse(BaseModel):
    message: str
    clinic_id: str
    verification_status: ClinicVerificationStatus


class RegisterStaffRequest(BaseModel):
    clinic_id: str
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["doctor", "receptionist"]
    doctor_image: str | None = Field(default=None, max_length=2000)
    specialization: str | None = Field(default=None, max_length=120)
    avg_consult_mins: int | None = Field(default=10, ge=1, le=120)


class RegisterStaffResponse(BaseModel):
    id: str
    clinic_id: str
    name: str
    email: str
    role: UserRole


class RegisterPatientRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, min_length=7, max_length=40)
    password: str = Field(min_length=6)


class RegisterPatientResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    phone: str | None = None


class BootstrapSuperAdminRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8)


class BootstrapSuperAdminResponse(BaseModel):
    message: str
    user_id: str


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _staff_role(value: Literal["doctor", "receptionist"]) -> UserRole:
    if value == "doctor":
        return UserRole.DOCTOR
    return UserRole.RECEPTIONIST


async def _ensure_emails_available(emails: list[str]) -> None:
    existing_users = await User.find({"email": {"$in": emails}}).to_list()
    if existing_users:
        conflict_email = existing_users[0].email
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email already registered: {conflict_email}",
        )


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="User login",
    description="Login for super admin, clinic admin, doctor, receptionist, and patient users.",
)
async def login(payload: LoginRequest) -> LoginResponse:
    email = _normalize_email(payload.email)
    user = await User.find_one(User.email == email)

    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.role not in {UserRole.SUPER_ADMIN, UserRole.PATIENT}:
        if user.clinic_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not assigned to a clinic",
            )

        clinic = await Clinic.get(user.clinic_id)
        if clinic is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Clinic account is unavailable",
            )

        if clinic.verification_status != ClinicVerificationStatus.APPROVED:
            if clinic.verification_status == ClinicVerificationStatus.REJECTED:
                reason = clinic.rejection_reason or "please contact support"
                detail = f"Clinic verification rejected: {reason}"
            else:
                detail = "Clinic verification pending. Super admin approval is required."
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

    token = secrets.token_urlsafe(32)

    return LoginResponse(
        access_token=token,
        user=AuthUserResponse(
            id=str(user.id),
            name=user.name,
            email=user.email,
            role=user.role,
            clinic_id=str(user.clinic_id) if user.clinic_id else None,
            phone=user.phone,
        ),
    )


@router.post(
    "/register-clinic",
    response_model=RegisterClinicResponse,
    summary="Register clinic tenant",
    description="Create a clinic workspace and initial users. New clinics require super admin verification.",
    status_code=status.HTTP_201_CREATED,
)
async def register_clinic(payload: RegisterClinicRequest) -> RegisterClinicResponse:
    admin_email = _normalize_email(payload.admin_email)
    staff_emails = [_normalize_email(member.email) for member in payload.staff]
    all_emails = [admin_email, *staff_emails]

    if len(set(all_emails)) != len(all_emails):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate emails found in request",
        )

    await _ensure_emails_available(all_emails)

    clinic = Clinic(
        name=payload.clinic_name.strip(),
        location={
            "type": "Point",
            "coordinates": [payload.longitude, payload.latitude],
        },
        clinic_image=(payload.clinic_image or "").strip() or None,
        address=payload.address.strip(),
        phone=payload.phone.strip(),
        specializations=[spec.strip() for spec in payload.specializations if spec.strip()],
        opening_hours=payload.opening_hours,
        avg_consult_time=payload.avg_consult_time,
        delay_buffer=payload.delay_buffer,
        is_open=False,
        verification_status=ClinicVerificationStatus.PENDING,
    )
    await clinic.insert()

    admin_user = User(
        clinic_id=clinic.id,
        role=UserRole.ADMIN,
        name=payload.admin_name.strip(),
        email=admin_email,
        password_hash=hash_password(payload.admin_password),
        is_active=True,
    )
    await admin_user.insert()

    for member in payload.staff:
        member_role = _staff_role(member.role)
        staff_user = User(
            clinic_id=clinic.id,
            role=member_role,
            name=member.name.strip(),
            email=_normalize_email(member.email),
            password_hash=hash_password(member.password),
            is_active=True,
        )
        await staff_user.insert()

        if member_role == UserRole.DOCTOR:
            doctor = Doctor(
                clinic_id=clinic.id,
                user_id=staff_user.id,
                name=member.name.strip(),
                doctor_image=(member.doctor_image or "").strip() or None,
                specialization=(member.specialization or "General Physician").strip(),
                avg_consult_mins=member.avg_consult_mins or 10,
                is_available=True,
            )
            await doctor.insert()

    return RegisterClinicResponse(
        message="Clinic registered successfully. Awaiting super admin verification.",
        clinic_id=str(clinic.id),
        verification_status=clinic.verification_status,
    )


@router.post(
    "/register-staff",
    response_model=RegisterStaffResponse,
    summary="Register staff user",
    description="Create a doctor or receptionist user and link them to a clinic.",
    status_code=status.HTTP_201_CREATED,
)
async def register_staff(payload: RegisterStaffRequest) -> RegisterStaffResponse:
    clinic_id = _parse_object_id(payload.clinic_id, "clinic_id")
    clinic = await Clinic.get(clinic_id)
    if clinic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")

    normalized_email = _normalize_email(payload.email)
    await _ensure_emails_available([normalized_email])

    role = _staff_role(payload.role)
    user = User(
        clinic_id=clinic.id,
        role=role,
        name=payload.name.strip(),
        email=normalized_email,
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    await user.insert()

    if role == UserRole.DOCTOR:
        doctor = Doctor(
            clinic_id=clinic.id,
            user_id=user.id,
            name=payload.name.strip(),
            doctor_image=(payload.doctor_image or "").strip() or None,
            specialization=(payload.specialization or "General Physician").strip(),
            avg_consult_mins=payload.avg_consult_mins or 10,
            is_available=True,
        )
        await doctor.insert()

    return RegisterStaffResponse(
        id=str(user.id),
        clinic_id=str(clinic.id),
        name=user.name,
        email=user.email,
        role=user.role,
    )


@router.post(
    "/register-patient",
    response_model=RegisterPatientResponse,
    summary="Register patient user",
    description="Create a patient account for the patient portal.",
    status_code=status.HTTP_201_CREATED,
)
async def register_patient(payload: RegisterPatientRequest) -> RegisterPatientResponse:
    normalized_email = _normalize_email(payload.email)
    await _ensure_emails_available([normalized_email])

    patient = User(
        clinic_id=None,
        role=UserRole.PATIENT,
        name=payload.name.strip(),
        email=normalized_email,
        phone=payload.phone.strip() if payload.phone else None,
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    await patient.insert()

    return RegisterPatientResponse(
        id=str(patient.id),
        name=patient.name,
        email=patient.email,
        role=patient.role,
        phone=patient.phone,
    )


@router.post(
    "/bootstrap-super-admin",
    response_model=BootstrapSuperAdminResponse,
    summary="Bootstrap first super admin",
    description="Create the first super admin user. This works only when no super admin exists.",
    status_code=status.HTTP_201_CREATED,
)
async def bootstrap_super_admin(payload: BootstrapSuperAdminRequest) -> BootstrapSuperAdminResponse:
    existing = await User.find_one(User.role == UserRole.SUPER_ADMIN)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Super admin already exists",
        )

    normalized_email = _normalize_email(payload.email)
    await _ensure_emails_available([normalized_email])

    user = User(
        clinic_id=None,
        role=UserRole.SUPER_ADMIN,
        name=payload.name.strip(),
        email=normalized_email,
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    await user.insert()

    return BootstrapSuperAdminResponse(
        message="Super admin created successfully",
        user_id=str(user.id),
    )


@router.post(
    "/refresh",
    response_model=RefreshResponse,
    summary="Refresh access token",
    description="Returns a new access token for existing sessions.",
)
async def refresh_token(_: RefreshRequest) -> RefreshResponse:
    return RefreshResponse(access_token=secrets.token_urlsafe(32))
