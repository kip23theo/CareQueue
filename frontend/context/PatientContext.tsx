'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Clinic, QueueToken } from '@/types'

interface Location {
  lat: number
  lng: number
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
  const [location, setLocationState] = useState<Location | null>(null)
  const [nearbyClinics, setNearbyClinics] = useState<Clinic[]>([])
  const [myToken, setMyTokenState] = useState<QueueToken | null>(null)

  useEffect(() => {
    // Restore location from sessionStorage
    const savedLoc = sessionStorage.getItem('cf_location')
    if (savedLoc) {
      try { setLocationState(JSON.parse(savedLoc)) } catch { /* ignore */ }
    }
    // Restore my token from localStorage
    const savedToken = localStorage.getItem('cf_my_token')
    if (savedToken) {
      try { setMyTokenState(JSON.parse(savedToken)) } catch { /* ignore */ }
    }
  }, [])

  const setLocation = (loc: Location) => {
    setLocationState(loc)
    sessionStorage.setItem('cf_location', JSON.stringify(loc))
  }

  const setMyToken = (token: QueueToken | null) => {
    setMyTokenState(token)
    if (token) {
      localStorage.setItem('cf_my_token', JSON.stringify(token))
    } else {
      localStorage.removeItem('cf_my_token')
    }
  }

  return (
    <PatientContext.Provider value={{
      location, setLocation,
      nearbyClinics, setNearbyClinics,
      myToken, setMyToken,
    }}>
      {children}
    </PatientContext.Provider>
  )
}

export function usePatient() {
  const ctx = useContext(PatientContext)
  if (!ctx) throw new Error('usePatient must be used within PatientProvider')
  return ctx
}
