const DEFAULT_API_BASE_URL = 'http://localhost:8000'

function replaceWildcardHost(url: string): string {
  return url.replace(/^(https?:\/\/)0\.0\.0\.0(?=[:/]|$)/i, '$1localhost')
}

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() ?? ''
  if (!raw) return DEFAULT_API_BASE_URL

  const normalized = replaceWildcardHost(raw).replace(/\/+$/, '')
  return normalized || DEFAULT_API_BASE_URL
}

