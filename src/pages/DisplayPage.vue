<template>
  <div class="display-root">
    <div v-if="!state && loadError" class="flex flex-center column" style="min-height: 100vh; gap: 12px">
      <q-icon name="eva-alert-triangle-outline" size="42px" color="white" />
      <div class="text-white text-subtitle1">No session found for code “{{ code }}”</div>
      <div class="text-caption" style="color: rgba(255, 255, 255, 0.6)">
        Check the code in the URL, or the session may have ended.
      </div>
    </div>

    <div v-else-if="!state" class="flex flex-center" style="min-height: 100vh">
      <q-spinner size="48px" color="white" />
    </div>

    <div v-else-if="sessionGone || sessionCancelled" class="flex flex-center column" style="min-height: 100vh; gap: 12px">
      <q-icon name="eva-close-circle-outline" size="48px" color="white" />
      <div class="text-white text-h5 text-weight-bold">{{ state.session.name }}</div>
      <div class="text-subtitle1" style="color: rgba(255, 255, 255, 0.75)">
        {{ sessionCancelled ? 'This session was cancelled.' : 'This session is no longer available.' }}
      </div>
    </div>

    <template v-else>
      <header class="display-header">
        <div>
          <div class="display-brand">
            <img :src="logoUrl" alt="PickleCourt" class="display-logo" decoding="async" />
            <span class="brand-badge">QUEUE</span>
          </div>
          <div class="display-title">{{ state.session.name }}</div>
          <div class="display-sub">
            <template v-if="state.session.status === 'draft'">
              {{ state.session.date }} · starting soon
            </template>
            <template v-else-if="sessionEnded">
              {{ state.session.date }} · session ended ·
              {{ state.stats.games_completed }} games played
            </template>
            <template v-else>
              {{ state.session.date }} · {{ state.stats.waiting_count }} waiting ·
              {{ Math.round(state.stats.avg_game_seconds / 60) }} min avg game
            </template>
          </div>
        </div>
        <!-- Only invite scans while players can actually join -->
        <div v-if="joinable" class="display-qr">
          <canvas ref="qrCanvas" />
          <div class="display-code">{{ code }}</div>
          <div class="display-qr-sub">Scan to join</div>
        </div>
      </header>

      <!-- Voice announcements: the venue TV is the natural announcer -->
      <div v-if="stale" class="display-stale" role="status">
        <q-icon name="eva-wifi-off-outline" /> Reconnecting… last updated {{ lastUpdatedText }}
      </div>
      <button
        class="display-fs-btn"
        :aria-label="isFullscreen ? 'Exit full screen' : 'Full screen'"
        @click="toggleFullscreen"
      >
        <q-icon :name="isFullscreen ? 'eva-collapse-outline' : 'eva-expand-outline'" size="20px" />
      </button>
      <button
        class="display-voice-btn"
        :class="{ 'display-voice-btn--on': voiceSettings.enabled }"
        :aria-label="voiceSettings.enabled ? 'Voice announcements on' : 'Voice announcements off'"
        @click="voiceDialog = true"
      >
        <q-icon
          :name="voiceSettings.enabled ? 'eva-volume-up-outline' : 'eva-volume-off-outline'"
          size="20px"
        />
      </button>
      <VoiceSettingsSheet v-model="voiceDialog" />

      <!-- Ended: the board becomes the results screen -->
      <main v-if="sessionEnded" class="display-final">
        <div class="display-final-title">Final standings</div>

        <div v-if="finalPodium" class="display-podium">
          <div
            v-for="entry in finalPodium"
            :key="entry.row.player_id"
            class="display-podium-col"
            :class="{ 'display-podium-col--first': entry.place === 1 }"
          >
            <div class="display-podium-medal">{{ entry.medal }}</div>
            <div class="display-podium-name">{{ entry.row.display_name }}</div>
            <span v-if="entry.row.locked_partner_name" class="display-pair-tag display-pair-tag--podium">
              <q-icon name="eva-link-outline" />{{ entry.row.locked_partner_name }}
            </span>
            <div class="display-podium-record">{{ entry.row.wins }}–{{ entry.row.losses }}</div>
            <div class="display-podium-step" :style="{ height: `${entry.step}px` }">
              {{ entry.place }}
            </div>
          </div>
        </div>

        <div v-if="finalRest.length" class="display-final-list">
          <div v-for="(row, i) in finalRest" :key="row.player_id" class="display-final-row">
            <span class="display-final-rank">{{ i + (finalPodium ? 4 : 1) }}</span>
            <span class="display-final-name">{{ row.display_name }}</span>
            <span v-if="row.locked_partner_name" class="display-pair-tag">
              <q-icon name="eva-link-outline" />{{ row.locked_partner_name }}
            </span>
            <span class="display-final-record">{{ row.wins }}–{{ row.losses }}</span>
          </div>
        </div>

        <div v-if="!(state.leaderboard || []).length" class="display-final-empty">
          No games were recorded this session.
        </div>
      </main>

      <main v-else class="display-grid">
        <!-- Courts -->
        <section class="display-courts">
          <div
            v-for="{ court, match, onDeck } in courtRows"
            :key="court.id"
            class="display-court"
            :class="{ 'display-court--ondeck': onDeck }"
          >
            <div class="display-court-head">
              <span class="display-court-label">{{ court.label }}</span>
              <span v-if="onDeck" class="display-ondeck-badge">
                <q-icon name="eva-arrow-circle-right-outline" />On deck
              </span>
              <span v-else class="display-court-status">
                <i class="display-dot" :class="`display-dot--${court.status}`" />
                {{ courtStatusLabel(court.status) }}
              </span>
              <!-- Ticks on its own; the board itself doesn't re-render each second. -->
              <CourtTimer
                v-if="match?.status === 'playing' && match.started_at"
                plain
                class="display-court-timer"
                :started-at="match.started_at"
              />
            </div>
            <template v-if="match">
              <div class="display-court-body">
                <div
                  v-for="(team, t) in [match.team_a, match.team_b]"
                  :key="t"
                  class="display-team-wrap"
                >
                  <div v-if="t === 1" class="display-vs"><span>vs</span></div>
                  <div class="display-team">
                    <template v-for="(slot, i) in team" :key="slot.player_id">
                      <q-icon
                        v-if="i > 0 && isLockedPair(team)"
                        name="eva-link-outline"
                        class="display-team-link"
                        title="Locked partners"
                      />
                      <span v-else-if="i > 0"> + </span>{{ slot.display_name }}
                    </template>
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="display-court-body display-court-free">
              <span>Free</span>
            </div>
          </div>
        </section>

        <!-- Waiting line. Winners & Losers runs two separate feeder pools, so
             show them side by side; other formats are a single ordered list. -->
        <aside class="display-queue">
          <div class="display-queue-title">{{ queueTitle }}</div>

          <div v-if="isWinnersLosers" class="display-pool-cols">
            <div class="display-pool-col">
              <div class="display-pool-head display-pool-head--win">Winners</div>
              <div
                v-for="(entry, i) in winnersQueue"
                :key="entry.player_id"
                class="display-queue-row"
              >
                <span class="display-queue-pos">{{ i + 1 }}</span>
                <span class="display-queue-name">{{ nameOf(entry.player_id) }}</span>
                <span v-if="partnerNameOf(entry.player_id)" class="display-pair-tag">
                  <q-icon name="eva-link-outline" />{{ partnerNameOf(entry.player_id) }}
                </span>
                <span class="display-queue-wait">{{
                  formatSeconds(entry.effective_wait_seconds)
                }}</span>
              </div>
              <div v-if="!winnersQueue.length" class="display-sub q-mt-sm">Nobody yet</div>
              <div v-else-if="winnersTotal > winnersQueue.length" class="display-sub q-mt-sm">+{{ winnersTotal - winnersQueue.length }} more</div>
            </div>

            <div class="display-pool-col">
              <div class="display-pool-head display-pool-head--challenger">Challengers</div>
              <div
                v-for="(entry, i) in challengersQueue"
                :key="entry.player_id"
                class="display-queue-row"
              >
                <span class="display-queue-pos">{{ i + 1 }}</span>
                <span class="display-queue-name">{{ nameOf(entry.player_id) }}</span>
                <span v-if="partnerNameOf(entry.player_id)" class="display-pair-tag">
                  <q-icon name="eva-link-outline" />{{ partnerNameOf(entry.player_id) }}
                </span>
                <span class="display-queue-wait">{{
                  formatSeconds(entry.effective_wait_seconds)
                }}</span>
              </div>
              <div v-if="!challengersQueue.length" class="display-sub q-mt-sm">Nobody yet</div>
              <div v-else-if="challengersTotal > challengersQueue.length" class="display-sub q-mt-sm">+{{ challengersTotal - challengersQueue.length }} more</div>
            </div>
          </div>

          <template v-else>
            <div v-for="entry in queueRows" :key="entry.player_id" class="display-queue-row">
              <span class="display-queue-pos">{{ entry.position }}</span>
              <span class="display-queue-name">{{ nameOf(entry.player_id) }}</span>
              <span v-if="partnerNameOf(entry.player_id)" class="display-pair-tag">
                <q-icon name="eva-link-outline" />{{ partnerNameOf(entry.player_id) }}
              </span>
              <span class="display-queue-wait">{{
                formatSeconds(entry.effective_wait_seconds)
              }}</span>
            </div>
            <div v-if="!queueRows.length" class="display-sub q-mt-md">Queue is empty</div>
            <div v-else-if="queueTotal > queueRows.length" class="display-sub q-mt-sm">+{{ queueTotal - queueRows.length }} more waiting</div>
          </template>
        </aside>
      </main>

      <!-- Branding + lead-gen (Powered by · "Own a court?" promo) -->
      <DisplayPromo />
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import logoUrl from 'src/assets/logo.png'
import { getDisplayState } from 'src/api/openPlay'
import CourtTimer from 'src/components/CourtTimer.vue'
import DisplayPromo from 'src/components/DisplayPromo.vue'
import VoiceSettingsSheet from 'src/components/VoiceSettingsSheet.vue'
import { useAnnouncer, useCallAnnouncer } from 'src/composables/useAnnouncer'
import { usePlayDisplayRealtime } from 'src/composables/usePlayRealtime'
import { courtStatusLabel, formatSeconds } from 'src/utils/format'
import { isInWinnersPool, isLockedPair } from 'src/utils/pairs'
import { setKeepScreenOn } from 'src/utils/calledAlert'
import { joinUrl } from 'src/utils/publicUrl'

