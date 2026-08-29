import { defineBoot } from '#q-app/wrappers'
import axios from 'axios'
import { getViteApiUrl } from 'src/utils/quasarEnv'

function resolveApiBaseUrl() {
  return getViteApiUrl() || 'http://localhost:8000/api'
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Same conventions as the booking frontend: the backend's DetectTenant
// middleware needs mobile-source signalling, and the token lives in
// localStorage under the shared key so a login carries across both apps
// when they run on the same origin.
function isCapacitorNative() {
  if (typeof window === 'undefined') return false
  const cap = window.Capacitor
  if (!cap) return false
  if (typeof cap.isNativePlatform === 'function') {
    try {
      return !!cap.isNativePlatform()
    } catch {
      return false
    }
  }
  return true
}

const MOBILE_TENANT_DOMAIN = (import.meta.env.VITE_MOBILE_TENANT_DOMAIN || '').trim()

api.interceptors.request.use((config) => {
  // Resolve on each request so Capacitor is detected after bridge init.
  config.baseURL = resolveApiBaseUrl()
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  if (isCapacitorNative()) {
    config.headers['X-App-Source'] = 'mobile'
    if (MOBILE_TENANT_DOMAIN) {
      config.headers['X-Tenant-Domain'] = MOBILE_TENANT_DOMAIN
    }
  }
  const activeBusinessId = localStorage.getItem('active_business_id')
  if (activeBusinessId) {
    config.headers['X-Active-Business-Id'] = activeBusinessId
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      if (typeof window !== 'undefined') {
        const path = window.location.pathname || ''
        // Public surfaces (TV board, QR landing) never force a login.
        const publicPath =
          path.includes('/login') || path.includes('/display/') || path.includes('/join/')
        if (!publicPath) {
          const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
          // Come back to where the session expired after signing in.
          const redirect = encodeURIComponent(path + (window.location.search || ''))
          window.location.assign(`${base}login?redirect=${redirect}`)
        }
      }
    }
    return Promise.reject(error)
  },
)

export default defineBoot(({ app }) => {
  app.config.globalProperties.$api = api
})

export { api }
