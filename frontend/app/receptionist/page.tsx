'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQueue } from '@/context/QueueContext'
import { useToast } from '@/context/ToastContext'
import { adminQueueApi, aiApi, doctorsApi } from '@/lib/api-calls'
import { getUser } from '@/lib/auth'
import { QueueList } from '@/components/queue/QueueList'
import { SSEStatusDot } from '@/components/ui/LiveDot'
import { cn, formatTokenDisplay } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Doctor } from '@/types'
import axios from 'axios'
import { Plus, Search, Loader2, Sparkles, Users, PhoneCall, CheckCircle2, SkipForward } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ReceptionistPage() {
  const router = useRouter()
  const { queue, isLoading, sseStatus, refresh } = useQueue()
  const { success, error: toastError } = useToast()
  const user = getUser()
  const [actionLoading, setActionLoading] = useState(false)

  // Quick add form
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [parseText, setParseText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', age: '', gender: '' as '' | 'male' | 'female' | 'other',
    symptoms: '', doctor_id: ''
  })
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (!user?.clinic_id) return
    doctorsApi.getAll(user.clinic_id).then(({ data }) => {
      setDoctors(data)
      const avail = data.find((d) => d.is_available)
      if (avail) setForm((f) => ({ ...f, doctor_id: avail._id }))
    }).catch(() => {})
  }, [user?.clinic_id])

  const handleAction = useCallback(async (fn: () => Promise<unknown>, msg: string) => {
    setActionLoading(true)
    try {
      await fn()
      success(msg)
      refresh()
    } catch (err) {
      if (axios.isAxiosError(err)) toastError(err.response?.data?.detail ?? 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }, [success, toastError, refresh])

  const handleParse = async () => {
    if (!parseText.trim()) return
    setIsParsing(true)
    try {
      const { data } = await aiApi.parsePatient({ text: parseText })
      setForm((f) => ({
        ...f,
        name: data.patient_name || f.name,
        age: data.patient_age?.toString() || f.age,
        gender: data.patient_gender || f.gender,
        symptoms: data.symptoms || f.symptoms,
      }))
      success('AI parsed details and filled the form. Review and click Add to Queue to submit.')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toastError(err.response?.data?.detail ?? 'Unable to parse patient text')
      }
    } finally {
      setIsParsing(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.clinic_id || !form.doctor_id) return
    setIsAdding(true)
    try {
      const { data: token } = await adminQueueApi.addWalkin({
        clinic_id: user.clinic_id,
        doctor_id: form.doctor_id,
        patient_name: form.name,
        patient_phone: form.phone,
        patient_age: Number(form.age),
        patient_gender: form.gender || undefined,
        symptoms: form.symptoms || undefined,
      })
      success(`Token ${formatTokenDisplay(token.token_number)} created for ${form.name}`)
      setForm({ name: '', phone: '', age: '', gender: '', symptoms: '', doctor_id: form.doctor_id })
      setParseText('')
      refresh()
    } catch (err) {
      if (axios.isAxiosError(err)) toastError(err.response?.data?.detail ?? 'Failed to add patient')
    } finally {
      setIsAdding(false)
    }
  }

  const stats = [
    { label: 'Waiting', value: queue?.waiting.length ?? 0, icon: <Users size={14} />, color: 'text-blue-600' },
    { label: 'Called', value: queue?.called.length ?? 0, icon: <PhoneCall size={14} />, color: 'text-amber-600' },
    { label: 'Completed', value: queue?.completed_count ?? 0, icon: <CheckCircle2 size={14} />, color: 'text-green-600' },
    { label: 'No shows', value: queue?.no_show_count ?? 0, icon: <SkipForward size={14} />, color: 'text-orange-600' },
  ]

  const allTokens = [
    ...(queue?.current_token ? [queue.current_token] : []),
    ...(queue?.waiting ?? []),
    ...(queue?.called ?? []),
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: Queue board */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-surface-200">
        <div className="bg-white border-b border-surface-200 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold font-heading text-surface-900">Queue Board</h1>
              <p className="text-sm text-surface-500">Today&apos;s live queue</p>
            </div>
            <div className="flex items-center gap-3">
              <SSEStatusDot status={sseStatus} showLabel />
              <Button
                onClick={() => router.push('/receptionist/search')}
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 text-sm text-surface-600 hover:bg-surface-50"
              >
                <Search size={14} />
                Search
              </Button>
            </div>
          </div>
          {/* Stats bar */}
          <div className="flex gap-3 overflow-x-auto">
            {stats.map((s) => (
              <div key={s.label} className={cn('flex items-center gap-1.5 text-sm font-medium', s.color)}>
                {s.icon}
                <span className="font-bold">{s.value}</span>
                <span className="text-surface-500 font-normal text-xs">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
            </div>
          ) : (
            <QueueList
              tokens={allTokens}
              currentToken={queue?.current_token}
              onSkip={(id) => handleAction(() => adminQueueApi.skip(id), 'Patient skipped')}
              onEmergency={(id) => handleAction(() => adminQueueApi.markEmergency(id), '🚨 Emergency flagged')}
              onStart={(id) => handleAction(() => adminQueueApi.startConsultation(id), 'Consultation started')}
              isLoading={actionLoading}
            />
          )}
        </div>
      </div>

      {/* Right: Quick add */}
      <div className="w-80 flex flex-col bg-white overflow-y-auto shrink-0">
        <div className="px-5 py-4 border-b border-surface-200">
          <h2 className="font-bold font-heading text-surface-900 flex items-center gap-2">
            <Plus size={16} className="text-brand-500" />
            Add Walk-in
          </h2>
        </div>
        <div className="p-5 flex-1">
          {/* AI parse bar */}
          <div className="mb-4">
            <Label className="block text-xs font-medium text-surface-600 mb-1.5">AI Parse</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={parseText}
                onChange={(e) => setParseText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  handleParse()
                }}
                placeholder="Rahul, 25, fever..."
                className="h-10 flex-1 rounded-xl border-surface-200 text-sm bg-surface-50"
              />
              <Button
                type="button"
                onClick={handleParse}
                disabled={isParsing || !parseText.trim()}
                size="icon"
                className="h-10 w-10 rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {isParsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              </Button>
            </div>
          </div>

          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <Label className="block text-xs font-medium text-surface-600 mb-1">Name *</Label>
              <Input required value={form.name} onChange={(e) => setForm(f => ({...f, name: e.target.value}))}
                className="h-10 rounded-xl border-surface-200 text-sm bg-surface-50"
                placeholder="Patient name" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="block text-xs font-medium text-surface-600 mb-1">Phone *</Label>
                <Input required type="tel" value={form.phone} onChange={(e) => setForm(f => ({...f, phone: e.target.value}))}
                  className="h-10 rounded-xl border-surface-200 text-sm bg-surface-50"
                  placeholder="+91..." />
              </div>
              <div>
                <Label className="block text-xs font-medium text-surface-600 mb-1">Age *</Label>
                <Input required type="number" min="0" value={form.age} onChange={(e) => setForm(f => ({...f, age: e.target.value}))}
                  className="h-10 rounded-xl border-surface-200 text-sm bg-surface-50"
                  placeholder="Age" />
              </div>
            </div>
            <div>
              <Label className="block text-xs font-medium text-surface-600 mb-1">Gender</Label>
              <div className="flex gap-1">
                {(['male','female','other'] as const).map(g => (
                  <Button key={g} type="button" onClick={() => setForm(f => ({...f, gender: f.gender === g ? '' : g}))}
                    size="sm"
                    variant={form.gender === g ? 'default' : 'outline'}
                    className={cn('flex-1 h-8 rounded-lg text-xs font-medium capitalize transition-all',
                      form.gender === g ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-600')}>
                    {g}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="block text-xs font-medium text-surface-600 mb-1">Doctor *</Label>
              <Select value={form.doctor_id} onValueChange={(value) => setForm(f => ({ ...f, doctor_id: value }))}>
                <SelectTrigger className="h-10 rounded-xl border-surface-200 text-sm bg-surface-50">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                {doctors.map(d => (
                  <SelectItem key={d._id} value={d._id} disabled={!d.is_available}>
                    {d.name} {!d.is_available ? '(unavailable)' : ''}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block text-xs font-medium text-surface-600 mb-1">Symptoms</Label>
              <Textarea value={form.symptoms} onChange={(e) => setForm(f => ({...f, symptoms: e.target.value}))}
                rows={2} placeholder="Optional..."
                className="rounded-xl border-surface-200 text-sm resize-none bg-surface-50" />
            </div>
            <Button type="submit" disabled={isAdding}
              className="w-full h-10 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2">
              {isAdding ? <><Loader2 size={14} className="animate-spin" />Adding...</> : <><Plus size={14} />Add to Queue</>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
