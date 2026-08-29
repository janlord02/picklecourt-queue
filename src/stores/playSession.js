import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as openPlay from 'src/api/openPlay'
import { useAuthStore } from 'src/stores/auth'

const ACTIVE_KEY = 'play_active_session'

/**
 * The live session a player/organizer is inside. The server owns all queue
 * state — this store only mirrors GET /play/sessions/{id}/state and refetches
 * when a `.play.updated` broadcast bumps the version (see
 * composables/usePlayRealtime.js).
 */
export const usePlaySessionStore = defineStore('playSession', () => {
  const sessionId = ref(Number(localStorage.getItem(ACTIVE_KEY)) || null)
  const state = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const auth = useAuthStore()

  const session = computed(() => state.value?.session || null)
  const courts = computed(() => state.value?.courts || [])
  const players = computed(() => state.value?.players || [])
  const queue = computed(() => state.value?.queue || [])
  const activeMatches = computed(() => state.value?.matches?.active || [])
  const recentMatches = computed(() => state.value?.matches?.recent || [])
  const leaderboard = computed(() => state.value?.leaderboard || [])
  const stats = computed(() => state.value?.stats || {})
  const canManage = computed(() => !!state.value?.can_manage)

  const myPlayer = computed(() => {
    const userId = auth.user?.id
    if (!userId) return null
    return players.value.find((p) => p.user_id === userId) || null
  })
  const myQueueEntry = computed(() =>
    myPlayer.value ? queue.value.find((q) => q.player_id === myPlayer.value.id) || null : null,
  )
  const myActiveMatch = computed(() => {
    if (!myPlayer.value) return null
    return (
      activeMatches.value.find((m) =>
        [...(m.team_a || []), ...(m.team_b || [])].some(
          (slot) => slot.player_id === myPlayer.value.id,
        ),
      ) || null
    )
  })

  function setActive(id) {
    sessionId.value = id ? Number(id) : null
    state.value = null
    if (sessionId.value) {
      localStorage.setItem(ACTIVE_KEY, String(sessionId.value))
    } else {
      localStorage.removeItem(ACTIVE_KEY)
    }
  }

  // Concurrent fetches are routine (action refresh + broadcast refresh +
  // poll); only the newest response may win, or a stalled early request
  // would overwrite fresher state with stale data.
  let fetchSeq = 0

  async function fetchState() {
    if (!sessionId.value) return null
    const seq = ++fetchSeq
    const forId = sessionId.value
    loading.value = !state.value // spinner only on first load, not live refreshes
    error.value = null
    try {
      const data = await openPlay.getState(forId)
      if (seq === fetchSeq && sessionId.value === forId) {
        state.value = data
      }
      return data
    } catch (e) {
      if (seq !== fetchSeq || sessionId.value !== forId) throw e // stale failure — ignore
      error.value = e.response?.data?.message || e.message
      if (e.response?.status === 403 || e.response?.status === 404) {
        setActive(null)
      }
      throw e
    } finally {
      if (seq === fetchSeq) {
        loading.value = false
      }
    }
  }

  async function join(id, payload = {}) {
    const player = await openPlay.joinSession(id, payload)
    setActive(id)
    await fetchState().catch(() => {})
    return player
  }

  async function checkIn() {
    const player = await openPlay.checkIn(sessionId.value)
    await fetchState().catch(() => {})
    return player
  }

  async function myAction(action, extra = {}) {
    if (!myPlayer.value) throw new Error('Not in this session')
    const result = await openPlay.playerAction(sessionId.value, myPlayer.value.id, action, extra)
    await fetchState().catch(() => {})
    return result
  }

  async function ready() {
    // The takeover can appear (personal push) before the state refetch has
    // landed — refetch once rather than silently doing nothing.
    if (!myActiveMatch.value) {
      await fetchState().catch(() => {})
    }
    if (!myActiveMatch.value) {
      throw new Error('Could not find your match yet — try again in a second.')
    }
    return openPlay.readyMatch(myActiveMatch.value.id)
  }

  return {
    sessionId,
    state,
    loading,
    error,
    session,
    courts,
    players,
    queue,
    activeMatches,
    recentMatches,
    leaderboard,
    stats,
    canManage,
    myPlayer,
    myQueueEntry,
    myActiveMatch,
    setActive,
    fetchState,
    join,
    checkIn,
    myAction,
    ready,
  }
})
