import asyncio
import hashlib
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from beanie import PydanticObjectId, init_beanie
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

        await Notification.find({"message": {"$regex": r"^Demo "}}).delete()
        await MedicalDocument.find({"title": {"$regex": r"^Demo "}}).delete()
        await MedicalHistory.find({"title": {"$regex": r"^Demo Visit"}}).delete()
        await Review.find({"patient_name": {"$regex": r"^Demo Patient"}}).delete()
        await QueueToken.find({"patient_phone": {"$regex": r"^\+91000000"}}).delete()
        await Doctor.find({"name": {"$regex": r"^Demo Dr\."}}).delete()
        await Clinic.find({"phone": {"$regex": r"^\+91110000"}}).delete()
        demo_email_local_parts = [
            "admin",
            "doctor",
            "receptionist",
            "admin2",
            "doctor2",
            "receptionist2",
            "pendingadmin",
            "rejectedadmin",
            "superadmin",
            "patient",
        ]
        demo_emails = [
            f"{local_part}@{domain}"
            for local_part in demo_email_local_parts
            for domain in ("demo.carequeue.local", "gmail.com")
        ]
        await User.find({"email": {"$in": demo_emails}}).delete()

        clinic_one = Clinic(
            name="Demo City Clinic",
            location={"type": "Point", "coordinates": [77.2090, 28.6139]},
            clinic_image="https://images.unsplash.com/photo-1586773860418-d37222d8fce3",
            address="Connaught Place, New Delhi",
            phone="+911100000001",
            specializations=["general", "fever", "family medicine"],
            opening_hours={"mon_sat": "09:00-18:00"},
            avg_consult_time=8,
            is_open=True,
            rating=4.5,
            delay_buffer=5,
            verification_status=ClinicVerificationStatus.APPROVED,
        )
        clinic_two = Clinic(
            name="Demo Care Plus",
            location={"type": "Point", "coordinates": [77.2300, 28.6200]},
            clinic_image="https://images.unsplash.com/photo-1666214280557-f1b5022eb634",
            address="Barakhamba Road, New Delhi",
            phone="+911100000002",
            specializations=["pediatrics", "general"],
            opening_hours={"mon_sat": "10:00-19:00"},
            avg_consult_time=10,
            is_open=True,
            rating=4.3,
            delay_buffer=3,
            verification_status=ClinicVerificationStatus.APPROVED,
        )
        clinic_three = Clinic(
            name="Demo Health Hub",
            location={"type": "Point", "coordinates": [77.1900, 28.6000]},
            clinic_image="https://images.unsplash.com/photo-1516549655169-df83a0774514",
            address="Lodhi Road, New Delhi",
            phone="+911100000003",
            specializations=["orthopedics", "general"],
            opening_hours={"mon_sat": "08:30-17:30"},
            avg_consult_time=12,
            is_open=False,
            rating=4.2,
            delay_buffer=0,
            verification_status=ClinicVerificationStatus.APPROVED,
        )
        clinic_pending = Clinic(
            name="Demo Pending Clinic",
            location={"type": "Point", "coordinates": [77.2500, 28.6500]},
            clinic_image="https://images.unsplash.com/photo-1538108149393-fbbd81895907",
            address="Karol Bagh, New Delhi",
            phone="+911100000004",
            specializations=["general"],
            opening_hours={"mon_sat": "09:00-17:00"},
            avg_consult_time=9,
            is_open=False,
            rating=0.0,
            delay_buffer=0,
            verification_status=ClinicVerificationStatus.PENDING,
        )
        clinic_rejected = Clinic(
            name="Demo Rejected Clinic",
            location={"type": "Point", "coordinates": [77.1600, 28.5800]},
            clinic_image="https://images.unsplash.com/photo-1580281657702-257584239a1d",
            address="Nizamuddin, New Delhi",
            phone="+911100000005",
            specializations=["general"],
            opening_hours={"mon_sat": "09:00-17:00"},
            avg_consult_time=9,
            is_open=False,
            rating=0.0,
            delay_buffer=0,
            verification_status=ClinicVerificationStatus.REJECTED,
            rejection_reason="Missing license document",
        )

        clinics = [clinic_one, clinic_two, clinic_three, clinic_pending, clinic_rejected]
        for clinic in clinics:
            await clinic.insert()

        demo_password_hash = hash_password("password123")

        admin_user = User(
            clinic_id=clinic_one.id,
            role=UserRole.ADMIN,
            name="Demo Admin",
            email="admin@gmail.com",
            password_hash=demo_password_hash,
            is_active=True,
        )
        doctor_user = User(
            clinic_id=clinic_one.id,
            role=UserRole.DOCTOR,
            name="Demo Doctor",
            email="doctor@gmail.com",
            password_hash=demo_password_hash,
            is_active=True,
        )
        receptionist_user = User(
            clinic_id=clinic_one.id,
            role=UserRole.RECEPTIONIST,
            name="Demo Receptionist",
            email="receptionist@gmail.com",
            password_hash=demo_password_hash,
            is_active=True,
        )
        admin_user_two = User(
            clinic_id=clinic_two.id,
            role=UserRole.ADMIN,
            name="Demo Admin Two",
            email="admin2@gmail.com",
            password_hash=demo_password_hash,
            is_active=True,
        )
        doctor_user_two = User(
            clinic_id=clinic_two.id,
            role=UserRole.DOCTOR,
            name="Demo Doctor Two",
            email="doctor2@gmail.com",
            password_hash=demo_password_hash,
            is_active=True,
        )
        receptionist_user_two = User(
            clinic_id=clinic_two.id,
            role=UserRole.RECEPTIONIST,
            name="Demo Receptionist Two",
            email="receptionist2@gmail.com",
            password_hash=demo_password_hash,
            is_active=True,
        )
        pending_admin_user = User(
            clinic_id=clinic_pending.id,
            role=UserRole.ADMIN,
            name="Demo Pending Admin",
            email="pendingadmin@gmail.com",
            password_hash=demo_password_hash,
            is_active=True,
        )
        rejected_admin_user = User(
            clinic_id=clinic_rejected.id,
            role=UserRole.ADMIN,
            name="Demo Rejected Admin",
            email="rejectedadmin@gmail.com",
            password_hash=demo_password_hash,
            is_active=True,
        )
        super_admin_user = User(
            clinic_id=None,
            role=UserRole.SUPER_ADMIN,
            name="Demo Super Admin",
            email="superadmin@gmail.com",
            password_hash=demo_password_hash,
            is_active=True,
        )
        patient_user = User(
            clinic_id=None,
            role=UserRole.PATIENT,
            name="Demo Patient",
            email="patient@gmail.com",
            phone="+919900001111",
            password_hash=demo_password_hash,
            is_active=True,
        )
        users = [
            admin_user,
            doctor_user,
            receptionist_user,
            admin_user_two,
            doctor_user_two,
            receptionist_user_two,
            pending_admin_user,
            rejected_admin_user,
            super_admin_user,
            patient_user,
        ]
        for user in users:
            await user.insert()

        doctors = [
            Doctor(
                clinic_id=clinic_one.id,
                user_id=doctor_user.id,
                name="Demo Dr. Priya Sharma",
                doctor_image="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d",
                specialization="General Physician",
                avg_consult_mins=8,
                is_available=True,
            ),
            Doctor(
                clinic_id=clinic_one.id,
                user_id=PydanticObjectId(),
                name="Demo Dr. Arjun Mehta",
                doctor_image="https://images.unsplash.com/photo-1537368910025-700350fe46c7",
                specialization="Pediatrics",
                avg_consult_mins=10,
                is_available=True,
                delay_mins=5,
            ),
            Doctor(
                clinic_id=clinic_two.id,
                user_id=doctor_user_two.id,
                name="Demo Dr. Neha Kapoor",
                doctor_image="https://images.unsplash.com/photo-1651008376811-b90baee60c1f",
                specialization="General Physician",
                avg_consult_mins=9,
                is_available=True,
            ),
            Doctor(
                clinic_id=clinic_two.id,
                user_id=PydanticObjectId(),
                name="Demo Dr. Rohan Iyer",
                doctor_image="https://images.unsplash.com/photo-1559839734-2b71ea197ec2",
                specialization="Dermatology",
                avg_consult_mins=12,
                is_available=False,
            ),
            Doctor(
                clinic_id=clinic_three.id,
                user_id=PydanticObjectId(),
                name="Demo Dr. Sana Khan",
                doctor_image="https://images.unsplash.com/photo-1594824475317-d7f8f29613b6",
                specialization="Orthopedics",
                avg_consult_mins=15,
                is_available=True,
            ),
        ]
        for doctor in doctors:
            await doctor.insert()

        now = datetime.now(timezone.utc)
        today = now.date().isoformat()
        queue_tokens = []
        clinic_one_statuses = [
            (101, QueueStatus.IN_CONSULTATION),
            (102, QueueStatus.CALLED),
            (103, QueueStatus.WAITING),
            (104, QueueStatus.WAITING),
            (105, QueueStatus.EMERGENCY),
            (106, QueueStatus.SKIPPED),
            (107, QueueStatus.WAITING),
            (108, QueueStatus.WAITING),
            (109, QueueStatus.COMPLETED),
            (110, QueueStatus.NO_SHOW),
            (111, QueueStatus.CANCELLED),
        ]
        for position, (token_number, status) in enumerate(clinic_one_statuses, start=1):
            queue_tokens.append(
                QueueToken(
                    clinic_id=clinic_one.id,
                    doctor_id=doctors[0].id,
                    token_number=token_number,
                    patient_name=f"Demo Patient {position}",
                    patient_phone=f"+91000000{position:04d}",
                    patient_age=22 + position,
                    symptoms="Fever and headache",
                    status=status,
                    position=position,
                    est_wait_mins=position * clinic_one.avg_consult_time,
                    joined_at=now - timedelta(minutes=position * 6),
                    date=today,
                )
            )

        queue_tokens.extend(
            [
                QueueToken(
                    clinic_id=clinic_two.id,
                    doctor_id=doctors[2].id,
                    token_number=201,
                    patient_name="Demo Patient Secondary 1",
                    patient_phone="+910000009001",
                    patient_age=30,
                    symptoms="Allergy flare up",
                    status=QueueStatus.WAITING,
                    position=1,
                    est_wait_mins=clinic_two.avg_consult_time,
                    joined_at=now - timedelta(minutes=10),
                    date=today,
                ),
                QueueToken(
                    clinic_id=clinic_two.id,
                    doctor_id=doctors[2].id,
                    token_number=202,
                    patient_name="Demo Patient Secondary 2",
                    patient_phone="+910000009002",
                    patient_age=34,
                    symptoms="Skin rash",
                    status=QueueStatus.CALLED,
                    position=2,
                    est_wait_mins=0,
                    joined_at=now - timedelta(minutes=20),
                    date=today,
                ),
            ]
        )

        for queue_token in queue_tokens:
            await queue_token.insert()

        history_entries = [
            MedicalHistory(
                patient_user_id=patient_user.id,
                clinic_id=clinic_one.id,
                doctor_id=doctors[0].id,
                title="Demo Visit - Viral Fever",
                diagnosis="Viral fever with mild dehydration",
                notes="Patient advised rest and hydration for 3 days.",
                prescriptions=["Paracetamol 650mg", "ORS sachet"],
                vitals={"temperature": "100.2 F", "bp": "118/78"},
                visit_date=now - timedelta(days=12),
            ),
            MedicalHistory(
                patient_user_id=patient_user.id,
                clinic_id=clinic_two.id,
                doctor_id=doctors[2].id,
                title="Demo Visit - Seasonal Allergy",
                diagnosis="Allergic rhinitis",
                notes="Avoid dust exposure and continue antihistamine for 5 days.",
                prescriptions=["Cetirizine 10mg"],
                vitals={"spo2": "99%", "pulse": "80 bpm"},
                visit_date=now - timedelta(days=45),
                follow_up_date=now - timedelta(days=38),
            ),
        ]
        for entry in history_entries:
            await entry.insert()

        documents = [
            MedicalDocument(
                patient_user_id=patient_user.id,
                clinic_id=clinic_one.id,
                medical_history_id=history_entries[0].id,
                uploaded_by_user_id=doctor_user.id,
                title="Demo CBC Report",
                document_type=MedicalDocumentType.LAB_REPORT,
                file_url="https://example.com/docs/demo-cbc-report.pdf",
                description="Complete blood count report",
                tags=["blood", "cbc", "fever"],
                issued_on=now - timedelta(days=12),
            ),
            MedicalDocument(
                patient_user_id=patient_user.id,
                clinic_id=clinic_two.id,
                medical_history_id=history_entries[1].id,
                uploaded_by_user_id=doctor_user_two.id,
                title="Demo Allergy Prescription",
                document_type=MedicalDocumentType.PRESCRIPTION,
                file_url="https://example.com/docs/demo-allergy-prescription.pdf",
                description="Prescription for allergy management",
                tags=["prescription", "allergy"],
                issued_on=now - timedelta(days=45),
            ),
        ]
        for document in documents:
            await document.insert()

        reviews = [
            Review(
                clinic_id=clinic_one.id,
                target_type=ReviewTargetType.CLINIC,
                patient_user_id=patient_user.id,
                token_id=queue_tokens[0].id,
                rating=5,
                comment="Very organized clinic and short wait time.",
                patient_name="Demo Patient",
            ),
            Review(
                clinic_id=clinic_one.id,
                doctor_id=doctors[0].id,
                target_type=ReviewTargetType.DOCTOR,
                patient_user_id=patient_user.id,
                token_id=queue_tokens[0].id,
                rating=5,
                comment="Doctor explained everything clearly.",
                patient_name="Demo Patient",
            ),
            Review(
                clinic_id=clinic_one.id,
                target_type=ReviewTargetType.CLINIC,
                patient_user_id=patient_user.id,
                token_id=queue_tokens[1].id,
                rating=4,
                comment="Reception team was helpful.",
                patient_name="Demo Patient",
            ),
        ]
        for review in reviews:
            await review.insert()

        notifications = [
            Notification(
                token_id=queue_tokens[1].id,
                clinic_id=clinic_one.id,
                channel=NotificationChannel.SMS,
                message="Demo SMS: Please proceed to consultation room 2.",
            ),
            Notification(
                token_id=queue_tokens[10].id,
                clinic_id=clinic_one.id,
                channel=NotificationChannel.WHATSAPP,
                message="Demo WhatsApp: Your token was marked as cancelled.",
            ),
        ]
        for notification in notifications:
            await notification.insert()

        print(
            "Seed data inserted: "
            f"{len(clinics)} clinics, {len(doctors)} doctors, "
            f"{len(users)} users, "
            f"{len(queue_tokens)} queue tokens, "
            f"{len(history_entries)} history entries, {len(documents)} documents, "
            f"{len(reviews)} reviews, {len(notifications)} notifications"
        )
        print("\n--- IDs for Swagger testing ---")
        for c in clinics:
            print(f"  clinic: {c.id}  ({c.name})")
        for d in doctors:
            print(f"  doctor: {d.id}  ({d.name}, clinic={d.clinic_id})")
        for qt in queue_tokens:
            print(
                f"  token:  {qt.id}  "
                f"(#{qt.token_number} {qt.status.value} pos={qt.position})"
            )
        print("\nDemo logins (password for all: password123)")
        print("  ✅ superadmin@gmail.com      -> Super Admin panel (/super-admin)")
        print("  ✅ admin@gmail.com           -> Clinic 1 Admin panel (/admin)")
        print("  ✅ doctor@gmail.com          -> Clinic 1 Doctor panel (/doctor)")
        print("  ✅ receptionist@gmail.com    -> Clinic 1 Reception panel (/receptionist)")
        print("  ✅ admin2@gmail.com          -> Clinic 2 Admin panel (/admin)")
        print("  ✅ doctor2@gmail.com         -> Clinic 2 Doctor panel (/doctor)")
        print("  ✅ receptionist2@gmail.com   -> Clinic 2 Reception panel (/receptionist)")
        print("  ✅ patient@gmail.com         -> Patient dashboard (/patient/dashboard)")
        print("  ⛔ pendingadmin@gmail.com    -> Login blocked (pending verification)")
        print("  ⛔ rejectedadmin@gmail.com   -> Login blocked (rejected verification)")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(seed_data())