const route = useRoute()
const code = String(route.params.code || '').toUpperCase()
const state = ref(null)
const loadError = ref(false)
const qrCanvas = ref(null)

// Ended sessions: the board turns into a results screen (2nd · 1st · 3rd
// podium + everyone else) instead of courts/queue.
const sessionEnded = computed(() => state.value?.session?.status === 'ended')
const sessionCancelled = computed(() => state.value?.session?.status === 'cancelled')
const joinable = computed(() => ['open', 'live'].includes(state.value?.session?.status))
// Deleted after we had loaded it (404 on refresh).
const sessionGone = ref(false)
const lastUpdated = ref(null)
const finalPodium = computed(() => {
  const [first, second, third] = state.value?.leaderboard || []
  if (!third) return null
  return [
    { row: second, place: 2, medal: '🥈', step: 110 },
    { row: first, place: 1, medal: '🏆', step: 160 },
    { row: third, place: 3, medal: '🥉', step: 80 },
  ]
})
const finalRest = computed(() => {
  const rows = state.value?.leaderboard || []
  return rows.slice(finalPodium.value ? 3 : 0)
})
let qrDrawn = false

const queueRows = computed(() => (state.value?.queue || []).slice(0, 12))
const queueTotal = computed(() => (state.value?.queue || []).length)

