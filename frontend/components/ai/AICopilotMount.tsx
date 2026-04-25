'use client'

import { usePathname } from 'next/navigation'
import AICopilotPanel from '@/components/ai/AICopilotPanel'

export default function AICopilotMount() {
  const pathname = usePathname()
  const showAI = !pathname.startsWith('/auth')

  if (!showAI) return null

  return <AICopilotPanel />
}
