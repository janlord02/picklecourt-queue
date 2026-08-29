import { onBeforeUnmount, watch } from 'vue'
import { CHANNELS, EVENTS } from 'src/api/openPlay'
import { getEcho, isEchoConnected } from 'src/utils/echoClient'

// Venue wifi is unreliable: when the socket is down (or Reverb is not
// configured at all), fall back to polling so screens never silently stale.
const FALLBACK_POLL_MS = 20000

/**
 * Live updates for a play session. Broadcasts are thin ({session_id,
 * version, reason}); on every signal we refetch the full state (debounced),
 * which is the server-authoritative convergence model.
 *
 * No-ops gracefully when Echo is unconfigured (VITE_REVERB_APP_KEY unset).
 * Returns an unsubscribe closure; also cleans up on component unmount.
 */
export function usePlaySessionRealtime(sessionIdRef, onUpdate, { debounceMs = 250 } = {}) {
  let channelName = null
  let timer = null
  let pollTimer = null

  const debounced = (payload) => {
    clearTimeout(timer)
    timer = setTimeout(() => onUpdate(payload), debounceMs)
  }

  const unsubscribe = () => {
    clearTimeout(timer)
    clearInterval(pollTimer)
    pollTimer = null
    const echo = getEcho()
    if (echo && channelName) {
      echo.leave(channelName)
    }
    channelName = null
  }

  const subscribe = (id) => {
    unsubscribe()
    if (!id) return
    pollTimer = setInterval(() => {
      if (!isEchoConnected()) onUpdate({ reason: 'poll' })
    }, FALLBACK_POLL_MS)
    const echo = getEcho()
    if (!echo) return
    channelName = CHANNELS.session(id)
    echo.private(channelName).listen(EVENTS.updated, debounced)
  }

  const stop = watch(sessionIdRef, (id) => subscribe(id), { immediate: true })

  onBeforeUnmount(() => {
    stop()
    unsubscribe()
  })

  return unsubscribe
}

/** Public TV/kiosk board — no auth, keyed by join code. */
export function usePlayDisplayRealtime(codeRef, onUpdate, { debounceMs = 250 } = {}) {
  let channelName = null
  let timer = null
  let pollTimer = null

  const debounced = (payload) => {
    clearTimeout(timer)
    timer = setTimeout(() => onUpdate(payload), debounceMs)
  }

  const unsubscribe = () => {
    clearTimeout(timer)
    clearInterval(pollTimer)
    pollTimer = null
    const echo = getEcho()
    if (echo && channelName) {
      echo.leave(channelName)
    }
    channelName = null
  }

  const subscribe = (code) => {
    unsubscribe()
    if (!code) return
    pollTimer = setInterval(() => {
      if (!isEchoConnected()) onUpdate({ reason: 'poll' })
    }, FALLBACK_POLL_MS)
    const echo = getEcho()
    if (!echo) return
    channelName = CHANNELS.display(code)
    echo.channel(channelName).listen(EVENTS.updated, debounced)
  }

  const stop = watch(codeRef, (code) => subscribe(code), { immediate: true })

  onBeforeUnmount(() => {
    stop()
    unsubscribe()
  })

  return unsubscribe
}

/**
 * Personal "you're up" pings on the user's own channel. Drives the
 * full-screen takeover + vibration in PlayPage.
 */
export function usePlayCalledRealtime(userIdRef, onCalled) {
  let channelName = null

  const unsubscribe = () => {
    const echo = getEcho()
    if (echo && channelName) {
      echo.leave(channelName)
    }
    channelName = null
  }

  const subscribe = (userId) => {
    unsubscribe()
    if (!userId) return
    const echo = getEcho()
    if (!echo) return
    channelName = CHANNELS.user(userId)
    echo.private(channelName).listen(EVENTS.called, onCalled)
  }

  const stop = watch(userIdRef, (id) => subscribe(id), { immediate: true })

  onBeforeUnmount(() => {
    stop()
    unsubscribe()
  })

  return unsubscribe
}
