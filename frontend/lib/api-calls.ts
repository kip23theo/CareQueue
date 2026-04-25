import api from './api'
import type {
  LoginRequest, LoginResponse,
  RegisterPatientRequest, RegisterPatientResponse,
  RegisterClinicRequest, RegisterClinicResponse,
  RegisterStaffRequest, RegisterStaffResponse,
  Clinic, NearbyClinicRequest,
  QueueToken, JoinQueueRequest, JoinQueueResponse,
  AddWalkinRequest, LiveQueue, DoctorQueue,
  Doctor, UpdateDoctorAvailabilityRequest, UpdateDoctorDelayRequest,
  ClinicAnalytics, Notification, Review, AddReviewRequest,
  ClinicReviewSummary, PlatformFeedback, AddPlatformFeedbackRequest,
  MedicalDocument, MedicalHistoryEntry, PatientDashboardResponse,
  DoctorConsultedPatientsResponse, RecordPaymentRequest,
  AIRecommendRequest, AIRecommendResponse,
  AIChatRequest, AIChatResponse,
  AIParsePatientRequest, AIParsePatientResponse,
  PredictWaitResponse,
  SuperAdminClinic, SuperAdminOverview, SuperAdminUser, VerifyClinicRequest,
} from '@/types'

import type { AxiosResponse } from 'axios'

const DEFAULT_OPENING_HOURS = {
  monday: null,
  tuesday: null,
  wednesday: null,
  thursday: null,
  friday: null,
  saturday: null,
  sunday: null,
}

const TOKEN_STATUSES = new Set([
  'WAITING',
  'CALLED',
  'IN_CONSULTATION',
  'COMPLETED',
  'SKIPPED',
  'CANCELLED',
  'EMERGENCY',
  'NO_SHOW',
] as const)

function withData<T>(res: AxiosResponse<unknown>, data: T): AxiosResponse<T> {
  return { ...res, data }
}

export function resolveMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim()
  if (!normalized) return null
  if (/^(?:https?:|data:|blob:)/i.test(normalized)) return normalized
  if (normalized.startsWith('/')) return `${BASE_URL}${normalized}`
  return `${BASE_URL}/${normalized}`
}

function toClinic(raw: unknown): Clinic {
  const c = (raw ?? {}) as Partial<Clinic> & { id?: string; queue_count?: number }
  return {
    _id: c._id ?? c.id ?? '',
    name: c.name ?? 'Clinic',
    clinic_image: resolveMediaUrl(c.clinic_image),
    address: c.address ?? '',
    location: c.location ?? { type: 'Point', coordinates: [0, 0] },
    google_maps_link: c.google_maps_link ?? null,
    phone: c.phone ?? '',
    specializations: c.specializations ?? [],
    opening_hours: c.opening_hours ?? DEFAULT_OPENING_HOURS,
    avg_consult_time: c.avg_consult_time ?? 10,
    is_open: c.is_open ?? true,
    rating: c.rating ?? 0,
    delay_buffer: c.delay_buffer ?? 0,
    verification_status: c.verification_status,
    rejection_reason: c.rejection_reason,
    distance_km: c.distance_km,
    queue_length: c.queue_length ?? c.queue_count,
    est_wait_mins: c.est_wait_mins,
  }
}

function toDoctor(raw: unknown): Doctor {
  const doctor = (raw ?? {}) as Partial<Doctor> & { id?: string }
  return {
    _id: doctor._id ?? doctor.id ?? '',
    clinic_id: doctor.clinic_id ?? '',
    user_id: doctor.user_id ?? '',
    name: doctor.name ?? 'Doctor',
    doctor_image: resolveMediaUrl(doctor.doctor_image),
    specialization: doctor.specialization ?? 'General Physician',
    avg_consult_mins: doctor.avg_consult_mins ?? 10,
    is_available: doctor.is_available ?? true,
    delay_mins: doctor.delay_mins ?? 0,
    completed_today: doctor.completed_today ?? 0,
  }
}

