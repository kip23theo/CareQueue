'use client'

import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  Compass,
  HeartPulse,
  LocateFixed,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getUser } from '@/lib/auth'

type Stat = {
  label: string
  value: string
}

type QuickAction = {
  title: string
  desc: string
  href: string
  icon: LucideIcon
}

type PulseRow = {
  clinic: string
  wait: string
  state: string
}

type Step = {
  index: string
  title: string
  desc: string
}

type Value = {
  title: string
  desc: string
  icon: LucideIcon
}

const stats: Stat[] = [
  { label: 'Queue updates', value: '< 30 sec' },
  { label: 'Clinics online', value: '450+' },
  { label: 'Patients served/day', value: '12K+' },
]

const quickActions: QuickAction[] = [
  {
    title: 'Find Nearby Clinics',
    desc: 'Compare live wait times and pick the fastest option.',
    href: '/patient/clinics',
    icon: Compass,
  },
  {
    title: 'Explore Doctors',
    desc: 'Search by specialty and review current availability.',
    href: '/patient/doctors',
    icon: Stethoscope,
  },
]

const pulseRows: PulseRow[] = [
  { clinic: 'GreenLife Clinic', wait: '11 min', state: 'Steady' },
  { clinic: 'CityCare Multispecialty', wait: '17 min', state: 'Busy' },
  { clinic: 'Sunrise Family Practice', wait: '8 min', state: 'Fast' },
]

const steps: Step[] = [
  {
    index: '01',
    title: 'Select a clinic',
    desc: 'Check queue movement, ratings, and distance in one screen.',
  },
  {
    index: '02',
    title: 'Book your token',
    desc: 'Join in seconds and skip standing in physical lines.',
  },
  {
    index: '03',
    title: 'Arrive just in time',
    desc: 'Get real-time updates until your consultation call.',
  },
]

const values: Value[] = [
  {
    title: 'Live movement',
    desc: 'Queue state refreshes continuously so your ETA stays realistic.',
    icon: Clock3,
  },
  {
    title: 'Reliable alerts',
    desc: 'Notifications keep you informed when your turn is close.',
    icon: BellRing,
  },
  {
    title: 'Location smart',
    desc: 'See clinics near you only when location is needed.',
    icon: LocateFixed,
  },
  {
    title: 'Safer process',
    desc: 'Less crowding in waiting rooms and smoother patient flow.',
    icon: ShieldCheck,
  },
]

export default function PatientHome() {
  const router = useRouter()
  const user = getUser()
  const isPatient = user?.role === 'patient'

  return (
    <div className="relative min-h-[calc(100vh-70px)] pb-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,0.12),transparent_38%),radial-gradient(circle_at_85%_15%,rgba(37,99,235,0.1),transparent_38%)]"
      />

      <section className="relative mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pt-11">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/80 bg-white/76 p-6 md:p-8">
            <Badge className="mb-4 rounded-full border border-brand-200 bg-brand-50 text-brand-700">
              <Sparkles size={12} />
              Patient Portal
            </Badge>

            <h1 className="text-4xl font-bold leading-tight text-surface-900 md:text-[3rem] md:leading-[1.05]">
              Skip the crowd.
              <span className="block text-brand-700">Keep your day on track.</span>
            </h1>

            <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-surface-600">
              CareQueue helps you pick the right clinic, join digitally, and arrive only when your turn is near.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => router.push('/patient/clinics')}
                className="h-11 rounded-xl px-5 text-sm"
              >
                Explore clinics
                <ArrowRight size={16} />
              </Button>

              <Button
                onClick={() => router.push('/patient/doctors')}
                variant="outline"
                className="h-11 rounded-xl border-surface-300 bg-white px-5 text-sm"
              >
                Find doctors
              </Button>

              {isPatient && (
                <Button
                  onClick={() => router.push('/patient/dashboard')}
                  variant="ghost"
                  className="h-11 rounded-xl px-4 text-sm text-surface-700"
                >
                  Open dashboard
                </Button>
              )}
            </div>

            <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              <CheckCircle2 size={14} />
              Location access is requested only for clinic/doctor discovery.
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-surface-200 bg-white/82 px-4 py-3"
                >
                  <p className="text-[11px] uppercase tracking-[0.08em] text-surface-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xl font-bold text-surface-900">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-white/80 bg-white/78 p-6 md:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">
              Live Queue Pulse
            </p>
            <h2 className="mt-2 text-2xl font-bold text-surface-900">Around your area</h2>
            <p className="mt-1 text-sm text-surface-600">
              Snapshot of current movement to help you pick quickly.
            </p>

            <div className="mt-5 space-y-2.5">
              {pulseRows.map((row) => (
                <div
                  key={row.clinic}
                  className="flex items-center justify-between rounded-xl border border-surface-200 bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-surface-900">{row.clinic}</p>
                    <p className="text-xs text-surface-500">{row.state} queue</p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                    {row.wait}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-surface-200 bg-surface-50/70 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-surface-500">Today</p>
              <p className="mt-1 text-sm text-surface-700">
                81% of patients reached the clinic within 10 minutes of consultation call.
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Card className="border-white/80 bg-white/75 p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">
                Quick Start
              </p>
              <h2 className="mt-2 text-2xl font-bold text-surface-900">What would you like to do?</h2>
            </div>
            <HeartPulse className="mt-1 text-brand-600" size={20} />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {quickActions.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={cn(
                    'group rounded-xl border border-surface-200 bg-white px-4 py-4 text-left transition-colors',
                    'hover:border-brand-300 hover:bg-brand-50/45'
                  )}
                >
                  <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon size={16} />
                  </div>
                  <p className="text-sm font-semibold text-surface-900">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-surface-600">{item.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                    Open
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              )
            })}
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-white/80 bg-white/75 p-6 md:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">How It Works</p>
            <h2 className="mt-2 text-2xl font-bold text-surface-900">Simple 3-step flow</h2>
            <div className="mt-5 space-y-3">
              {steps.map((item) => (
                <div key={item.index} className="rounded-xl border border-surface-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-600">
                    Step {item.index}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-surface-900">{item.title}</p>
                  <p className="mt-1 text-sm text-surface-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-white/80 bg-white/75 p-6 md:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">Why CareQueue</p>
            <h2 className="mt-2 text-2xl font-bold text-surface-900">Built for calm appointments</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {values.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="rounded-xl border border-surface-200 bg-white p-4">
                    <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                      <Icon size={16} />
                    </div>
                    <p className="text-sm font-semibold text-surface-900">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-surface-600">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
