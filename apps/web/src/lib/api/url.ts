const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

/**
 * Browser API URLs default to same-origin `/api`, so a production reverse proxy
 * can serve the frontend and API together. Set VITE_API_BASE_URL at build time
 * when the API is hosted on a distinct origin.
 */
export function apiUrl(path: `/api/${string}`): string {
  if (!configuredApiBaseUrl) return path

  let origin: URL
  try {
    origin = new URL(configuredApiBaseUrl)
  } catch {
    throw new Error('VITE_API_BASE_URL must be an absolute http(s) origin.')
  }

  if (!['http:', 'https:'].includes(origin.protocol) || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('VITE_API_BASE_URL must be an absolute http(s) origin without a path, query, or fragment.')
  }

  return `${origin.origin}${path}`
}
