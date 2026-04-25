'use client'

import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'
import { clinicAdminApi } from '@/lib/api-calls'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
        <Card className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold font-heading text-surface-900">Basic Information</h2>
          <div>
            <Label className="block text-xs font-medium text-surface-600 mb-1.5">Clinic Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              className="h-10 rounded-xl border-surface-200 bg-surface-50 px-4 text-sm"
              placeholder="City Clinic" />
          </div>
          <div>
            <Label className="block text-xs font-medium text-surface-600 mb-1.5">Address</Label>
            <Input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))}
              className="h-10 rounded-xl border-surface-200 bg-surface-50 px-4 text-sm"
              placeholder="123 Main St, City" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block text-xs font-medium text-surface-600 mb-1.5">Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                className="h-10 rounded-xl border-surface-200 bg-surface-50 px-4 text-sm"
                placeholder="+91 ..." />
            </div>
            <div>
              <Label className="block text-xs font-medium text-surface-600 mb-1.5">Avg consultation (min)</Label>
              <Input type="number" min="1" value={form.avg_consult_time}
                onChange={e => setForm(f => ({...f, avg_consult_time: Number(e.target.value)}))}
                className="h-10 rounded-xl border-surface-200 bg-surface-50 px-4 text-sm" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-700">Open today</p>
              <p className="text-xs text-surface-500">Toggle clinic availability</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_open} onCheckedChange={(checked) => setForm(f => ({...f, is_open: checked}))} />
              <span className="text-sm font-semibold text-surface-700">{form.is_open ? 'Open' : 'Closed'}</span>
            </div>
          </div>
        </Card>

        {/* Specializations */}
        <Card className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
          <h2 className="font-semibold font-heading text-surface-900 mb-3">Specializations</h2>
          <div className="flex flex-wrap gap-2">
            {SPEC_OPTIONS.map(s => (
              <Button key={s} type="button" onClick={() => toggleSpec(s)}
                size="sm"
                variant={form.specializations.includes(s) ? 'default' : 'secondary'}
                className={cn(
                  'h-8 px-3 rounded-full text-sm font-medium transition-all',
                  form.specializations.includes(s)
                    ? 'bg-brand-500 text-white'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                )}>
                {s}
              </Button>
            ))}
          </div>
        </Card>

        {/* Opening hours */}
        <Card className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
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
                    <Input type="time" value={form.opening_hours[day]?.open ?? '09:00'}
                      onChange={e => setForm(f => ({...f, opening_hours: {...f.opening_hours, [day]: {...(f.opening_hours[day] || {open:'09:00',close:'18:00'}), open: e.target.value}}}))}
                      className="h-8 w-32 rounded-lg border-surface-200 px-3 py-1.5 text-sm" />
                    <span className="text-surface-400 text-sm">—</span>
                    <Input type="time" value={form.opening_hours[day]?.close ?? '18:00'}
                      onChange={e => setForm(f => ({...f, opening_hours: {...f.opening_hours, [day]: {...(f.opening_hours[day] || {open:'09:00',close:'18:00'}), close: e.target.value}}}))}
                      className="h-8 w-32 rounded-lg border-surface-200 px-3 py-1.5 text-sm" />
                  </div>
                )}
                <Button type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setForm(f => ({...f, opening_hours: {...f.opening_hours, [day]: f.opening_hours[day] === null ? {open:'09:00',close:'18:00'} : null}}))}
                  className={cn('text-xs px-2 py-1 rounded-lg font-medium transition-colors',
                    form.opening_hours[day] === null
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-surface-100 text-surface-500 hover:bg-red-50 hover:text-red-600')}>
                  {form.opening_hours[day] === null ? 'Open' : 'Close'}
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Button type="submit" disabled={isSaving}
          className="w-full h-11 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-brand-500/25">
          {isSaving ? <><Loader2 size={18} className="animate-spin" />Saving...</> : <><Save size={18} />Save Settings</>}
        </Button>
      </form>
    </div>
  )
}
