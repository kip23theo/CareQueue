'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Clinic, QueueToken } from '@/types'

interface Location {
  lat: number
  lng: number
  label?: string
}

interface PatientContextValue {
  location: Location | null
  setLocation: (loc: Location) => void
  nearbyClinics: Clinic[]
  setNearbyClinics: (clinics: Clinic[]) => void
  myToken: QueueToken | null
  setMyToken: (token: QueueToken | null) => void
}

const PatientContext = createContext<PatientContextValue | null>(null)

export function PatientProvider({ children }: { children: ReactNode }) {
  const [nearbyClinics, setNearbyClinicsState] = useState<Clinic[]>([])
  const [location, setLocationState] = useState<Location | null>(null)
  const [myToken, setMyTokenState] = useState<QueueToken | null>(null)

  const hydrateFromStorage = useCallback(() => {
    const savedClinics = sessionStorage.getItem('cf_nearby_clinics')
    if (savedClinics) {
      try {
        const parsedClinics = JSON.parse(savedClinics) as Clinic[]
        setNearbyClinicsState((prev) => (prev.length > 0 ? prev : parsedClinics))
      } catch {
        // ignore malformed cached clinics
      }
    }

    const savedLocation = sessionStorage.getItem('cf_location')
    if (savedLocation) {
      try {
        const parsedLocation = JSON.parse(savedLocation) as Location
        setLocationState((prev) => prev ?? parsedLocation)
      } catch {
        // ignore malformed cached location
      }
    }

    const savedToken = localStorage.getItem('cf_my_token')
    if (savedToken) {
      try {
        const parsedToken = JSON.parse(savedToken) as QueueToken
        setMyTokenState((prev) => prev ?? parsedToken)
      } catch {
        // ignore malformed cached token
      }
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      hydrateFromStorage()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [hydrateFromStorage])

  const setLocation = useCallback((loc: Location) => {
    setLocationState(loc)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cf_location', JSON.stringify(loc))
    }
  }, [])

  const setNearbyClinics = useCallback((clinics: Clinic[]) => {
    setNearbyClinicsState(clinics)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cf_nearby_clinics', JSON.stringify(clinics))
    }
  }, [])

  const setMyToken = useCallback((token: QueueToken | null) => {
    setMyTokenState(token)
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('cf_my_token', JSON.stringify(token))
      } else {
        localStorage.removeItem('cf_my_token')
      }
    }
  }, [])

  const value = useMemo(
    () => ({
      location,
      setLocation,
      nearbyClinics,
      setNearbyClinics,
      myToken,
      setMyToken,
    }),
    [location, setLocation, nearbyClinics, setNearbyClinics, myToken, setMyToken]
  )

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  )
}

export function usePatient() {
  const ctx = useContext(PatientContext)
  if (!ctx) throw new Error('usePatient must be used within PatientProvider')
  return ctx
}
