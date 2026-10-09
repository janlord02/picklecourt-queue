// "You're up!" alerts for players. Browsers only allow sound after a user
// gesture, so primeAlerts() runs on a tap (Turn on alerts / Check in) and
// unlocks audio + asks for notification permission. alertCalled() then plays
// a chime, vibrates (Android), and shows a system notification when the app
// is in the background. A fully locked iPhone still needs Web Push (a
// separate project) — keeping the screen on avoids that case.

let audioCtx = null

export function alertsSupported() {
  return {
    sound: typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext),
    notifications: typeof Notification !== 'undefined',
    wakeLock: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
  }
}

export async function primeAlerts({ askNotifications = true } = {}) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (Ctx && !audioCtx) audioCtx = new Ctx()
    if (audioCtx?.state === 'suspended') await audioCtx.resume()
  } catch {
    audioCtx = null
  }
  if (askNotifications && typeof Notification !== 'undefined' && Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch {
      // older Safari: callback-only API / blocked — ignore
    }
  }
  return alertsState()
}

export function alertsState() {
  return {
    sound: !!audioCtx && audioCtx.state === 'running',
    notifications: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  }
}

function chime() {
  if (!audioCtx || audioCtx.state !== 'running') return
  const t0 = audioCtx.currentTime
  // Three rising notes, loud enough to hear courtside.
  ;[660, 880, 1175].forEach((freq, i) => {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const start = t0 + i * 0.22
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.6, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start(start)
    osc.stop(start + 0.4)
  })
}

export function alertCalled({ courtLabel = null } = {}) {
  chime()
  setTimeout(chime, 1400) // twice, in case the first was missed
  try {
    navigator.vibrate?.([300, 120, 300, 120, 600])
  } catch {
    // unsupported
  }
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible'
    && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      const n = new Notification("You're up! 🎾", {
        body: courtLabel ? `Head to ${courtLabel}.` : 'Your match is ready — head to your court.',
        tag: 'play-called',
        renotify: true,
        requireInteraction: true,
        icon: '/icons/apple-touch-icon.png',
      })
      n.onclick = () => {
        window.focus()
        n.close()
      }
    } catch {
      // some mobile browsers only allow notifications from a service worker
    }
  }
}

// Screen wake lock while waiting in the queue (opt-in). Re-acquired when the
// page becomes visible again, since browsers release it on hide.
let wakeLock = null
let wantWake = false
async function acquire() {
  if (!wantWake || wakeLock || document.visibilityState !== 'visible') return
  try {
    wakeLock = await navigator.wakeLock.request('screen')
    wakeLock.addEventListener('release', () => {
      wakeLock = null
    })
  } catch {
    wakeLock = null
  }
}
const onVisibility = () => acquire()

export async function setKeepScreenOn(on) {
  if (!alertsSupported().wakeLock) return false
  wantWake = on
  if (on) {
    document.addEventListener('visibilitychange', onVisibility)
    await acquire()
    return !!wakeLock
  }
  document.removeEventListener('visibilitychange', onVisibility)
  try {
    await wakeLock?.release()
  } catch {
    // already released
  }
  wakeLock = null
  return false
}
