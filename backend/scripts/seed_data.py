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

        await MedicalDocument.find({"title": {"$regex": r"^Demo "}}).delete()
        await MedicalHistory.find({"title": {"$regex": r"^Demo Visit"}}).delete()
        await Review.find({"patient_name": {"$regex": r"^Demo Patient"}}).delete()
        await QueueToken.find({"patient_phone": {"$regex": r"^\+91000000"}}).delete()
        await Doctor.find({"name": {"$regex": r"^Demo Dr\."}}).delete()
        await Clinic.find({"phone": {"$regex": r"^\+91110000"}}).delete()
        await User.find({"email": {"$regex": r"@demo\.carequeue\.local$"}}).delete()

        clinics = [
            Clinic(
                name="Demo City Clinic",
                location={"type": "Point", "coordinates": [77.2090, 28.6139]},
                address="Connaught Place, New Delhi",
                phone="+911100000001",
                specializations=["general", "fever", "family medicine"],
                opening_hours={"mon_sat": "09:00-18:00"},
                avg_consult_time=8,
                is_open=True,
                rating=4.5,
                delay_buffer=5,
                verification_status=ClinicVerificationStatus.APPROVED,
            ),
            Clinic(
                name="Demo Care Plus",
                location={"type": "Point", "coordinates": [77.2300, 28.6200]},
                address="Barakhamba Road, New Delhi",
                phone="+911100000002",
                specializations=["pediatrics", "general"],
                opening_hours={"mon_sat": "10:00-19:00"},
                avg_consult_time=10,
                is_open=True,
                rating=4.3,
                delay_buffer=3,
                verification_status=ClinicVerificationStatus.APPROVED,
            ),
            Clinic(
                name="Demo Health Hub",
                location={"type": "Point", "coordinates": [77.1900, 28.6000]},
                address="Lodhi Road, New Delhi",
                phone="+911100000003",
                specializations=["orthopedics", "general"],
                opening_hours={"mon_sat": "08:30-17:30"},
                avg_consult_time=12,
                is_open=False,
                rating=4.2,
                delay_buffer=0,
                verification_status=ClinicVerificationStatus.APPROVED,
            ),
        ]
        for clinic in clinics:
            await clinic.insert()

        clinic_one, clinic_two, clinic_three = clinics
        demo_password_hash = hash_password("password123")

        admin_user = User(
            clinic_id=clinic_one.id,
            role=UserRole.ADMIN,
            name="Demo Admin",
            email="admin@demo.carequeue.local",
            password_hash=demo_password_hash,
            is_active=True,
        )
        doctor_user = User(
            clinic_id=clinic_one.id,
            role=UserRole.DOCTOR,
            name="Demo Doctor",
            email="doctor@demo.carequeue.local",
            password_hash=demo_password_hash,
            is_active=True,
        )
        receptionist_user = User(
            clinic_id=clinic_one.id,
            role=UserRole.RECEPTIONIST,
            name="Demo Receptionist",
            email="receptionist@demo.carequeue.local",
            password_hash=demo_password_hash,
            is_active=True,
        )
        super_admin_user = User(
            clinic_id=None,
            role=UserRole.SUPER_ADMIN,
            name="Demo Super Admin",
            email="superadmin@demo.carequeue.local",
            password_hash=demo_password_hash,
            is_active=True,
        )
        patient_user = User(
            clinic_id=None,
            role=UserRole.PATIENT,
            name="Demo Patient",
            email="patient@demo.carequeue.local",
            phone="+919900001111",
            password_hash=demo_password_hash,
            is_active=True,
        )
        users = [admin_user, doctor_user, receptionist_user, super_admin_user, patient_user]
        for user in users:
            await user.insert()

        doctors = [
            Doctor(
                clinic_id=clinic_one.id,
                user_id=doctor_user.id,
                name="Demo Dr. Priya Sharma",
                specialization="General Physician",
                avg_consult_mins=8,
                is_available=True,
            ),
            Doctor(
                clinic_id=clinic_one.id,
                user_id=PydanticObjectId(),
                name="Demo Dr. Arjun Mehta",
                specialization="Pediatrics",
                avg_consult_mins=10,
                is_available=True,
                delay_mins=5,
            ),
            Doctor(
                clinic_id=clinic_two.id,
                user_id=PydanticObjectId(),
                name="Demo Dr. Neha Kapoor",
                specialization="General Physician",
                avg_consult_mins=9,
                is_available=True,
            ),
            Doctor(
                clinic_id=clinic_two.id,
                user_id=PydanticObjectId(),
                name="Demo Dr. Rohan Iyer",
                specialization="Dermatology",
                avg_consult_mins=12,
                is_available=False,
            ),
            Doctor(
                clinic_id=clinic_three.id,
                user_id=PydanticObjectId(),
                name="Demo Dr. Sana Khan",
                specialization="Orthopedics",
                avg_consult_mins=15,
                is_available=True,
            ),
        ]
        for doctor in doctors:
            await doctor.insert()

        now = datetime.now(timezone.utc)
        today = now.date().isoformat()
        queue_tokens = [
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
            for position, (token_number, status) in enumerate(
                [
                    (101, QueueStatus.IN_CONSULTATION),
                    (102, QueueStatus.CALLED),
                    (103, QueueStatus.WAITING),
                    (104, QueueStatus.WAITING),
                    (105, QueueStatus.EMERGENCY),
                    (106, QueueStatus.SKIPPED),
                    (107, QueueStatus.WAITING),
                    (108, QueueStatus.WAITING),
                ],
                start=1,
            )
        ]
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
                uploaded_by_user_id=doctor_user.id,
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

        print(
            "Seed data inserted: "
            f"{len(clinics)} clinics, {len(doctors)} doctors, "
            f"{len(users)} users, "
            f"{len(queue_tokens)} queue tokens, "
            f"{len(history_entries)} history entries, {len(documents)} documents"
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
        print("\nDemo logins:")
        print("  admin@demo.carequeue.local / password123")
        print("  doctor@demo.carequeue.local / password123")
        print("  receptionist@demo.carequeue.local / password123")
        print("  superadmin@demo.carequeue.local / password123")
        print("  patient@demo.carequeue.local / password123")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(seed_data())
