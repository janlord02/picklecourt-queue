<template>
  <div class="mon">
    <header class="mon-top">
      <img :src="iconUrl" alt="" width="40" height="40" class="mon-logo" />
      <div class="col ellipsis">
        <div class="mon-title ellipsis">{{ t?.name || 'Tournament' }}</div>
        <div v-if="t?.venue" class="mon-sub ellipsis">{{ t.venue }}</div>
      </div>
      <span v-if="t?.status === 'live'" class="live-tag mon-live">Live</span>
      <div class="mon-clock tnum">{{ clock }}</div>
      <div class="mon-qr">
        <canvas ref="qrCanvas" width="84" height="84" />
        <div>
          <div class="mon-qr__label">Live scores on your phone</div>
          <div class="mon-qr__code tnum">{{ code }}</div>
        </div>
      </div>
      <q-btn flat round color="white" :icon="isFullscreen ? 'eva-collapse-outline' : 'eva-expand-outline'" aria-label="Full screen" class="mon-fs" @click="toggleFullscreen" />
    </header>

    <div v-if="notFound" class="mon-empty">Tournament not found — check the code.</div>
    <div v-else-if="!t" class="mon-empty"><q-spinner color="white" size="48px" /></div>

    <main v-else class="mon-main">
      <!-- Courts -->
      <section class="mon-courts" :style="{ '--cols': courtCols }">
        <div v-for="c in courtTiles" :key="c.court" class="mon-court" :class="{ 'is-live': c.live, 'is-open': !c.match }">
          <div class="mon-court__head">
            <span class="mon-court__name">{{ c.court }}</span>
            <q-space />
            <span v-if="c.live" class="live-tag">Live</span>
            <span v-else-if="c.match" class="mon-court__next">Up next</span>
            <span v-else class="mon-court__next">Open</span>
          </div>
          <template v-if="c.match">
            <div class="mon-court__label ellipsis">{{ c.division.name }} · {{ c.match.label }}</div>
            <div
              v-for="side in ['A', 'B']"
              :key="side"
              class="mon-team"
              :class="{ 'is-serving': c.match.live?.serving === side, 'is-winner': winnerSide(c.match) === side }"
            >
              <span class="mon-team__name ellipsis">{{ slotName(c.match, side, entryMap(c.division)) }}</span>
              <span class="mon-team__games tnum">
                <span v-for="(g, i) in c.match.games" :key="i">{{ side === 'A' ? g.a : g.b }}</span>
              </span>
              <span v-if="c.match.live" class="mon-team__score tnum">{{ side === 'A' ? c.match.live.a : c.match.live.b }}</span>
            </div>
            <div v-if="c.match.live" class="mon-court__call">
              <span class="tnum">{{ c.match.live.call }}</span>
              <span>Game {{ c.match.games.length + 1 }}<template v-if="c.match.best_of > 1"> of {{ c.match.best_of }}</template></span>
            </div>
          </template>
          <div v-else class="mon-court__idle">Waiting for the next match</div>
        </div>
      </section>

      <!-- Rotating spotlight: each division's bracket / standings / podium -->
      <section class="mon-spot">
        <div class="mon-spot__head">
          <span class="mon-spot__title">{{ spot?.division.name }}</span>
          <span class="mon-spot__kind">{{ spot?.title }}</span>
          <q-space />
          <span v-if="spots.length > 1" class="mon-dots">
            <span v-for="(s, i) in spots" :key="s.key" class="mon-dot" :class="{ 'is-on': i === spotIndex }" />
          </span>
        </div>
        <div ref="spotBox" class="mon-spot__body">
          <div
            v-if="spot"
            :key="spot.key"
            ref="spotContent"
            class="mon-spot__content"
            :style="{ transform: `scale(${spotScale})` }"
          >
            <div v-if="spot.kind === 'podium'" class="mon-podium">
              <div v-for="p in spot.division.podium" :key="`${p.place}-${p.entry_id}`" class="mon-podium__row" :class="`place-${p.place}`">
                <span class="mon-podium__place">{{ p.place }}</span>
                <span class="mon-podium__name">{{ entryMap(spot.division)[p.entry_id]?.name }}</span>
                <span class="mon-podium__label">{{ PLACE_LABEL[p.place] }}</span>
              </div>
            </div>
            <PoolStandings
              v-else-if="spot.kind === 'standings'"
              class="mon-standings"
              :standings="spot.division.standings"
              :entries="entryMap(spot.division)"
              :advance="spot.division.format === 'pool_playoff' ? spot.division.settings.advance_per_pool : 0"
            />
            <BracketView v-else-if="spot.kind === 'bracket'" :division="spot.division" :entries="entryMap(spot.division)" dark />
            <div v-else class="mon-court__idle">Draw coming soon · {{ spot.division.entries.length }} teams</div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import iconUrl from 'src/assets/picklecourt-icon.png'