const activeMatchesById = computed(
  () => new Map((state.value?.matches?.active || []).map((m) => [m.id, m])),
)
function matchFor(court) {
  if (!court.active_match_id) return null
  return activeMatchesById.value.get(court.active_match_id) || null
}

function nameOf(playerId) {
  return playersById.value.get(playerId)?.display_name || '—'
}

function playerFor(playerId) {
  return playersById.value.get(playerId) || null
}

// Locked doubles partner — shown as a pill so pairs read at a glance on the TV.
function partnerNameOf(playerId) {
  const player = playerFor(playerId)
  if (!player?.locked_partner_id) return null
  return nameOf(player.locked_partner_id)
}

// Winners & Losers runs two feeder pools; the board shows them separately.
const isWinnersLosers = computed(() => state.value?.session?.format === 'winners_losers')

// FIFO's queue really is "next up"; every other format is a waiting line, not
// a literal next-match prediction (Smart re-orders by priority, Winners &
// Losers pulls from a pool) — so name it honestly.
const queueTitle = computed(() =>
  state.value?.session?.format === 'fifo' ? 'Up next' : 'Waiting',
)

// A queued player feeds the winners pool when they won their last game,
// otherwise the challenger pool (new players included). A locked pair goes to
// winners only if both partners won — same rule as the engine — so a pair is
// never split across the two columns.
const playersById = computed(() => new Map((state.value?.players || []).map((p) => [p.id, p])))
const queuedIds = computed(() => new Set((state.value?.queue || []).map((e) => e.player_id)))
const inWinners = (e) => isInWinnersPool(playersById.value.get(e.player_id), playersById.value, queuedIds.value)
const winnersAll = computed(() => (state.value?.queue || []).filter(inWinners))
const challengersAll = computed(() => (state.value?.queue || []).filter((e) => !inWinners(e)))
const winnersQueue = computed(() => winnersAll.value.slice(0, 8))
const challengersQueue = computed(() => challengersAll.value.slice(0, 8))
const winnersTotal = computed(() => winnersAll.value.length)
const challengersTotal = computed(() => challengersAll.value.length)

