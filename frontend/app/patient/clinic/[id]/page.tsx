'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { clinicsApi, tokensApi } from '@/lib/api-calls'
import { getUser } from '@/lib/auth'
import { usePatient } from '@/context/PatientContext'
import { useToast } from '@/context/ToastContext'
import { WaitTimeMeter } from '@/components/ui/WaitTimeMeter'
import { buildGoogleMapsDirectionsUrl } from '@/lib/location'
import { cn, formatWaitTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PhoneReveal } from '@/components/ui/PhoneReveal'
import type { Clinic, Doctor, QueueToken } from '@/types'
import axios from 'axios'
import { MapPin, Star, Clock, Users, Loader2, Stethoscope, Navigation } from 'lucide-react'

const ACTIVE_TRACKABLE_STATUSES: Set<QueueToken['status']> = new Set([
  'WAITING',
  'CALLED',
  'IN_CONSULTATION',
  'EMERGENCY',
])

const BOOKING_PROFILE_KEY = 'cf_patient_booking_profile'

interface BookingProfile {
  name: string
  phone: string
  age: string
  gender: 'male' | 'female' | 'other' | ''
}

function getInitialBookingProfile(authUser: ReturnType<typeof getUser>): BookingProfile {
  const fallbackProfile: BookingProfile = {
    name: authUser?.name?.trim() ?? '',
    phone: authUser?.phone?.trim() ?? '',
    age: '',
    gender: '',
  }

  if (typeof window === 'undefined') return fallbackProfile

  const savedRaw = localStorage.getItem(BOOKING_PROFILE_KEY)
  if (!savedRaw) return fallbackProfile

  try {
    const saved = JSON.parse(savedRaw) as Partial<BookingProfile>
    return {
      name: saved.name?.trim() || fallbackProfile.name,
      phone: saved.phone?.trim() || fallbackProfile.phone,
      age: saved.age?.trim() || '',
      gender: saved.gender && ['male', 'female', 'other'].includes(saved.gender) ? saved.gender : '',
    }
  } catch {
    return fallbackProfile
  }
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} />
}

