'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { AIChatMessage, Clinic } from '@/types'
import { aiApi } from '@/lib/api-calls'
import { ClinicCard } from '@/components/ui/ClinicCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

const quickPrompts = [
  "Which clinic has the shortest wait near me?",
  "I have fever and headache, where should I go?",
  "Find the best clinic for a child with cough",
]

interface Props {
  initialContext?: Clinic[]
}

export function ChatInterface({ initialContext = [] }: Props) {
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [suggestedClinic, setSuggestedClinic] = useState<Clinic | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async (message: string) => {
    if (!message.trim()) return
    const newMessages: AIChatMessage[] = [...messages, { role: 'user', content: message }]
    setMessages(newMessages)
    setInput('')
    setIsTyping(true)
    setSuggestedClinic(null)
    try {
      const { data } = await aiApi.chat({ messages: newMessages, clinic_context: initialContext })
      setMessages([...newMessages, { role: 'assistant', content: data.reply }])
      if (data.suggested_clinic_id) {
        const found = initialContext.find((c) => c._id === data.suggested_clinic_id)
        if (found) setSuggestedClinic(found)
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: "Sorry, I'm having trouble connecting. Please try again." }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome state */}
        {messages.length === 0 && (
          <div className="py-8 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles size={22} className="text-white" />
            </div>
            <h2 className="text-lg font-bold font-heading text-surface-900 mb-1">CareQueue AI</h2>
            <p className="text-sm text-surface-500 mb-6">Ask me about clinics, wait times, or symptoms</p>
            <div className="space-y-2 max-w-xs mx-auto">
              {quickPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  variant="outline"
                  className="w-full h-auto justify-start text-left px-4 py-3 rounded-xl border-surface-200 bg-white hover:border-brand-300 hover:bg-brand-50 text-sm text-surface-700"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-2.5 animate-slide-up',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div
              className={cn(
                'max-w-xs rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-brand-500 text-white rounded-tr-sm'
                  : 'bg-white border border-surface-200 text-surface-800 rounded-tl-sm shadow-sm'
              )}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-surface-200 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-surface-600" />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-2.5 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white border border-surface-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-surface-400 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        {/* Suggested clinic inline */}
        {suggestedClinic && (
          <div className="animate-slide-up">
            <p className="text-xs text-surface-500 mb-2 ml-9">Suggested clinic:</p>
            <div className="ml-9">
              <ClinicCard
                clinic={suggestedClinic}
                isBestMatch
                onSelect={() => router.push(`/patient/clinic/${suggestedClinic._id}`)}
              />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-surface-200 bg-white px-4 py-3">
        <div className="flex gap-2 max-w-lg mx-auto">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(input)}
            placeholder="Ask about clinics or symptoms..."
            className="flex-1 h-10 px-4 rounded-xl border-surface-200 bg-surface-50 text-sm focus-visible:ring-brand-300"
          />
          <Button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isTyping}
            size="icon"
            className="w-10 h-10 rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 shrink-0"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