// A staged/called match is the real "on deck" game for ANY format — the engine
// has already resolved the correct pool/balanced teams onto this court.
const courtRows = computed(() =>
  (state.value?.courts || []).map((court) => {
    const match = matchFor(court)
    return { court, match, onDeck: !!match && (match.status === 'staged' || match.status === 'called') }
  }),
)

// Court timers tick inside <CourtTimer>. The page only needs a slow clock
// for the "Reconnecting…" stale badge.
const nowTick = ref(Date.now())
const tickInterval = setInterval(() => (nowTick.value = Date.now()), 10000)

// ——— Voice announcements: the board speaks when a match becomes "called"
// and repeats every N seconds while it stays called.
const voiceDialog = ref(false)
const { settings: voiceSettings } = useAnnouncer()
const { sync: syncAnnouncer } = useCallAnnouncer(
  () => (state.value?.matches?.active || []).filter((m) => m.status === 'called'),
  () => !!state.value, // never prime on the empty pre-fetch state
)

async function refresh() {
  try {
    state.value = await getDisplayState(code)
    loadError.value = false
    sessionGone.value = false
    lastUpdated.value = Date.now()
    syncAnnouncer()
  } catch (e) {
    // Before the first good load, a 404 means the code is wrong/expired —
    // show that instead of spinning forever. After a good load, keep the
    // last good state on transient errors.
    if (e.response?.status === 404) {
      if (state.value) sessionGone.value = true
      else loadError.value = true
    }
  }
}

usePlayDisplayRealtime(
  computed(() => code),
  refresh,
)

// Draw the join QR once, after the header (and canvas) exist in the DOM.
watch(state, async (value) => {
  if (!value || qrDrawn) return
  await nextTick()
  if (!qrCanvas.value) return
  // Public address, never the page origin (https://localhost inside the app).
  // qrcode is loaded on demand — only boards that are joinable need it.
  import('qrcode')
    .then(({ default: QRCode }) => QRCode.toCanvas(qrCanvas.value, joinUrl(code), { width: 128, margin: 1 }))
    .then(() => {
      qrDrawn = true
    })
    .catch(() => {})
})

// Never silently show old data on a TV: badge it after a minute without an
// update (the realtime composable already polls/re-syncs on reconnect).
const stale = computed(() => !!lastUpdated.value && nowTick.value - lastUpdated.value > 60000)
const lastUpdatedText = computed(() =>
  lastUpdated.value ? new Date(lastUpdated.value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '',
)

// Kiosk: full screen on demand, keep the TV awake, and reload once a night
// so a board left on for days doesn't accumulate memory.
const isFullscreen = ref(false)
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.()
  else document.documentElement.requestFullscreen?.().catch(() => {})
}
const onFsChange = () => (isFullscreen.value = !!document.fullscreenElement)
const bootedAt = Date.now()

