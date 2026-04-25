'use client'

import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'
import { clinicAdminApi, clinicsApi, resolveMediaUrl, uploadsApi } from '@/lib/api-calls'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Clinic } from '@/types'
import axios from 'axios'
import { Save, Loader2, Clock, ExternalLink, LocateFixed } from 'lucide-react'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const
type Day = typeof DAYS[number]

const SPEC_OPTIONS = ['General', 'Paediatrics', 'ENT', 'Orthopaedics', 'Gynaecology', 'Cardiology', 'Dermatology', 'Neurology']

export default function AdminSettingsPage() {
  const user = getUser()
  const { success, error: toastError } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingClinicImage, setIsUploadingClinicImage] = useState(false)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', clinic_image: '', address: '', phone: '',
    google_maps_link: '',
    avg_consult_time: 15,
    is_open: true,
    specializations: [] as string[],
    opening_hours: Object.fromEntries(
      DAYS.map(d => [d, { open: '09:00', close: '18:00' }])
    ) as Record<Day, { open: string; close: string } | null>,
  })

  useEffect(() => {
    if (!user?.clinic_id) return
    clinicsApi.getById(user.clinic_id).then(({ data }) => {
      const coords = data.location?.coordinates ?? [0, 0]
      const lat = Number(coords[1] ?? 0)
      const lng = Number(coords[0] ?? 0)
      const fallbackLink =
        Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
          ? `https://www.google.com/maps?q=${lat},${lng}`
          : ''
      setForm((prev) => ({
        ...prev,
        name: data.name,
        clinic_image: data.clinic_image ?? '',
        address: data.address,
        phone: data.phone,
        google_maps_link: data.google_maps_link ?? fallbackLink,
        avg_consult_time: data.avg_consult_time,
        is_open: data.is_open,
        specializations: data.specializations,
        opening_hours: { ...prev.opening_hours, ...(data.opening_hours ?? {}) },
      }))
    }).catch(() => {})
  }, [user?.clinic_id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.clinic_id) return
    const mapsLink = form.google_maps_link.trim()
    if (!mapsLink) {
      toastError('Google Maps link is required')
      return
    }
    setIsSaving(true)
    try {
      await clinicAdminApi.update(user.clinic_id, {
        name: form.name,
        clinic_image: form.clinic_image,
        address: form.address,
        phone: form.phone,
        google_maps_link: mapsLink,
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

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported in this browser.')
      return
    }

    setLocationError(null)
    setIsDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6)
        const lng = position.coords.longitude.toFixed(6)
        setForm((prev) => ({
          ...prev,
          google_maps_link: `https://www.google.com/maps?q=${lat},${lng}`,
        }))
        setIsDetectingLocation(false)
      },
      () => {
        setLocationError('Location access denied. Paste the clinic map link manually.')
        setIsDetectingLocation(false)
      }
    )
  }

  const handleClinicImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingClinicImage(true)
    try {
      const { data } = await uploadsApi.uploadImage(file)
      setForm((prev) => ({ ...prev, clinic_image: data.file_path }))
      success('Clinic image uploaded')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toastError(err.response?.data?.detail ?? 'Unable to upload clinic image')
      } else {
        toastError('Unable to upload clinic image')
      }
    } finally {
      setIsUploadingClinicImage(false)
      event.target.value = ''
    }
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
            <Label className="block text-xs font-medium text-surface-600 mb-1.5">Clinic Image</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleClinicImageUpload}
              className="h-10 rounded-xl border-surface-200 bg-surface-50 px-4 text-sm"
              disabled={isUploadingClinicImage}
            />
            {isUploadingClinicImage && <p className="mt-1 text-xs text-surface-500">Uploading image...</p>}
            {form.clinic_image && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={resolveMediaUrl(form.clinic_image) ?? ''}
                  alt="Clinic preview"
                  className="h-12 w-12 rounded-lg border border-surface-200 object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 rounded-lg"
                  onClick={() => setForm((f) => ({ ...f, clinic_image: '' }))}
                >
                  Remove image
                </Button>
              </div>
            )}
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
          <div>
            <Label className="block text-xs font-medium text-surface-600 mb-1.5">Google Maps Link</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={form.google_maps_link}
                onChange={e => setForm(f => ({ ...f, google_maps_link: e.target.value }))}
                className="h-10 rounded-xl border-surface-200 bg-surface-50 px-4 text-sm sm:flex-1"
                placeholder="https://www.google.com/maps/place/..."
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-surface-200 text-surface-700 px-3"
                  onClick={handleUseCurrentLocation}
                  disabled={isDetectingLocation}
                >
                  {isDetectingLocation ? (
                    <><Loader2 size={14} className="animate-spin" /> Detecting...</>
                  ) : (
                    <><LocateFixed size={14} /> Use current</>
                  )}
                </Button>
                {form.google_maps_link.trim() && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl border-surface-200 text-surface-700 px-3"
                    onClick={() => window.open(form.google_maps_link.trim(), '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink size={14} />
                    Open
                  </Button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-surface-500 mt-1.5">
              Paste the clinic&apos;s Google Maps URL. Coordinates are auto-extracted from this link.
            </p>
            {locationError && <p className="text-[11px] text-red-600 mt-1">{locationError}</p>}
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

        <Button type="submit" disabled={isSaving || isUploadingClinicImage}
          className="w-full h-11 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-brand-500/25">
          {isSaving ? <><Loader2 size={18} className="animate-spin" />Saving...</> : <><Save size={18} />Save Settings</>}
        </Button>
      </form>
    </div>
  )
}
