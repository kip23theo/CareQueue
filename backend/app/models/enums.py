from enum import Enum


class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    DOCTOR = "doctor"
    RECEPTIONIST = "receptionist"
    PATIENT = "patient"


class ClinicVerificationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class QueueStatus(str, Enum):
    WAITING = "WAITING"
    CALLED = "CALLED"
    IN_CONSULTATION = "IN_CONSULTATION"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"
    EMERGENCY = "EMERGENCY"


class NotificationChannel(str, Enum):
    SMS = "sms"
    WHATSAPP = "whatsapp"
    PUSH = "push"


class NotificationStatus(str, Enum):
    SENT = "sent"
    FAILED = "failed"


class ReviewTargetType(str, Enum):
    CLINIC = "clinic"
    DOCTOR = "doctor"


class MedicalDocumentType(str, Enum):
    LAB_REPORT = "lab_report"
    PRESCRIPTION = "prescription"
    DISCHARGE_SUMMARY = "discharge_summary"
    SCAN = "scan"
    OTHER = "other"