import BracketView from 'components/tournament/BracketView.vue'
import PoolStandings from 'components/tournament/PoolStandings.vue'
import { getBoard } from 'src/api/tournament'
import { useTournamentRealtime } from 'src/composables/useTournamentRealtime'
import { boardUrl } from 'src/utils/publicUrl'
import { PLACE_LABEL, entryMap, slotName } from 'src/utils/tournament'

const SPOT_SECONDS = 15

const route = useRoute()
const code = String(route.params.code || '').toUpperCase()
const t = ref(null)
const notFound = ref(false)

async function load() {
  try {
    t.value = await getBoard(code)
  } catch (e) {
    if (e.response?.status === 404) notFound.value = true
  }
}
useTournamentRealtime(computed(() => (t.value ? code : null)), () => load())

const winnerSide = (m) => (m.status === 'completed' && m.winner_entry_id ? (m.winner_entry_id === m.entry_a_id ? 'A' : 'B') : null)

// ——— courts: live match on each court, else the next match assigned to it ———
const allMatches = computed(() =>
  (t.value?.divisions || []).flatMap((d) => d.matches.map((m) => ({ match: m, division: d }))),
)
const courtTiles = computed(() => {
  const courts = [...(t.value?.courts || [])]
  // Live matches on a court that isn't in the list still get a tile.
  for (const { match } of allMatches.value) {
    const name = match.status === 'live' ? match.court || 'No court' : null
    if (name && !courts.includes(name)) courts.push(name)
  }
  return courts.map((court) => {
    const onCourt = allMatches.value.filter((x) => (x.match.court || 'No court') === court)
    const live = onCourt.find((x) => x.match.status === 'live')
    const next = onCourt.filter((x) => x.match.status === 'ready').sort((a, b) => a.match.number - b.match.number)[0]
    const pick = live || next
    return { court, live: !!live, match: pick?.match || null, division: pick?.division || null }
  })
})
const courtCols = computed(() => Math.min(4, Math.max(1, courtTiles.value.length)))

// ——— spotlight rotation ———
const spots = computed(() =>
  (t.value?.divisions || []).flatMap((d) => {
    const list = []
    if (d.podium.length && d.status === 'completed') list.push({ key: `${d.id}-podium`, kind: 'podium', title: 'Winners', division: d })
    if (Object.keys(d.standings || {}).length) list.push({ key: `${d.id}-standings`, kind: 'standings', title: 'Standings', division: d })
    if (d.matches.some((m) => m.stage !== 'pool')) {
      list.push({ key: `${d.id}-bracket`, kind: 'bracket', title: d.format === 'pool_playoff' ? 'Playoff' : 'Bracket', division: d })
    }
    if (!list.length) list.push({ key: `${d.id}-soon`, kind: 'soon', title: '', division: d })
    return list
  }),
)
const spotIndex = ref(0)
const spot = computed(() => spots.value[spotIndex.value % Math.max(1, spots.value.length)] || null)
let rotateTimer = null

// Scale the spotlight to fit the space below the courts (TVs never scroll).
const spotBox = ref(null)
const spotContent = ref(null)
const spotScale = ref(1)
function fit() {
  const box = spotBox.value
  const content = spotContent.value
  if (!box || !content) return
  const w = content.scrollWidth
  const h = content.scrollHeight
  spotScale.value = w && h ? Math.min(1.6, box.clientWidth / w, box.clientHeight / h) : 1
}
watch([spot, t], () => nextTick(() => setTimeout(fit, 60)))

// ——— chrome: clock, QR, fullscreen, keep the screen awake ———
const clock = ref('')
let clockTimer = null
const tick = () => (clock.value = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))

const qrCanvas = ref(null)
watch(qrCanvas, (el) => {
  if (!el) return
  import('qrcode')
    .then(({ default: QRCode }) => QRCode.toCanvas(el, boardUrl(code), { width: 84, margin: 1 }))
    .catch(() => {})
})

const isFullscreen = ref(false)
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.()
  else document.documentElement.requestFullscreen?.().catch(() => {})
}
const onFsChange = () => (isFullscreen.value = !!document.fullscreenElement)

let wakeLock = null
async function keepAwake() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen')
  } catch {
    // not supported / not allowed — the board still works
  }
}
const onVisible = () => document.visibilityState === 'visible' && keepAwake()

onMounted(() => {
  load()
  tick()
  clockTimer = setInterval(tick, 15000)
  rotateTimer = setInterval(() => {
    spotIndex.value = spots.value.length ? (spotIndex.value + 1) % spots.value.length : 0
  }, SPOT_SECONDS * 1000)
  window.addEventListener('resize', fit)
  document.addEventListener('fullscreenchange', onFsChange)
  document.addEventListener('visibilitychange', onVisible)
  keepAwake()
  document.title = 'Live monitor · PickleCourt Queue'
})
onBeforeUnmount(() => {
  clearInterval(clockTimer)
  clearInterval(rotateTimer)
  window.removeEventListener('resize', fit)
  document.removeEventListener('fullscreenchange', onFsChange)
  document.removeEventListener('visibilitychange', onVisible)
  wakeLock?.release?.().catch(() => {})
})
</script>

