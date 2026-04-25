export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'doctor' | 'receptionist' | 'patient'
  clinic_id: string | null
  phone?: string | null
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('carequeue_user')
  return raw ? (JSON.parse(raw) as AuthUser) : null
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('carequeue_token')
}

export function logout(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('carequeue_token')
  localStorage.removeItem('carequeue_user')
  window.location.href = '/auth/login'
}

export function saveAuth(token: string, user: AuthUser): void {
  localStorage.setItem('carequeue_token', token)
  localStorage.setItem('carequeue_user', JSON.stringify(user))
}
