export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'doctor' | 'receptionist'
  clinic_id: string
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('cf_user')
  return raw ? (JSON.parse(raw) as AuthUser) : null
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cf_token')
}

export function logout(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('cf_token')
  localStorage.removeItem('cf_user')
  window.location.href = '/auth/login'
}

export function saveAuth(token: string, user: AuthUser): void {
  localStorage.setItem('cf_token', token)
  localStorage.setItem('cf_user', JSON.stringify(user))
}
