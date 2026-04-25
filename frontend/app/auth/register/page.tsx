'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Activity, Loader2, Plus, Trash2 } from 'lucide-react'

import { authApi } from '@/lib/api-calls'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type StaffDraft = {
  role: 'doctor' | 'receptionist'
  name: string
  email: string
  password: string
  specialization: string
}

function emptyStaff(role: 'doctor' | 'receptionist' = 'doctor'): StaffDraft {
  return {
    role,
    name: '',
    email: '',
    password: '',
    specialization: role === 'doctor' ? 'General Physician' : '',
  }
}

export default function RegisterClinicPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [clinicName, setClinicName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')

  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  const [staff, setStaff] = useState<StaffDraft[]>([])

  const addStaff = (role: 'doctor' | 'receptionist') => {
    setStaff((prev) => [...prev, emptyStaff(role)])
  }

  const updateStaff = (idx: number, patch: Partial<StaffDraft>) => {
    setStaff((prev) => prev.map((entry, i) => (i === idx ? { ...entry, ...patch } : entry)))
  }

  const removeStaff = (idx: number) => {
    setStaff((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    const lat = Number(latitude)
    const lng = Number(longitude)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError('Latitude and longitude must be valid numbers')
      setIsSubmitting(false)
      return
    }

    const filteredStaff = staff.filter((entry) => entry.name && entry.email && entry.password)

    try {
      const { data } = await authApi.registerClinic({
        clinic_name: clinicName,
        address,
        phone,
        latitude: lat,
        longitude: lng,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
        staff: filteredStaff.map((entry) => ({
          role: entry.role,
          name: entry.name,
          email: entry.email,
          password: entry.password,
          specialization: entry.role === 'doctor' ? entry.specialization : undefined,
        })),
      })
      setSuccess(data.message)
      setTimeout(() => router.push('/auth/login'), 1200)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'Failed to register clinic')
      } else {
        setError('Failed to register clinic')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-100 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading text-surface-900">Create Clinic Workspace</h1>
            <p className="text-sm text-surface-500">Super admin will verify your clinic before staff login is enabled.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Card className="bg-white rounded-2xl border border-surface-200 p-5 space-y-4">
            <h2 className="font-semibold font-heading text-surface-900">Clinic Details</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Clinic Name</Label>
                <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} required placeholder="City Health Clinic" />
              </div>
              <div>
                <Label className="mb-1.5 block">Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+91 ..." />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="Street, City, State" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Latitude</Label>
                <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} required placeholder="28.6139" />
              </div>
              <div>
                <Label className="mb-1.5 block">Longitude</Label>
                <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} required placeholder="77.2090" />
              </div>
            </div>
          </Card>

          <Card className="bg-white rounded-2xl border border-surface-200 p-5 space-y-4">
            <h2 className="font-semibold font-heading text-surface-900">Clinic Admin Account</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Full Name</Label>
                <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} required placeholder="Admin Name" />
              </div>
              <div>
                <Label className="mb-1.5 block">Email</Label>
                <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required placeholder="admin@clinic.com" />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Password</Label>
              <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required placeholder="Minimum 6 characters" />
            </div>
          </Card>

          <Card className="bg-white rounded-2xl border border-surface-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold font-heading text-surface-900">Optional Staff Users</h2>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => addStaff('doctor')}>
                  <Plus size={14} /> Doctor
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addStaff('receptionist')}>
                  <Plus size={14} /> Receptionist
                </Button>
              </div>
            </div>

            {staff.length === 0 ? (
              <p className="text-sm text-surface-500">Add staff now or add later after clinic approval.</p>
            ) : (
              <div className="space-y-3">
                {staff.map((entry, idx) => (
                  <div key={`${entry.role}-${idx}`} className="rounded-xl border border-surface-200 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Select
                        value={entry.role}
                        onValueChange={(value) =>
                          updateStaff(idx, {
                            role: value as 'doctor' | 'receptionist',
                            specialization: value === 'doctor' ? (entry.specialization || 'General Physician') : '',
                          })
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="doctor">Doctor</SelectItem>
                          <SelectItem value="receptionist">Receptionist</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button type="button" variant="ghost" size="icon" onClick={() => removeStaff(idx)} className="text-red-600 hover:text-red-700">
                        <Trash2 size={16} />
                      </Button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <Input value={entry.name} onChange={(e) => updateStaff(idx, { name: e.target.value })} placeholder="Name" />
                      <Input type="email" value={entry.email} onChange={(e) => updateStaff(idx, { email: e.target.value })} placeholder="Email" />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <Input type="password" value={entry.password} onChange={(e) => updateStaff(idx, { password: e.target.value })} placeholder="Password" />
                      {entry.role === 'doctor' ? (
                        <Input value={entry.specialization} onChange={(e) => updateStaff(idx, { specialization: e.target.value })} placeholder="Specialization" />
                      ) : (
                        <Input disabled value="Reception desk" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {success && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting} className="h-11 rounded-xl bg-brand-500 hover:bg-brand-600 text-white">
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : 'Create Clinic'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/auth/login')} className="h-11 rounded-xl">
              Back to Login
            </Button>
          </div>

          <p className="text-sm text-surface-500">
            Already have an account? <Link href="/auth/login" className="text-brand-600 hover:text-brand-700">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
