import { onBeforeUnmount, watch } from 'vue'
import { TOURNAMENT_CHANNEL, TOURNAMENT_EVENT } from 'src/api/tournament'
import { getEcho } from 'src/utils/echoClient'
import { pollTick, watchResync } from 'src/composables/usePlayRealtime'

const FALLBACK_POLL_MS = 20000

/**
 * Live updates for a tournament (host console, referee phone, spectator
 * board). Same model as the queue: a thin public `tournament.{code}` signal
 * → refetch, with polling + wake/online resync when the socket is down.
 * The payload carries `match_id`, so a referee screen can skip refetches
 * for other courts' rallies.
 */
export function useTournamentRealtime(codeRef, onUpdate, { debounceMs = 250 } = {}) {
  let channelName = null
  let timer = null
  let pollTimer = null
  let stopResync = () => {}

  const debounced = (payload) => {
    clearTimeout(timer)
    timer = setTimeout(() => onUpdate(payload || {}), debounceMs)
  }

  const unsubscribe = () => {
    clearTimeout(timer)
    clearInterval(pollTimer)
    pollTimer = null
    stopResync()
    stopResync = () => {}
    const echo = getEcho()
    if (echo && channelName) echo.leave(channelName)
    channelName = null
  }

  const subscribe = (code) => {
    unsubscribe()
    if (!code) return
    pollTimer = setInterval(pollTick(onUpdate), FALLBACK_POLL_MS)
    stopResync = watchResync(debounced)
    const echo = getEcho()
    if (!echo) return
    channelName = TOURNAMENT_CHANNEL(code)
    echo.channel(channelName).listen(TOURNAMENT_EVENT, debounced)
  }

  const stop = watch(codeRef, (code) => subscribe(code), { immediate: true })

  onBeforeUnmount(() => {
    stop()
    unsubscribe()
  })

  return unsubscribe
}