function toQueueToken(raw: unknown): QueueToken {
  const t = (raw ?? {}) as Partial<QueueToken> & { id?: string; token_id?: string }
  const now = new Date().toISOString()
  const status = TOKEN_STATUSES.has((t.status ?? 'WAITING') as QueueToken['status'])
    ? (t.status as QueueToken['status'])
    : 'WAITING'
  return {
    _id: t._id ?? t.token_id ?? t.id ?? '',
    clinic_id: t.clinic_id ?? '',
    doctor_id: t.doctor_id ?? '',
    patient_user_id: t.patient_user_id ?? null,
    token_number: t.token_number ?? 0,
    token_display: t.token_display ?? '',
    patient_name: t.patient_name ?? '',
    patient_phone: t.patient_phone ?? '',
    patient_age: t.patient_age ?? 0,
    patient_gender: t.patient_gender,
    symptoms: t.symptoms,
    status,
    position: t.position ?? 0,
    est_wait_mins: t.est_wait_mins ?? 0,
    joined_at: t.joined_at ?? now,
    called_at: t.called_at,
    consult_start: t.consult_start,
    consult_end: t.consult_end,
    payment_amount: t.payment_amount ?? null,
    payment_method: t.payment_method ?? null,
    payment_notes: t.payment_notes ?? null,
    payment_recorded_at: t.payment_recorded_at ?? null,
    payment_recorded_by_role: t.payment_recorded_by_role ?? null,
    payment_recorded_by_name: t.payment_recorded_by_name ?? null,
    date: t.date ?? now.slice(0, 10),
    is_walkin: t.is_walkin ?? false,
  }
}

function toLiveQueue(raw: unknown): LiveQueue {
  const q = (raw ?? {}) as Partial<LiveQueue> & {
    id?: string
    tokens?: unknown[]
    queue_length?: number
    next_token?: number
    current_token?: unknown
  }
  if (Array.isArray(q.tokens)) {
    const tokens = q.tokens.map(toQueueToken)
    return {
      clinic_id: q.clinic_id ?? q.id ?? '',
      date: q.date ?? new Date().toISOString().slice(0, 10),
      tokens,
      current_token: tokens.find((t) => t.status === 'IN_CONSULTATION') ?? null,
      waiting: tokens.filter((t) => t.status === 'WAITING'),
      called: tokens.filter((t) => t.status === 'CALLED'),
      completed_count: tokens.filter((t) => t.status === 'COMPLETED').length,
      skipped_count: tokens.filter((t) => t.status === 'SKIPPED').length,
      no_show_count: tokens.filter((t) => t.status === 'NO_SHOW').length,
    }
  }

  const waiting = Array.isArray(q.waiting) ? q.waiting.map(toQueueToken) : []
  const called = Array.isArray(q.called) ? q.called.map(toQueueToken) : []
  let currentToken: QueueToken | null = null
  if (q.current_token && typeof q.current_token === 'object') {
    currentToken = toQueueToken(q.current_token)
  } else if (typeof q.current_token === 'number') {
    currentToken = toQueueToken({
      token_number: q.current_token,
      status: 'CALLED',
      clinic_id: q.clinic_id ?? q.id ?? '',
    })
  }

  if (waiting.length === 0 && called.length === 0 && typeof q.queue_length === 'number') {
    for (let i = 0; i < q.queue_length; i += 1) {
      waiting.push(
        toQueueToken({
          clinic_id: q.clinic_id ?? q.id ?? '',
          token_number: q.next_token ? q.next_token + i : i + 1,
          status: 'WAITING',
          position: i + 1,
        })
      )
    }
  }

  return {
    clinic_id: q.clinic_id ?? q.id ?? '',
    date: q.date ?? new Date().toISOString().slice(0, 10),
    tokens: [
      ...(currentToken ? [currentToken] : []),
      ...waiting,
      ...called,
    ],
    current_token: currentToken,
    waiting,
    called,
    completed_count: q.completed_count ?? 0,
    skipped_count: q.skipped_count ?? 0,
    no_show_count: q.no_show_count ?? 0,
  }
}

