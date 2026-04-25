'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { tokensApi, clinicsApi } from '@/lib/api-calls'
import { LiveTracker } from '@/components/queue/LiveTracker'
import type { QueueToken, Clinic } from '@/types'
import { Loader2 } from 'lucide-react'

export default function TokenTrackerPage() {
  const { tokenId } = useParams<{ tokenId: string }>()
  const [token, setToken] = useState<QueueToken | null>(null)
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: t } = await tokensApi.getStatus(tokenId)
        setToken(t)
        const { data: c } = await clinicsApi.getById(t.clinic_id)
        setClinic(c)
      } catch {
        // handle error
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [tokenId])

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

  return <LiveTracker token={token} clinicName={clinic?.name ?? 'Clinic'} />
}
