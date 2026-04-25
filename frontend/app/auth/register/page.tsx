'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Activity, Eye, EyeOff, Loader2, LocateFixed, Plus, Trash2 } from 'lucide-react'

import { authApi, resolveMediaUrl, uploadsApi } from '@/lib/api-calls'
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
  doctor_image: string
  specialization: string
}

function emptyStaff(role: 'doctor' | 'receptionist' = 'doctor'): StaffDraft {
  return {
    role,
    name: '',
    email: '',
    password: '',
    doctor_image: '',
    specialization: role === 'doctor' ? 'General Physician' : '',
  }
}

export default function RegisterClinicPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingClinicImage, setIsUploadingClinicImage] = useState(false)
  const [isUploadingStaffImage, setIsUploadingStaffImage] = useState<Record<number, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [clinicName, setClinicName] = useState('')
  const [clinicImage, setClinicImage] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [showStaffPasswords, setShowStaffPasswords] = useState<Record<number, boolean>>({})

  const [staff, setStaff] = useState<StaffDraft[]>([])

  const addStaff = (role: 'doctor' | 'receptionist') => {
    setStaff((prev) => [...prev, emptyStaff(role)])
  }

  const updateStaff = (idx: number, patch: Partial<StaffDraft>) => {
    setStaff((prev) => prev.map((entry, i) => (i === idx ? { ...entry, ...patch } : entry)))
  }

  const removeStaff = (idx: number) => {
    setStaff((prev) => prev.filter((_, i) => i !== idx))
    setShowStaffPasswords({})
    setIsUploadingStaffImage({})
  }

  const toggleStaffPassword = (idx: number) => {
    setShowStaffPasswords((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  const handleClinicImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingClinicImage(true)
    try {
      const { data } = await uploadsApi.uploadImage(file)
      setClinicImage(data.file_path)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'Failed to upload clinic image')
      } else {
        setError('Failed to upload clinic image')
      }
    } finally {
      setIsUploadingClinicImage(false)
      event.target.value = ''
    }
  }

  const handleStaffDoctorImageUpload = async (
    idx: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingStaffImage((prev) => ({ ...prev, [idx]: true }))
    try {
      const { data } = await uploadsApi.uploadImage(file)
      updateStaff(idx, { doctor_image: data.file_path })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'Failed to upload doctor image')
      } else {
        setError('Failed to upload doctor image')
      }
    } finally {
      setIsUploadingStaffImage((prev) => ({ ...prev, [idx]: false }))
      event.target.value = ''
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported in this browser.')
      return
    }

    setLocationError(null)
    setIsDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6))
        setLongitude(position.coords.longitude.toFixed(6))
        setIsDetectingLocation(false)
      },
      () => {
        setLocationError('Location access denied. Enter latitude and longitude manually.')
        setIsDetectingLocation(false)
      }
    )
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
        clinic_image: clinicImage.trim() || undefined,
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
          doctor_image: entry.role === 'doctor' ? (entry.doctor_image.trim() || undefined) : undefined,
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

  const isAnyStaffImageUploading = Object.values(isUploadingStaffImage).some(Boolean)

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

            <div>
              <Label className="mb-1.5 block">Clinic Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleClinicImageUpload}
                disabled={isUploadingClinicImage}
              />
              {isUploadingClinicImage && <p className="mt-1 text-xs text-surface-500">Uploading image...</p>}
              {clinicImage && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={resolveMediaUrl(clinicImage) ?? ''}
                    alt="Clinic preview"
                    className="h-12 w-12 rounded-lg border border-surface-200 object-cover"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={() => setClinicImage('')}>
                    Remove image
                  </Button>
                </div>
              )}
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

            <div className="space-y-1.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleUseCurrentLocation}
                disabled={isDetectingLocation}
                className="h-10 rounded-xl"
              >
                {isDetectingLocation ? (
                  <><Loader2 size={14} className="animate-spin" /> Detecting location...</>
                ) : (
                  <><LocateFixed size={14} /> Use current location</>
                )}
              </Button>
              <p className="text-xs text-surface-500">Autofills latitude and longitude from your device location.</p>
              {locationError && <p className="text-xs text-red-600">{locationError}</p>}
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
              <div className="relative">
                <Input
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  placeholder="Minimum 6 characters"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAdminPassword((prev) => !prev)}
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                  aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                >
                  {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
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
                      <div className="relative">
                        <Input
                          type={showStaffPasswords[idx] ? 'text' : 'password'}
                          value={entry.password}
                          onChange={(e) => updateStaff(idx, { password: e.target.value })}
                          placeholder="Password"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleStaffPassword(idx)}
                          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                          aria-label={showStaffPasswords[idx] ? 'Hide password' : 'Show password'}
                        >
                          {showStaffPasswords[idx] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Button>
                      </div>
                      <Input
                        value={entry.role === 'doctor' ? entry.specialization : 'Reception desk'}
                        onChange={(e) => updateStaff(idx, { specialization: e.target.value })}
                        placeholder="Specialization"
                        disabled={entry.role !== 'doctor'}
                      />
                    </div>

                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleStaffDoctorImageUpload(idx, e)}
                        disabled={entry.role !== 'doctor' || Boolean(isUploadingStaffImage[idx])}
                      />
                      {entry.role === 'doctor' && isUploadingStaffImage[idx] && (
                        <p className="mt-1 text-xs text-surface-500">Uploading doctor image...</p>
                      )}
                      {entry.role === 'doctor' && entry.doctor_image && (
                        <div className="mt-2 flex items-center gap-3">
                          <img
                            src={resolveMediaUrl(entry.doctor_image) ?? ''}
                            alt="Doctor preview"
                            className="h-10 w-10 rounded-lg border border-surface-200 object-cover"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => updateStaff(idx, { doctor_image: '' })}
                          >
                            Remove image
                          </Button>
                        </div>
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
            <Button
              type="submit"
              disabled={isSubmitting || isUploadingClinicImage || isAnyStaffImageUploading}
              className="h-11 rounded-xl bg-brand-500 hover:bg-brand-600 text-white"
            >
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
