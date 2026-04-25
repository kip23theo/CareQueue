'use client'

import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Navigation,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getUser } from '@/lib/auth'

type Metric = {
  label: string
  value: string
}

type FeaturePillar = {
  icon: LucideIcon
  title: string
  desc: string
  tone: string
  iconTone: string
}

type JourneyStep = {
  step: string
  title: string
  desc: string
}

type LiveClinic = {
  clinic: string
  wait: string
  flow: string
}

type Voice = {
  quote: string
  name: string
  detail: string
}

const trustMetrics: Metric[] = [
  {
    label: 'Queue refresh',
    value: '< 30s',
  },
  {
    label: 'Connected clinics',
    value: '450+',
  },
  {
    label: 'Patients/day',
    value: '12K+',
  },
]

const experiencePillars: FeaturePillar[] = [
  {
    icon: Clock3,
    title: 'Minute-level wait forecasting',
    desc: 'Queue velocity updates constantly so your ETA stays realistic while you travel.',
    tone: 'border-sky-200 bg-gradient-to-br from-sky-50 to-white',
    iconTone: 'bg-sky-500',
  },
  {
    icon: Navigation,
    title: 'Smart clinic discovery',
    desc: 'Compare nearby options by travel time, specialty, and live queue pressure.',
    tone: 'border-brand-200 bg-gradient-to-br from-brand-50 to-white',
    iconTone: 'bg-brand-500',
  },
  {
    icon: ShieldCheck,
    title: 'Reliable token tracking',
    desc: 'Track status from waiting to consultation without repeated calls to reception.',
    tone: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white',
    iconTone: 'bg-emerald-500',
  },
]

const careJourney: JourneyStep[] = [
  {
    step: '01',
    title: 'Pick your clinic',
    desc: 'Compare nearby options by specialty, travel time, and live queue pressure.',
  },
  {
    step: '02',
    title: 'Join digitally',
    desc: 'Get your token in seconds and skip standing in physical lines.',
  },
  {
    step: '03',
    title: 'Arrive at the right minute',
    desc: 'Live updates keep you synced so you reach just before your call.',
  },
]

const liveClinics: LiveClinic[] = [
  {
    clinic: 'GreenLife Clinic',
    wait: '11 min',
    flow: 'Steady flow',
  },
  {
    clinic: 'CityCare Multispecialty',
    wait: '17 min',
    flow: 'Slightly busy',
  },
  {
    clinic: 'Sunrise Family Practice',
    wait: '8 min',
    flow: 'Fast movement',
  },
]

const patientVoices: Voice[] = [
  {
    quote: 'I only leave home when my token is close now. It has saved me hours every week.',
    name: 'Asha R.',
    detail: 'Parent, Pune',
  },
  {
    quote: 'The live queue view is accurate enough to plan around work breaks without stress.',
    name: 'Ravi M.',
    detail: 'Consultant, Bengaluru',
  },
]

