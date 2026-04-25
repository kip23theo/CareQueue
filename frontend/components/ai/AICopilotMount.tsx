'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AICopilotPanel from '@/components/ai/AICopilotPanel'
import { setAICopilotOpenState } from '@/lib/ai-copilot'

export default function AICopilotMount() {
  const pathname = usePathname()
  const showAI = pathname === '/patient/clinics'

  useEffect(() => {
    if (!showAI) {
      setAICopilotOpenState(false)
    }
  }, [showAI])

  if (!showAI) return null

  return <AICopilotPanel />
}
