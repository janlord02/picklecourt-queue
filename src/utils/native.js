// Native (Capacitor) helpers. Everything here is a safe no-op in the browser,
// so callers don't need to check the platform.
import { Capacitor } from '@capacitor/core'

export const isNative = () => Capacitor.isNativePlatform()
export const platform = () => Capacitor.getPlatform() // 'ios' | 'android' | 'web'

/**
 * Haptic feedback on key actions. kind: 'light' | 'medium' | 'success' |
 * 'warning' | 'error'. Fire-and-forget; never throws.
 */
export async function haptic(kind = 'light') {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')
    if (kind === 'success' || kind === 'warning' || kind === 'error') {
      const type = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error }[kind]
      await Haptics.notification({ type })
    } else {
      await Haptics.impact({ style: kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light })
    }
  } catch {
    // plugin missing / unsupported device
  }
}

/**
 * One-time native setup (called from boot/native.js): brand status bar,
 * keyboard that doesn't cover inputs, Android back button = go back (exit on
 * home), and hide the splash once the app has mounted.
 */
export async function setupNative(router) {
  if (!isNative()) return
  document.documentElement.classList.add('is-native', `is-${platform()}`)

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark }) // light text on dark green
    if (platform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0c2b23' })
    }
  } catch {
    // ignore
  }

  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard')
    if (platform() === 'ios') await Keyboard.setResizeMode({ mode: KeyboardResize.Native })
    await Keyboard.setAccessoryBarVisible?.({ isVisible: true })
  } catch {
    // ignore
  }

  try {
    const { App } = await import('@capacitor/app')
    App.addListener('backButton', ({ canGoBack }) => {
      const atRoot = ['home', 'organizer-sessions', 'login'].includes(router.currentRoute.value.name)
      if (canGoBack && !atRoot) router.back()
      else App.exitApp()
    })
    // Returning to the app: let realtime/visibility listeners refetch.
    App.addListener('resume', () => window.dispatchEvent(new Event('online')))
  } catch {
    // ignore
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide({ fadeOutDuration: 250 })
  } catch {
    // ignore
  }
}