function toSuperAdminOverview(raw: unknown): SuperAdminOverview {
  const payload = (raw ?? {}) as Partial<SuperAdminOverview>
  return {
    clinics: {
      total: payload.clinics?.total ?? 0,
      pending: payload.clinics?.pending ?? 0,
      approved: payload.clinics?.approved ?? 0,
      rejected: payload.clinics?.rejected ?? 0,
    },
    users: {
      total: payload.users?.total ?? 0,
      super_admin: payload.users?.super_admin ?? 0,
      admin: payload.users?.admin ?? 0,
      doctor: payload.users?.doctor ?? 0,
      receptionist: payload.users?.receptionist ?? 0,
    },
  }
}

function toSuperAdminClinic(raw: unknown): SuperAdminClinic {
  const clinic = (raw ?? {}) as Partial<SuperAdminClinic>
  return {
    id: clinic.id ?? '',
    name: clinic.name ?? 'Clinic',
    clinic_image: resolveMediaUrl(clinic.clinic_image),
    address: clinic.address ?? '',
    phone: clinic.phone ?? '',
    latitude: clinic.latitude ?? null,
    longitude: clinic.longitude ?? null,
    verification_status: clinic.verification_status ?? 'pending',
    verified_at: clinic.verified_at ?? null,
    rejection_reason: clinic.rejection_reason ?? null,
    created_at: clinic.created_at ?? new Date().toISOString(),
    updated_at: clinic.updated_at ?? new Date().toISOString(),
    admin: clinic.admin ?? null,
    user_count: clinic.user_count ?? 0,
  }
}

function toSuperAdminUser(raw: unknown): SuperAdminUser {
  const user = (raw ?? {}) as Partial<SuperAdminUser>
  return {
    id: user.id ?? '',
    name: user.name ?? 'User',
    email: user.email ?? '',
    role: user.role ?? 'receptionist',
    clinic_id: user.clinic_id ?? null,
    clinic_name: user.clinic_name ?? null,
    is_active: user.is_active ?? false,
    created_at: user.created_at ?? new Date().toISOString(),
    updated_at: user.updated_at ?? new Date().toISOString(),
  }
}

function toMedicalHistory(raw: unknown): MedicalHistoryEntry {
  const entry = (raw ?? {}) as Partial<MedicalHistoryEntry>
  const now = new Date().toISOString()
  return {
    id: entry.id ?? '',
    patient_user_id: entry.patient_user_id ?? '',
    clinic_id: entry.clinic_id ?? null,
    doctor_id: entry.doctor_id ?? null,
    title: entry.title ?? '',
    diagnosis: entry.diagnosis ?? '',
    notes: entry.notes ?? '',
    prescriptions: entry.prescriptions ?? [],
    vitals: entry.vitals ?? {},
    visit_date: entry.visit_date ?? now,
    follow_up_date: entry.follow_up_date ?? null,
    created_at: entry.created_at ?? now,
    updated_at: entry.updated_at ?? now,
  }
}

function toMedicalDocument(raw: unknown): MedicalDocument {
  const document = (raw ?? {}) as Partial<MedicalDocument>
  const now = new Date().toISOString()
  return {
    id: document.id ?? '',
    patient_user_id: document.patient_user_id ?? '',
    clinic_id: document.clinic_id ?? null,
    medical_history_id: document.medical_history_id ?? null,
    uploaded_by_user_id: document.uploaded_by_user_id ?? null,
    title: document.title ?? '',
    document_type: document.document_type ?? 'other',
    file_url: document.file_url ?? '',
    description: document.description ?? '',
    tags: document.tags ?? [],
    issued_on: document.issued_on ?? null,
    created_at: document.created_at ?? now,
    updated_at: document.updated_at ?? now,
  }
}

function toDoctorConsultedPatients(raw: unknown): DoctorConsultedPatientsResponse {
  const payload = (raw ?? {}) as Partial<DoctorConsultedPatientsResponse>
  return {
    doctor_id: payload.doctor_id ?? '',
    consulted_patients: (payload.consulted_patients ?? []).map((record) => ({
      token: toQueueToken(record.token),
      patient: record.patient
        ? {
            id: record.patient.id ?? '',
            name: record.patient.name ?? 'Patient',
            email: record.patient.email ?? '',
            phone: record.patient.phone ?? null,
            role: 'patient',
          }
        : null,
      patient_lookup: record.patient_lookup ?? 'not_found',
      medical_history: (record.medical_history ?? []).map(toMedicalHistory),
      documents: (record.documents ?? []).map(toMedicalDocument),
    })),
  }
}

