'use client'

import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'
import { adminQueueApi, aiApi, doctorsApi } from '@/lib/api-calls'
import { useToast } from '@/context/ToastContext'
import { cn, formatTokenDisplay } from '@/lib/utils'
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
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 mb-6 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="text-2xl font-bold font-heading text-surface-900 mb-6">Add Walk-in Patient</h1>

      {/* AI parse */}
      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5 mb-6">
        <p className="text-sm font-semibold text-brand-700 mb-2 flex items-center gap-2">
          <Sparkles size={14} />
          AI Auto-fill
        </p>
        <p className="text-xs text-brand-600 mb-3">Type patient info naturally and AI will fill the form</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={parseText}
            onChange={(e) => setParseText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleParse()}
            placeholder="e.g. Rahul Kumar, 25 yrs, fever and cough..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-brand-200 bg-white text-sm focus:outline-none focus:border-brand-400"
          />
          <button onClick={handleParse} disabled={isParsing || !parseText.trim()}
            className="px-4 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center gap-2">
            {isParsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Parse
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-medium text-surface-600 mb-1.5">Full Name *</label>
          <input required value={form.name} onChange={(e) => setForm(f => ({...f, name: e.target.value}))}
            className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 focus:bg-white"
            placeholder="Patient full name" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1.5">Phone *</label>
            <input required type="tel" value={form.phone} onChange={(e) => setForm(f => ({...f, phone: e.target.value}))}
              className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 focus:bg-white"
              placeholder="+91 98765..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1.5">Age *</label>
            <input required type="number" min="0" max="150" value={form.age} onChange={(e) => setForm(f => ({...f, age: e.target.value}))}
              className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 focus:bg-white"
              placeholder="25" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-600 mb-1.5">Gender</label>
          <div className="flex gap-2">
            {(['male','female','other'] as const).map(g => (
              <button key={g} type="button" onClick={() => setForm(f => ({...f, gender: f.gender === g ? '' : g}))}
                className={cn('flex-1 py-2.5 rounded-xl border text-sm font-medium capitalize transition-all',
                  form.gender === g ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-600 hover:border-surface-300')}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-600 mb-1.5">Assign Doctor *</label>
          <select required value={form.doctor_id} onChange={(e) => setForm(f => ({...f, doctor_id: e.target.value}))}
            className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 focus:bg-white">
            <option value="">Select a doctor</option>
            {doctors.map(d => (
              <option key={d._id} value={d._id} disabled={!d.is_available}>
                Dr. {d.name} — {d.specialization} {!d.is_available ? '(unavailable)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-600 mb-1.5">Symptoms (optional)</label>
          <textarea value={form.symptoms} onChange={(e) => setForm(f => ({...f, symptoms: e.target.value}))}
            rows={3} placeholder="Chief complaint or symptoms..."
            className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 focus:bg-white resize-none" />
        </div>
        <button type="submit" disabled={isAdding}
          className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-brand-500/25">
          {isAdding ? <><Loader2 size={18} className="animate-spin" />Adding...</> : <><Plus size={18} />Add to Queue</>}
        </button>
      </form>
    </div>
  )
}
