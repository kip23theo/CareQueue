'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
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
  const [nearbyClinics, setNearbyClinicsState] = useState<Clinic[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = sessionStorage.getItem('cf_nearby_clinics')
    if (!saved) return []
    try {
      return JSON.parse(saved) as Clinic[]
    } catch {
      return []
    }
  })
  const [location, setLocationState] = useState<Location | null>(() => {
    if (typeof window === 'undefined') return null
    const savedLoc = sessionStorage.getItem('cf_location')
    if (!savedLoc) return null
    try {
      return JSON.parse(savedLoc) as Location
    } catch {
      return null
    }
  })
  const [myToken, setMyTokenState] = useState<QueueToken | null>(() => {
    if (typeof window === 'undefined') return null
    const savedToken = localStorage.getItem('cf_my_token')
    if (!savedToken) return null
    try {
      return JSON.parse(savedToken) as QueueToken
    } catch {
      return null
    }
  })

  const setLocation = useCallback((loc: Location) => {
    setLocationState(loc)
    sessionStorage.setItem('cf_location', JSON.stringify(loc))
  }, [])

  const setNearbyClinics = useCallback((clinics: Clinic[]) => {
    setNearbyClinicsState(clinics)
    sessionStorage.setItem('cf_nearby_clinics', JSON.stringify(clinics))
  }, [])

  const setMyToken = useCallback((token: QueueToken | null) => {
    setMyTokenState(token)
    if (token) {
      localStorage.setItem('cf_my_token', JSON.stringify(token))
    } else {
      localStorage.removeItem('cf_my_token')
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
