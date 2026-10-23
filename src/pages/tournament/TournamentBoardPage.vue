<template>
  <div class="board">
    <header class="board-top">
      <img :src="iconUrl" alt="" width="28" height="28" class="board-logo" />
      <div class="col ellipsis">
        <div class="board-title ellipsis">{{ t?.name || 'Tournament' }}</div>
        <div v-if="t" class="board-sub ellipsis">
          <template v-if="t.venue">{{ t.venue }} · </template>{{ t.start_date }}
        </div>
      </div>
      <span v-if="t?.status === 'live'" class="live-tag">Live</span>
    </header>

    <div v-if="notFound" class="board-empty">
      <q-icon name="eva-alert-circle-outline" size="40px" />
      <div class="text-h6 q-mt-sm">Tournament not found</div>
      <div>Check the code and try again.</div>
    </div>

    <div v-else-if="!t" class="board-empty"><q-spinner color="primary" size="40px" /></div>

    <main v-else class="board-main">
      <div v-if="t.divisions.length > 1" class="board-divisions">
        <button
          v-for="d in t.divisions"
          :key="d.id"
          type="button"
          class="board-chip"
          :class="{ 'is-active': d.id === divisionId }"
          @click="divisionId = d.id"
        >
          {{ d.name }}<span v-if="d.matches.some((m) => m.status === 'live')" class="board-dot" />
        </button>
      </div>

      <template v-if="division">
        <div class="board-heading">
          <span class="text-weight-bold">{{ division.name }}</span>
          <span class="text-grey-7"> · {{ formatLabel(division.format) }}</span>
        </div>

        <div v-if="division.podium.length" class="play-card board-podium q-mb-md">
          <div v-for="p in division.podium" :key="`${p.place}-${p.entry_id}`" class="board-podium__row">
            <span class="board-medal" :class="`board-medal--${p.place}`">{{ p.place }}</span>
            <span class="text-weight-bold ellipsis">{{ entries[p.entry_id]?.name }}</span>
            <q-space />
            <span class="text-caption text-grey-7">{{ PLACE_LABEL[p.place] }}</span>
          </div>
        </div>

        <template v-if="live.length">
          <div class="section-label">On court now</div>
          <div class="board-grid q-mb-md">
            <MatchCard v-for="m in live" :key="m.id" :match="m" :entries="entries" />
          </div>
        </template>

        <template v-if="upcoming.length">
          <div class="section-label">Up next</div>
          <div class="board-grid q-mb-md">
            <MatchCard v-for="m in upcoming" :key="m.id" :match="m" :entries="entries" />
          </div>
        </template>

        <template v-if="hasStandings">
          <div class="section-label">Standings</div>
          <PoolStandings
            :standings="division.standings"
            :entries="entries"
            :advance="division.format === 'pool_playoff' ? division.settings.advance_per_pool : 0"
          />
        </template>

        <template v-if="division.matches.some((m) => m.stage !== 'pool')">
          <div class="section-label">{{ division.format === 'pool_playoff' ? 'Playoff' : 'Bracket' }}</div>
          <BracketView :division="division" :entries="entries" />
        </template>

        <template v-if="recent.length">
          <div class="section-label">Results</div>
          <div class="board-grid">
            <MatchCard v-for="m in recent" :key="m.id" :match="m" :entries="entries" />
          </div>
        </template>

        <div v-if="!division.matches.length" class="play-card empty-state">
          <div class="empty-state-title">Draw not made yet</div>
          <div>{{ division.entries.length }} teams registered. Check back soon.</div>
        </div>
      </template>
    </main>

    <footer class="board-foot">
      Live scores by PickleCourt Queue · code <span class="tnum">{{ code }}</span>
      · <router-link :to="{ name: 'tournament-monitor', params: { code } }" class="board-tv">TV mode</router-link>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import iconUrl from 'src/assets/picklecourt-icon.png'
import MatchCard from 'components/tournament/MatchCard.vue'
import BracketView from 'components/tournament/BracketView.vue'
import PoolStandings from 'components/tournament/PoolStandings.vue'
import { getBoard } from 'src/api/tournament'
import { useTournamentRealtime } from 'src/composables/useTournamentRealtime'
import { PLACE_LABEL, entryMap, formatLabel } from 'src/utils/tournament'

const route = useRoute()
const code = String(route.params.code || '').toUpperCase()

const t = ref(null)
const notFound = ref(false)
const divisionId = ref(null)

const division = computed(() => t.value?.divisions.find((d) => d.id === divisionId.value) || null)
const entries = computed(() => entryMap(division.value))
const live = computed(() => division.value?.matches.filter((m) => m.status === 'live') || [])
const upcoming = computed(() => (division.value?.matches.filter((m) => m.status === 'ready') || []).slice(0, 6))
const recent = computed(() =>
  (division.value?.matches.filter((m) => m.status === 'completed') || [])
    .slice()
    .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))
    .slice(0, 8),
)
const hasStandings = computed(() => Object.keys(division.value?.standings || {}).length > 0)

async function load() {
  try {
    t.value = await getBoard(code)
    if (!division.value) {
      // Open on the division with something live, else the first.
      const liveDiv = t.value.divisions.find((d) => d.matches.some((m) => m.status === 'live'))
      divisionId.value = (liveDiv || t.value.divisions[0])?.id ?? null
    }
  } catch (e) {
    if (e.response?.status === 404) notFound.value = true
  }
}

useTournamentRealtime(computed(() => (t.value ? code : null)), () => load())
watch(
  () => t.value?.name,
  (n) => {
    if (n && typeof document !== 'undefined') document.title = `${n} · Live`
  },
)
onMounted(load)
</script>

<style scoped lang="scss">
.board {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--page);
  display: flex;
  flex-direction: column;
}
.board-top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: calc(10px + env(safe-area-inset-top)) 16px 10px;
  background: #0c2b23;
  color: #fff;
}
.board-logo { border-radius: 7px; display: block; }
.board-title { font-weight: 800; font-size: 17px; }
.board-sub { font-size: 12px; color: rgba(255, 255, 255, 0.65); }
.board-main {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}
.board-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--ink-muted);
  text-align: center;
  padding: 24px;
}
.board-divisions {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 12px;
}
.board-chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  font: inherit;
  font-weight: 600;
  font-size: 14px;
  color: var(--ink-muted);
  cursor: pointer;
  &.is-active { background: var(--brand-deep); color: #fff; border-color: var(--brand-deep); }
}
.board-dot { width: 7px; height: 7px; border-radius: 50%; background: #dc2626; }
.board-heading { font-size: 16px; margin-bottom: 8px; }
.board-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
.board-podium__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  & + & { border-top: 1px solid var(--line); }
}
.board-medal {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 13px;
  &--1 { background: #facc15; color: #713f12; }
  &--2 { background: #e2e8f0; color: #334155; }
  &--3 { background: #fdba74; color: #7c2d12; }
}
.board-tv {
  color: var(--brand-teal);
  font-weight: 600;
}
.board-foot {
  text-align: center;
  font-size: 12px;
  color: var(--ink-faint);
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
}
</style>
