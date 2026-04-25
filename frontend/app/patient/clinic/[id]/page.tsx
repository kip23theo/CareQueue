'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { clinicsApi, tokensApi } from '@/lib/api-calls'
import { usePatient } from '@/context/PatientContext'
import { useToast } from '@/context/ToastContext'
import { WaitTimeMeter } from '@/components/ui/WaitTimeMeter'
import { cn, formatWaitTime } from '@/lib/utils'
import type { Clinic, Doctor } from '@/types'
import axios from 'axios'
import { MapPin, Phone, Star, Clock, Users, Loader2, Stethoscope } from 'lucide-react'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} />
}

export default function ClinicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { setMyToken, myToken } = usePatient()
  const { success, error: toastError } = useToast()
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  const [isJoining, setIsJoining] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [symptoms, setSymptoms] = useState('')

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
  }, [id])

  const existingToken = myToken?.clinic_id === id ? myToken : null

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDoctor) { toastError('Please select a doctor'); return }
    setIsJoining(true)
    try {
      const { data } = await tokensApi.join({
        clinic_id: id,
        doctor_id: selectedDoctor,
        patient_name: name,
        patient_phone: phone,
        patient_age: Number(age),
        patient_gender: gender || undefined,
        symptoms: symptoms || undefined,
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
      <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold font-heading text-surface-900">{clinic.name}</h1>
            <div className="flex items-center gap-1 mt-1 text-sm text-surface-500">
              <MapPin size={14} />
              {clinic.address}
            </div>
          </div>
          <span className={cn(
            'px-2.5 py-1 rounded-full text-xs font-semibold',
            clinic.is_open
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-600'
          )}>
            {clinic.is_open ? 'Open' : 'Closed'}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-4 text-sm text-surface-600">
          <Phone size={13} />
          <span>{clinic.phone}</span>
          <span className="mx-2 text-surface-300">•</span>
          <Star size={13} className="text-amber-400 fill-amber-400" />
          <span>{clinic.rating.toFixed(1)}</span>
        </div>

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
      </div>

      {/* Already in queue */}
      {existingToken && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-700">You already have a token</p>
            <p className="text-xs text-brand-600 mt-0.5">Token #{existingToken.token_display}</p>
          </div>
          <button
            onClick={() => router.push(`/patient/token/${existingToken._id}`)}
            className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
          >
            Track
          </button>
        </div>
      )}

      {/* Doctor selector */}
      {doctors.length > 0 && (
        <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
          <h2 className="font-semibold text-surface-900 font-heading mb-3 flex items-center gap-2">
            <Stethoscope size={16} className="text-brand-500" />
            Select Doctor
          </h2>
          <div className="space-y-2">
            {doctors.map((doc) => (
              <label
                key={doc._id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                  selectedDoctor === doc._id
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-surface-200 hover:border-surface-300',
                  !doc.is_available && 'opacity-50 cursor-not-allowed'
                )}
              >
                <input
                  type="radio"
                  name="doctor"
                  value={doc._id}
                  checked={selectedDoctor === doc._id}
                  onChange={() => doc.is_available && setSelectedDoctor(doc._id)}
                  className="accent-brand-500"
                  disabled={!doc.is_available}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-900">{doc.name}</p>
                  <p className="text-xs text-surface-500">{doc.specialization}</p>
                </div>
                {doc.is_available ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                    Available
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 text-surface-500">
                    Unavailable
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Join form */}
      {!existingToken && clinic.is_open && (
        <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
          <h2 className="font-semibold text-surface-900 font-heading mb-4">Join Queue</h2>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-surface-600 mb-1.5">Full Name *</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1.5">Phone *</label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1.5">Age *</label>
                <input
                  required
                  type="number"
                  min="0"
                  max="150"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="25"
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1.5">Gender</label>
              <div className="flex gap-2">
                {(['male', 'female', 'other'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(gender === g ? '' : g)}
                    className={cn(
                      'flex-1 py-2 rounded-xl border text-xs font-medium capitalize transition-all',
                      gender === g
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-surface-200 text-surface-600 hover:border-surface-300'
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1.5">Symptoms (optional)</label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Describe your symptoms..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 focus:bg-white transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isJoining}
              className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm shadow-brand-500/25"
            >
              {isJoining ? (
                <><Loader2 size={18} className="animate-spin" /> Joining...</>
              ) : (
                'Join Queue'
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
