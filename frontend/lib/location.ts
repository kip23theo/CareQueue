export interface Coordinates {
  lat: number
  lng: number
}

export interface LocationSuggestion extends Coordinates {
  label: string
}

interface NominatimSearchItem {
  lat?: string
  lon?: string
  display_name?: string
}

interface NominatimReverseResult {
  display_name?: string
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

function parseCoordinate(value?: string): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function searchLocationSuggestions(
  query: string,
  signal?: AbortSignal
): Promise<LocationSuggestion[]> {
  const normalized = query.trim()
  if (normalized.length < 2) return []

  const url = new URL('/search', NOMINATIM_BASE)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('q', normalized)
  url.searchParams.set('limit', '6')
  url.searchParams.set('addressdetails', '1')

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!res.ok) return []

  const payload = (await res.json()) as NominatimSearchItem[]
  return payload
    .map((item) => {
      const lat = parseCoordinate(item.lat)
      const lng = parseCoordinate(item.lon)
      const label = item.display_name?.trim()
      if (lat === null || lng === null || !label) return null
      return { lat, lng, label }
    })
    .filter((item): item is LocationSuggestion => item !== null)
}

export async function reverseGeocodeLocation(
  coords: Coordinates,
  signal?: AbortSignal
): Promise<string | null> {
  const url = new URL('/reverse', NOMINATIM_BASE)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(coords.lat))
  url.searchParams.set('lon', String(coords.lng))
  url.searchParams.set('zoom', '14')

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!res.ok) return null

  const payload = (await res.json()) as NominatimReverseResult
  return payload.display_name?.trim() ?? null
}

export function buildGoogleMapsDirectionsUrl(
  destination: Coordinates,
  origin?: Coordinates
): string {
  const url = new URL('https://www.google.com/maps/dir/')
  url.searchParams.set('api', '1')
  url.searchParams.set('destination', `${destination.lat},${destination.lng}`)
  url.searchParams.set('travelmode', 'driving')
  if (origin) {
    url.searchParams.set('origin', `${origin.lat},${origin.lng}`)
  }
  return url.toString()
}
