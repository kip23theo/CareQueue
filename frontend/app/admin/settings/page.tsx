'use client'

import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'
import { clinicAdminApi } from '@/lib/api-calls'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'
import type { Clinic } from '@/types'
import axios from 'axios'
import { Save, Loader2, Plus, X, Clock } from 'lucide-react'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const
type Day = typeof DAYS[number]

const SPEC_OPTIONS = ['General', 'Paediatrics', 'ENT', 'Orthopaedics', 'Gynaecology', 'Cardiology', 'Dermatology', 'Neurology']

export default function AdminSettingsPage() {
  const user = getUser()
  const { success, error: toastError } = useToast()
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', address: '', phone: '',
    avg_consult_time: 15,
    is_open: true,
    specializations: [] as string[],
    opening_hours: Object.fromEntries(
      DAYS.map(d => [d, { open: '09:00', close: '18:00' }])
    ) as Record<Day, { open: string; close: string } | null>,
  })

  useEffect(() => {
    if (!user?.clinic_id) return
    // Would fetch clinic data here
    // clinicsApi.getById(user.clinic_id).then(({ data }) => { ... })
  }, [user?.clinic_id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.clinic_id) return
    setIsSaving(true)
    try {
      await clinicAdminApi.update(user.clinic_id, {
        name: form.name,
        address: form.address,
        phone: form.phone,
        avg_consult_time: form.avg_consult_time,
        is_open: form.is_open,
        specializations: form.specializations,
        opening_hours: form.opening_hours as Clinic['opening_hours'],
      })
      success('Clinic settings saved')
    } catch (err) {
      if (axios.isAxiosError(err)) toastError(err.response?.data?.detail ?? 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleSpec = (s: string) => {
    setForm(f => ({
      ...f,
      specializations: f.specializations.includes(s)
        ? f.specializations.filter(x => x !== s)
        : [...f.specializations, s]
    }))
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold font-heading text-surface-900 mb-6">Clinic Settings</h1>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold font-heading text-surface-900">Basic Information</h2>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1.5">Clinic Name</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 focus:bg-white"
              placeholder="City Clinic" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1.5">Address</label>
            <input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))}
              className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 focus:bg-white"
              placeholder="123 Main St, City" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1.5">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 focus:bg-white"
                placeholder="+91 ..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1.5">Avg consultation (min)</label>
              <input type="number" min="1" value={form.avg_consult_time}
                onChange={e => setForm(f => ({...f, avg_consult_time: Number(e.target.value)}))}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 focus:bg-white" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-700">Open today</p>
              <p className="text-xs text-surface-500">Toggle clinic availability</p>
            </div>
            <button type="button" onClick={() => setForm(f => ({...f, is_open: !f.is_open}))}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                form.is_open ? 'bg-green-500 text-white' : 'bg-surface-200 text-surface-600'
              )}>
              {form.is_open ? 'Open' : 'Closed'}
            </button>
          </div>
        </div>

        {/* Specializations */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
          <h2 className="font-semibold font-heading text-surface-900 mb-3">Specializations</h2>
          <div className="flex flex-wrap gap-2">
            {SPEC_OPTIONS.map(s => (
              <button key={s} type="button" onClick={() => toggleSpec(s)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  form.specializations.includes(s)
                    ? 'bg-brand-500 text-white'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                )}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Opening hours */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
          <h2 className="font-semibold font-heading text-surface-900 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-brand-500" />
            Opening Hours
          </h2>
          <div className="space-y-3">
            {DAYS.map(day => (
              <div key={day} className="flex items-center gap-3">
                <span className="w-24 text-sm text-surface-700 capitalize font-medium">{day.slice(0,3)}</span>
                {form.opening_hours[day] === null ? (
                  <span className="text-sm text-surface-400 flex-1">Closed</span>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" value={form.opening_hours[day]?.open ?? '09:00'}
                      onChange={e => setForm(f => ({...f, opening_hours: {...f.opening_hours, [day]: {...(f.opening_hours[day] || {open:'09:00',close:'18:00'}), open: e.target.value}}}))}
                      className="px-3 py-1.5 rounded-lg border border-surface-200 text-sm focus:outline-none focus:border-brand-400" />
                    <span className="text-surface-400 text-sm">—</span>
                    <input type="time" value={form.opening_hours[day]?.close ?? '18:00'}
                      onChange={e => setForm(f => ({...f, opening_hours: {...f.opening_hours, [day]: {...(f.opening_hours[day] || {open:'09:00',close:'18:00'}), close: e.target.value}}}))}
                      className="px-3 py-1.5 rounded-lg border border-surface-200 text-sm focus:outline-none focus:border-brand-400" />
                  </div>
                )}
                <button type="button"
                  onClick={() => setForm(f => ({...f, opening_hours: {...f.opening_hours, [day]: f.opening_hours[day] === null ? {open:'09:00',close:'18:00'} : null}}))}
                  className={cn('text-xs px-2 py-1 rounded-lg font-medium transition-colors',
                    form.opening_hours[day] === null
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-surface-100 text-surface-500 hover:bg-red-50 hover:text-red-600')}>
                  {form.opening_hours[day] === null ? 'Open' : 'Close'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={isSaving}
          className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-brand-500/25">
          {isSaving ? <><Loader2 size={18} className="animate-spin" />Saving...</> : <><Save size={18} />Save Settings</>}
        </button>
      </form>
    </div>
  )
}
