import asyncio
import hashlib
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from beanie import init_beanie
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BACKEND_DIR))

from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.enums import (
    ClinicVerificationStatus,
    MedicalDocumentType,
    NotificationChannel,
    QueueStatus,
    ReviewTargetType,
    UserRole,
)
from app.models.medical_document import MedicalDocument
from app.models.medical_history import MedicalHistory
from app.models.notification import Notification
from app.models.queue_token import QueueToken
from app.models.review import Review
from app.models.user import User

DEMO_PASSWORD = "password123"
DEMO_EMAIL_DOMAIN = "gmail.com"
DEMO_LOCAL_PARTS = [
    "superadmin",
    "admin",
    "doctor.alisha",
    "doctor.rohan",
    "receptionist",
    "patient.aarav",
    "patient.maya",
    "patient.karan",
]


def _email(local_part: str) -> str:
    return f"{local_part}@{DEMO_EMAIL_DOMAIN}"


DEMO_EMAILS = [_email(local_part) for local_part in DEMO_LOCAL_PARTS]

LEGACY_DEMO_EMAILS = [
    "superadmin@gmail.com",
    "admin@gmail.com",
    "doctor@gmail.com",
    "receptionist@gmail.com",
    "admin2@gmail.com",
    "doctor2@gmail.com",
    "receptionist2@gmail.com",
    "pendingadmin@gmail.com",
    "rejectedadmin@gmail.com",
    "patient@gmail.com",
    "superadmin@demo.carequeue.local",
    "admin@demo.carequeue.local",
    "doctor@demo.carequeue.local",
    "receptionist@demo.carequeue.local",
    "admin2@demo.carequeue.local",
    "doctor2@demo.carequeue.local",
    "receptionist2@demo.carequeue.local",
    "pendingadmin@demo.carequeue.local",
    "rejectedadmin@demo.carequeue.local",
    "patient@demo.carequeue.local",
]
LEGACY_DEMO_EMAILS.extend(
    [f"{local_part}@demo.carequeue.local" for local_part in DEMO_LOCAL_PARTS]
)

ALL_DEMO_EMAILS = sorted(set(DEMO_EMAILS + LEGACY_DEMO_EMAILS))


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


