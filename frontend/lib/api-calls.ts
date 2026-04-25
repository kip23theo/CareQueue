import api from './api'
import type {
  LoginRequest, LoginResponse,
  Clinic, NearbyClinicRequest,
  QueueToken, JoinQueueRequest, JoinQueueResponse,
  AddWalkinRequest, LiveQueue, DoctorQueue,
  Doctor, UpdateDoctorAvailabilityRequest, UpdateDoctorDelayRequest,
  ClinicAnalytics, Notification, Review, AddReviewRequest,
  AIRecommendRequest, AIRecommendResponse,
  AIChatRequest, AIChatResponse,
  AIParsePatientRequest, AIParsePatientResponse,
  PredictWaitResponse, MessageResponse,
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

function toClinic(raw: unknown): Clinic {
  const c = (raw ?? {}) as Partial<Clinic> & { id?: string; queue_count?: number }
  return {
    _id: c._id ?? c.id ?? '',
    name: c.name ?? 'Clinic',
    address: c.address ?? '',
    location: c.location ?? { type: 'Point', coordinates: [0, 0] },
    phone: c.phone ?? '',
    specializations: c.specializations ?? [],
    opening_hours: c.opening_hours ?? DEFAULT_OPENING_HOURS,
    avg_consult_time: c.avg_consult_time ?? 10,
    is_open: c.is_open ?? true,
    rating: c.rating ?? 0,
    delay_buffer: c.delay_buffer ?? 0,
    distance_km: c.distance_km,
    queue_length: c.queue_length ?? c.queue_count,
    est_wait_mins: c.est_wait_mins,
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
    current_token: currentToken,
    waiting,
    called,
    completed_count: q.completed_count ?? 0,
    skipped_count: q.skipped_count ?? 0,
    no_show_count: q.no_show_count ?? 0,
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
          clinic_id: payload.user?.clinic_id ?? payload.user?.clinicId ?? '',
        },
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
    api.get<Doctor[]>(`/clinics/${id}/doctors`),
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
  getStatus: (tokenId: string) =>
    api.get<unknown>(`/tokens/${tokenId}/status`).then((res) => withData(res, toQueueToken(res.data))),
  cancel: (tokenId: string) =>
    api.patch<unknown>(`/tokens/${tokenId}/cancel`).then((res) => {
      const payload = (res.data ?? {}) as { status?: string; message?: string }
      return withData(res, { message: payload.message ?? payload.status ?? 'Cancelled' })
    }),
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
      }
      return withData(res, normalized)
    }),
  updateAvailability: (doctorId: string, body: UpdateDoctorAvailabilityRequest) =>
    api.patch<unknown>(`/doctors/${doctorId}/availability`, body).then((res) =>
      withData(res, { message: 'Availability updated' })
    ),
  updateDelay: (doctorId: string, body: UpdateDoctorDelayRequest) =>
    api.patch<unknown>(`/doctors/${doctorId}/delay`, body).then((res) =>
      withData(res, { message: 'Delay updated' })
    ),
  getAll: (clinicId: string) =>
    api.get<Doctor[]>(`/admin/clinics/${clinicId}/doctors`),
}

// ── Clinic admin ────────────────────────────────────────
export const clinicAdminApi = {
  update: (clinicId: string, body: Partial<Clinic>) =>
    api.patch<Clinic>(`/admin/clinics/${clinicId}`, body),
  getAnalytics: (clinicId: string, date?: string) =>
    api.get<ClinicAnalytics>(`/admin/clinics/${clinicId}/analytics`, { params: { date } }),
}

// ── Notifications ───────────────────────────────────────
export const notificationsApi = {
  getLog: (clinicId: string) =>
    api.get<unknown>(`/notifications/log/${clinicId}`).then((res) => {
      const payload = res.data as { notifications?: Notification[] } | Notification[]
      const list = Array.isArray(payload) ? payload : payload?.notifications ?? []
      return withData(res, list)
    }),
  send: (tokenId: string, channel: string, message?: string) =>
    api.post<unknown>('/notifications/send', { token_id: tokenId, channel, message }).then((res) =>
      withData(res, { message: ((res.data ?? {}) as { status?: string }).status ?? 'sent' })
    ),
}

// ── Reviews ─────────────────────────────────────────────
export const reviewsApi = {
  add: (body: AddReviewRequest) =>
    api.post<Review>('/reviews', body),
  getByClinic: (clinicId: string) =>
    api.get<unknown>(`/reviews/${clinicId}`).then((res) => {
      const payload = res.data as { reviews?: Review[] } | Review[]
      const list = Array.isArray(payload) ? payload : payload?.reviews ?? []
      return withData(res, list)
    }),
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
      const payload = (res.data ?? {}) as Partial<PredictWaitResponse> & { updated_tokens?: number }
      return withData(res, {
        tokens: payload.tokens ?? [],
        updated_tokens: payload.updated_tokens,
      } as PredictWaitResponse & { updated_tokens?: number })
    }),
  chat: (body: AIChatRequest) =>
    api.post<unknown>(
      '/ai/chat',
      'messages' in body
        ? { message: body.messages[body.messages.length - 1]?.content ?? '' }
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
      }
      return withData(res, {
        patient_name: payload.patient_name ?? payload.name ?? '',
        patient_age: payload.patient_age ?? payload.age ?? null,
        patient_gender: payload.patient_gender ?? null,
        symptoms: payload.symptoms ?? null,
        confidence: payload.confidence ?? 0,
      })
    }),
}
