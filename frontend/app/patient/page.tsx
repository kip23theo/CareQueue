'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePatient } from '@/context/PatientContext'
import { cn } from '@/lib/utils'
import { MapPin, Loader2, Zap, Clock, Smartphone } from 'lucide-react'

const CITY_PRESETS = [
  { name: 'Mumbai', lat: 19.076, lng: 72.877 },
  { name: 'Delhi', lat: 28.679, lng: 77.069 },
  { name: 'Bangalore', lat: 12.971, lng: 77.594 },
  { name: 'Chennai', lat: 13.083, lng: 80.270 },
]

const features = [
  { icon: <Zap size={14} />, label: 'Live wait times' },
  { icon: <Smartphone size={14} />, label: 'Remote queue join' },
  { icon: <Zap size={14} />, label: 'AI recommendations' },
  { icon: <Clock size={14} />, label: 'Real-time tracking' },
]

export default function PatientHome() {
  const router = useRouter()
  const { setLocation } = usePatient()
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const handleUseLocation = () => {
    setIsLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setIsLocating(false)
        router.push('/patient/clinics')
      },
      () => {
        setLocationError('Location access denied. Please select a city.')
        setIsLocating(false)
      }
    )
  }

  const handleCitySelect = (city: typeof CITY_PRESETS[0]) => {
    setLocation({ lat: city.lat, lng: city.lng })
    router.push('/patient/clinics')
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        {/* Hero */}
        <div className="mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            Real-time Queue Management
          </div>
          <h1 className="text-4xl font-bold font-heading text-surface-900 leading-tight mb-3">
            Find a clinic<br />near you
          </h1>
          <p className="text-surface-500 text-base leading-relaxed">
            See live wait times, join the queue remotely,<br />and get AI-powered recommendations.
          </p>
        </div>

        {/* Location CTA */}
        <div className="space-y-3 animate-slide-up mb-8">
          <button
            id="use-location-btn"
            onClick={handleUseLocation}
            disabled={isLocating}
            className={cn(
              'w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl',
              'bg-brand-500 text-white font-semibold text-base',
              'hover:bg-brand-600 active:scale-[0.98] transition-all shadow-lg shadow-brand-500/25',
              'disabled:opacity-70 disabled:cursor-not-allowed'
            )}
          >
            {isLocating ? (
              <><Loader2 size={20} className="animate-spin" /> Detecting location...</>
            ) : (
              <><MapPin size={20} /> Use my location</>
            )}
          </button>

          {locationError && (
            <p className="text-sm text-red-600 text-center">{locationError}</p>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-200" />
            <span className="text-xs text-surface-400">or select a city</span>
            <div className="flex-1 h-px bg-surface-200" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {CITY_PRESETS.map((city) => (
              <button
                key={city.name}
                onClick={() => handleCitySelect(city)}
                className={cn(
                  'py-2.5 rounded-xl border border-surface-200 bg-white',
                  'text-sm font-medium text-surface-700',
                  'hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
                  'transition-all'
                )}
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 animate-fade-in">
          {features.map((f) => (
            <span
              key={f.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-surface-200 text-xs text-surface-600 font-medium"
            >
              <span className="text-brand-500">{f.icon}</span>
              {f.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
