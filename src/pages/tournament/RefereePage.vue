<template>
  <div class="ref-page">
    <!-- Top bar -->
    <header class="ref-top">
      <q-btn flat round class="tap-44" icon="eva-arrow-back-outline" color="white" aria-label="Back to the tournament" @click="back" />
      <div class="col ellipsis">
        <div class="ref-top__title ellipsis">
          <template v-if="match">M{{ match.number }} · {{ match.label }}</template>
          <template v-else>Loading…</template>
        </div>
        <div v-if="match" class="ref-top__sub ellipsis">
          {{ divisionName }}<template v-if="match.court"> · {{ match.court }}</template>
          · to {{ match.points_to }}, win by {{ match.win_by }}<template v-if="match.best_of > 1"> · best of {{ match.best_of }}</template>
        </div>
      </div>
      <q-btn v-if="match?.status === 'live'" flat round class="tap-44" icon="eva-swap-outline" color="white" aria-label="Swap sides on screen" @click="flipped = !flipped">
        <q-tooltip>Swap sides on screen (match the court)</q-tooltip>
      </q-btn>
    </header>

    <div v-if="!match" class="ref-center"><q-spinner color="white" size="40px" /></div>

    <!-- Not ready yet -->
    <div v-else-if="['pending', 'bye', 'void'].includes(match.status)" class="ref-center ref-note">
      <q-icon name="eva-clock-outline" size="40px" />
      <div class="text-h6 q-mt-sm">Not ready yet</div>
      <div>{{ match.status === 'pending' ? 'Waiting for the matches that feed it.' : 'This match is not played.' }}</div>
      <q-btn class="q-mt-lg" outline no-caps color="white" label="Back to matches" @click="back" />
    </div>

    <!-- Start: who serves first -->
    <div v-else-if="match.status === 'ready'" class="ref-start">
      <div class="ref-start__q">Who serves first?</div>
      <div class="ref-start__hint">Coin toss / rally for serve. {{ match.scoring === 'sideout' && match.team_size === 2 ? 'The first team starts at 0-0-2.' : '' }}</div>
      <button v-for="side in ['A', 'B']" :key="side" type="button" class="ref-start__team" :disabled="sending" @click="start(side)">
        <span class="ref-start__name">{{ name(side) }}</span>
        <span class="ref-start__players">{{ players(side) }}</span>
      </button>
      <q-select
        v-if="courts.length"
        v-model="court"
        :options="courts"
        dark
        outlined
        dense
        clearable
        label="Court"
        class="q-mt-md"
        style="width: 100%; max-width: 360px"
      />
    </div>

    <!-- Live scoring -->
    <template v-else-if="match.status === 'live' && match.live">
      <div class="ref-call">
        <div class="ref-call__label">{{ match.scoring === 'rally' ? 'Score' : 'Call' }}</div>
        <div class="ref-call__value tnum">{{ match.live.call }}</div>
        <div class="ref-call__meta">
          Game {{ gameNumber }}<template v-if="match.best_of > 1"> of {{ match.best_of }}</template>
          <span v-if="switchEnds" class="ref-switch">Switch ends</span>
        </div>
      </div>

      <div class="ref-teams">
        <button
          v-for="side in sides"
          :key="side"
          type="button"
          class="ref-team"
          :class="{ 'is-serving': match.live.serving === side }"
          :disabled="sending"
          :aria-label="`Rally won by ${name(side)}`"
          @click="rally(side)"
        >
          <!-- Doubles: one player per line so long names never get cut off. -->
          <div class="ref-team__name">
            <div v-for="(line, i) in nameLines(side)" :key="i" class="ellipsis">{{ line }}</div>
          </div>
          <div v-if="players(side)" class="ref-team__players ellipsis">{{ players(side) }}</div>
          <div class="ref-team__score tnum">{{ side === 'A' ? match.live.a : match.live.b }}</div>
          <div class="ref-team__games">
            <span v-for="n in gamesNeeded" :key="n" class="ref-pip" :class="{ 'is-won': n <= match.games_won[side] }" />
          </div>
          <div class="ref-team__serve">
            <template v-if="match.live.serving === side">
              Serving<template v-if="match.live.server"> · server {{ match.live.server }}</template>
            </template>
            <template v-else>&nbsp;</template>
          </div>
          <div class="ref-team__tap">Tap when they win the rally</div>
        </button>
      </div>

      <div class="ref-actions safe-bottom">
        <q-btn class="ref-action" unelevated no-caps color="white" text-color="primary" icon="eva-undo-outline" label="Undo" :disable="!match.can_undo || sending" @click="undo" />
        <q-btn class="ref-action" outline no-caps color="white" icon="eva-edit-2-outline" label="Fix score" :disable="sending" @click="openFix" />
      </div>
      <div v-if="match.games.length" class="ref-history">Games: {{ gamesLine(match) }}</div>
    </template>

    <!-- Finished -->
    <div v-else-if="match.status === 'completed'" class="ref-center ref-done">
      <q-icon name="eva-award-outline" size="48px" color="yellow-6" />
      <div class="ref-done__winner">{{ winnerName }}</div>
      <div class="ref-done__label">wins<template v-if="match.result_note === 'walkover'"> by walkover</template></div>
      <div v-if="match.games.length" class="ref-done__games tnum">{{ gamesLine(match) }}</div>
      <div class="ref-done__buttons">
        <q-btn v-if="match.can_undo" outline no-caps color="white" icon="eva-undo-outline" label="Undo last rally" :loading="sending" @click="undo" />
        <q-btn unelevated no-caps color="white" text-color="primary" label="Back to matches" @click="back" />
      </div>
      <!-- Court referee: keep this court going -->
      <q-btn
        v-if="courtMode"
        class="ref-next-court"
        unelevated
        no-caps
        color="lime"
        text-color="dark"
        icon-right="eva-arrow-forward-outline"
        :label="`Next match on ${courtMode}`"
        @click="nextOnMyCourt"
      />
      <div v-else-if="nextForMe" class="ref-next">
        <div class="micro-label" style="color: rgba(255,255,255,.6)">Next up</div>
        <q-btn flat no-caps color="white" :label="`M${nextForMe.number} · ${nextForMe.label} →`" @click="goTo(nextForMe)" />
      </div>
    </div>

    <!-- Fix score -->
    <q-dialog v-model="fixDialog" position="bottom">
      <q-card v-if="match?.live" class="sheet">
        <q-card-section class="q-pa-md form-stack">
          <div class="sheet-title">Fix the score</div>
          <div class="row q-col-gutter-sm">
            <div class="col-6"><q-input v-model.number="fix.a" type="number" min="0" outlined dense :label="name('A')" input-class="text-center tnum" /></div>
            <div class="col-6"><q-input v-model.number="fix.b" type="number" min="0" outlined dense :label="name('B')" input-class="text-center tnum" /></div>
          </div>
          <q-btn-toggle
            v-model="fix.serving"
            spread
            no-caps
            unelevated
            toggle-color="primary"
            color="white"
            text-color="primary"
            class="ref-toggle"
            :options="[{ label: `${name('A')} serving`, value: 'A' }, { label: `${name('B')} serving`, value: 'B' }]"
          />
          <q-btn-toggle
            v-if="match.live.server"
            v-model="fix.server"
            spread
            no-caps
            unelevated
            toggle-color="primary"
            color="white"
            text-color="primary"
            class="ref-toggle"
            :options="[{ label: 'Server 1', value: 1 }, { label: 'Server 2', value: 2 }]"
          />
          <q-btn class="big-action full-width" color="primary" unelevated no-caps label="Save" :loading="sending" @click="saveFix" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import * as T from 'src/api/tournament'
