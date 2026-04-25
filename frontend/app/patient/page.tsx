'use client'

import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowRight,
  BellRing,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  HeartPulse,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  TimerReset,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getUser } from '@/lib/auth'

type Metric = {
  label: string
  value: string
  hint: string
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
  icon: LucideIcon
}

type VisitTrack = {
  title: string
  wait: string
  desc: string
  icon: LucideIcon
  badge: string
}

type Voice = {
  quote: string
  name: string
  detail: string
}

const trustMetrics: Metric[] = [
  {
    label: 'Queue refresh interval',
    value: '< 30s',
    hint: 'Always up to date',
  },
  {
    label: 'Clinics connected',
    value: '450+',
    hint: 'Across major areas',
  },
  {
    label: 'Patients served daily',
    value: '12K+',
    hint: 'High-volume reliability',
  },
  {
    label: 'Average arrival accuracy',
    value: '94%',
    hint: 'Less waiting room time',
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
    title: 'Find the right clinic',
    desc: 'Filter by distance, wait time, and specialty, then pick what matches your need.',
    icon: MapPin,
  },
  {
    step: '02',
    title: 'Join queue instantly',
    desc: 'Share details once and receive your token immediately in the app.',
    icon: Activity,
  },
  {
    step: '03',
    title: 'Track your position',
    desc: 'Get live movement alerts so you arrive just in time, not too early.',
    icon: BellRing,
  },
  {
    step: '04',
    title: 'Walk in with confidence',
    desc: 'Know your likely consult window before you even leave home.',
    icon: TimerReset,
  },
]