async def seed_data() -> None:
    env_path = BACKEND_DIR / ".env"
    load_dotenv(env_path)

    mongodb_uri = os.getenv("MONGODB_URI")
    database_name = os.getenv("DATABASE_NAME", "carequeue")

    if not mongodb_uri or "PASTE_" in mongodb_uri:
        raise RuntimeError("Set MONGODB_URI in backend/.env before running this script")

    client = AsyncIOMotorClient(mongodb_uri)

    try:
        await init_beanie(
            database=client[database_name],
            document_models=[
                Clinic,
                User,
                Doctor,
                QueueToken,
                Notification,
                Review,
                MedicalHistory,
                MedicalDocument,
            ],
        )

        # Remove only demo fixtures from current and older seed versions.
        await Notification.find({"message": {"$regex": r"^Demo "}}).delete()
        await MedicalDocument.find({"title": {"$regex": r"^Demo "}}).delete()
        await MedicalHistory.find({"title": {"$regex": r"^Demo "}}).delete()
        await Review.find({"patient_name": {"$regex": r"^Demo "}}).delete()
        await QueueToken.find({"patient_name": {"$regex": r"^Demo "}}).delete()
        await QueueToken.find({"patient_phone": {"$regex": r"^\+91000000"}}).delete()
        await Doctor.find({"name": {"$regex": r"^Demo Dr\."}}).delete()
        await Clinic.find({"name": {"$regex": r"^Demo "}}).delete()
        await Clinic.find({"phone": {"$regex": r"^\+91110000"}}).delete()
        await User.find({"email": {"$in": ALL_DEMO_EMAILS}}).delete()

        clinic = Clinic(
            name="Demo City Clinic",
            location={"type": "Point", "coordinates": [76.365517, 10.007223]},
            clinic_image="https://images.unsplash.com/photo-1586773860418-d37222d8fce3",
            address="Connaught Place, New Delhi",
            google_maps_link="https://www.google.com/maps?q=10.007223,76.365517",
            phone="+911100000001",
            specializations=["general", "family medicine", "pediatrics", "dermatology"],
            opening_hours={"mon_sat": "09:00-18:00"},
            avg_consult_time=9,
            is_open=True,
            rating=4.6,
            delay_buffer=4,
            verification_status=ClinicVerificationStatus.APPROVED,
        )
        await clinic.insert()

        demo_password_hash = hash_password(DEMO_PASSWORD)

        users: dict[str, User] = {
            "super_admin": User(
                clinic_id=None,
                role=UserRole.SUPER_ADMIN,
                name="Demo Super Admin",
                email=_email("superadmin"),
                password_hash=demo_password_hash,
                is_active=True,
            ),
            "admin": User(
                clinic_id=clinic.id,
                role=UserRole.ADMIN,
                name="Demo Admin",
                email=_email("admin"),
                password_hash=demo_password_hash,
                is_active=True,
            ),
            "receptionist": User(
                clinic_id=clinic.id,
                role=UserRole.RECEPTIONIST,
                name="Demo Receptionist",
                email=_email("receptionist"),
                password_hash=demo_password_hash,
                is_active=True,
            ),
            "doctor_alisha": User(
                clinic_id=clinic.id,
                role=UserRole.DOCTOR,
                name="Demo Dr. Alisha Verma",
                email=_email("doctor.alisha"),
                password_hash=demo_password_hash,
                is_active=True,
            ),
            "doctor_rohan": User(
                clinic_id=clinic.id,
                role=UserRole.DOCTOR,
                name="Demo Dr. Rohan Iyer",
                email=_email("doctor.rohan"),
                password_hash=demo_password_hash,
                is_active=True,
            ),
            "patient_aarav": User(
                clinic_id=None,
                role=UserRole.PATIENT,
                name="Demo Patient Aarav",
                email=_email("patient.aarav"),
                phone="+919900001111",
                password_hash=demo_password_hash,
                is_active=True,
            ),
            "patient_maya": User(
                clinic_id=None,
                role=UserRole.PATIENT,
                name="Demo Patient Maya",
                email=_email("patient.maya"),
                phone="+919900002222",
                password_hash=demo_password_hash,
                is_active=True,
            ),
            "patient_karan": User(
                clinic_id=None,
                role=UserRole.PATIENT,
                name="Demo Patient Karan",
                email=_email("patient.karan"),
                phone="+919900003333",
                password_hash=demo_password_hash,
                is_active=True,
            ),
        }
        for user in users.values():
            await user.insert()

        doctors = [
            Doctor(
                clinic_id=clinic.id,
                user_id=users["doctor_alisha"].id,
                name="Demo Dr. Alisha Verma",
                doctor_image="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d",
                specialization="General Physician",
                avg_consult_mins=9,
                is_available=True,
                delay_mins=3,
            ),
            Doctor(
                clinic_id=clinic.id,
                user_id=users["doctor_rohan"].id,
                name="Demo Dr. Rohan Iyer",
                doctor_image="https://images.unsplash.com/photo-1559839734-2b71ea197ec2",
                specialization="Dermatology",
                avg_consult_mins=12,
                is_available=True,
                delay_mins=5,
            ),
        ]
        for doctor in doctors:
            await doctor.insert()

        now = datetime.now(timezone.utc)
        today = now.date().isoformat()
        patient_aarav = users["patient_aarav"]
        patient_maya = users["patient_maya"]
        patient_karan = users["patient_karan"]

        queue_tokens = [
            QueueToken(
                clinic_id=clinic.id,
                doctor_id=doctors[0].id,
                patient_user_id=patient_aarav.id,
                token_number=101,
                patient_name=patient_aarav.name,
                patient_phone=patient_aarav.phone or "",
                patient_age=27,
                symptoms="Fever and headache",
                status=QueueStatus.IN_CONSULTATION,
                position=1,
                est_wait_mins=0,
                joined_at=now - timedelta(minutes=42),
                called_at=now - timedelta(minutes=15),
                consult_start=now - timedelta(minutes=9),
                date=today,
            ),
            QueueToken(
                clinic_id=clinic.id,
                doctor_id=doctors[0].id,
                patient_user_id=patient_maya.id,
                token_number=102,
                patient_name=patient_maya.name,
                patient_phone=patient_maya.phone or "",
                patient_age=31,
                symptoms="Cough and throat pain",
                status=QueueStatus.CALLED,
                position=2,
                est_wait_mins=4,
                joined_at=now - timedelta(minutes=36),
                called_at=now - timedelta(minutes=2),
                date=today,
            ),
            QueueToken(
                clinic_id=clinic.id,
                doctor_id=doctors[1].id,
                patient_user_id=patient_karan.id,
                token_number=103,
                patient_name=patient_karan.name,
                patient_phone=patient_karan.phone or "",
                patient_age=25,
                symptoms="Skin rash and itching",
                status=QueueStatus.WAITING,
                position=3,
                est_wait_mins=18,
                joined_at=now - timedelta(minutes=28),
                date=today,
            ),
            QueueToken(
                clinic_id=clinic.id,
                doctor_id=doctors[1].id,
                patient_user_id=patient_aarav.id,
                token_number=104,
                patient_name=patient_aarav.name,
                patient_phone=patient_aarav.phone or "",
                patient_age=27,
                symptoms="Follow-up skin irritation",
                status=QueueStatus.WAITING,
                position=4,
                est_wait_mins=29,
                joined_at=now - timedelta(minutes=14),
                date=today,
            ),
            QueueToken(
                clinic_id=clinic.id,
                doctor_id=doctors[0].id,
                patient_user_id=patient_maya.id,
                token_number=105,
                patient_name=patient_maya.name,
                patient_phone=patient_maya.phone or "",
                patient_age=31,
                symptoms="Seasonal allergy review",
                status=QueueStatus.COMPLETED,
                position=5,
                est_wait_mins=0,
                joined_at=now - timedelta(minutes=93),
                called_at=now - timedelta(minutes=62),
                consult_start=now - timedelta(minutes=57),
                consult_end=now - timedelta(minutes=48),
                date=today,
                payment_amount=500.0,
                payment_method="UPI",
                payment_notes="Paid at reception",
                payment_recorded_at=now - timedelta(minutes=47),
                payment_recorded_by_role=UserRole.RECEPTIONIST,
                payment_recorded_by_name=users["receptionist"].name,
            ),
            QueueToken(
                clinic_id=clinic.id,
                doctor_id=doctors[1].id,
                patient_user_id=patient_karan.id,
                token_number=106,
                patient_name=patient_karan.name,
                patient_phone=patient_karan.phone or "",
                patient_age=25,
                symptoms="Acne consultation",
                status=QueueStatus.CANCELLED,
                position=6,
                est_wait_mins=0,
                joined_at=now - timedelta(minutes=73),
                date=today,
            ),
        ]
        for queue_token in queue_tokens:
            await queue_token.insert()

        history_entries = [
            MedicalHistory(
                patient_user_id=patient_aarav.id,
                clinic_id=clinic.id,
                doctor_id=doctors[0].id,
                title="Demo Visit - Viral Fever",
                diagnosis="Viral fever with mild dehydration",
                notes="Advised fluids, rest, and temperature monitoring for 3 days.",
                prescriptions=["Paracetamol 650mg", "ORS sachet"],
                vitals={"temperature": "100.1 F", "bp": "118/78"},
                visit_date=now - timedelta(days=10),
                follow_up_date=now - timedelta(days=7),
            ),
            MedicalHistory(
                patient_user_id=patient_maya.id,
                clinic_id=clinic.id,
                doctor_id=doctors[0].id,
                title="Demo Visit - Seasonal Allergy",
                diagnosis="Allergic rhinitis",
                notes="Continue antihistamine and avoid dust exposure.",
                prescriptions=["Cetirizine 10mg"],
                vitals={"spo2": "99%", "pulse": "80 bpm"},
                visit_date=now - timedelta(days=24),
            ),
            MedicalHistory(
                patient_user_id=patient_karan.id,
                clinic_id=clinic.id,
                doctor_id=doctors[1].id,
                title="Demo Visit - Contact Dermatitis",
                diagnosis="Mild contact dermatitis",
                notes="Topical treatment and skin-care plan shared.",
                prescriptions=["Hydrocortisone cream", "Moisturizer"],
                vitals={"bp": "116/76"},
                visit_date=now - timedelta(days=17),
                follow_up_date=now - timedelta(days=10),
            ),
        ]
        for entry in history_entries:
            await entry.insert()

        documents = [
            MedicalDocument(
                patient_user_id=patient_aarav.id,
                clinic_id=clinic.id,
                medical_history_id=history_entries[0].id,
                uploaded_by_user_id=users["doctor_alisha"].id,
                title="Demo CBC Report",
                document_type=MedicalDocumentType.LAB_REPORT,
                file_url="https://example.com/docs/demo-cbc-report.pdf",
                description="Complete blood count report",
                tags=["blood", "cbc", "fever"],
                issued_on=now - timedelta(days=10),
            ),
            MedicalDocument(
                patient_user_id=patient_maya.id,
                clinic_id=clinic.id,
                medical_history_id=history_entries[1].id,
                uploaded_by_user_id=users["doctor_alisha"].id,
                title="Demo Allergy Prescription",
                document_type=MedicalDocumentType.PRESCRIPTION,
                file_url="https://example.com/docs/demo-allergy-prescription.pdf",
                description="Prescription for allergy management",
                tags=["prescription", "allergy"],
                issued_on=now - timedelta(days=24),
            ),
            MedicalDocument(
                patient_user_id=patient_karan.id,
                clinic_id=clinic.id,
                medical_history_id=history_entries[2].id,
                uploaded_by_user_id=users["doctor_rohan"].id,
                title="Demo Dermatology Notes",
                document_type=MedicalDocumentType.OTHER,
                file_url="https://example.com/docs/demo-dermatology-notes.pdf",
                description="Dermatology follow-up care notes",
                tags=["dermatology", "notes"],
                issued_on=now - timedelta(days=17),
            ),
        ]
        for document in documents:
            await document.insert()

        reviews = [
            Review(
                clinic_id=clinic.id,
                target_type=ReviewTargetType.CLINIC,
                patient_user_id=patient_maya.id,
                token_id=queue_tokens[4].id,
                rating=5,
                comment="Very organized clinic and fast support from reception.",
                patient_name=patient_maya.name,
            ),
            Review(
                clinic_id=clinic.id,
                doctor_id=doctors[0].id,
                target_type=ReviewTargetType.DOCTOR,
                patient_user_id=patient_maya.id,
                token_id=queue_tokens[4].id,
                rating=5,
                comment="Doctor explained the treatment clearly.",
                patient_name=patient_maya.name,
            ),
            Review(
                clinic_id=clinic.id,
                doctor_id=doctors[1].id,
                target_type=ReviewTargetType.DOCTOR,
                patient_user_id=patient_karan.id,
                token_id=queue_tokens[2].id,
                rating=4,
                comment="Good consultation and practical skin-care advice.",
                patient_name=patient_karan.name,
            ),
        ]
        for review in reviews:
            await review.insert()

        notifications = [
            Notification(
                token_id=queue_tokens[1].id,
                clinic_id=clinic.id,
                channel=NotificationChannel.SMS,
                message="Demo SMS: Please proceed to consultation room 2.",
            ),
            Notification(
                token_id=queue_tokens[2].id,
                clinic_id=clinic.id,
                channel=NotificationChannel.WHATSAPP,
                message="Demo WhatsApp: Your expected wait time is now 18 minutes.",
            ),
            Notification(
                token_id=queue_tokens[3].id,
                clinic_id=clinic.id,
                channel=NotificationChannel.PUSH,
                message="Demo Push: Queue updated, please stay nearby.",
            ),
        ]
        for notification in notifications:
            await notification.insert()

        print(
            "Seed data inserted: "
            "1 clinic, "
            f"{len(doctors)} doctors, {len(users)} users, "
            f"{len(queue_tokens)} queue tokens, {len(history_entries)} history entries, "
            f"{len(documents)} documents, {len(reviews)} reviews, "
            f"{len(notifications)} notifications"
        )

        print("\n--- IDs for Swagger testing ---")
        print(f"  clinic: {clinic.id}  ({clinic.name})")
        for doctor in doctors:
            print(
                f"  doctor: {doctor.id}  "
                f"({doctor.name}, clinic={doctor.clinic_id}, user_id={doctor.user_id})"
            )
        for token in queue_tokens:
            print(
                f"  token:  {token.id}  "
                f"(#{token.token_number} {token.status.value} pos={token.position})"
            )
        for entry in history_entries:
            print(
                f"  history:{entry.id}  "
                f"({entry.title}, patient_user_id={entry.patient_user_id})"
            )
        for document in documents:
            print(
                f"  doc:    {document.id}  "
                f"({document.title}, type={document.document_type.value})"
            )
        for review in reviews:
            target = (
                f"doctor_id={review.doctor_id}" if review.doctor_id else "clinic review"
            )
            print(
                f"  review: {review.id}  "
                f"(rating={review.rating}, {target}, patient={review.patient_name})"
            )
        for notification in notifications:
            print(
                f"  notif:  {notification.id}  "
                f"({notification.channel.value}, token_id={notification.token_id})"
            )

        print("\n--- Demo User Accounts ---")
        ordered_user_keys = [
            "super_admin",
            "admin",
            "doctor_alisha",
            "doctor_rohan",
            "receptionist",
            "patient_aarav",
            "patient_maya",
            "patient_karan",
        ]
        for key in ordered_user_keys:
            user = users[key]
            clinic_scope = str(user.clinic_id) if user.clinic_id else "None"
            print(
                f"  {user.role.value:<12} | {user.name:<22} | "
                f"{user.email:<36} | clinic_id={clinic_scope} | user_id={user.id}"
            )

        print(f"\nDemo logins (password for all: {DEMO_PASSWORD})")
        print(f"  ✅ {_email('superadmin')}      -> Super Admin panel (/super-admin)")
        print(f"  ✅ {_email('admin')}           -> Clinic Admin panel (/admin)")
        print(f"  ✅ {_email('doctor.alisha')}   -> Doctor panel (/doctor)")
        print(f"  ✅ {_email('doctor.rohan')}    -> Doctor panel (/doctor)")
        print(f"  ✅ {_email('receptionist')}    -> Reception panel (/receptionist)")
        print(f"  ✅ {_email('patient.aarav')}   -> Patient dashboard (/patient/dashboard)")
        print(f"  ✅ {_email('patient.maya')}    -> Patient dashboard (/patient/dashboard)")
        print(f"  ✅ {_email('patient.karan')}   -> Patient dashboard (/patient/dashboard)")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(seed_data())