let pollTimer = null
let nightlyTimer = null
onMounted(() => {
  refresh()
  // Slow safety poll (sockets can look connected while dead).
  pollTimer = setInterval(refresh, 60000)
  document.addEventListener('fullscreenchange', onFsChange)
  setKeepScreenOn(true)
  nightlyTimer = setInterval(() => {
    if (Date.now() - bootedAt > 12 * 3600 * 1000 && new Date().getHours() === 4) window.location.reload()
  }, 10 * 60 * 1000)
})
onBeforeUnmount(() => {
  clearInterval(pollTimer)
  clearInterval(tickInterval)
  clearInterval(nightlyTimer)
  document.removeEventListener('fullscreenchange', onFsChange)
  setKeepScreenOn(false)
})
</script>

<style scoped>
/* Brand dark-teal board. Same design language as the app: one surface style
   (hairline borders, soft radius), status dots, hairline vs divider. */
.display-root {
  min-height: 100vh;
  background: #0c2b23;
  color: #f6fbf9;
  padding: 28px;
  font-family: 'Figtree', sans-serif;
}
.display-header {
  display: flex;
  flex-wrap: wrap; /* phone: QR drops below the title instead of clipping */
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 28px;
}

.display-header > div:first-child {
  flex: 1 1 260px;
  min-width: 0;
}

@media (max-width: 599px) {
  .display-root {
    padding: 16px;
  }

  .display-qr {
    margin: 0 auto; /* centered on its own row once wrapped */
  }
}
.display-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.display-logo {
  height: clamp(20px, 2.4vw, 28px);
  display: block;
}
.display-title {
  font-size: clamp(26px, 4vw, 46px);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.display-sub {
  color: #8fb5a9;
  font-size: clamp(12px, 1.4vw, 17px);
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

/* Voice button (fixed, bottom-right) */
.display-voice-btn {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 10;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #113329;
  color: #8fb5a9;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.display-voice-btn--on {
  color: #c7f000;
  border-color: rgba(199, 240, 0, 0.4);
}

/* QR card */
.display-qr {
  flex: none;
  text-align: center;
  background: #fff;
  color: #0c2b23;
  border-radius: 16px;
  padding: 12px 14px 10px;
}
.display-qr canvas {
  display: block;
  margin: 0 auto;
}
.display-code {
  font-weight: 800;
  letter-spacing: 0.22em;
  font-size: 16px;
  margin-top: 6px;
}
.display-qr-sub {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5f6f69;
}

/* ——— ended: final standings screen ——— */
.display-final {
  max-width: 860px;
  margin: 0 auto;
}

.display-final-title {
  font-size: clamp(15px, 1.6vw, 22px);
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8fb5a9;
  text-align: center;
  margin-bottom: 26px;
}

.display-podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: clamp(10px, 2vw, 24px);
  margin-bottom: 34px;
}

.display-podium-col {
  flex: 1;
  max-width: 250px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}

.display-podium-medal {
  font-size: clamp(30px, 4vw, 52px);
}

.display-podium-col--first .display-podium-medal {
  font-size: clamp(42px, 5.5vw, 72px);
}

.display-podium-name {
  font-size: clamp(15px, 1.9vw, 24px);
  font-weight: 700;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.display-podium-col--first .display-podium-name {
  font-size: clamp(18px, 2.4vw, 30px);
  font-weight: 800;
  color: #c7f000;
}

.display-podium-record {
  font-size: clamp(16px, 2vw, 26px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  margin-bottom: 10px;
}

.display-podium-step {
  width: 100%;
  border-radius: 14px 14px 0 0;
  background: #113329;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(22px, 3vw, 40px);
  font-weight: 800;
  color: rgba(255, 255, 255, 0.3);
}

.display-podium-col--first .display-podium-step {
  background: rgba(199, 240, 0, 0.18);
  color: #c7f000;
}

.display-final-list {
  background: #113329;
  border-radius: 16px;
  padding: 6px 22px;
}

.display-final-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 13px 0;
  font-size: clamp(15px, 1.8vw, 23px);
}

.display-final-row + .display-final-row {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.display-final-rank {
  width: 34px;
  color: #8fb5a9;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.display-final-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.display-final-record {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.display-final-empty {
  text-align: center;
  color: #8fb5a9;
  padding: 40px 0;
}

.display-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  align-items: start;
}
@media (max-width: 800px) {
  .display-grid {
    grid-template-columns: 1fr;
  }
}

/* Courts */
.display-courts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
  align-content: start;
}
.display-court {
  background: #113329;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  overflow: hidden;
}
.display-court-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.display-court-label {
  font-weight: 800;
  font-size: clamp(16px, 1.8vw, 22px);
}
.display-court-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: clamp(11px, 1.1vw, 13px);
  font-weight: 600;
  color: #8fb5a9;
}
.display-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #47695e;
}
.display-dot--playing {
  background: #4c9aff;
}
.display-dot--available {
  background: #c7f000;
}
.display-dot--reserved,
.display-dot--players_called {
  background: #f5b93c;
}
.display-dot--result_pending {
  background: #b39ddb;
}

