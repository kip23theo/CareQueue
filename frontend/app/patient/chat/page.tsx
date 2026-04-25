'use client'

import { usePatient } from '@/context/PatientContext'
import { ChatInterface } from '@/components/ai/ChatInterface'
import { Sparkles } from 'lucide-react'

export default function PatientChatPage() {
  const { nearbyClinics } = usePatient()

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <div className="border-b border-surface-200 bg-white px-4 py-3">
        <h1 className="font-bold font-heading text-surface-900 flex items-center gap-2">
          <Sparkles size={18} className="text-brand-500" />
          AI Assistant
        </h1>
        <p className="text-xs text-surface-500 mt-0.5">Ask about clinics, wait times, or symptoms</p>
      </div>
      <div className="flex-1 overflow-hidden bg-surface-50">
        <ChatInterface initialContext={nearbyClinics} />
      </div>
    </div>
  )
}
