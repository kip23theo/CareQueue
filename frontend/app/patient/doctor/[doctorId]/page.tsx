'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
import { MapPin, Star, Clock, Users, Loader2, Navigation, Stethoscope, Building2 } from 'lucide-react'

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

export default function DoctorBookingPage() {
  const { doctorId } = useParams<{ doctorId: string }>()
  const searchParams = useSearchParams()
  const clinicId = searchParams.get('clinicId') ?? ''
  const hasClinicId = Boolean(clinicId)
  const router = useRouter()

  const authUser = getUser()
  const { location, setMyToken, myToken } = usePatient()
  const { success, error: toastError } = useToast()

  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [isLoading, setIsLoading] = useState(hasClinicId)
  const [loadError, setLoadError] = useState<string | null>(
    hasClinicId ? null : 'Clinic was not specified for this doctor booking.'
  )
  const [isJoining, setIsJoining] = useState(false)

  const [initialBookingProfile] = useState(() => getInitialBookingProfile(authUser))

  const [name, setName] = useState(initialBookingProfile.name)
  const [phone, setPhone] = useState(initialBookingProfile.phone)
  const [age, setAge] = useState(initialBookingProfile.age)
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>(initialBookingProfile.gender)
  const [symptoms, setSymptoms] = useState('')
  const [isEditingDetails, setIsEditingDetails] = useState(
    !(initialBookingProfile.name && initialBookingProfile.phone && initialBookingProfile.age)
  )

  useEffect(() => {
    if (!clinicId) return

    const load = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const [clinicRes, doctorsRes] = await Promise.all([
          clinicsApi.getById(clinicId),
          clinicsApi.getDoctors(clinicId),
        ])

        const selectedDoctor = doctorsRes.data.find((item) => item._id === doctorId)
        if (!selectedDoctor) {
          setLoadError('Doctor not found in this clinic.')
          setClinic(clinicRes.data)
          return
        }

        setClinic(clinicRes.data)
        setDoctor(selectedDoctor)
      } catch {
        setLoadError('Failed to load doctor booking details')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [clinicId, doctorId])

  const existingToken =
    myToken?.clinic_id === clinicId &&
    myToken?.doctor_id === doctorId &&
    ACTIVE_TRACKABLE_STATUSES.has(myToken.status)
      ? myToken
      : null

  const doctorWaitEstimate = useMemo(() => {
    if (!clinic || !doctor || clinic.est_wait_mins === undefined) return undefined
    return Math.max(0, clinic.est_wait_mins + Math.max(doctor.delay_mins, 0))
  }, [clinic, doctor])

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
    if (!clinic || !doctor) return

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
        clinic_id: clinic._id,
        doctor_id: doctor._id,
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

  if (loadError || !clinic || !doctor) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <Card className="rounded-2xl border border-surface-200 bg-white p-5">
          <p className="text-sm font-semibold text-surface-800">{loadError ?? 'Doctor booking details unavailable'}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 rounded-xl border-surface-200"
            onClick={() => router.push('/patient/clinics')}
          >
            Back to search
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <Card className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-16 w-16 rounded-xl overflow-hidden bg-surface-100 border border-surface-200 shrink-0">
              {doctor.doctor_image ? (
                <img src={doctor.doctor_image} alt={doctor.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-surface-500">
                  {doctor.name.trim().split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'DR'}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold font-heading text-surface-900 truncate">{doctor.name}</h1>
              <p className="text-sm text-surface-600 mt-0.5">{doctor.specialization || 'General'}</p>
              <p className="text-xs text-surface-500 mt-1 flex items-center gap-1">
                <Building2 size={12} />
                {clinic.name}
              </p>
            </div>
          </div>

          <Badge className={cn(
            'px-2.5 py-1 rounded-full text-xs font-semibold',
            doctor.is_available && clinic.is_open
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-600'
          )}>
            {doctor.is_available && clinic.is_open ? 'Available' : 'Unavailable'}
          </Badge>
        </div>

        <div className="flex items-center gap-1 mt-1 text-sm text-surface-500">
          <MapPin size={14} />
          <span className="truncate">{clinic.address}</span>
        </div>

        <div className="flex items-center gap-2 mt-2 text-sm text-surface-600">
          <Star size={13} className="text-amber-400 fill-amber-400" />
          <span>{clinic.rating.toFixed(1)}</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <PhoneReveal
            phone={doctor.phone}
            buttonLabel="Show doctor number"
            emptyLabel="Doctor phone unavailable"
          />
          <PhoneReveal
            phone={clinic.phone}
            buttonLabel="Show clinic number"
            emptyLabel="Clinic phone unavailable"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            onClick={handleGetDirections}
            variant="outline"
            size="sm"
            disabled={!Number.isFinite(clinic.location?.coordinates?.[1]) || !Number.isFinite(clinic.location?.coordinates?.[0])}
            className="h-9 rounded-xl border-surface-200 text-surface-700"
          >
            <Navigation size={14} />
            Get directions
          </Button>
          <Button
            type="button"
            onClick={() => router.push(`/patient/clinic/${clinic._id}`)}
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-surface-200 text-surface-700"
          >
            View clinic
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center p-3 rounded-xl bg-surface-50">
            <Users size={16} className="text-brand-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-surface-900 font-heading">{clinic.queue_length ?? '—'}</p>
            <p className="text-xs text-surface-500">waiting</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-surface-50">
            <Clock size={16} className="text-brand-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-surface-900 font-heading">
              {doctorWaitEstimate !== undefined ? formatWaitTime(doctorWaitEstimate) : '—'}
            </p>
            <p className="text-xs text-surface-500">est. wait</p>
          </div>
          <div className="flex justify-center items-center p-3 rounded-xl bg-surface-50">
            <WaitTimeMeter waitMins={doctorWaitEstimate ?? 0} size="sm" />
          </div>
        </div>
      </Card>

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

      {!existingToken && clinic.is_open && doctor.is_available && (
        <Card className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-surface-900 font-heading flex items-center gap-2">
                <Stethoscope size={16} className="text-brand-500" />
                Book with {doctor.name}
              </h2>
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

              <div>
                <Label className="block text-xs font-medium text-surface-600 mb-1.5">Gender</Label>
                <div className="flex gap-2">
                  {(['male', 'female', 'other'] as const).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      onClick={() => setGender(gender === value ? '' : value)}
                      variant={gender === value ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'flex-1 h-9 rounded-xl text-xs font-medium capitalize transition-all',
                        gender === value
                          ? 'border-brand-400 bg-brand-50 text-brand-700'
                          : 'border-surface-200 text-surface-600 hover:border-surface-300'
                      )}
                    >
                      {value}
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

      {!existingToken && (!clinic.is_open || !doctor.is_available) && (
        <Card className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
          <p className="text-sm font-semibold text-surface-900">Booking unavailable right now</p>
          <p className="text-xs text-surface-500 mt-1">
            {!clinic.is_open
              ? 'This clinic is currently closed.'
              : 'This doctor is currently unavailable. Please choose another doctor or clinic.'}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 rounded-xl border-surface-200"
            onClick={() => router.push(`/patient/clinic/${clinic._id}`)}
          >
            Choose another doctor
          </Button>
        </Card>
      )}
    </div>
  )
}