import { useTournamentRealtime } from 'src/composables/useTournamentRealtime'
import { haptic } from 'src/utils/native'
import { entryMap, gamesLine, slotName, upNext } from 'src/utils/tournament'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const tournamentId = Number(route.params.id)
const matchId = computed(() => Number(route.params.matchId))

const tournament = ref(null)
const match = ref(null)
const sending = ref(false)
// Opened from a court link (/tournaments/:id/court/:court): this phone runs that court.
const courtMode = computed(() => (typeof route.query.court === 'string' && route.query.court) || null)
const court = ref(courtMode.value)
// Left/right on screen should match what the referee sees on court.
const flipped = ref(false)

const division = computed(() => tournament.value?.divisions.find((d) => d.id === match.value?.division_id))
const entries = computed(() => entryMap(division.value))
const divisionName = computed(() => division.value?.name || '')
const courts = computed(() => tournament.value?.courts || [])
const sides = computed(() => (flipped.value ? ['B', 'A'] : ['A', 'B']))
const gamesNeeded = computed(() => Math.floor((match.value?.best_of || 1) / 2) + 1)
const gameNumber = computed(() => (match.value?.games.length || 0) + 1)
const winnerName = computed(() => entries.value[match.value?.winner_entry_id]?.name || '')

// Deciding game: ends switch when the leader reaches half (6 in a game to 11).
const switchEnds = computed(() => {
  const m = match.value
  if (!m?.live) return false
  const need = gamesNeeded.value
  const deciding = m.games_won.A === need - 1 && m.games_won.B === need - 1
  return deciding && Math.max(m.live.a, m.live.b) === Math.ceil(m.points_to / 2)
})