.display-dot--maintenance,
.display-dot--closed {
  background: #f16063;
}
.display-court-timer {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: clamp(13px, 1.4vw, 17px);
  color: #c7f000;
}
.display-court-body {
  padding: 18px;
  text-align: center;
}
.display-team {
  font-size: clamp(17px, 2vw, 26px);
  font-weight: 700;
  line-height: 1.3;
}
.display-vs {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 10px 0;
}
.display-vs::before,
.display-vs::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}
.display-vs span {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #5f8f81;
}
.display-court-free {
  color: #c7f000;
  font-weight: 800;
  font-size: clamp(18px, 2vw, 26px);
  padding: 26px 18px;
  letter-spacing: 0.02em;
}

/* Queue */
.display-queue {
  background: #113329;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 18px 20px;
}
.display-queue-title {
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8fb5a9;
  margin-bottom: 8px;
}
.display-queue-row {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 10px 0;
  font-size: clamp(14px, 1.6vw, 21px);
  font-weight: 600;
}
.display-queue-row + .display-queue-row {
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
.display-queue-pos {
  width: 28px;
  color: #c7f000;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-align: center;
  flex: none;
}
.display-queue-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 0 1 auto;
  min-width: 0;
}
.display-queue-wait {
  margin-left: auto;
  color: #8fb5a9;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.display-pair-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(199, 240, 0, 0.14);
  color: #c7f000;
  font-size: clamp(11px, 1.1vw, 15px);
  font-weight: 700;
  white-space: nowrap;
  flex: none;
}
.display-pair-tag .q-icon {
  font-size: 1em;
}
.display-stale {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  background: #fff6db;
  color: #7a5300;
  font-weight: 700;
  font-size: clamp(13px, 1.2vw, 16px);
  padding: 6px 14px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.display-fs-btn {
  position: fixed;
  right: 24px;
  bottom: 84px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  cursor: pointer;
  z-index: 10;
}
.display-pair-tag--podium {
  max-width: 100%;
  overflow: hidden;
  margin-bottom: 4px;
}
.display-team-link {
  color: #c7f000;
  font-size: 0.85em;
  margin: 0 0.3em;
  vertical-align: -0.1em;
}
/* On-deck court: the real "up next" match for any format */
.display-court--ondeck {
  border-color: #c7f000;
  box-shadow:
    0 0 0 2px rgba(199, 240, 0, 0.5),
    0 0 24px rgba(199, 240, 0, 0.18);
}
.display-ondeck-badge {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 12px;
  border-radius: 999px;
  background: #c7f000;
  color: #17321f;
  font-size: clamp(11px, 1.1vw, 14px);
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.display-ondeck-badge .q-icon {
  font-size: 1.1em;
}

/* Waiting: two feeder pools for Winners & Losers */
.display-pool-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
}
.display-pool-col {
  min-width: 0;
}
.display-pool-head {
  font-weight: 800;
  font-size: clamp(11px, 1.1vw, 14px);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 4px 0 6px;
  border-bottom: 2px solid transparent;
}
.display-pool-head--win {
  color: #c7f000;
  border-bottom-color: rgba(199, 240, 0, 0.5);
}
.display-pool-head--challenger {
  color: #cfe3db;
  border-bottom-color: rgba(255, 255, 255, 0.18);
}
.display-pool-col .display-queue-row {
  gap: 8px;
  font-size: clamp(13px, 1.2vw, 17px);
  padding: 7px 0;
}
.display-pool-col .display-queue-pos {
  width: 20px;
}
/* Narrow W/L columns: the player's own name keeps priority; the partner pill
   shrinks (ellipsis) instead of squeezing the name to a letter. */
.display-pool-col .display-queue-name {
  flex: 0 0 auto;
  max-width: 55%;
}
.display-pool-col .display-pair-tag {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