function toReview(raw: unknown): Review {
  const review = (raw ?? {}) as Partial<Review> & { id?: string }
  return {
    _id: review._id ?? review.id ?? '',
    clinic_id: review.clinic_id ?? '',
    doctor_id: review.doctor_id ?? null,
    patient_user_id: review.patient_user_id ?? null,
    token_id: review.token_id ?? null,
    target_type: review.target_type ?? 'clinic',
    rating: review.rating ?? 0,
    comment: review.comment ?? '',
    created_at: review.created_at ?? new Date().toISOString(),
    patient_name: review.patient_name,
  }
}

function toPlatformFeedback(raw: unknown): PlatformFeedback {
  const feedback = (raw ?? {}) as Partial<PlatformFeedback>
  return {
    id: feedback.id ?? '',
    user_id: feedback.user_id ?? '',
    user_name: feedback.user_name ?? 'User',
    user_email: feedback.user_email ?? '',
    user_role: feedback.user_role ?? 'patient',
    clinic_id: feedback.clinic_id ?? null,
    clinic_name: feedback.clinic_name ?? null,
    rating: feedback.rating ?? 0,
    comment: feedback.comment ?? '',
    created_at: feedback.created_at ?? new Date().toISOString(),
  }
}

function toNotification(raw: unknown): Notification {
  const notification = (raw ?? {}) as Partial<Notification>
  return {
    _id: notification._id ?? '',
    token_id: notification.token_id ?? '',
    clinic_id: notification.clinic_id ?? '',
    clinic_name: notification.clinic_name ?? null,
    channel: notification.channel ?? 'push',
    message: notification.message ?? '',
    status: notification.status ?? 'sent',
    sent_at: notification.sent_at ?? new Date().toISOString(),
    patient_name: notification.patient_name ?? '',
    patient_phone: notification.patient_phone ?? '',
    token_display: notification.token_display ?? null,
  }
}

// ── Auth ────────────────────────────────────────────────
export const authApi = {
  login: (body: LoginRequest) =>
    api.post<unknown>('/auth/login', body).then((res) => {
      const payload = (res.data ?? {}) as Partial<LoginResponse> & {
        user?: Partial<LoginResponse['user']> & { clinicId?: string }
      }
      const normalized: LoginResponse = {
        access_token: payload.access_token ?? '',
        token_type: payload.token_type ?? 'bearer',
        user: {
          id: payload.user?.id ?? '',
          name: payload.user?.name ?? payload.user?.email ?? 'User',
          email: payload.user?.email ?? body.email,
          role: payload.user?.role ?? 'receptionist',
          clinic_id: payload.user?.clinic_id ?? payload.user?.clinicId ?? null,
          phone: payload.user?.phone ?? null,
        },
      }
      return withData(res, normalized)
    }),
  registerPatient: (body: RegisterPatientRequest) =>
    api.post<unknown>('/auth/register-patient', body).then((res) => {
      const payload = (res.data ?? {}) as Partial<RegisterPatientResponse>
      const normalized: RegisterPatientResponse = {
        id: payload.id ?? '',
        name: payload.name ?? body.name,
        email: payload.email ?? body.email,
        role: 'patient',
        phone: payload.phone ?? body.phone ?? null,
      }
      return withData(res, normalized)
    }),
  registerClinic: (body: RegisterClinicRequest) =>
    api.post<unknown>('/auth/register-clinic', body).then((res) => {
      const payload = (res.data ?? {}) as Partial<RegisterClinicResponse>
      const normalized: RegisterClinicResponse = {
        message: payload.message ?? 'Clinic registered',
        clinic_id: payload.clinic_id ?? '',
        verification_status: payload.verification_status ?? 'pending',
      }
      return withData(res, normalized)
    }),
  registerStaff: (body: RegisterStaffRequest) =>
    api.post<unknown>('/auth/register-staff', body).then((res) => {
      const payload = (res.data ?? {}) as Partial<RegisterStaffResponse>
      const normalized: RegisterStaffResponse = {
        id: payload.id ?? '',
        clinic_id: payload.clinic_id ?? body.clinic_id,
        name: payload.name ?? body.name,
        email: payload.email ?? body.email,
        role: payload.role ?? body.role,
      }
      return withData(res, normalized)
    }),
  refresh: (refreshToken?: string) =>
    api.post<unknown>('/auth/refresh', refreshToken ? { refresh_token: refreshToken } : {}).then((res) =>
      withData(res, { access_token: ((res.data ?? {}) as { access_token?: string }).access_token ?? '' })
    ),
}

