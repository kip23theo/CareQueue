'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api-calls'
import { saveAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import axios from 'axios'
import { Eye, EyeOff, Activity, Loader2 } from 'lucide-react'
import Link from 'next/link'

type Role = 'admin' | 'doctor' | 'receptionist'

const roleLabels: Record<Role, string> = {
  admin: 'Admin',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
}

export default function LoginPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<Role>('doctor')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await authApi.login({ email, password })
      saveAuth(data.access_token, data.user)
      const role = data.user.role
      if (role === 'admin') router.push('/admin')
      else if (role === 'doctor') router.push('/doctor')
      else router.push('/receptionist')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'Invalid email or password')
      } else {
        setError('Something went wrong')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-surface-900 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-brand-400/8 blur-3xl" />
        </div>

        {/* Floating queue cards */}
        <div className="absolute top-32 right-8 space-y-3 opacity-60">
          {[
            { token: 'A05', status: 'Now Serving', color: 'text-brand-400' },
            { token: 'A06', status: 'Next Up', color: 'text-amber-400' },
            { token: 'A07', status: 'Waiting', color: 'text-surface-400' },
          ].map((item) => (
            <div key={item.token} className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 w-44">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white font-heading">{item.token}</span>
                <span className={cn('text-xs font-medium', item.color)}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 flex flex-col justify-end h-full p-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg">
              <Activity size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white font-heading">ClinicFlow AI</span>
          </div>
          <h2 className="text-3xl font-bold text-white font-heading leading-tight mb-3">
            Real-time queue intelligence<br />for modern clinics
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-8">
            Manage patient flow, reduce wait times, and deliver better care with AI-powered insights.
          </p>
          <Link
            href="/patient"
            className="text-sm text-brand-400 hover:text-brand-300 transition-colors inline-flex items-center gap-1"
          >
            For patients → Visit patient portal
          </Link>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <span className="text-xl font-bold font-heading text-surface-900">ClinicFlow AI</span>
          </div>

          <h1 className="text-2xl font-bold font-heading text-surface-900 mb-1">Welcome back</h1>
          <p className="text-surface-500 text-sm mb-8">Sign in to your staff account</p>

          {/* Role selector */}
          <div className="flex gap-2 p-1 bg-surface-100 rounded-xl mb-6">
            {(Object.keys(roleLabels) as Role[]).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-sm font-medium transition-all',
                  selectedRole === role
                    ? 'bg-white text-surface-900 shadow-sm'
                    : 'text-surface-500 hover:text-surface-700'
                )}
              >
                {roleLabels[role]}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@clinic.com"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              id="login-submit"
              disabled={isLoading}
              className={cn(
                'w-full py-3 rounded-xl font-semibold text-white transition-all',
                'bg-brand-500 hover:bg-brand-600 active:scale-[0.98]',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-surface-400 mt-6">
            Patient?{' '}
            <Link href="/patient" className="text-brand-500 hover:text-brand-600 font-medium">
              Use patient portal →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
