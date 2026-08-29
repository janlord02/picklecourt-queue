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

    <template v-else>
      <header class="display-header">
        <div>
          <div class="display-brand">
            <img :src="logoUrl" alt="PickleCourt" class="display-logo" />
            <span class="brand-badge">QUEUE</span>
          </div>
          <div class="display-title">{{ state.session.name }}</div>
          <div class="display-sub">
            <template v-if="sessionEnded">
              {{ state.session.date }} · session ended ·
              {{ state.stats.games_completed }} games played
            </template>
            <template v-else>
              {{ state.session.date }} · {{ state.stats.waiting_count }} waiting ·
              {{ Math.round(state.stats.avg_game_seconds / 60) }} min avg game
            </template>
          </div>
        </div>
        <div v-if="!sessionEnded" class="display-qr">
          <canvas ref="qrCanvas" />
          <div class="display-code">{{ code }}</div>
          <div class="display-qr-sub">Scan to join</div>
        </div>
      </header>

      <!-- Voice announcements: the venue TV is the natural announcer -->
      <button
        class="display-voice-btn"
        :class="{ 'display-voice-btn--on': voiceSettings.enabled }"
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
          <div v-for="court in state.courts" :key="court.id" class="display-court">
            <div class="display-court-head">
              <span class="display-court-label">{{ court.label }}</span>
              <span class="display-court-status">
                <i class="display-dot" :class="`display-dot--${court.status}`" />
                {{ courtStatusLabel(court.status) }}
              </span>
              <span v-if="elapsedFor(court)" class="display-court-timer">{{
                elapsedFor(court)
              }}</span>
            </div>
            <template v-if="matchFor(court)">
              <div class="display-court-body">
                <div class="display-team">{{ teamNames(matchFor(court).team_a) }}</div>
                <div class="display-vs"><span>vs</span></div>
                <div class="display-team">{{ teamNames(matchFor(court).team_b) }}</div>
              </div>
            </template>
            <div v-else class="display-court-body display-court-free">
              <span>Free</span>
            </div>
          </div>
        </section>

        <!-- Queue -->
        <aside class="display-queue">
          <div class="display-queue-title">Up next</div>
          <div v-for="entry in queueRows" :key="entry.player_id" class="display-queue-row">
            <span class="display-queue-pos">{{ entry.position }}</span>
            <span class="display-queue-name">{{ nameOf(entry.player_id) }}</span>
            <span class="display-queue-wait">{{ formatSeconds(entry.effective_wait_seconds) }}</span>
          </div>
          <div v-if="!queueRows.length" class="display-sub q-mt-md">Queue is empty</div>
        </aside>
      </main>
    </template>
  </div>
</template>

<script setup>
import QRCode from 'qrcode'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import logoUrl from 'src/assets/logo.png'
import { getDisplayState } from 'src/api/openPlay'
import VoiceSettingsSheet from 'src/components/VoiceSettingsSheet.vue'
import { useAnnouncer, useCallAnnouncer } from 'src/composables/useAnnouncer'
import { usePlayDisplayRealtime } from 'src/composables/usePlayRealtime'
import { courtStatusLabel, formatSeconds } from 'src/utils/format'

const route = useRoute()
const code = String(route.params.code || '').toUpperCase()
const state = ref(null)
const loadError = ref(false)
const qrCanvas = ref(null)

// Ended sessions: the board turns into a results screen (2nd · 1st · 3rd
// podium + everyone else) instead of courts/queue.
const sessionEnded = computed(() => state.value?.session?.status === 'ended')
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

function matchFor(court) {
  if (!court.active_match_id) return null
  return (state.value?.matches?.active || []).find((m) => m.id === court.active_match_id) || null
}

function teamNames(team) {
  return (team || []).map((slot) => slot.display_name).join(' + ')
}

function nameOf(playerId) {
  return state.value?.players?.find((p) => p.id === playerId)?.display_name || '—'
}

// Live court timers
const nowTick = ref(Date.now())
const tickInterval = setInterval(() => (nowTick.value = Date.now()), 1000)

function elapsedFor(court) {
  const match = matchFor(court)
  if (!match || match.status !== 'playing' || !match.started_at) return ''
  const seconds = Math.max(0, Math.floor((nowTick.value - new Date(match.started_at)) / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

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
    syncAnnouncer()
  } catch (e) {
    // Before the first good load, a 404 means the code is wrong/expired —
    // show that instead of spinning forever. After a good load, keep the
    // last good state on transient errors.
    if (!state.value && e.response?.status === 404) {
      loadError.value = true
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
  const joinUrl = `${window.location.origin}/join/${code}`
  QRCode.toCanvas(qrCanvas.value, joinUrl, { width: 128, margin: 1 })
    .then(() => {
      qrDrawn = true
    })
    .catch(() => {})
})

let pollTimer = null
onMounted(() => {
  refresh()
  // Fallback poll for venues with flaky sockets.
  pollTimer = setInterval(refresh, 30000)
})
onBeforeUnmount(() => {
  clearInterval(pollTimer)
  clearInterval(tickInterval)
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
}
.display-queue-wait {
  margin-left: auto;
  color: #8fb5a9;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