// ── Clinics (patient) ───────────────────────────────────
export const clinicsApi = {
  getNearby: (params: NearbyClinicRequest) =>
    api.get<unknown>('/clinics/nearby', { params }).then((res) => {
      const payload = res.data as { clinics?: unknown[] } | unknown[]
      const list = Array.isArray(payload) ? payload : payload?.clinics ?? []
      return withData(res, list.map(toClinic))
    }),
  getById: (id: string) =>
    api.get<unknown>(`/clinics/${id}`).then((res) => withData(res, toClinic(res.data))),
  getLiveQueue: (id: string) =>
    api.get<unknown>(`/clinics/${id}/queue/live`).then((res) => withData(res, toLiveQueue(res.data))),
  getDoctors: (id: string) =>
    api.get<unknown[]>(`/clinics/${id}/doctors`).then((res) =>
      withData(res, (Array.isArray(res.data) ? res.data : []).map(toDoctor))
    ),
}

// ── Queue tokens (patient) ──────────────────────────────
export const tokensApi = {
  join: (body: JoinQueueRequest) =>
    api.post<unknown>('/tokens/join', body).then((res) => {
      const payload = (res.data ?? {}) as Partial<JoinQueueResponse> & {
        token_id?: string
        token_number?: number
        position?: number
        est_wait_mins?: number
      }
      if (payload.token) return withData(res, payload as JoinQueueResponse)
      const normalized: JoinQueueResponse = {
        token: toQueueToken({
          _id: payload.token_id,
          clinic_id: body.clinic_id,
          doctor_id: body.doctor_id,
          patient_user_id: body.patient_user_id,
          token_number: payload.token_number ?? 0,
          patient_name: body.patient_name,
          patient_phone: body.patient_phone,
          patient_age: body.patient_age,
          patient_gender: body.patient_gender,
          symptoms: body.symptoms,
          position: payload.position ?? 0,
          est_wait_mins: payload.est_wait_mins ?? 0,
          status: 'WAITING',
          is_walkin: false,
        }),
        message: 'Joined queue',
      }
      return withData(res, normalized)
    }),
  getByPatient: (patientUserId: string, includeTerminal = true) =>
    api.get<unknown[]>(`/tokens/patient/${patientUserId}`, {
      params: { include_terminal: includeTerminal },
    }).then((res) =>
      withData(res, (Array.isArray(res.data) ? res.data : []).map(toQueueToken))
    ),
  getStatus: (tokenId: string) =>
    api.get<unknown>(`/tokens/${tokenId}/status`).then((res) => withData(res, toQueueToken(res.data))),
  cancel: (tokenId: string) =>
    api.patch<unknown>(`/tokens/${tokenId}/cancel`).then((res) => {
      const payload = (res.data ?? {}) as { status?: string; message?: string }
      return withData(res, { message: payload.message ?? payload.status ?? 'Cancelled' })
    }),
}

