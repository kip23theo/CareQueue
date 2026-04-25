// ── Auth ────────────────────────────────────────────────
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: 'bearer'
  user: {
    id: string
    name: string
    email: string
    role: 'super_admin' | 'admin' | 'doctor' | 'receptionist' | 'patient'
    clinic_id: string | null
    phone?: string | null
  }
}

export interface RegisterPatientRequest {
  name: string
  email: string
  phone?: string
  password: string
}

export interface RegisterPatientResponse {
  id: string
  name: string
  email: string
  role: 'patient'
  phone?: string | null
}

export interface RegisterClinicStaffInput {
  name: string
  email: string
  password: string
  role: 'doctor' | 'receptionist'
  specialization?: string
  avg_consult_mins?: number
}

export interface RegisterClinicRequest {
  clinic_name: string
  address: string
  phone: string
  latitude: number
  longitude: number
  specializations?: string[]
  opening_hours?: Record<string, unknown>
  avg_consult_time?: number
  delay_buffer?: number
  admin_name: string
  admin_email: string
  admin_password: string
  staff?: RegisterClinicStaffInput[]
}

export interface RegisterClinicResponse {
  message: string
  clinic_id: string
  verification_status: 'pending' | 'approved' | 'rejected'
}

// ── Clinic ──────────────────────────────────────────────
export interface GeoLocation {
  type: 'Point'
  coordinates: [number, number] // [lng, lat]
}

export interface OpeningHours {
  monday: { open: string; close: string } | null
  tuesday: { open: string; close: string } | null
  wednesday: { open: string; close: string } | null
  thursday: { open: string; close: string } | null
  friday: { open: string; close: string } | null
  saturday: { open: string; close: string } | null
  sunday: { open: string; close: string } | null
}

export interface Clinic {
  _id: string
  name: string
  address: string
  location: GeoLocation
  phone: string
  specializations: string[]
  opening_hours: OpeningHours
  avg_consult_time: number        // minutes
  is_open: boolean
  rating: number                  // 1.0 – 5.0
  delay_buffer: number            // extra minutes
  verification_status?: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string | null
  // Computed live fields (returned by /clinics/nearby)
  distance_km?: number
  queue_length?: number
  est_wait_mins?: number
}

export interface NearbyClinicRequest {
  lat: number
  lng: number
  radius?: number                 // meters, default 5000
}

// ── Doctor ──────────────────────────────────────────────
export interface Doctor {
  _id: string
  clinic_id: string
  user_id: string
  name: string
  specialization: string
  avg_consult_mins: number
  is_available: boolean
  delay_mins: number
  completed_today: number
}

export interface UpdateDoctorAvailabilityRequest {
  is_available: boolean
}

export interface UpdateDoctorDelayRequest {
  delay_mins: number
}

// ── Queue Token ─────────────────────────────────────────
export type TokenStatus =
  | 'WAITING'
  | 'CALLED'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'CANCELLED'
  | 'EMERGENCY'
  | 'NO_SHOW'

export interface QueueToken {
  _id: string
  clinic_id: string
  doctor_id: string
  token_number: number
  token_display: string           // e.g. "A07"
  patient_name: string
  patient_phone: string
  patient_age: number
  patient_gender?: 'male' | 'female' | 'other'
  symptoms?: string
  status: TokenStatus
  position: number                // 1-indexed position in WAITING queue
  est_wait_mins: number
  joined_at: string               // ISO datetime
  called_at?: string
  consult_start?: string
  consult_end?: string
  date: string                    // "YYYY-MM-DD"
  is_walkin: boolean
}

// ── Patient join request ────────────────────────────────
export interface JoinQueueRequest {
  clinic_id: string
  doctor_id: string
  patient_name: string
  patient_phone: string
  patient_age: number
  patient_gender?: 'male' | 'female' | 'other'
  symptoms?: string
}

export interface JoinQueueResponse {
  token: QueueToken
  message: string
}

// ── Receptionist add walk-in ────────────────────────────
export interface AddWalkinRequest {
  clinic_id: string
  doctor_id: string
  patient_name: string
  patient_phone: string
  patient_age: number
  patient_gender?: 'male' | 'female' | 'other'
  symptoms?: string
}

// ── Queue management ────────────────────────────────────
export interface LiveQueue {
  clinic_id: string
  date: string
  tokens?: QueueToken[]
  current_token: QueueToken | null
  waiting: QueueToken[]
  called: QueueToken[]
  completed_count: number
  skipped_count: number
  no_show_count: number
}

// ── Doctor queue view ───────────────────────────────────
export interface DoctorQueue {
  current: QueueToken | null
  next_five: QueueToken[]
  waiting_count: number
  completed_today: number
}

