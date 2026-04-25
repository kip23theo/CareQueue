'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getUser } from '@/lib/auth'
import { authApi, doctorsApi, resolveMediaUrl, uploadsApi } from '@/lib/api-calls'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Doctor } from '@/types'
import axios from 'axios'
import {
  CheckCircle2,
  ClipboardCopy,
  Clock,
  Loader2,
  MailPlus,
  Stethoscope,
  ToggleLeft,
  ToggleRight,
  Tv,
  UserPlus2,
} from 'lucide-react'

type AddDoctorFormState = {
  name: string
  email: string
  password: string
  specialization: string
  avg_consult_mins: number
  doctor_image: string
}

type InviteDoctorFormState = {
  name: string
  email: string
  specialization: string
  avg_consult_mins: number
  doctor_image: string
}

type InviteCredentials = {
  name: string
  email: string
  password: string
  loginUrl: string
}

const INITIAL_ADD_FORM: AddDoctorFormState = {
  name: '',
  email: '',
  password: '',
  specialization: 'General Physician',
  avg_consult_mins: 10,
  doctor_image: '',
}

const INITIAL_INVITE_FORM: InviteDoctorFormState = {
  name: '',
  email: '',
  specialization: 'General Physician',
  avg_consult_mins: 10,
  doctor_image: '',
}

function buildTemporaryPassword(length = 12): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*'
  if (typeof window === 'undefined' || !window.crypto?.getRandomValues) {
    return Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join('')
  }

  const values = new Uint32Array(length)
  window.crypto.getRandomValues(values)
  return Array.from(values, (value) => charset[value % charset.length]).join('')
}

