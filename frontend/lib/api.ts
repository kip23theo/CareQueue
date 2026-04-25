import axios from 'axios'
import { getApiBaseUrl } from './base-url'

const BASE_URL = getApiBaseUrl()

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
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('carequeue_token')
      localStorage.removeItem('carequeue_user')
      window.location.href = '/auth/login'
    }
    return Promise.reject(err)
  }
)

export default api