// After finishing: the next playable match on the same court, else the first ready one.
const nextForMe = computed(() => {
  if (!division.value) return null
  const ready = upNext(division.value).filter((m) => !m.busy)
  return ready.find((m) => match.value?.court && m.court === match.value.court) || ready[0] || null
})

const name = (side) => (match.value ? slotName(match.value, side, entries.value) : '')
// Team named after its players → stack them; a custom team name stays one line.
const nameLines = (side) => {
  const e = entries.value[side === 'A' ? match.value?.entry_a_id : match.value?.entry_b_id]
  if (e && e.players.map((p) => p.name).join(' / ') === e.name) return e.players.map((p) => p.name)
  return [name(side)]
}
const players = (side) => {
  const e = entries.value[side === 'A' ? match.value?.entry_a_id : match.value?.entry_b_id]
  if (!e) return ''
  const line = e.players.map((p) => p.name).join(' / ')
  return line === e.name ? '' : line
}

async function load() {
  try {
    tournament.value = await T.getTournament(tournamentId)
    const m = tournament.value.divisions.flatMap((d) => d.matches).find((x) => x.id === matchId.value)
    if (!m) {
      $q.notify({ type: 'warning', message: 'Match not found' })
      back()
      return
    }
    match.value = m
    if (court.value === null) court.value = m.court
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Could not load the match' })
    if (e.response?.status === 403) router.replace({ name: 'organizer-tournaments' })
  }
}

// Another court's rally doesn't concern this screen — except once we're
// done, when the "next up" suggestion should stay current.
useTournamentRealtime(computed(() => tournament.value?.code), (payload) => {
  if (sending.value) return
  if (!payload?.match_id || payload.match_id === matchId.value || match.value?.status !== 'live') load()
})

async function send(fn, feel = 'light') {
  if (sending.value) return
  sending.value = true
  haptic(feel)
  try {
    const before = match.value.status
    match.value = await fn()
    if (before === 'live' && match.value.status === 'completed') {
      haptic('success')
      load() // bracket moved on: refresh names for "next up"
    }
  } catch (e) {
    if (e.response?.status === 409 && e.response.data?.data) {
      match.value = e.response.data.data
      $q.notify({ type: 'warning', message: e.response.data.message, timeout: 2000 })
    } else {
      $q.notify({ type: 'negative', message: e.response?.data?.message || 'Not saved — check your connection and tap again' })
    }
  } finally {
    sending.value = false
  }
}

const start = (side) => send(() => T.startMatch(matchId.value, { first_server: side, court: court.value || null }), 'medium')
const rally = (side) => send(() => T.scoreRally(matchId.value, side, match.value.seq))
const undo = () => send(() => T.undoRally(matchId.value, match.value.seq), 'warning')

const fixDialog = ref(false)
const fix = reactive({ a: 0, b: 0, serving: 'A', server: 1 })
function openFix() {
  Object.assign(fix, { a: match.value.live.a, b: match.value.live.b, serving: match.value.live.serving, server: match.value.live.server || 1 })
  fixDialog.value = true
}
async function saveFix() {
  await send(() =>
    T.setMatchScore(matchId.value, {
      a: Number(fix.a) || 0,
      b: Number(fix.b) || 0,
      serving: fix.serving,
      server: match.value.live.server ? fix.server : null,
      seq: match.value.seq,
    }),
  )
  fixDialog.value = false
}

function back() {
  router.push({ name: 'organizer-tournament', params: { id: tournamentId }, query: match.value ? { d: match.value.division_id } : {} })
}
// The court page hands this court its next playable match (or waits for one).
function nextOnMyCourt() {
  router.replace({ name: 'tournament-court', params: { id: tournamentId, court: courtMode.value } })
}
function goTo(m) {
  router.replace({ name: 'tournament-referee', params: { id: tournamentId, matchId: m.id } })
  match.value = m
  court.value = m.court
}

onMounted(load)
</script>