export default function PatientHome() {
  const router = useRouter()
  const user = getUser()
  const isPatient = user?.role === 'patient'

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[radial-gradient(circle_at_12%_8%,rgba(20,184,166,0.16),transparent_28%),radial-gradient(circle_at_84%_20%,rgba(56,189,248,0.16),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#f5fdfb_52%,#ffffff_100%)]">
      <section className="relative overflow-hidden border-b border-surface-200/70">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-100/50 to-transparent" />
        <div className="pointer-events-none absolute -right-24 top-16 h-56 w-56 rounded-full bg-brand-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-6 h-56 w-56 rounded-full bg-cyan-200/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-16 lg:pt-16">
          <div>
            <Badge className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">
              <Sparkles size={13} />
              Smart Queue for Patients
            </Badge>

            <h1 className="font-heading text-4xl font-bold leading-tight text-surface-900 sm:text-5xl lg:text-[3.2rem] lg:leading-[1.06]">
              Reach your clinic at the
              <span className="block text-brand-700">right minute</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-surface-600 sm:text-lg">
              CareQueue helps you find nearby clinics and doctors, join the line digitally, and arrive just before your turn.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => router.push('/patient/clinics')}
                className="h-11 rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white shadow-sm shadow-brand-500/30 hover:bg-brand-600"
              >
                Explore clinics
                <ArrowRight size={16} />
              </Button>

              <Button
                onClick={() => router.push('/patient/doctors')}
                variant="outline"
                className="h-11 rounded-xl border-surface-300 bg-white px-5 text-sm font-semibold text-surface-700 hover:bg-surface-100"
              >
                Find doctors
              </Button>

              {isPatient && (
                <Button
                  onClick={() => router.push('/patient/dashboard')}
                  variant="outline"
                  className="h-11 rounded-xl border-surface-300 bg-white px-5 text-sm font-semibold text-surface-700 hover:bg-surface-100"
                >
                  Open dashboard
                </Button>
              )}
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm text-surface-600">
              <CheckCircle2 size={15} className="text-emerald-600" />
              Location is only requested when you open clinics or doctors search.
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {trustMetrics.map((item) => (
                <Card
                  key={item.label}
                  className="rounded-2xl border border-surface-200/90 bg-white/85 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-[0.08em] text-surface-500">{item.label}</p>
                  <p className="mt-1 text-xl font-bold text-surface-900">{item.value}</p>
                </Card>
              ))}
            </div>
          </div>

          <Card className="rounded-[1.75rem] border border-brand-100/80 bg-white/90 p-6 shadow-[0_30px_80px_-50px_rgba(20,184,166,0.45)]">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Live Snapshot</p>
            <h2 className="mt-2 text-2xl font-bold text-surface-900">Today around you</h2>
            <p className="mt-1 text-sm text-surface-600">Quick glance at real queue movement in your area.</p>

            <div className="mt-6 space-y-3">
              {liveClinics.map((item) => (
                <div
                  key={item.clinic}
                  className="flex items-center justify-between rounded-xl border border-surface-200 bg-surface-50/80 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-surface-900">{item.clinic}</p>
                    <p className="text-xs text-surface-500">{item.flow}</p>
                  </div>
                  <div className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                    {item.wait}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
              81% of patients arrive within 10 minutes of consultation call.
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:grid lg:grid-cols-[1fr_1fr] lg:gap-6 lg:px-8">
        <Card className="rounded-[1.5rem] border border-surface-200 bg-white/90 p-6 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">How It Works</p>
          <h2 className="mt-2 text-2xl font-bold text-surface-900 md:text-[1.75rem]">
            A simple 3-step flow
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-surface-600">
            Minimal taps, less waiting room time, and better predictability for your day.
          </p>

          <div className="mt-6 space-y-3">
            {careJourney.map((item) => (
              <div key={item.step} className="rounded-2xl border border-surface-200 bg-surface-50/75 p-4">
                <div className="mb-2 inline-flex rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
                  Step {item.step}
                </div>
                <p className="text-sm font-semibold text-surface-900">{item.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-surface-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mt-6 rounded-[1.5rem] border border-surface-200 bg-white/90 p-6 md:p-7 lg:mt-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Core Experience</p>
          <h2 className="mt-2 text-2xl font-bold text-surface-900 md:text-[1.75rem]">
            Designed to feel calm and clear
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-surface-600">
            The app keeps you informed without overwhelming you with noise.
          </p>

          <div className="mt-6 space-y-3">
            {experiencePillars.map((pillar) => {
              const Icon = pillar.icon
              return (
                <Card key={pillar.title} className={cn('rounded-2xl border p-4', pillar.tone)}>
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm',
                        pillar.iconTone
                      )}
                    >
                      <Icon size={17} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-surface-900">{pillar.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-surface-600">{pillar.desc}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <Card className="rounded-[1.75rem] border border-brand-200 bg-gradient-to-br from-white via-brand-50/50 to-cyan-50/70 p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Patient Voices</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-surface-900">
                Trusted by busy families
              </h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {patientVoices.map((item) => (
                  <div key={item.name} className="rounded-2xl border border-surface-200 bg-white/90 p-4">
                    <div className="mb-2 flex items-center gap-1 text-amber-500">
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                    </div>
                    <p className="text-sm leading-relaxed text-surface-700">&ldquo;{item.quote}&rdquo;</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.06em] text-surface-500">
                      {item.name} · {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex h-full flex-col justify-between rounded-3xl border border-brand-200 bg-white/85 p-5 md:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Start Now</p>
                <h3 className="mt-1 text-2xl font-bold text-surface-900">Pick your clinic in under a minute</h3>
                <p className="mt-2 text-sm leading-relaxed text-surface-600">
                  Compare wait times, choose a clinic or doctor, and join instantly.
                </p>
              </div>

              <div className="mt-5 space-y-2">
                <Button
                  onClick={() => router.push('/patient/clinics')}
                  className="h-11 w-full rounded-xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  Explore clinics near me
                  <ArrowRight size={16} />
                </Button>

                <Button
                  onClick={() => router.push('/patient/doctors')}
                  variant="outline"
                  className="h-11 w-full rounded-xl border-surface-300 bg-white text-sm font-semibold text-surface-700 hover:bg-surface-100"
                >
                  Find doctors near me
                </Button>

                {isPatient && (
                  <Button
                    onClick={() => router.push('/patient/dashboard')}
                    variant="outline"
                    className="h-11 w-full rounded-xl border-surface-300 bg-white text-sm font-semibold text-surface-700 hover:bg-surface-100"
                  >
                    Open my dashboard
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
