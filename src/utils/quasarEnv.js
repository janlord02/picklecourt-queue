/**
 * Quasar reads `.env` and injects keys at build time as `process.env.VITE_*`.
 * Prefer that, then `import.meta.env` (plain Vite), so dev/prod both see the same values.
 * Use literal `process.env.VITE_*` names only so the bundler can substitute them.
 */

function isCapacitorNative() {
  if (typeof window === 'undefined') return false
  try {
    const c = window.Capacitor
    if (!c) return false
    if (typeof c.isNativePlatform === 'function' && c.isNativePlatform()) return true
    if (typeof c.getPlatform === 'function') {
      const p = c.getPlatform()
      return p === 'ios' || p === 'android'
    }
    return false
  } catch {
    return false
  }
}

/** True when the page is served from a typical LAN dev URL (Quasar live reload on a device). */
function isPrivateLanHostname(hostname) {
  if (!hostname) return false
  if (hostname === 'localhost' || hostname === '127.0.0.1') return false
  return (
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  )
}

function devApiProxyDisabled() {
  const v =
    process.env.VITE_CAPACITOR_DISABLE_DEV_PROXY || import.meta.env.VITE_CAPACITOR_DISABLE_DEV_PROXY
  return v === 'true' || v === '1'
}

/**
 * On iOS/Android, `localhost` in VITE_API_URL points at the device, not your dev machine.
 *
 * In dev, Capacitor live reload uses http://YOUR_LAN:9500. Calling Laravel on :8000 from the
 * WebView is cross-origin and often surfaces as axios "Network Error". Quasar devServer proxies
 * `/api` → Laravel; using `${origin}/api` keeps requests same-origin. Production builds still use
 * VITE_API_URL_MOBILE / VITE_API_URL. Set VITE_CAPACITOR_DISABLE_DEV_PROXY=1 to force direct LAN API in dev.
 */
export function getViteApiUrl() {
  const defaultUrl = process.env.VITE_API_URL || import.meta.env.VITE_API_URL || ''
  const mobileUrl = process.env.VITE_API_URL_MOBILE || import.meta.env.VITE_API_URL_MOBILE || ''

  if (typeof window !== 'undefined' && import.meta.env.DEV && !devApiProxyDisabled()) {
    const useDevProxy = isCapacitorNative() || isPrivateLanHostname(window.location?.hostname)
    if (useDevProxy) {
      return `${window.location.origin}/api`
    }
  }

  if (isCapacitorNative() && mobileUrl) {
    return mobileUrl
  }
  return defaultUrl
}

export function getViteGoogleMapsApiKey() {
  return process.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
}

export function getViteReverbAppKey() {
  return process.env.VITE_REVERB_APP_KEY || import.meta.env.VITE_REVERB_APP_KEY || ''
}

export function getViteReverbHost() {
  return process.env.VITE_REVERB_HOST || import.meta.env.VITE_REVERB_HOST || 'localhost'
}

export function getViteReverbPort() {
  const raw = process.env.VITE_REVERB_PORT || import.meta.env.VITE_REVERB_PORT
  return raw != null && raw !== '' ? String(raw) : ''
}

export function getViteReverbScheme() {
  return process.env.VITE_REVERB_SCHEME || import.meta.env.VITE_REVERB_SCHEME || 'http'
}

export function getViteReverbCluster() {
  return process.env.VITE_REVERB_APP_CLUSTER || import.meta.env.VITE_REVERB_APP_CLUSTER || 'mt1'
}
