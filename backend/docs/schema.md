# CareQueue MongoDB Schema

## `clinics`

Stores clinic profile, location, operating state, queue timing defaults, and verification status.

| Field | Type | Description |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `name` | String | Clinic name |
| `location` | GeoJSON | Clinic coordinates for nearby search |
| `address` | String | Display address |
| `phone` | String | Clinic contact number |
| `specializations` | [String] | Available clinic specialties |
| `opening_hours` | Object | Weekly opening schedule |
| `avg_consult_time` | Int | Default consultation time in minutes |
| `is_open` | Bool | Current opening status |
| `rating` | Float | Average clinic rating (auto-updated from reviews) |
| `delay_buffer` | Int | Extra buffer minutes added to ETA |
| `verification_status` | Enum | `pending`, `approved`, or `rejected` |
| `verified_at` | DateTime | When verification decision was made |
| `verified_by` | ObjectId | FK to `users._id` (super admin who verified) |
| `rejection_reason` | String | Reason if rejected |
| `created_at` | DateTime | Auto-set on creation |
| `updated_at` | DateTime | Auto-set on update |

Relationships: referenced by `users.clinic_id`, `doctors.clinic_id`, `queue_tokens.clinic_id`, `notifications.clinic_id`, and `reviews.clinic_id`.

Index notes: `2dsphere` on `location`, ascending on `verification_status`.

## `users`

Stores all user accounts: super admins, clinic admins, doctors, receptionists, and patients.

| Field | Type | Description |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `clinic_id` | ObjectId | FK to `clinics._id` (null for super_admin and patient) |
| `role` | Enum | `super_admin`, `admin`, `doctor`, `receptionist`, or `patient` |
| `name` | String | User name |
| `email` | String | Login email (unique) |
| `phone` | String | Phone number (optional) |
| `password_hash` | String | SHA-256 hashed password |
| `is_active` | Bool | Account active flag |
| `created_at` | DateTime | Auto-set on creation |
| `updated_at` | DateTime | Auto-set on update |

Relationships: `clinic_id` references `clinics._id`.

Index notes: unique index on `email`.

## `doctors`

Stores doctor profile, queue settings, and availability.

| Field | Type | Description |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `clinic_id` | ObjectId | FK to `clinics._id` |
| `user_id` | ObjectId | FK to `users._id` |
| `name` | String | Doctor name |
| `specialization` | String | Doctor specialization |
| `avg_consult_mins` | Int | Average consultation duration |
| `is_available` | Bool | Whether doctor can accept patients |
| `delay_mins` | Int | Current delay added to ETA |
| `completed_today` | Int | Completed consultations for the day |
| `created_at` | DateTime | Auto-set on creation |
| `updated_at` | DateTime | Auto-set on update |

Relationships: `clinic_id` references `clinics._id`; `user_id` references `users._id`.

Index notes: compound index on `clinic_id` and `is_available`.

## `queue_tokens`

Hot collection for all real-time queue reads and writes.

| Field | Type | Description |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `clinic_id` | ObjectId | FK to `clinics._id` |
| `doctor_id` | ObjectId | FK to `doctors._id` (auto-assigned if not specified) |
| `token_number` | Int | Daily token number |
| `patient_name` | String | Patient name |
| `patient_phone` | String | Patient phone number |
| `patient_age` | Int | Patient age (optional) |
| `symptoms` | String | Patient symptoms |
| `status` | Enum | `WAITING`, `CALLED`, `IN_CONSULTATION`, `COMPLETED`, `SKIPPED`, `CANCELLED`, `NO_SHOW`, or `EMERGENCY` |
| `position` | Int | Current queue position |
| `est_wait_mins` | Int | Current estimated wait time |
| `joined_at` | DateTime | Queue join time |
| `called_at` | DateTime | Time patient was called |
| `consult_start` | DateTime | Consultation start time |
| `consult_end` | DateTime | Consultation end time |
| `date` | DateString | Queue date YYYY-MM-DD, used for daily filtering |
| `created_at` | DateTime | Auto-set on creation |
| `updated_at` | DateTime | Auto-set on update |

