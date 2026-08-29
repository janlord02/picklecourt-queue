<template>
  <div class="play-card">
    <div v-if="!leaderboard.length" class="empty-state">
      <div class="empty-state-title">No completed games yet</div>
      <div class="text-caption">The standings build as results come in.</div>
    </div>

    <template v-else>
      <!-- Podium: 2nd · 1st · 3rd -->
      <div v-if="podium" class="podium">
        <div
          v-for="entry in podium"
          :key="entry.row.player_id"
          class="podium-col"
          :class="{ 'podium-col--first': entry.place === 1 }"
        >
          <div class="podium-medal">{{ entry.medal }}</div>
          <div
            class="podium-name"
            :class="{ 'text-weight-bold': highlightPlayerId === entry.row.player_id }"
          >
            {{ entry.row.display_name }}
          </div>
          <div class="podium-record tnum">{{ entry.row.wins }}–{{ entry.row.losses }}</div>
          <div class="podium-rate">{{ winRate(entry.row) }}</div>
          <div class="podium-step" :style="{ height: `${entry.step}px` }">{{ entry.place }}</div>
        </div>
      </div>

      <!-- Everyone else -->
      <div
        v-for="(row, i) in rest"
        :key="row.player_id"
        class="list-row"
        :class="{ 'text-weight-bold': highlightPlayerId === row.player_id }"
      >
        <div class="rank">{{ i + restOffset + 1 }}</div>
        <div class="col">{{ row.display_name }}</div>
        <div class="text-caption text-grey-6 tnum">{{ winRate(row) }}</div>
        <div class="record tnum">{{ row.wins }}–{{ row.losses }}</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  leaderboard: { type: Array, default: () => [] },
  highlightPlayerId: { type: Number, default: null },
})

// 2nd · 1st · 3rd, first place tallest — needs a full top three.
const podium = computed(() => {
  const [first, second, third] = props.leaderboard
  if (!third) return null
  return [
    { row: second, place: 2, medal: '🥈', step: 56 },
    { row: first, place: 1, medal: '🏆', step: 80 },
    { row: third, place: 3, medal: '🥉', step: 42 },
  ]
})

const restOffset = computed(() => (podium.value ? 3 : 0))
const rest = computed(() => props.leaderboard.slice(restOffset.value))

function winRate(row) {
  if (!row.games_played) return ''
  return `${Math.round((row.wins / row.games_played) * 100)}%`
}
</script>

<style scoped>
.podium {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 4px 16px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 4px;
}

.podium-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-align: center;
}

.podium-medal {
  font-size: 26px;
}

.podium-col--first .podium-medal {
  font-size: 36px;
}

.podium-name {
  font-size: 13px;
  font-weight: 600;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.podium-col--first .podium-name {
  font-size: 15px;
  font-weight: 800;
}

.podium-record {
  font-weight: 800;
  font-size: 15px;
}

.podium-col--first .podium-record {
  font-size: 18px;
}

.podium-rate {
  font-size: 11.5px;
  color: var(--ink-muted);
  margin-bottom: 6px;
}

.podium-step {
  width: 100%;
  border-radius: 10px 10px 0 0;
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  border-bottom: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  color: var(--ink-faint);
}

.podium-col--first .podium-step {
  background: rgba(199, 240, 0, 0.22);
  border-color: rgba(140, 170, 0, 0.35);
  color: #3c5200;
}

.rank {
  width: 28px;
  text-align: center;
  color: var(--ink-faint);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  flex: none;
}

.record {
  font-weight: 700;
  min-width: 34px;
  text-align: right;
}
</style>
