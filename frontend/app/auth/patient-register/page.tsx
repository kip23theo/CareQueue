'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Activity, Loader2 } from 'lucide-react'

import { authApi } from '@/lib/api-calls'
import { saveAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function PatientRegisterPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    try {
      await authApi.registerPatient({
        name,
        email,
        phone: phone || undefined,
        password,
      })

      const { data } = await authApi.login({ email, password })
      saveAuth(data.access_token, data.user)
      router.push('/patient/dashboard')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'Unable to create patient account')
      } else {
        setError('Unable to create patient account')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-100 px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading text-surface-900">Create Patient Account</h1>
            <p className="text-sm text-surface-500">Access your medical history, documents, and reviews.</p>
          </div>
        </div>

        <Card className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="mb-1.5 block">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="email" className="mb-1.5 block">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="phone" className="mb-1.5 block">Phone (optional)</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="password" className="mb-1.5 block">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <div>
              <Label htmlFor="confirm-password" className="mb-1.5 block">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full h-11 rounded-xl bg-brand-500 hover:bg-brand-600 text-white">
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <p className="text-sm text-surface-500 mt-5">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
