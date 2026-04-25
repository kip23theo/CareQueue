export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'doctor' | 'receptionist' | 'patient'
  clinic_id: string | null
  phone?: string | null
}

const AUTH_TOKEN_KEY = 'carequeue_token'
const AUTH_USER_KEY = 'carequeue_user'
const AUTH_CHANGE_EVENT = 'carequeue_auth_changed'

let cachedUserRaw: string | null = null
let cachedUser: AuthUser | null = null

function emitAuthChange(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (raw === cachedUserRaw) return cachedUser

  cachedUserRaw = raw
  if (!raw) {
    cachedUser = null
    return null
  }

  try {
    cachedUser = JSON.parse(raw) as AuthUser
  } catch {
    cachedUser = null
  }
  return cachedUser
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function subscribeAuth(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === AUTH_TOKEN_KEY || event.key === AUTH_USER_KEY) {
      listener()
    }
  }
  const onAuthChange = () => listener()

  window.addEventListener('storage', onStorage)
  window.addEventListener(AUTH_CHANGE_EVENT, onAuthChange)

  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(AUTH_CHANGE_EVENT, onAuthChange)
  }
}

export function logout(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
  cachedUserRaw = null
  cachedUser = null
  emitAuthChange()
  window.location.href = '/auth/login'
}

export function saveAuth(token: string, user: AuthUser): void {
  const serializedUser = JSON.stringify(user)
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_USER_KEY, serializedUser)
  cachedUserRaw = serializedUser
  cachedUser = user
  emitAuthChange()
}