Relationships: `clinic_id` references `clinics._id`; `doctor_id` references `doctors._id`.

Index notes: compound indexes on `clinic_id + date`, `status`, and `position`.

## `notifications`

Stores notification send attempts and delivery status.

| Field | Type | Description |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `token_id` | ObjectId | FK to `queue_tokens._id` |
| `clinic_id` | ObjectId | FK to `clinics._id` |
| `channel` | Enum | `sms`, `whatsapp`, or `push` |
| `message` | String | Notification text |
| `status` | Enum | `sent` or `failed` |
| `sent_at` | DateTime | Send timestamp |
| `created_at` | DateTime | Auto-set on creation |
| `updated_at` | DateTime | Auto-set on update |

Relationships: `token_id` references `queue_tokens._id`; `clinic_id` references `clinics._id`.

Index notes: compound index on `token_id` and `sent_at`.

## `reviews`

Stores patient reviews for clinics and doctors.

| Field | Type | Description |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `clinic_id` | ObjectId | FK to `clinics._id` |
| `doctor_id` | ObjectId | FK to `doctors._id` (required for doctor reviews) |
| `patient_user_id` | ObjectId | FK to `users._id` (patient who wrote the review) |
| `token_id` | ObjectId | FK to `queue_tokens._id` (optional) |
| `target_type` | Enum | `clinic` or `doctor` |
| `rating` | Int | Rating from 1 to 5 |
| `comment` | String | Review comment |
| `patient_name` | String | Reviewer display name |
| `created_at` | DateTime | Auto-set on creation |
| `updated_at` | DateTime | Auto-set on update |

Relationships: `clinic_id` references `clinics._id`; `doctor_id` references `doctors._id`; `patient_user_id` references `users._id`.

Index notes: indexes on `clinic_id`, `doctor_id`, and `target_type`.

## `medical_history`

Stores patient visit records, diagnoses, and prescriptions.

| Field | Type | Description |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `patient_user_id` | ObjectId | FK to `users._id` (patient role) |
| `clinic_id` | ObjectId | FK to `clinics._id` (optional) |
| `doctor_id` | ObjectId | FK to `doctors._id` (optional) |
| `title` | String | Visit title |
| `diagnosis` | String | Diagnosis text |
| `notes` | String | Doctor notes |
| `prescriptions` | [String] | List of prescriptions |
| `vitals` | Object | Key-value vitals (e.g. `{"bp": "120/80"}`) |
| `visit_date` | DateTime | Date of visit |
| `follow_up_date` | DateTime | Scheduled follow-up (optional) |
| `created_at` | DateTime | Auto-set on creation |
| `updated_at` | DateTime | Auto-set on update |

Index notes: compound index on `patient_user_id + visit_date`, indexes on `clinic_id` and `doctor_id`.

## `medical_documents`

Stores metadata for uploaded medical documents (lab reports, prescriptions, scans).

| Field | Type | Description |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `patient_user_id` | ObjectId | FK to `users._id` (patient role) |
| `clinic_id` | ObjectId | FK to `clinics._id` (optional) |
| `medical_history_id` | ObjectId | FK to `medical_history._id` (optional) |
| `uploaded_by_user_id` | ObjectId | FK to `users._id` (optional) |
| `title` | String | Document title |
| `document_type` | Enum | `lab_report`, `prescription`, `discharge_summary`, `scan`, or `other` |
| `file_url` | String | URL to the uploaded file |
| `description` | String | Document description |
| `tags` | [String] | Searchable tags |
| `issued_on` | DateTime | Document issue date (optional) |
| `created_at` | DateTime | Auto-set on creation |
| `updated_at` | DateTime | Auto-set on update |

Index notes: compound index on `patient_user_id + created_at`, indexes on `clinic_id` and `medical_history_id`.
