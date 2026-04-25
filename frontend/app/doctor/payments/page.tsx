'use client'

import { useCallback, useEffect, useState } from 'react'
import { doctorsApi } from '@/lib/api-calls'
import { getUser } from '@/lib/auth'
import { PaymentEntryBoard } from '@/components/staff/PaymentEntryBoard'
import type { DoctorQueue } from '@/types'

export default function DoctorPaymentsPage() {
  const user = getUser()
  const [queue, setQueue] = useState<DoctorQueue | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data } = await doctorsApi.getQueue(user.id)
      setQueue(data)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    queueMicrotask(() => {
      void refresh()
    })
  }, [refresh])

  return (
    <PaymentEntryBoard
      title="My Patient Payments"
      description="Record payments for your completed consultations."
      completedTokens={queue?.completed_tokens ?? []}
      isLoading={isLoading}
      onRefresh={refresh}
    />
  )
}