<style scoped lang="scss">
.mon {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #071d17;
  color: #fff;
}
.mon-top {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #0c2b23;
  border-bottom: 1px solid #1d4a3d;
}
.mon-logo { border-radius: 9px; }
.mon-title { font-size: clamp(20px, 2.2vw, 34px); font-weight: 800; }
.mon-sub { font-size: 14px; color: rgba(255, 255, 255, 0.6); }
.mon-live { font-size: 15px; padding: 3px 12px; }
.mon-clock { font-size: clamp(18px, 1.8vw, 28px); font-weight: 700; color: rgba(255, 255, 255, 0.85); }
.mon-qr {
  display: flex;
  align-items: center;
  gap: 10px;
  canvas { border-radius: 8px; background: #fff; width: 84px; height: 84px; }
}
.mon-qr__label { font-size: 12px; color: rgba(255, 255, 255, 0.6); max-width: 110px; line-height: 1.2; }
.mon-qr__code { font-size: 20px; font-weight: 800; letter-spacing: 0.1em; color: var(--lime); }
.mon-fs { opacity: 0.5; &:hover { opacity: 1; } }
.mon-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: rgba(255, 255, 255, 0.7);
}
.mon-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 20px 18px;
}

// ——— courts ———
.mon-courts {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: 12px;
  flex: none;
}
.mon-court {
  background: #0f3329;
  border: 1px solid #1d4a3d;
  border-radius: 18px;
  padding: 12px 16px;
  min-width: 0;
  &.is-live { border-color: #ef4444; box-shadow: 0 0 0 1px #ef4444 inset; }
  &.is-open { opacity: 0.6; }
}
.mon-court__head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.mon-court__name { font-size: clamp(16px, 1.4vw, 22px); font-weight: 800; }
.mon-court__next { font-size: 13px; font-weight: 700; color: rgba(255, 255, 255, 0.55); text-transform: uppercase; letter-spacing: 0.06em; }
.mon-court__label { font-size: 13px; color: rgba(255, 255, 255, 0.6); margin-bottom: 6px; }
.mon-court__idle { font-size: 15px; color: rgba(255, 255, 255, 0.5); padding: 12px 0; }
.mon-team {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  &.is-winner .mon-team__name { color: var(--lime); }
}
.mon-team__name {
  flex: 1;
  min-width: 0;
  font-size: clamp(16px, 1.5vw, 24px);
  font-weight: 700;
}
.mon-team.is-serving .mon-team__name::after {
  content: '';
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--lime);
  margin-left: 8px;
  vertical-align: middle;
}
.mon-team__games {
  display: flex;
  gap: 8px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.55);
}
.mon-team__score {
  min-width: 1.6em;
  text-align: right;
  font-size: clamp(30px, 3vw, 52px);
  font-weight: 900;
  line-height: 1;
}
.mon-court__call {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  span:first-child { color: var(--lime); font-weight: 800; font-size: 16px; }
}

// ——— spotlight ———
.mon-spot {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #0b271f;
  border: 1px solid #1d4a3d;
  border-radius: 18px;
  padding: 12px 16px;
}
.mon-spot__head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; flex: none; }
.mon-spot__title { font-size: clamp(18px, 1.6vw, 26px); font-weight: 800; }
.mon-spot__kind { font-size: 15px; color: var(--lime); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
.mon-dots { display: flex; gap: 6px; }
.mon-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  &.is-on { background: var(--lime); }
}
.mon-spot__body {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}
.mon-spot__content {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
  width: max-content;
  animation: mon-in 0.4s ease;
  // Natural size inside the scaler (no inner scrolling on a TV).
  :deep(.t-bracket__scroll) { overflow: visible; margin: 0; padding: 0; }
  :deep(.t-bracket section) { margin-bottom: 14px; }
}
.mon-standings {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 420px;
  gap: 14px;
  :deep(.text-caption) { color: rgba(255, 255, 255, 0.6) !important; }
}
.mon-podium { display: grid; gap: 12px; min-width: 520px; }
.mon-podium__row {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #0f3329;
  border-radius: 16px;
  padding: 14px 20px;
}
.mon-podium__place {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 900;
  background: #e2e8f0;
  color: #334155;
}
.place-1 .mon-podium__place { background: #facc15; color: #713f12; }
.place-3 .mon-podium__place { background: #fdba74; color: #7c2d12; }
.mon-podium__name { flex: 1; font-size: 26px; font-weight: 800; }
.mon-podium__label { color: rgba(255, 255, 255, 0.6); font-size: 16px; }
@keyframes mon-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