export default function AdminDoctorsPage() {
  const user = getUser()
  const { success, error: toastError } = useToast()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingDoctor, setIsAddingDoctor] = useState(false)
  const [isInvitingDoctor, setIsInvitingDoctor] = useState(false)
  const [isUploadingAddImage, setIsUploadingAddImage] = useState(false)
  const [isUploadingInviteImage, setIsUploadingInviteImage] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [delayEditing, setDelayEditing] = useState<Record<string, number>>({})
  const [isAddDoctorDialogOpen, setIsAddDoctorDialogOpen] = useState(false)
  const [isInviteDoctorDialogOpen, setIsInviteDoctorDialogOpen] = useState(false)
  const [addDoctorForm, setAddDoctorForm] = useState<AddDoctorFormState>(INITIAL_ADD_FORM)
  const [inviteDoctorForm, setInviteDoctorForm] = useState<InviteDoctorFormState>(INITIAL_INVITE_FORM)
  const [inviteCredentials, setInviteCredentials] = useState<InviteCredentials | null>(null)

  const inviteMessage = useMemo(() => {
    if (!inviteCredentials) return ''
    return [
      `Hi Dr. ${inviteCredentials.name},`,
      'You have been invited to join CareQueue.',
      `Login URL: ${inviteCredentials.loginUrl}`,
      `Email: ${inviteCredentials.email}`,
      `Temporary password: ${inviteCredentials.password}`,
      'Please sign in and change your password after first login.',
    ].join('\n')
  }, [inviteCredentials])

  useEffect(() => {
    if (!user?.clinic_id) return
    doctorsApi.getAll(user.clinic_id)
      .then(({ data }) => setDoctors(data))
      .catch(() => setDoctors([]))
      .finally(() => setIsLoading(false))
  }, [user?.clinic_id])

  const refreshDoctors = async () => {
    if (!user?.clinic_id) return
    const { data } = await doctorsApi.getAll(user.clinic_id)
    setDoctors(data)
  }

  const handleAddDoctor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.clinic_id) {
      toastError('Clinic account not found')
      return
    }

    const trimmedName = addDoctorForm.name.trim()
    const trimmedEmail = addDoctorForm.email.trim()
    const trimmedSpecialization = addDoctorForm.specialization.trim()
    const trimmedImage = addDoctorForm.doctor_image.trim()
    if (!trimmedName || !trimmedEmail || !addDoctorForm.password.trim()) {
      toastError('Name, email, and password are required')
      return
    }

    setIsAddingDoctor(true)
    try {
      await authApi.registerStaff({
        clinic_id: user.clinic_id,
        name: trimmedName,
        email: trimmedEmail,
        password: addDoctorForm.password.trim(),
        role: 'doctor',
        specialization: trimmedSpecialization || 'General Physician',
        avg_consult_mins: addDoctorForm.avg_consult_mins,
        doctor_image: trimmedImage || undefined,
      })
      setAddDoctorForm(INITIAL_ADD_FORM)
      setIsAddDoctorDialogOpen(false)
      success(`Doctor account created for ${trimmedName}`)
      await refreshDoctors().catch(() => {})
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toastError(err.response?.data?.detail ?? 'Unable to add doctor')
      }
    } finally {
      setIsAddingDoctor(false)
    }
  }

  const handleInviteDoctor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.clinic_id) {
      toastError('Clinic account not found')
      return
    }

    const trimmedName = inviteDoctorForm.name.trim()
    const trimmedEmail = inviteDoctorForm.email.trim()
    const trimmedSpecialization = inviteDoctorForm.specialization.trim()
    const trimmedImage = inviteDoctorForm.doctor_image.trim()
    if (!trimmedName || !trimmedEmail) {
      toastError('Name and email are required')
      return
    }

    const temporaryPassword = buildTemporaryPassword()

    setIsInvitingDoctor(true)
    try {
      await authApi.registerStaff({
        clinic_id: user.clinic_id,
        name: trimmedName,
        email: trimmedEmail,
        password: temporaryPassword,
        role: 'doctor',
        specialization: trimmedSpecialization || 'General Physician',
        avg_consult_mins: inviteDoctorForm.avg_consult_mins,
        doctor_image: trimmedImage || undefined,
      })

      const loginUrl = typeof window === 'undefined' ? '/auth/login' : `${window.location.origin}/auth/login`
      setInviteCredentials({
        name: trimmedName,
        email: trimmedEmail,
        password: temporaryPassword,
        loginUrl,
      })
      setInviteDoctorForm(INITIAL_INVITE_FORM)
      setIsInviteDoctorDialogOpen(false)
      success(`Invite prepared for ${trimmedName}`)
      await refreshDoctors().catch(() => {})
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toastError(err.response?.data?.detail ?? 'Unable to invite doctor')
      }
    } finally {
      setIsInvitingDoctor(false)
    }
  }

  const handleCopyInviteMessage = async () => {
    if (!inviteCredentials || !inviteMessage) return
    try {
      await navigator.clipboard.writeText(inviteMessage)
      success('Invite message copied')
    } catch {
      toastError('Could not copy invite message')
    }
  }

  const handleAddDoctorImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingAddImage(true)
    try {
      const { data } = await uploadsApi.uploadImage(file)
      setAddDoctorForm((prev) => ({ ...prev, doctor_image: data.file_path }))
      success('Doctor photo uploaded')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toastError(err.response?.data?.detail ?? 'Unable to upload doctor photo')
      } else {
        toastError('Unable to upload doctor photo')
      }
    } finally {
      setIsUploadingAddImage(false)
      event.target.value = ''
    }
  }

  const handleInviteDoctorImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingInviteImage(true)
    try {
      const { data } = await uploadsApi.uploadImage(file)
      setInviteDoctorForm((prev) => ({ ...prev, doctor_image: data.file_path }))
      success('Doctor photo uploaded')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toastError(err.response?.data?.detail ?? 'Unable to upload doctor photo')
      } else {
        toastError('Unable to upload doctor photo')
      }
    } finally {
      setIsUploadingInviteImage(false)
      event.target.value = ''
    }
  }

  const handleToggleAvailability = async (doc: Doctor) => {
    setUpdatingId(doc._id)
    try {
      await doctorsApi.updateAvailability(doc._id, { is_available: !doc.is_available })
      setDoctors((prev) =>
        prev.map((d) => d._id === doc._id ? { ...d, is_available: !d.is_available } : d)
      )
      success(`Dr. ${doc.name} marked as ${doc.is_available ? 'unavailable' : 'available'}`)
    } catch (err) {
      if (axios.isAxiosError(err)) toastError(err.response?.data?.detail ?? 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleSaveDelay = async (doc: Doctor) => {
    const delay = delayEditing[doc._id] ?? doc.delay_mins
    setUpdatingId(doc._id)
    try {
      await doctorsApi.updateDelay(doc._id, { delay_mins: delay })
      setDoctors((prev) =>
        prev.map((d) => d._id === doc._id ? { ...d, delay_mins: delay } : d)
      )
      success(`Dr. ${doc.name} delay updated`)
    } catch (err) {
      if (axios.isAxiosError(err)) toastError(err.response?.data?.detail ?? 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-surface-900">Doctors</h1>
        <p className="text-surface-500 text-sm mt-0.5">Add, invite, and manage doctor availability</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus2 size={16} className="text-brand-500" />
            <h2 className="font-semibold font-heading text-surface-900">Add Doctor</h2>
          </div>
          <p className="text-sm text-surface-500 mb-4">Create a doctor account from a pop-up form.</p>
          <Button
            type="button"
            className="h-10 rounded-xl bg-brand-500 text-white hover:bg-brand-600"
            onClick={() => setIsAddDoctorDialogOpen(true)}
          >
            <UserPlus2 size={14} />
            Add doctor
          </Button>
        </Card>

        <Card className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MailPlus size={16} className="text-brand-500" />
            <h2 className="font-semibold font-heading text-surface-900">Invite Doctor</h2>
          </div>
          <p className="text-sm text-surface-500 mb-4">Generate invite credentials through a dialog.</p>
          <Button
            type="button"
            className="h-10 rounded-xl bg-surface-900 text-white hover:bg-surface-700"
            onClick={() => setIsInviteDoctorDialogOpen(true)}
          >
            <MailPlus size={14} />
            Invite doctor
          </Button>
        </Card>
      </div>

      <Dialog open={isAddDoctorDialogOpen} onOpenChange={setIsAddDoctorDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl border border-surface-200 bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-surface-900">Add Doctor</DialogTitle>
            <DialogDescription className="text-sm text-surface-500">
              Create a direct login for a doctor in your clinic.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleAddDoctor}>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-surface-600">Name</Label>
              <Input
                required
                value={addDoctorForm.name}
                onChange={(e) => setAddDoctorForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Dr. Sarah John"
                className="h-10 rounded-xl border-surface-200"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-surface-600">Email</Label>
              <Input
                required
                type="email"
                value={addDoctorForm.email}
                onChange={(e) => setAddDoctorForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="sarah@clinic.com"
                className="h-10 rounded-xl border-surface-200"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-surface-600">Password</Label>
              <Input
                required
                minLength={6}
                type="password"
                value={addDoctorForm.password}
                onChange={(e) => setAddDoctorForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Minimum 6 characters"
                className="h-10 rounded-xl border-surface-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-surface-600">Specialization</Label>
                <Input
                  value={addDoctorForm.specialization}
                  onChange={(e) => setAddDoctorForm((prev) => ({ ...prev, specialization: e.target.value }))}
                  placeholder="General Physician"
                  className="h-10 rounded-xl border-surface-200"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-surface-600">Avg consult (min)</Label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={addDoctorForm.avg_consult_mins}
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    setAddDoctorForm((prev) => ({
                      ...prev,
                      avg_consult_mins: Number.isFinite(value) && value > 0 ? value : 10,
                    }))
                  }}
                  className="h-10 rounded-xl border-surface-200"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-surface-600">Doctor photo (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleAddDoctorImageUpload}
                className="h-10 rounded-xl border-surface-200"
                disabled={isUploadingAddImage}
              />
              {isUploadingAddImage && <p className="mt-1 text-xs text-surface-500">Uploading image...</p>}
              {addDoctorForm.doctor_image && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={resolveMediaUrl(addDoctorForm.doctor_image) ?? ''}
                    alt="Doctor preview"
                    className="h-10 w-10 rounded-lg border border-surface-200 object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={() => setAddDoctorForm((prev) => ({ ...prev, doctor_image: '' }))}
                  >
                    Remove photo
                  </Button>
                </div>
              )}
            </div>
            <Button
              type="submit"
              disabled={isAddingDoctor || isUploadingAddImage}
              className="w-full h-10 rounded-xl bg-brand-500 text-white hover:bg-brand-600"
            >
              {isAddingDoctor ? <Loader2 size={14} className="animate-spin" /> : <UserPlus2 size={14} />}
              Create doctor account
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteDoctorDialogOpen} onOpenChange={setIsInviteDoctorDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl border border-surface-200 bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-surface-900">Invite Doctor</DialogTitle>
            <DialogDescription className="text-sm text-surface-500">
              Generate temporary credentials and share them with the doctor.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleInviteDoctor}>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-surface-600">Name</Label>
              <Input
                required
                value={inviteDoctorForm.name}
                onChange={(e) => setInviteDoctorForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Dr. Alex Rao"
                className="h-10 rounded-xl border-surface-200"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-surface-600">Email</Label>
              <Input
                required
                type="email"
                value={inviteDoctorForm.email}
                onChange={(e) => setInviteDoctorForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="alex@clinic.com"
                className="h-10 rounded-xl border-surface-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-surface-600">Specialization</Label>
                <Input
                  value={inviteDoctorForm.specialization}
                  onChange={(e) => setInviteDoctorForm((prev) => ({ ...prev, specialization: e.target.value }))}
                  placeholder="General Physician"
                  className="h-10 rounded-xl border-surface-200"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-surface-600">Avg consult (min)</Label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={inviteDoctorForm.avg_consult_mins}
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    setInviteDoctorForm((prev) => ({
                      ...prev,
                      avg_consult_mins: Number.isFinite(value) && value > 0 ? value : 10,
                    }))
                  }}
                  className="h-10 rounded-xl border-surface-200"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-surface-600">Doctor photo (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleInviteDoctorImageUpload}
                className="h-10 rounded-xl border-surface-200"
                disabled={isUploadingInviteImage}
              />
              {isUploadingInviteImage && <p className="mt-1 text-xs text-surface-500">Uploading image...</p>}
              {inviteDoctorForm.doctor_image && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={resolveMediaUrl(inviteDoctorForm.doctor_image) ?? ''}
                    alt="Doctor preview"
                    className="h-10 w-10 rounded-lg border border-surface-200 object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={() => setInviteDoctorForm((prev) => ({ ...prev, doctor_image: '' }))}
                  >
                    Remove photo
                  </Button>
                </div>
              )}
            </div>
            <Button
              type="submit"
              disabled={isInvitingDoctor || isUploadingInviteImage}
              className="w-full h-10 rounded-xl bg-surface-900 text-white hover:bg-surface-700"
            >
              {isInvitingDoctor ? <Loader2 size={14} className="animate-spin" /> : <MailPlus size={14} />}
              Generate invite credentials
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {inviteCredentials && (
        <Card className="mb-6 rounded-2xl border border-surface-200 bg-surface-50 p-3">
          <p className="text-xs font-semibold text-surface-700">Latest invite</p>
          <p className="text-xs text-surface-600 mt-1 break-words">{inviteCredentials.email}</p>
          <p className="text-xs text-surface-600 break-words">Temp password: {inviteCredentials.password}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2 rounded-lg bg-white border border-surface-200"
            onClick={handleCopyInviteMessage}
          >
            <ClipboardCopy size={13} />
            Copy invite message
          </Button>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-16">
          <Stethoscope size={32} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-600 font-medium">No doctors found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {doctors.map((doc) => {
            const currentDelay = delayEditing[doc._id] ?? doc.delay_mins
            const isUpdating = updatingId === doc._id
            return (
              <Card key={doc._id} className={cn(
                'bg-white rounded-2xl border border-surface-200 p-5 shadow-sm transition-all',
                doc.is_available ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-surface-300'
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={cn(
                      'w-12 h-12 rounded-xl overflow-hidden border border-surface-200 shrink-0',
                      !doc.doctor_image && (doc.is_available ? 'bg-brand-500' : 'bg-surface-400')
                    )}>
                      {doc.doctor_image ? (
                        <img src={doc.doctor_image} alt={doc.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-white font-bold">
                          {doc.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-surface-900 font-heading">Dr. {doc.name}</p>
                      <p className="text-sm text-surface-500">{doc.specialization}</p>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-surface-500">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-green-500" />
                          {doc.completed_today} today
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-brand-500" />
                          {doc.avg_consult_mins} min avg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Availability toggle */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {doc.clinic_id && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl border-surface-200 text-xs text-surface-700 hover:border-brand-300"
                      >
                        <Link href={`/display/${doc.clinic_id}`} target="_blank" rel="noopener noreferrer">
                          <Tv size={12} />
                          TV Live Token
                        </Link>
                      </Button>
                    )}
                    <Button
                      onClick={() => handleToggleAvailability(doc)}
                      disabled={isUpdating}
                      className={cn(
                        'h-8 items-center gap-1.5 px-3 rounded-xl text-xs font-semibold transition-all',
                        doc.is_available
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-surface-200 text-surface-600 hover:bg-surface-300',
                        'disabled:opacity-50'
                      )}
                    >
                      {isUpdating
                        ? <Loader2 size={12} className="animate-spin" />
                        : doc.is_available ? <ToggleRight size={14} /> : <ToggleLeft size={14} />
                      }
                      {doc.is_available ? 'Available' : 'Unavailable'}
                    </Button>
                  </div>
                </div>

                {/* Delay row */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-surface-100">
                  <Clock size={14} className="text-amber-500 shrink-0" />
                  <span className="text-sm text-surface-600">Running late by</span>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={currentDelay}
                    onChange={(e) =>
                      setDelayEditing((prev) => ({ ...prev, [doc._id]: Number(e.target.value) }))
                    }
                    className="h-8 w-16 rounded-lg border-surface-200 px-2 py-1 text-center text-sm font-bold"
                  />
                  <span className="text-sm text-surface-600">min</span>
                  {delayEditing[doc._id] !== undefined && delayEditing[doc._id] !== doc.delay_mins && (
                    <Button
                      onClick={() => handleSaveDelay(doc)}
                      disabled={isUpdating}
                      size="sm"
                      className="ml-auto h-7 px-3 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 disabled:opacity-50"
                    >
                      Save
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
