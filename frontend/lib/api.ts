import axios from 'axios'
import { getApiBaseUrl } from './base-url'
import { showErrorToast } from './toast'

const BASE_URL = getApiBaseUrl()

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as UnknownRecord
}

function detailToMessage(detail: unknown): string | null {
  if (typeof detail === 'string' && detail.trim().length > 0) return detail

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string' && item.trim().length > 0) return item

        const record = asRecord(item)
        if (!record) return null

        const message = typeof record.msg === 'string'
          ? record.msg
          : typeof record.message === 'string'
            ? record.message
            : null

        const location = Array.isArray(record.loc)
          ? record.loc
              .filter((piece): piece is string | number => typeof piece === 'string' || typeof piece === 'number')
              .join('.')
          : null

        if (message && location) return `${location}: ${message}`
        return message
      })
      .filter((message): message is string => Boolean(message))

    if (messages.length > 0) return messages.join(', ')
  }

  const record = asRecord(detail)
  if (record) {
    if (typeof record.message === 'string' && record.message.trim().length > 0) return record.message
    if (typeof record.msg === 'string' && record.msg.trim().length > 0) return record.msg
    if ('detail' in record) return detailToMessage(record.detail)
  }

  return null
}

function getBackendErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Request failed. Please try again.'

  const record = asRecord(error.response?.data)
  const candidates: unknown[] = [record?.detail, record?.error, record?.message, record?.errors]

  for (const candidate of candidates) {
    const message = detailToMessage(candidate)
    if (message) return message
  }

  if (error.response?.status === 401) return 'Session expired. Please sign in again.'
  if (error.response?.status === 403) return 'You do not have permission to perform this action.'
  if (error.response?.status === 404) return 'Requested resource was not found.'
  if (error.response?.status === 422) return 'Some fields are invalid. Please review and try again.'
  if (!error.response) return 'Unable to reach server. Please check your connection.'

  return 'Request failed. Please try again.'
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('carequeue_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== 'undefined' && axios.isAxiosError(err)) {
      const config = (err.config ?? {}) as { suppressGlobalErrorToast?: boolean }
      if (!config.suppressGlobalErrorToast && err.code !== 'ERR_CANCELED') {
        showErrorToast(getBackendErrorMessage(err))
      }

      if (err.response?.status === 401) {
        localStorage.removeItem('carequeue_token')
        localStorage.removeItem('carequeue_user')
        window.location.href = '/auth/login'
      }
    }

    return Promise.reject(err)
  }
)

export default api