export default function ClinicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const authUser = getUser()
  const { location, setMyToken, myToken } = usePatient()
  const { success, error: toastError } = useToast()
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  const [isJoining, setIsJoining] = useState(false)
  const [initialBookingProfile] = useState(() => getInitialBookingProfile(authUser))

  // Form fields
  const [name, setName] = useState(initialBookingProfile.name)
  const [phone, setPhone] = useState(initialBookingProfile.phone)
  const [age, setAge] = useState(initialBookingProfile.age)
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>(initialBookingProfile.gender)
  const [symptoms, setSymptoms] = useState('')
  const [isEditingDetails, setIsEditingDetails] = useState(
    !(initialBookingProfile.name && initialBookingProfile.phone && initialBookingProfile.age)
  )

  useEffect(() => {
    const load = async () => {
      try {
        const [clinicRes, doctorsRes] = await Promise.all([
          clinicsApi.getById(id),
          clinicsApi.getDoctors(id),
        ])
        setClinic(clinicRes.data)
        setDoctors(doctorsRes.data)
        const avail = doctorsRes.data.find((d) => d.is_available)
        if (avail) setSelectedDoctor(avail._id)
      } catch {
        toastError('Failed to load clinic')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, toastError])

  const existingToken =
    myToken?.clinic_id === id && ACTIVE_TRACKABLE_STATUSES.has(myToken.status)
      ? myToken
      : null
  const hasSavedDetails = Boolean(name.trim() && phone.trim() && age.trim())

  const handleGetDirections = () => {
    if (!clinic) return
    const clinicLat = clinic.location?.coordinates?.[1]
    const clinicLng = clinic.location?.coordinates?.[0]
    if (!Number.isFinite(clinicLat) || !Number.isFinite(clinicLng)) return
    const directionsUrl = buildGoogleMapsDirectionsUrl(
      { lat: clinicLat as number, lng: clinicLng as number },
      location ? { lat: location.lat, lng: location.lng } : undefined
    )
    window.open(directionsUrl, '_blank', 'noopener,noreferrer')
  }

  const handleBook = async () => {
    if (!selectedDoctor) { toastError('Please select a doctor'); return }
    const cleanName = name.trim()
    const cleanPhone = phone.trim()
    const parsedAge = Number(age)
    if (!cleanName || !cleanPhone || !age.trim()) {
      toastError('Please complete your details once before booking')
      setIsEditingDetails(true)
      return
    }
    if (!Number.isFinite(parsedAge) || parsedAge <= 0 || parsedAge > 150) {
      toastError('Please enter a valid age')
      setIsEditingDetails(true)
      return
    }
    localStorage.setItem(BOOKING_PROFILE_KEY, JSON.stringify({
      name: cleanName,
      phone: cleanPhone,
      age: String(parsedAge),
      gender,
    } satisfies BookingProfile))
    setIsJoining(true)
    try {
      const { data } = await tokensApi.join({
        clinic_id: id,
        doctor_id: selectedDoctor,
        patient_user_id: authUser?.role === 'patient' ? authUser.id : undefined,
        patient_name: cleanName,
        patient_phone: cleanPhone,
        patient_age: parsedAge,
        patient_gender: gender || undefined,
        symptoms: symptoms.trim() || undefined,
      })
      setMyToken(data.token)
      success(`Token ${data.token.token_display} created! You're #${data.token.position} in queue.`)
      router.push(`/patient/token/${data.token._id}`)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toastError(err.response?.data?.detail ?? 'Failed to join queue')
      }
    } finally {
      setIsJoining(false)
    }
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    void handleBook()
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (!clinic) return <div className="p-8 text-center text-surface-500">Clinic not found</div>

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Hero */}
      <Card className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-16 w-16 rounded-xl overflow-hidden bg-surface-100 border border-surface-200 shrink-0">
              {clinic.clinic_image ? (
                <img src={clinic.clinic_image} alt={clinic.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-lg font-semibold text-surface-500">
                  {clinic.name.trim().charAt(0).toUpperCase() || 'C'}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold font-heading text-surface-900">{clinic.name}</h1>
              <div className="flex items-center gap-1 mt-1 text-sm text-surface-500">
                <MapPin size={14} />
                {clinic.address}
              </div>
            </div>
          </div>
          <Badge className={cn(
            'px-2.5 py-1 rounded-full text-xs font-semibold',
            clinic.is_open
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-600'
          )}>
            {clinic.is_open ? 'Open' : 'Closed'}
          </Badge>
        </div>

        <div className="flex items-center gap-2 mb-3 text-sm text-surface-600">
          <Star size={13} className="text-amber-400 fill-amber-400" />
          <span>{clinic.rating.toFixed(1)}</span>
        </div>

        <div className="mb-4">
          <PhoneReveal
            phone={clinic.phone}
            buttonLabel="Show clinic number"
            emptyLabel="Clinic phone unavailable"
          />
        </div>

        <Button
          type="button"
          onClick={handleGetDirections}
          variant="outline"
          size="sm"
          disabled={!Number.isFinite(clinic.location?.coordinates?.[1]) || !Number.isFinite(clinic.location?.coordinates?.[0])}
          className="h-9 rounded-xl border-surface-200 text-surface-700 mb-4"
        >
          <Navigation size={14} />
          Get Directions
        </Button>

        {/* Live stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-surface-50">
            <Users size={16} className="text-brand-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-surface-900 font-heading">{clinic.queue_length ?? '—'}</p>
            <p className="text-xs text-surface-500">waiting</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-surface-50">
            <Clock size={16} className="text-brand-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-surface-900 font-heading">
              {clinic.est_wait_mins !== undefined ? formatWaitTime(clinic.est_wait_mins) : '—'}
            </p>
            <p className="text-xs text-surface-500">est. wait</p>
          </div>
          <div className="flex justify-center items-center p-3 rounded-xl bg-surface-50">
            <WaitTimeMeter waitMins={clinic.est_wait_mins ?? 0} size="sm" />
          </div>
        </div>
      </Card>

      {/* Already in queue */}
      {existingToken && (
        <Card className="bg-brand-50 border border-brand-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-700">You already have a token</p>
            <p className="text-xs text-brand-600 mt-0.5">Token #{existingToken.token_display}</p>
          </div>
          <Button
            onClick={() => router.push(`/patient/token/${existingToken._id}`)}
            size="sm"
            className="h-9 px-4 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600"
          >
            Track
          </Button>
        </Card>
      )}

      {/* Doctor selector */}
      {doctors.length > 0 && (
        <Card className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
          <h2 className="font-semibold text-surface-900 font-heading mb-3 flex items-center gap-2">
            <Stethoscope size={16} className="text-brand-500" />
            Select Doctor
          </h2>
          <div className="space-y-2">
            {doctors.map((doc) => (
              <div key={doc._id}>
                <Button
                  type="button"
                  onClick={() => doc.is_available && setSelectedDoctor(doc._id)}
                  disabled={!doc.is_available}
                  variant="ghost"
                  className={cn(
                    'w-full h-auto justify-start flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                    selectedDoctor === doc._id
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-surface-200 hover:border-surface-300',
                    !doc.is_available && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-4 w-4 items-center justify-center rounded-full border border-surface-300',
                      selectedDoctor === doc._id && 'border-brand-500'
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        selectedDoctor === doc._id ? 'bg-brand-500' : 'bg-transparent'
                      )}
                    />
                  </span>
                  <div className="h-10 w-10 rounded-lg overflow-hidden bg-surface-100 border border-surface-200 shrink-0">
                    {doc.doctor_image ? (
                      <img src={doc.doctor_image} alt={doc.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-surface-500">
                        {doc.name.trim().split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'DR'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-900">{doc.name}</p>
                    <p className="text-xs text-surface-500">{doc.specialization}</p>
                  </div>
                  {doc.is_available ? (
                    <Badge className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium border-transparent">
                      Available
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full bg-surface-100 text-surface-500 border-transparent">
                      Unavailable
                    </Badge>
                  )}
                </Button>
                <div className="mt-1 px-1">
                  <PhoneReveal
                    phone={doc.phone}
                    buttonLabel="Show phone number"
                    emptyLabel="Doctor phone unavailable"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Join form */}
      {!existingToken && clinic.is_open && (
        <Card className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-surface-900 font-heading">Join Queue</h2>
              <p className="text-xs text-surface-500 mt-1">
                {hasSavedDetails
                  ? 'Saved details are ready. Tap Book Now.'
                  : 'Enter your details once, then book in one tap next time.'}
              </p>
            </div>
            {hasSavedDetails && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditingDetails((prev) => !prev)}
                className="h-9 rounded-xl border-surface-200 text-surface-700"
              >
                {isEditingDetails ? 'Hide details' : 'Edit details'}
              </Button>
            )}
          </div>

          {!isEditingDetails && hasSavedDetails ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-3 space-y-1.5">
                <p className="text-sm font-semibold text-surface-900">{name}</p>
                <p className="text-xs text-surface-600">{phone}</p>
                <p className="text-xs text-surface-600">Age {age}{gender ? ` · ${gender}` : ''}</p>
              </div>

              <div>
                <Label className="block text-xs font-medium text-surface-600 mb-1.5">Symptoms (optional)</Label>
                <Textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Describe your symptoms..."
                  rows={3}
                  className="rounded-xl border-surface-200 bg-surface-50 px-3 py-2.5 text-sm resize-none"
                />
              </div>

              <Button
                type="button"
                onClick={() => void handleBook()}
                disabled={isJoining}
                className="w-full h-12 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 flex items-center justify-center gap-2 shadow-sm shadow-brand-500/25"
              >
                {isJoining ? (
                  <><Loader2 size={18} className="animate-spin" /> Booking...</>
                ) : (
                  'Book Now'
                )}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="block text-xs font-medium text-surface-600 mb-1.5">Full Name *</Label>
                  <Input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="h-10 rounded-xl border-surface-200 bg-surface-50 px-3 text-sm"
                  />
                </div>
                <div>
                  <Label className="block text-xs font-medium text-surface-600 mb-1.5">Phone *</Label>
                  <Input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91..."
                    className="h-10 rounded-xl border-surface-200 bg-surface-50 px-3 text-sm"
                  />
                </div>
                <div>
                  <Label className="block text-xs font-medium text-surface-600 mb-1.5">Age *</Label>
                  <Input
                    required
                    type="number"
                    min="1"
                    max="150"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="25"
                    className="h-10 rounded-xl border-surface-200 bg-surface-50 px-3 text-sm"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <Label className="block text-xs font-medium text-surface-600 mb-1.5">Gender</Label>
                <div className="flex gap-2">
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <Button
                      key={g}
                      type="button"
                      onClick={() => setGender(gender === g ? '' : g)}
                      variant={gender === g ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'flex-1 h-9 rounded-xl text-xs font-medium capitalize transition-all',
                        gender === g
                          ? 'border-brand-400 bg-brand-50 text-brand-700'
                          : 'border-surface-200 text-surface-600 hover:border-surface-300'
                      )}
                    >
                      {g}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="block text-xs font-medium text-surface-600 mb-1.5">Symptoms (optional)</Label>
                <Textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Describe your symptoms..."
                  rows={3}
                  className="rounded-xl border-surface-200 bg-surface-50 px-3 py-2.5 text-sm resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isJoining}
                className="w-full h-12 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 flex items-center justify-center gap-2 shadow-sm shadow-brand-500/25"
              >
                {isJoining ? (
                  <><Loader2 size={18} className="animate-spin" /> Booking...</>
                ) : (
                  'Save Details & Book'
                )}
              </Button>
            </form>
          )}
        </Card>
      )}
    </div>
  )
}
