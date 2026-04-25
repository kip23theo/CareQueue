'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { tokensApi, clinicsApi } from '@/lib/api-calls'
import { usePatient } from '@/context/PatientContext'
import { LiveTracker } from '@/components/queue/LiveTracker'
import type { QueueToken, Clinic, Doctor } from '@/types'
import { Loader2 } from 'lucide-react'
import axios from 'axios'

export default function TokenTrackerPage() {
  const { tokenId } = useParams<{ tokenId: string }>()
  const { myToken, setMyToken } = usePatient()
  const [token, setToken] = useState<QueueToken | null>(null)
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: t } = await tokensApi.getStatus(tokenId)
        setToken(t)
        const [{ data: c }, { data: doctors }] = await Promise.all([
          clinicsApi.getById(t.clinic_id),
          clinicsApi.getDoctors(t.clinic_id),
        ])
        setClinic(c)
        setDoctor(doctors.find((item) => item._id === t.doctor_id) ?? null)
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          error.response?.status === 404 &&
          myToken?._id === tokenId
        ) {
          setMyToken(null)
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [myToken?._id, setMyToken, tokenId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-500" />
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center text-surface-500">
        Token not found
      </div>
    )
  }

  return (
    <LiveTracker
      token={token}
      clinicName={clinic?.name ?? 'Clinic'}
      doctorName={doctor?.name}
      doctorSpecialization={doctor?.specialization}
    />
  )
}