// ── Patients ────────────────────────────────────────────
export const patientsApi = {
  getDashboard: (patientUserId: string) =>
    api.get<unknown>(`/patients/${patientUserId}/dashboard`).then((res) => {
      const payload = (res.data ?? {}) as Partial<PatientDashboardResponse>
      return withData(res, {
        patient: {
          id: payload.patient?.id ?? patientUserId,
          name: payload.patient?.name ?? 'Patient',
          email: payload.patient?.email ?? '',
          phone: payload.patient?.phone ?? null,
          role: 'patient',
        },
        medical_history: (payload.medical_history ?? []).map(toMedicalHistory),
        documents: (payload.documents ?? []).map(toMedicalDocument),
      } satisfies PatientDashboardResponse)
    }),
  getMedicalHistory: (patientUserId: string) =>
    api.get<unknown[]>(`/patients/${patientUserId}/medical-history`).then((res) =>
      withData(res, (Array.isArray(res.data) ? res.data : []).map(toMedicalHistory))
    ),
  getDocuments: (patientUserId: string) =>
    api.get<unknown[]>(`/patients/${patientUserId}/documents`).then((res) =>
      withData(res, (Array.isArray(res.data) ? res.data : []).map(toMedicalDocument))
    ),
}

// ── Queue management (staff) ────────────────────────────
export const adminQueueApi = {
  getQueue: (clinicId: string, date?: string) =>
    api.get<unknown>('/admin/queue', { params: { clinic_id: clinicId, date } }).then((res) =>
      withData(res, toLiveQueue(res.data))
    ),
  addWalkin: (body: AddWalkinRequest) =>
    api.post<unknown>('/admin/queue/add', body).then((res) =>
      withData(
        res,
        toQueueToken({
          ...((res.data ?? {}) as object),
          clinic_id: body.clinic_id,
          doctor_id: body.doctor_id,
          patient_name: body.patient_name,
          patient_phone: body.patient_phone,
          patient_age: body.patient_age,
          patient_gender: body.patient_gender,
          symptoms: body.symptoms,
          is_walkin: true,
        })
      )
    ),
  callNext: (clinicId: string, doctorId: string) =>
    api.post<unknown>('/admin/queue/next', { clinic_id: clinicId, doctor_id: doctorId }).then((res) =>
      withData(res, toQueueToken(res.data))
    ),
  skip: (tokenId: string) =>
    api.patch<unknown>(`/admin/tokens/${tokenId}/skip`).then((res) =>
      withData(res, { message: ((res.data ?? {}) as { status?: string }).status ?? 'Skipped' })
    ),
  markEmergency: (tokenId: string) =>
    api.patch<unknown>(`/admin/tokens/${tokenId}/emergency`).then((res) =>
      withData(res, { message: ((res.data ?? {}) as { status?: string }).status ?? 'Emergency updated' })
    ),
  startConsultation: (tokenId: string) =>
    api.patch<unknown>(`/admin/tokens/${tokenId}/start`).then((res) =>
      withData(res, { message: ((res.data ?? {}) as { status?: string }).status ?? 'Consultation started' })
    ),
  completeConsultation: (tokenId: string) =>
    api.patch<unknown>(`/admin/tokens/${tokenId}/complete`).then((res) =>
      withData(res, { message: ((res.data ?? {}) as { status?: string }).status ?? 'Completed' })
    ),
  recordPayment: (tokenId: string, body: RecordPaymentRequest) =>
    api.patch<unknown>(`/admin/tokens/${tokenId}/payment`, body).then((res) =>
      withData(res, toQueueToken(res.data))
    ),
  markNoShow: (tokenId: string) =>
    api.patch<unknown>(`/admin/tokens/${tokenId}/no-show`).then((res) =>
      withData(res, { message: ((res.data ?? {}) as { status?: string }).status ?? 'No-show' })
    ),
}