const visitTracks: VisitTrack[] = [
  {
    title: 'General Physician',
    wait: '8-18 min',
    desc: 'Everyday fever, cold, headache, and routine concerns.',
    icon: HeartPulse,
    badge: 'Most booked',
  },
  {
    title: 'Pediatrics',
    wait: '10-20 min',
    desc: 'Child checkups, vaccinations, and quick symptom reviews.',
    icon: Users,
    badge: 'Family care',
  },
  {
    title: 'Dermatology',
    wait: '12-24 min',
    desc: 'Skin infections, allergy flare-ups, and treatment follow-ups.',
    icon: Sparkles,
    badge: 'Specialist',
  },
  {
    title: 'Dental',
    wait: '9-16 min',
    desc: 'Tooth pain, cleaning, and emergency dental assessments.',
    icon: Stethoscope,
    badge: 'Same-day slots',
  },
  {
    title: 'Cardiac Review',
    wait: '14-28 min',
    desc: 'Follow-up consultations and medication adjustment visits.',
    icon: CalendarClock,
    badge: 'Follow-up',
  },
  {
    title: 'Diabetes Care',
    wait: '11-21 min',
    desc: 'Sugar-level monitoring and long-term care plan check-ins.',
    icon: Building2,
    badge: 'Chronic care',
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
  {
    quote: 'Reception calls dropped and patients arrive calmer because everyone sees the same status.',
    name: 'Dr. Kiran S.',
    detail: 'Clinic Lead',
  },
]

export default function PatientHome() {
  const router = useRouter()
  const user = getUser()
  const isPatient = user?.role === 'patient'

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[radial-gradient(circle_at_12%_8%,rgba(20,184,166,0.18),transparent_26%),radial-gradient(circle_at_84%_18%,rgba(56,189,248,0.18),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#f7fffd_52%,#ffffff_100%)]">
      <section className="relative overflow-hidden border-b border-surface-200/70">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-brand-100/55 to-transparent" />
        <div className="pointer-events-none absolute -right-28 top-12 h-64 w-64 rounded-full bg-brand-300/35 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-2 h-64 w-64 rounded-full bg-cyan-200/35 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:pt-16">
          <div>
            <Badge className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">
              <Sparkles size={13} />
              Real-time Patient Queue Platform
            </Badge>

            <h1 className="font-heading text-4xl font-bold leading-tight text-surface-900 sm:text-5xl lg:text-[3.35rem] lg:leading-[1.05]">
              Reach the clinic at the
              <span className="block text-brand-700">right minute, not an hour early</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-surface-600 sm:text-lg">
              CareQueue helps you discover nearby clinics, compare live wait times, and join digitally so your visit feels predictable from start to finish.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => router.push('/patient/clinics')}
                className="h-11 rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white shadow-sm shadow-brand-500/30 hover:bg-brand-600"
              >
                Explore clinics
                <ArrowRight size={16} />
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
              Location is requested only when you open clinic discovery.
            </div>
          </div>

          <Card className="rounded-[1.75rem] border border-brand-100/80 bg-white/90 p-6 shadow-[0_30px_80px_-50px_rgba(20,184,166,0.45)]">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Live pulse snapshot</p>
            <h2 className="mt-2 text-2xl font-bold text-surface-900">Today around you</h2>
            <p className="mt-1 text-sm text-surface-600">Queue dynamics from connected clinics in your city region.</p>

            <div className="mt-6 space-y-3">
              {[
                { clinic: 'GreenLife Clinic', wait: '11 min', flow: 'Steady flow' },
                { clinic: 'CityCare Multispecialty', wait: '17 min', flow: 'Slightly busy' },
                { clinic: 'Sunrise Family Practice', wait: '8 min', flow: 'Fast movement' },
              ].map((item) => (
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

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {trustMetrics.map((item) => (
            <Card key={item.label} className="rounded-2xl border-surface-200/90 bg-white/85 p-5">
              <p className="text-xs uppercase tracking-[0.07em] text-surface-500">{item.label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-surface-900">{item.value}</p>
              <p className="mt-1 text-sm text-surface-600">{item.hint}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Core Experience</p>
          <h2 className="mt-1 font-heading text-3xl font-bold tracking-tight text-surface-900">
            Built to reduce uncertainty before every clinic visit
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {experiencePillars.map((pillar) => {
            const Icon = pillar.icon
            return (
              <Card key={pillar.title} className={cn('rounded-3xl border p-6', pillar.tone)}>
                <span
                  className={cn(
                    'mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm',
                    pillar.iconTone
                  )}
                >
                  <Icon size={18} />
                </span>
                <h3 className="text-lg font-bold text-surface-900">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-surface-600">{pillar.desc}</p>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <Card className="overflow-hidden rounded-[1.75rem] border border-surface-200 bg-white/90 p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">How It Works</p>
              <h2 className="mt-1 text-2xl font-bold text-surface-900 md:text-3xl">A 4-step queue journey</h2>
            </div>
            <p className="max-w-md text-sm text-surface-600">
              Everything is designed so you spend less time in waiting rooms and more time on your day.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {careJourney.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className="rounded-2xl border border-surface-200 bg-surface-50/80 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
                      Step {item.step}
                    </span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm">
                      <Icon size={16} />
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-surface-900">{item.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-surface-600">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Visit Tracks</p>
          <h2 className="mt-1 font-heading text-3xl font-bold tracking-tight text-surface-900">
            Choose the care lane that matches your visit
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visitTracks.map((track) => {
            const Icon = track.icon
            return (
              <Card key={track.title} className="rounded-2xl border border-surface-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                    <Icon size={17} />
                  </div>
                  <span className="rounded-full border border-surface-200 bg-surface-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-600">
                    {track.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-surface-900">{track.title}</h3>
                <p className="mt-1 text-sm text-surface-600">{track.desc}</p>
                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  <Clock3 size={13} />
                  Typical wait {track.wait}
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <Card className="rounded-[1.75rem] border border-brand-200 bg-gradient-to-br from-white via-brand-50/50 to-cyan-50/70 p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Patient Voices</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-surface-900">Trusted by busy families and clinics</h2>

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
                    <p className="text-sm leading-relaxed text-surface-700">“{item.quote}”</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.06em] text-surface-500">
                      {item.name} · {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex h-full flex-col justify-between rounded-3xl border border-brand-200 bg-white/80 p-5 md:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Start Now</p>
                <h3 className="mt-1 text-2xl font-bold text-surface-900">Find your best clinic in under a minute</h3>
                <p className="mt-2 text-sm leading-relaxed text-surface-600">
                  Compare wait times, pick your doctor, and join from your phone without standing in line.
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
