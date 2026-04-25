'use client'

import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'
import { adminQueueApi, aiApi, doctorsApi } from '@/lib/api-calls'
import { useToast } from '@/context/ToastContext'
import { cn, formatTokenDisplay } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Doctor } from '@/types'
import axios from 'axios'
import { Sparkles, Loader2, Plus, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AddWalkinPage() {
  const router = useRouter()
  const user = getUser()
  const { success, error: toastError } = useToast()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [parseText, setParseText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', age: '', gender: '' as '' | 'male' | 'female' | 'other',
    symptoms: '', doctor_id: ''
  })

  useEffect(() => {
    if (!user?.clinic_id) return
    doctorsApi.getAll(user.clinic_id).then(({ data }) => {
      setDoctors(data)
      const avail = data.find((d) => d.is_available)
      if (avail) setForm((f) => ({ ...f, doctor_id: avail._id }))
    }).catch(() => {})
  }, [user?.clinic_id])

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
    } catch { /* ignore */ } finally {
      setIsParsing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.clinic_id) return
    setIsAdding(true)
    try {
      const { data } = await adminQueueApi.addWalkin({
        clinic_id: user.clinic_id,
        doctor_id: form.doctor_id,
        patient_name: form.name,
        patient_phone: form.phone,
        patient_age: Number(form.age),
        patient_gender: form.gender || undefined,
        symptoms: form.symptoms || undefined,
      })
      success(`Token ${formatTokenDisplay(data.token_number)} created for ${form.name}`)
      router.push('/receptionist')
    } catch (err) {
      if (axios.isAxiosError(err)) toastError(err.response?.data?.detail ?? 'Failed to add patient')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Button variant="ghost" onClick={() => router.back()} className="h-auto px-0 flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 mb-6">
        <ArrowLeft size={16} /> Back
      </Button>
      <h1 className="text-2xl font-bold font-heading text-surface-900 mb-6">Add Walk-in Patient</h1>

      {/* AI parse */}
      <Card className="bg-brand-50 border border-brand-200 rounded-2xl p-5 mb-6">
        <p className="text-sm font-semibold text-brand-700 mb-2 flex items-center gap-2">
          <Sparkles size={14} />
          AI Auto-fill
        </p>
        <p className="text-xs text-brand-600 mb-3">Type patient info naturally and AI will fill the form</p>
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
            placeholder="e.g. Rahul Kumar, 25 yrs, fever and cough..."
            className="h-10 flex-1 rounded-xl border-brand-200 bg-white text-sm"
          />
          <Button type="button" onClick={handleParse} disabled={isParsing || !parseText.trim()}
            className="h-10 px-4 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2">
            {isParsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Parse
          </Button>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-4">
        <div>
          <Label className="block text-xs font-medium text-surface-600 mb-1.5">Full Name *</Label>
          <Input required value={form.name} onChange={(e) => setForm(f => ({...f, name: e.target.value}))}
            className="h-10 rounded-xl border-surface-200 bg-surface-50 text-sm"
            placeholder="Patient full name" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block text-xs font-medium text-surface-600 mb-1.5">Phone *</Label>
            <Input required type="tel" value={form.phone} onChange={(e) => setForm(f => ({...f, phone: e.target.value}))}
              className="h-10 rounded-xl border-surface-200 bg-surface-50 text-sm"
              placeholder="+91 98765..." />
          </div>
          <div>
            <Label className="block text-xs font-medium text-surface-600 mb-1.5">Age *</Label>
            <Input required type="number" min="0" max="150" value={form.age} onChange={(e) => setForm(f => ({...f, age: e.target.value}))}
              className="h-10 rounded-xl border-surface-200 bg-surface-50 text-sm"
              placeholder="25" />
          </div>
        </div>
        <div>
          <Label className="block text-xs font-medium text-surface-600 mb-1.5">Gender</Label>
          <div className="flex gap-2">
            {(['male','female','other'] as const).map(g => (
              <Button key={g} type="button" onClick={() => setForm(f => ({...f, gender: f.gender === g ? '' : g}))}
                size="sm"
                variant={form.gender === g ? 'default' : 'outline'}
                className={cn('flex-1 h-10 rounded-xl text-sm font-medium capitalize transition-all',
                  form.gender === g ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-600 hover:border-surface-300')}>
                {g}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="block text-xs font-medium text-surface-600 mb-1.5">Assign Doctor *</Label>
          <Select value={form.doctor_id} onValueChange={(value) => setForm(f => ({ ...f, doctor_id: value }))}>
            <SelectTrigger className="h-10 rounded-xl border-surface-200 bg-surface-50 text-sm">
              <SelectValue placeholder="Select a doctor" />
            </SelectTrigger>
            <SelectContent>
            {doctors.map(d => (
              <SelectItem key={d._id} value={d._id} disabled={!d.is_available}>
                Dr. {d.name} — {d.specialization} {!d.is_available ? '(unavailable)' : ''}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="block text-xs font-medium text-surface-600 mb-1.5">Symptoms (optional)</Label>
          <Textarea value={form.symptoms} onChange={(e) => setForm(f => ({...f, symptoms: e.target.value}))}
            rows={3} placeholder="Chief complaint or symptoms..."
            className="rounded-xl border-surface-200 bg-surface-50 text-sm resize-none" />
        </div>
        <Button type="submit" disabled={isAdding}
          className="w-full h-11 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-brand-500/25">
          {isAdding ? <><Loader2 size={18} className="animate-spin" />Adding...</> : <><Plus size={18} />Add to Queue</>}
        </Button>
      </form>
    </div>
  )
}
