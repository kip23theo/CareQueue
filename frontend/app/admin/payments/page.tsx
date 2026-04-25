'use client'

import { useMemo } from 'react'
import { useQueue } from '@/context/QueueContext'
import { PaymentEntryBoard } from '@/components/staff/PaymentEntryBoard'

export default function AdminPaymentsPage() {
  const { queue, isLoading, refresh } = useQueue()

  const completedTokens = useMemo(
    () => (queue?.tokens ?? []).filter((token) => token.status === 'COMPLETED'),
    [queue?.tokens]
  )

  return (
    <PaymentEntryBoard
      title="Payment Entry"
      description="Record or edit payments for completed consultations."
      completedTokens={completedTokens}
      isLoading={isLoading}
      onRefresh={refresh}
    />
  )
}
