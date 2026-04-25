'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowUp, Sparkles, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  closeAICopilotDialog,
  getAICopilotOpenState,
  setAICopilotOpenState,
  subscribeAICopilotOpenState,
} from '@/lib/ai-copilot'

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  role: ChatRole
  content: string
}

type MessageTime = {
  time: string
  isError?: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const TRAVEL_SPEED_KMPH = 25
const MAX_CONTEXT_CLINICS = 12

const quickPrompts = [
  'Fever - which clinic?',
  'Shortest wait near me?',
  'Is cardiology open?',
  'Add patient quickly',
]

type StoredLocation = {
  lat: number
  lng: number
  label?: string
}

type StoredClinic = {
  _id?: string
  id?: string
  name?: string
  address?: string
  distance_km?: number
  est_wait_mins?: number
  queue_length?: number
  rating?: number
  is_open?: boolean
  specializations?: string[]
}

function currentTime() {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

function parseSessionJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function toNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function estimateReachMins(distanceKm: number | null): number | null {
  if (distanceKm === null) return null
  const minutes = Math.round((distanceKm / TRAVEL_SPEED_KMPH) * 60)
  return Math.max(1, minutes)
}

function buildClinicContext() {
  const location = parseSessionJson<StoredLocation>('cf_location')
  const clinics = parseSessionJson<StoredClinic[]>('cf_nearby_clinics') ?? []

  const clinicRows = clinics
    .slice(0, MAX_CONTEXT_CLINICS)
    .map((clinic) => {
      const distanceKm = toNumber(clinic.distance_km)
      const rating = toNumber(clinic.rating)
      const waitMins = toNumber(clinic.est_wait_mins)
      const queueLength = toNumber(clinic.queue_length)
      const clinicId = (clinic._id ?? clinic.id ?? '').trim()
      if (!clinicId) return null
      return {
        clinic_id: clinicId,
        name: clinic.name ?? 'Clinic',
        address: clinic.address ?? '',
        distance_km: distanceKm,
        estimated_reach_mins: estimateReachMins(distanceKm),
        est_wait_mins: waitMins,
        queue_length: queueLength,
        rating,
        review_signal: rating !== null ? `${rating.toFixed(1)} / 5 based on patient reviews` : null,
        is_open: clinic.is_open ?? null,
        specializations: clinic.specializations ?? [],
      }
    })
    .filter((clinic): clinic is NonNullable<typeof clinic> => clinic !== null)

  if (clinicRows.length === 0) return null

  return {
    generated_at: new Date().toISOString(),
    user_location: location
      ? { lat: location.lat, lng: location.lng, label: location.label ?? null }
      : null,
    clinics: clinicRows,
  }
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${dot * 140}ms` }}
        />
      ))}
    </div>
  )
}

export default function AICopilotPanel() {
  const isOpen = useSyncExternalStore(subscribeAICopilotOpenState, getAICopilotOpenState, () => false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageTimes, setMessageTimes] = useState<MessageTime[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const sendMessage = async (message: string) => {
    const trimmed = message.trim()
    if (!trimmed || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setMessageTimes((times) => [...times, { time: currentTime() }])
    setInput('')
    setIsLoading(true)

    try {
      const clinicContext = buildClinicContext()
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map(({ role, content }) => ({ role, content })),
          clinic_context: clinicContext,
        }),
      })

      if (!response.ok) {
        throw new Error('AI request failed')
      }

      const data = (await response.json()) as { reply?: string }
      const reply = data.reply?.trim() || "I couldn't generate a response just now."

      setMessages([...nextMessages, { role: 'assistant', content: reply }])
      setMessageTimes((times) => [...times, { time: currentTime() }])
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: "Sorry, I'm having trouble reaching CareQueue AI. Please try again.",
        },
      ])
      setMessageTimes((times) => [...times, { time: currentTime(), isError: true }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setAICopilotOpenState}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(96vw,760px)] max-w-[760px] overflow-hidden rounded-2xl border border-[#E2E8F0] p-0"
      >
        <section className="flex h-[78vh] min-h-[500px] max-h-[760px] flex-col bg-white">
          <header className="flex shrink-0 items-start justify-between border-b border-[#E2E8F0] px-5 py-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Sparkles size={18} className="text-[#0D9488]" aria-hidden="true" />
                CareQueue AI
              </DialogTitle>
              <p className="mt-1 text-sm text-slate-500">Ask about symptoms, wait times, or clinics</p>
            </div>
            <button
              type="button"
              aria-label="Close CareQueue AI"
              onClick={closeAICopilotDialog}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto bg-slate-50/70 px-4 py-5">
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isLoading}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-[#E2E8F0] bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-[#0D9488] hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {messages.map((message, index) => {
                const isUser = message.role === 'user'
                const meta = messageTimes[index]

                return (
                  <div
                    key={`${message.role}-${index}`}
                    className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[82%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                        isUser
                          ? 'bg-[#0D9488] text-white'
                          : 'border border-[#E2E8F0] bg-[#F8FAFC] text-[#1e293b]',
                        meta?.isError && 'border-red-200 bg-red-50 text-red-800'
                      )}
                    >
                      {message.content}
                    </div>
                    <time className="mt-1 text-[11px] text-slate-400">{meta?.time}</time>
                  </div>
                )
              })}

              {isLoading && (
                <div className="flex flex-col items-start">
                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 shadow-sm">
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <form
            className="flex shrink-0 gap-2 border-t border-[#E2E8F0] bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault()
              sendMessage(input)
            }}
          >
            <input
              type="text"
              value={input}
              disabled={isLoading}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask anything..."
              className="min-w-0 flex-1 rounded-md border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0D9488] focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#0D9488] text-white transition hover:bg-[#0f766e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowUp size={19} aria-hidden="true" />
            </button>
          </form>
        </section>
      </DialogContent>
    </Dialog>
  )
}