// ── Doctors ─────────────────────────────────────────────
export const doctorsApi = {
  getQueue: (doctorId: string) =>
    api.get<unknown>(`/doctors/${doctorId}/queue`).then((res) => {
      const payload = (res.data ?? {}) as Partial<DoctorQueue> & { next?: unknown[] }
      const next = Array.isArray(payload.next_five)
        ? payload.next_five.map(toQueueToken)
        : Array.isArray(payload.next)
          ? payload.next.map(toQueueToken)
          : []
      const normalized: DoctorQueue = {
        current: payload.current ? toQueueToken(payload.current) : null,
        next_five: next,
        waiting_count: payload.waiting_count ?? next.length,
        completed_today: payload.completed_today ?? 0,
        completed_tokens: (payload.completed_tokens ?? []).map(toQueueToken),
      }
      return withData(res, normalized)
    }),
  getConsultedPatients: (doctorId: string, limit = 50) =>
    api.get<unknown>(`/doctors/${doctorId}/consulted-patients`, { params: { limit } }).then((res) =>
      withData(res, toDoctorConsultedPatients(res.data))
    ),
  updateAvailability: (doctorId: string, body: UpdateDoctorAvailabilityRequest) =>
    api.patch<unknown>(`/doctors/${doctorId}/availability`, body).then((res) =>
      withData(res, { message: 'Availability updated' })
    ),
  updateDelay: (doctorId: string, body: UpdateDoctorDelayRequest) =>
    api.patch<unknown>(`/doctors/${doctorId}/delay`, body).then((res) =>
      withData(res, { message: 'Delay updated' })
    ),
  getAll: (clinicId: string) =>
    api.get<unknown[]>(`/admin/clinics/${clinicId}/doctors`).then((res) =>
      withData(res, (Array.isArray(res.data) ? res.data : []).map(toDoctor))
    ),
}

