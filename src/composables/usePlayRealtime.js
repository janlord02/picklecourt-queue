import { onBeforeUnmount, watch } from 'vue'
import { CHANNELS, EVENTS } from 'src/api/openPlay'
import { getEcho, isEchoConnected } from 'src/utils/echoClient'

// Venue wifi is unreliable: when the socket is down (or Reverb is not
// configured at all), fall back to polling so screens never silently stale.
const FALLBACK_POLL_MS = 20000

/**
 * Courtside phones lock and TVs drop wifi; broadcasts sent meanwhile are lost
 * and the socket can report "connected" before noticing it died. Refetch when
 * the page becomes visible again, the device comes back online, or the socket
 * (re)connects. Returns a cleanup function.
 */
function watchResync(onUpdate) {
  if (typeof window === 'undefined') return () => {}
  const resync = (reason) => () => onUpdate({ reason })
  const onVisible = () => {
    if (document.visibilityState === 'visible') onUpdate({ reason: 'wake' })
  }
  const onOnline = resync('online')
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onOnline)
  window.addEventListener('pageshow', onOnline)

  const connection = getEcho()?.connector?.pusher?.connection
  let lastState = connection?.state
  const onState = ({ current }) => {
    if (current === 'connected' && lastState !== 'connected') onUpdate({ reason: 'reconnect' })
    lastState = current
  }
  connection?.bind?.('state_change', onState)

  return () => {
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('pageshow', onOnline)
    connection?.unbind?.('state_change', onState)
  }
}

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
  let stopResync = () => {}

  const debounced = (payload) => {
    clearTimeout(timer)
    timer = setTimeout(() => onUpdate(payload), debounceMs)
  }

  const unsubscribe = () => {
    clearTimeout(timer)
    clearInterval(pollTimer)
    pollTimer = null
    stopResync()
    stopResync = () => {}
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
    stopResync = watchResync(debounced)
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
  let stopResync = () => {}

  const debounced = (payload) => {
    clearTimeout(timer)
    timer = setTimeout(() => onUpdate(payload), debounceMs)
  }

  const unsubscribe = () => {
    clearTimeout(timer)
    clearInterval(pollTimer)
    pollTimer = null
    stopResync()
    stopResync = () => {}
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
    stopResync = watchResync(debounced)
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
export function usePlayCalledRealtime(userIdRef, onCalled, { onResync = null } = {}) {
  let channelName = null
  let stopResync = () => {}

  const unsubscribe = () => {
    stopResync()
    stopResync = () => {}
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
    // A "you're up" ping missed while the phone slept: let the page refetch.
    if (onResync) stopResync = watchResync(onResync)
  }

  const stop = watch(userIdRef, (id) => subscribe(id), { immediate: true })

  onBeforeUnmount(() => {
    stop()
    unsubscribe()
  })

  return unsubscribe
}
