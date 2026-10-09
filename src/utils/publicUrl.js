// The public web address of the queue app. Inside the native app the page
// origin is "https://localhost" / "capacitor://localhost", which must never
// end up in share links, QR codes or emailed links — use this instead.
import { isNative } from 'src/utils/native'

const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL || 'https://openplay.picklecourt.ph').replace(/\/+$/, '')

export function publicAppUrl() {
  if (isNative() || typeof window === 'undefined') return PUBLIC_APP_URL
  return window.location.origin
}

export const joinUrl = (code) => `${publicAppUrl()}/join/${code}`