<style scoped lang="scss">
.ref-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #0c2b23;
  color: #fff;
  display: flex;
  flex-direction: column;
  user-select: none;
  -webkit-user-select: none;
}
.ref-top {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: calc(6px + env(safe-area-inset-top)) 6px 6px 4px;
  border-bottom: 1px solid #1d4a3d;
}
.ref-top__title { font-weight: 700; font-size: 15px; }
.ref-top__sub { font-size: 12px; color: rgba(255, 255, 255, 0.6); }
.ref-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
}
.ref-note { color: rgba(255, 255, 255, 0.75); }

// ——— start ———
.ref-start {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px 16px;
}
.ref-start__q { font-size: 24px; font-weight: 800; }
.ref-start__hint { color: rgba(255, 255, 255, 0.6); font-size: 13px; text-align: center; margin-bottom: 8px; }
.ref-start__team {
  width: 100%;
  max-width: 360px;
  padding: 18px 16px;
  border-radius: 16px;
  border: 1px solid #2c8670;
  background: #12382e;
  color: #fff;
  font: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  &:active { background: #1d4a3d; }
}
.ref-start__name { font-size: 18px; font-weight: 800; }
.ref-start__players { font-size: 13px; color: rgba(255, 255, 255, 0.6); }

// ——— live ———
.ref-call {
  text-align: center;
  padding: 14px 16px 6px;
}
.ref-call__label { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255, 255, 255, 0.55); }
.ref-call__value { font-size: 44px; font-weight: 900; line-height: 1.1; letter-spacing: 0.02em; color: var(--lime); }
.ref-call__meta { font-size: 13px; color: rgba(255, 255, 255, 0.7); display: flex; gap: 8px; justify-content: center; align-items: center; }
.ref-switch {
  background: #f59e0b;
  color: #111;
  font-weight: 800;
  border-radius: 999px;
  padding: 1px 10px;
  animation: live-pulse 1.4s ease-in-out infinite;
}
.ref-teams {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 10px 12px;
}
.ref-team {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 260px;
  padding: 16px 10px;
  border-radius: 20px;
  border: 2px solid #1d4a3d;
  background: #12382e;
  color: #fff;
  font: inherit;
  cursor: pointer;
  min-width: 0;
  transition: transform 0.06s ease, background 0.15s ease;
  &:active { transform: scale(0.98); background: #1d4a3d; }
  &:disabled { opacity: 0.85; cursor: progress; }
  &.is-serving {
    border-color: var(--lime);
    box-shadow: 0 0 0 1px var(--lime) inset;
  }
}
.ref-team__name { font-size: 18px; font-weight: 800; max-width: 100%; line-height: 1.25; text-align: center; }
.ref-team__players { font-size: 12px; color: rgba(255, 255, 255, 0.6); max-width: 100%; min-height: 16px; }
.ref-team__score { font-size: clamp(72px, 22vw, 150px); font-weight: 900; line-height: 1; }
.ref-team__games { display: flex; gap: 6px; min-height: 10px; }
.ref-pip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  &.is-won { background: var(--lime); border-color: var(--lime); }
}
.ref-team__serve { font-size: 13px; font-weight: 700; color: var(--lime); min-height: 18px; }
.ref-team__tap { font-size: 11px; color: rgba(255, 255, 255, 0.4); }
.ref-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 4px 12px 12px;
}
.ref-action { height: 52px; border-radius: 14px; font-weight: 700; font-size: 15px; }
.ref-history { text-align: center; font-size: 13px; color: rgba(255, 255, 255, 0.6); padding-bottom: 12px; }
.ref-toggle { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }

// ——— done ———
.ref-done__winner { font-size: 28px; font-weight: 900; margin-top: 8px; }
.ref-done__label { color: rgba(255, 255, 255, 0.7); }
.ref-done__games { font-size: 20px; font-weight: 700; margin-top: 8px; color: var(--lime); }
.ref-done__buttons { display: flex; gap: 10px; margin-top: 24px; flex-wrap: wrap; justify-content: center; }
.ref-next { margin-top: 28px; }
.ref-next-court { margin-top: 28px; height: 56px; padding: 0 24px; border-radius: 14px; font-size: 17px; font-weight: 800; }

.safe-bottom { padding-bottom: calc(12px + env(safe-area-inset-bottom)); }

// Landscape phones: smaller call, side by side stays.
@media (max-height: 480px) {
  .ref-call { padding-top: 4px; }
  .ref-call__value { font-size: 30px; }
  .ref-team { min-height: 0; padding: 8px; }
  .ref-team__score { font-size: 64px; }
  .ref-team__tap { display: none; }
}
</style>
