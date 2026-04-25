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

// ── Auth ────────────────────────────────────────────────
export const authApi = {
  login: (body: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', body),
  refresh: () =>
    api.post<{ access_token: string }>('/auth/refresh'),
}

// ── Clinics (patient) ───────────────────────────────────
export const clinicsApi = {
  getNearby: (params: NearbyClinicRequest) =>
    api.get<Clinic[]>('/clinics/nearby', { params }),
  getById: (id: string) =>
    api.get<Clinic>(`/clinics/${id}`),
  getLiveQueue: (id: string) =>
    api.get<LiveQueue>(`/clinics/${id}/queue/live`),
  getDoctors: (id: string) =>
    api.get<Doctor[]>(`/clinics/${id}/doctors`),
}

// ── Queue tokens (patient) ──────────────────────────────
export const tokensApi = {
  join: (body: JoinQueueRequest) =>
    api.post<JoinQueueResponse>('/tokens/join', body),
  getStatus: (tokenId: string) =>
    api.get<QueueToken>(`/tokens/${tokenId}/status`),
  cancel: (tokenId: string) =>
    api.patch<MessageResponse>(`/tokens/${tokenId}/cancel`),
}

// ── Queue management (staff) ────────────────────────────
export const adminQueueApi = {
  getQueue: (clinicId: string, date?: string) =>
    api.get<LiveQueue>('/admin/queue', { params: { clinic_id: clinicId, date } }),
  addWalkin: (body: AddWalkinRequest) =>
    api.post<QueueToken>('/admin/queue/add', body),
  callNext: (clinicId: string, doctorId: string) =>
    api.post<QueueToken>('/admin/queue/next', { clinic_id: clinicId, doctor_id: doctorId }),
  skip: (tokenId: string) =>
    api.patch<MessageResponse>(`/admin/tokens/${tokenId}/skip`),
  markEmergency: (tokenId: string) =>
    api.patch<MessageResponse>(`/admin/tokens/${tokenId}/emergency`),
  startConsultation: (tokenId: string) =>
    api.patch<MessageResponse>(`/admin/tokens/${tokenId}/start`),
  completeConsultation: (tokenId: string) =>
    api.patch<MessageResponse>(`/admin/tokens/${tokenId}/complete`),
  markNoShow: (tokenId: string) =>
    api.patch<MessageResponse>(`/admin/tokens/${tokenId}/no-show`),
}

// ── Doctors ─────────────────────────────────────────────
export const doctorsApi = {
  getQueue: (doctorId: string) =>
    api.get<DoctorQueue>(`/doctors/${doctorId}/queue`),
  updateAvailability: (doctorId: string, body: UpdateDoctorAvailabilityRequest) =>
    api.patch<MessageResponse>(`/doctors/${doctorId}/availability`, body),
  updateDelay: (doctorId: string, body: UpdateDoctorDelayRequest) =>
    api.patch<MessageResponse>(`/doctors/${doctorId}/delay`, body),
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
    api.get<Notification[]>(`/notifications/log/${clinicId}`),
  send: (tokenId: string, channel: string, message?: string) =>
    api.post<MessageResponse>('/notifications/send', { token_id: tokenId, channel, message }),
}

// ── Reviews ─────────────────────────────────────────────
export const reviewsApi = {
  add: (body: AddReviewRequest) =>
    api.post<Review>('/reviews', body),
  getByClinic: (clinicId: string) =>
    api.get<Review[]>(`/reviews/${clinicId}`),
}

// ── AI ──────────────────────────────────────────────────
export const aiApi = {
  recommend: (body: AIRecommendRequest) =>
    api.post<AIRecommendResponse>('/ai/recommend', body),
  predictWait: (clinicId: string) =>
    api.get<PredictWaitResponse>(`/ai/predict-wait/${clinicId}`),
  chat: (body: AIChatRequest) =>
    api.post<AIChatResponse>('/ai/chat', body),
  parsePatient: (body: AIParsePatientRequest) =>
    api.post<AIParsePatientResponse>('/ai/parse-patient', body),
}
