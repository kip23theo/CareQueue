# ClinicFlow MongoDB Schema

## `clinics`

Stores clinic profile, location, operating state, and queue timing defaults.

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
| `rating` | Float | Average clinic rating |
| `delay_buffer` | Int | Extra buffer minutes added to ETA |

Relationships: referenced by `users.clinic_id`, `doctors.clinic_id`, `queue_tokens.clinic_id`, `notifications.clinic_id`, and `reviews.clinic_id`.

Index notes: create `2dsphere` index on `location`.

## `users`

Stores clinic staff accounts for admins, doctors, and receptionists.

| Field | Type | Description |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `clinic_id` | ObjectId | FK to `clinics._id` |
| `role` | String | `admin`, `doctor`, or `recept` |
| `name` | String | Staff member name |
| `email` | String | Login email |
| `password_hash` | String | Hashed password |
| `is_active` | Bool | Account active flag |

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

Relationships: `clinic_id` references `clinics._id`; `user_id` references `users._id`.

Index notes: compound index on `clinic_id` and `is_available`.

## `queue_tokens`

Hot collection for all real-time queue reads and writes.

| Field | Type | Description |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `clinic_id` | ObjectId | FK to `clinics._id` |
| `doctor_id` | ObjectId | FK to `doctors._id` |
| `token_number` | Int | Daily token number |
| `patient_name` | String | Patient name |
| `patient_phone` | String | Patient phone number |
| `patient_age` | Int | Patient age |
| `symptoms` | String | Patient symptoms |
| `status` | Enum | `WAITING`, `CALLED`, `IN_CONSULTATION`, `COMPLETED`, `SKIPPED`, `CANCELLED`, `NO_SHOW`, or `EMERGENCY` |
| `position` | Int | Current queue position |
| `est_wait_mins` | Int | Current estimated wait time |
| `joined_at` | DateTime | Queue join time |
| `called_at` | DateTime | Time patient was called |
| `consult_start` | DateTime | Consultation start time |
| `consult_end` | DateTime | Consultation end time |
| `date` | DateString | Queue date, used for daily filtering |

Relationships: `clinic_id` references `clinics._id`; `doctor_id` references `doctors._id`.

Index notes: compound indexes on `clinic_id + date`, `status`, and `position`. Keep indexes tight because this is the hot collection.

## `notifications`

Stores notification send attempts and delivery status.

| Field | Type | Description |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `token_id` | ObjectId | FK to `queue_tokens._id` |
| `clinic_id` | ObjectId | FK to `clinics._id` |
| `channel` | String | `sms`, `whatsapp`, or `push` |
| `message` | String | Notification text |
| `status` | String | `sent` or `failed` |
| `sent_at` | DateTime | Send timestamp |

Relationships: `token_id` references `queue_tokens._id`; `clinic_id` references `clinics._id`.

Index notes: compound index on `token_id` and `sent_at`.

## `reviews`

Stores patient reviews submitted after visits.

| Field | Type | Description |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `clinic_id` | ObjectId | FK to `clinics._id` |
| `token_id` | ObjectId | FK to `queue_tokens._id` |
| `rating` | Int | Rating from 1 to 5 |
| `comment` | String | Review comment |
| `created_at` | DateTime | Review creation time |

Relationships: `clinic_id` references `clinics._id`; `token_id` references `queue_tokens._id`.

Index notes: index on `clinic_id`.