export const uploadsApi = {
  uploadImage: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return api.post<{ file_id: string; file_path: string }>('/uploads/image', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ── Clinic admin ────────────────────────────────────────
export const clinicAdminApi = {
  update: (clinicId: string, body: Partial<Clinic> & { latitude?: number; longitude?: number; google_maps_link?: string }) =>
    api.patch<Clinic>(`/admin/clinics/${clinicId}`, body),
  getAnalytics: (clinicId: string, date?: string) =>
    api.get<ClinicAnalytics>(`/admin/clinics/${clinicId}/analytics`, { params: { date } }),
}

// ── Super admin ────────────────────────────────────────
export const superAdminApi = {
  getOverview: () =>
    api.get<unknown>('/super-admin/overview').then((res) =>
      withData(res, toSuperAdminOverview(res.data))
    ),
  getClinics: (verificationStatus?: 'pending' | 'approved' | 'rejected') =>
    api.get<unknown>('/super-admin/clinics', {
      params: verificationStatus ? { verification_status: verificationStatus } : {},
    }).then((res) => {
      const payload = Array.isArray(res.data) ? res.data : []
      return withData(res, payload.map(toSuperAdminClinic))
    }),
  verifyClinic: (clinicId: string, body: VerifyClinicRequest) =>
    api.patch<unknown>(`/super-admin/clinics/${clinicId}/verification`, body).then((res) =>
      withData(res, toSuperAdminClinic(res.data))
    ),
  getUsers: (params?: { clinic_id?: string; role?: SuperAdminUser['role'] }) =>
    api.get<unknown>('/super-admin/users', { params }).then((res) => {
      const payload = Array.isArray(res.data) ? res.data : []
      return withData(res, payload.map(toSuperAdminUser))
    }),
  getPlatformFeedback: (params: { viewer_user_id: string; role?: PlatformFeedback['user_role'] }) =>
    api.get<unknown>('/super-admin/platform-feedback', { params }).then((res) => {
      const payload = Array.isArray(res.data) ? res.data : []
      return withData(res, payload.map(toPlatformFeedback))
    }),
}

// ── Notifications ───────────────────────────────────────
export const notificationsApi = {
  getLog: (clinicId: string) =>
    api.get<unknown>(`/notifications/log/${clinicId}`).then((res) => {
      const payload = res.data as { notifications?: Notification[] } | Notification[]
      const list = Array.isArray(payload) ? payload : payload?.notifications ?? []
      return withData(res, list.map(toNotification))
    }),
  getPatient: (patientUserId: string) =>
    api.get<unknown>(`/notifications/patient/${patientUserId}`).then((res) => {
      const payload = res.data as { notifications?: Notification[] } | Notification[]
      const list = Array.isArray(payload) ? payload : payload?.notifications ?? []
      return withData(res, list.map(toNotification))
    }),
  getByToken: (tokenId: string) =>
    api.get<unknown>(`/notifications/token/${tokenId}`).then((res) => {
      const payload = res.data as { notifications?: Notification[] } | Notification[]
      const list = Array.isArray(payload) ? payload : payload?.notifications ?? []
      return withData(res, list.map(toNotification))
    }),
  send: (tokenId: string, channel: string, message?: string) =>
    api.post<unknown>('/notifications/send', { token_id: tokenId, channel, message }).then((res) =>
      withData(res, { message: ((res.data ?? {}) as { status?: string }).status ?? 'sent' })
    ),
}

// ── Reviews ─────────────────────────────────────────────
export const reviewsApi = {
  add: (body: AddReviewRequest) =>
    api.post<unknown>('/reviews', body).then((res) => withData(res, toReview(res.data))),
  getByClinic: (clinicId: string) =>
    api.get<unknown>(`/reviews/clinic/${clinicId}`).then((res) =>
      withData(res, (Array.isArray(res.data) ? res.data : []).map(toReview))
    ),
  getByDoctor: (doctorId: string) =>
    api.get<unknown>(`/reviews/doctor/${doctorId}`).then((res) =>
      withData(res, (Array.isArray(res.data) ? res.data : []).map(toReview))
    ),
  getByPatient: (patientUserId: string) =>
    api.get<unknown>(`/reviews/patient/${patientUserId}`).then((res) =>
      withData(res, (Array.isArray(res.data) ? res.data : []).map(toReview))
    ),
  getClinicSummary: (clinicId: string) =>
    api.get<ClinicReviewSummary>(`/reviews/clinic/${clinicId}/summary`),
}

// ── Platform Feedback ──────────────────────────────────
export const platformFeedbackApi = {
  submit: (body: AddPlatformFeedbackRequest) =>
    api.post<unknown>('/platform-feedback', body).then((res) => withData(res, toPlatformFeedback(res.data))),
}

// ── AI ──────────────────────────────────────────────────
export const aiApi = {
  recommend: (body: AIRecommendRequest) =>
    api.post<unknown>('/ai/recommend', body).then((res) => {
      const payload = (res.data ?? {}) as Partial<AIRecommendResponse>
      const recommendations = (payload.recommendations ?? []).map((r) => ({
        clinic_id: r.clinic_id,
        clinic_name: r.clinic_name ?? r.clinic_id,
        rank: r.rank,
        score: r.score ?? 0,
        reason: r.reason,
        distance_km: r.distance_km ?? 0,
        est_wait_mins: r.est_wait_mins ?? 0,
        rating: r.rating ?? 0,
      }))
      return withData(res, {
        recommendations,
        summary: payload.summary ?? '',
      })
    }),
  predictWait: (clinicId: string) =>
    api.get<unknown>(`/ai/predict-wait/${clinicId}`).then((res) => {
      const payload = (res.data ?? {}) as Partial<PredictWaitResponse> & {
        updated_tokens?: number
        notifications_generated?: number
      }
      return withData(res, {
        tokens: payload.tokens ?? [],
        updated_tokens: payload.updated_tokens,
        notifications_generated: payload.notifications_generated,
      } as PredictWaitResponse & { updated_tokens?: number; notifications_generated?: number })
    }),
  chat: (body: AIChatRequest) =>
    api.post<unknown>(
      '/ai/chat',
      'messages' in body
        ? {
            message: body.messages[body.messages.length - 1]?.content ?? '',
            history: body.messages.slice(0, -1),
            clinic_context: body.clinic_context,
          }
        : body
    ).then((res) => {
      const payload = (res.data ?? {}) as Partial<AIChatResponse>
      return withData(res, {
        reply: payload.reply ?? '',
        suggested_clinic_id: payload.suggested_clinic_id,
      })
    }),
  parsePatient: (body: AIParsePatientRequest) =>
    api.post<unknown>('/ai/parse-patient', body).then((res) => {
      const payload = (res.data ?? {}) as Partial<AIParsePatientResponse> & {
        name?: string
        age?: number
        gender?: 'male' | 'female' | 'other' | null
      }
      return withData(res, {
        patient_name: payload.patient_name ?? payload.name ?? '',
        patient_age: payload.patient_age ?? payload.age ?? null,
        patient_gender: payload.patient_gender ?? payload.gender ?? null,
        gender: payload.gender ?? payload.patient_gender ?? null,
        symptoms: payload.symptoms ?? null,
        confidence: payload.confidence ?? 0,
      })
    }),
}