// ── Analytics ───────────────────────────────────────────
export interface ClinicAnalytics {
  date: string
  total_patients: number
  completed: number
  cancelled: number
  no_shows: number
  avg_wait_mins: number
  avg_consult_mins: number
  peak_hour: string
  throughput_per_hour: number[]   // 24-length array
}

// ── Notifications ───────────────────────────────────────
export type NotificationChannel = 'sms' | 'whatsapp' | 'push'

export interface Notification {
  _id: string
  token_id: string
  clinic_id: string
  channel: NotificationChannel
  message: string
  status: 'sent' | 'failed'
  sent_at: string
  patient_name: string
  patient_phone: string
}

// ── Reviews ─────────────────────────────────────────────
export interface Review {
  _id: string
  clinic_id: string
  doctor_id?: string | null
  patient_user_id?: string | null
  token_id?: string | null
  target_type: 'clinic' | 'doctor'
  rating: number
  comment: string
  created_at: string
  patient_name?: string
}

export interface AddReviewRequest {
  clinic_id: string
  target_type: 'clinic' | 'doctor'
  doctor_id?: string
  patient_user_id?: string
  token_id?: string
  rating: number
  comment: string
  patient_name?: string
}

export interface DoctorRatingSummary {
  doctor_id: string
  doctor_name: string
  average_rating: number
  total_reviews: number
}

export interface ClinicReviewSummary {
  clinic_id: string
  clinic_average_rating: number
  total_clinic_reviews: number
  total_doctor_reviews: number
  doctor_summaries: DoctorRatingSummary[]
}

// ── Patient medical records ─────────────────────────────
export interface MedicalHistoryEntry {
  id: string
  patient_user_id: string
  clinic_id?: string | null
  doctor_id?: string | null
  title: string
  diagnosis: string
  notes: string
  prescriptions: string[]
  vitals: Record<string, string>
  visit_date: string
  follow_up_date?: string | null
  created_at: string
  updated_at: string
}

export interface MedicalDocument {
  id: string
  patient_user_id: string
  clinic_id?: string | null
  medical_history_id?: string | null
  uploaded_by_user_id?: string | null
  title: string
  document_type: 'lab_report' | 'prescription' | 'discharge_summary' | 'scan' | 'other'
  file_url: string
  description: string
  tags: string[]
  issued_on?: string | null
  created_at: string
  updated_at: string
}

export interface PatientDashboardResponse {
  patient: {
    id: string
    name: string
    email: string
    phone?: string | null
    role: 'patient'
  }
  medical_history: MedicalHistoryEntry[]
  documents: MedicalDocument[]
}

// ── AI / Prediction ─────────────────────────────────────
export interface AIRecommendRequest {
  lat: number
  lng: number
  symptoms: string
}

export interface AIRecommendation {
  clinic_id: string
  clinic_name: string
  rank: number
  score: number
  reason: string
  distance_km: number
  est_wait_mins: number
  rating: number
}

export interface AIRecommendResponse {
  recommendations: AIRecommendation[]
  summary: string
}

export interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIChatRequest {
  messages: AIChatMessage[]
  clinic_context?: Clinic[]
}

export interface AIChatResponse {
  reply: string
  suggested_clinic_id?: string
}

export interface AIParsePatientRequest {
  text: string
}

export interface AIParsePatientResponse {
  patient_name: string
  patient_age: number | null
  patient_gender: 'male' | 'female' | 'other' | null
  symptoms: string | null
  confidence: number
}

export interface PredictWaitResponse {
  tokens: Array<{
    token_id: string
    token_number: number
    new_est_wait_mins: number
  }>
}

// ── Generic ─────────────────────────────────────────────
export interface MessageResponse {
  message: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
}

export interface SuperAdminOverview {
  clinics: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
  users: {
    total: number
    super_admin: number
    admin: number
    doctor: number
    receptionist: number
  }
}

export interface SuperAdminClinic {
  id: string
  name: string
  address: string
  phone: string
  latitude: number | null
  longitude: number | null
  verification_status: 'pending' | 'approved' | 'rejected'
  verified_at?: string | null
  rejection_reason?: string | null
  created_at: string
  updated_at: string
  admin?: {
    id: string
    name: string
    email: string
  } | null
  user_count: number
}

export interface SuperAdminUser {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'doctor' | 'receptionist' | 'patient'
  clinic_id: string | null
  clinic_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface VerifyClinicRequest {
  status: 'approved' | 'rejected'
  reason?: string
  verified_by_user_id?: string
}
