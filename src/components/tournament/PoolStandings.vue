<template>
  <div class="t-pools">
    <div v-for="(rows, pool) in standings" :key="pool" class="play-card q-pa-none q-mb-md">
      <div class="t-pool-head">
        <span class="text-weight-bold">{{ poolCount > 1 ? `Pool ${poolName(pool)}` : 'Standings' }}</span>
        <q-space />
        <span class="micro-label">W-L · games · +/-</span>
      </div>
      <div
        v-for="row in rows"
        :key="row.entry_id"
        class="t-pool-row"
        :class="{ 'is-advancing': advance && row.rank <= advance }"
      >
        <span class="t-rank tnum">{{ row.rank }}</span>
        <span class="col ellipsis">{{ entries[row.entry_id]?.name || '—' }}</span>
        <span class="tnum t-rec">{{ row.wins }}-{{ row.losses }}</span>
        <span class="tnum t-dim">{{ row.games_won }}-{{ row.games_lost }}</span>
        <span class="tnum t-diff" :class="row.diff > 0 ? 'text-positive' : row.diff < 0 ? 'text-negative' : ''">
          {{ row.diff > 0 ? '+' : '' }}{{ row.diff }}
        </span>
      </div>
    </div>
    <div v-if="advance" class="text-caption text-grey-7 q-px-xs">
      Top {{ advance }} of each pool advance (highlighted). Ties: head-to-head, then point difference, then points scored.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { poolName } from 'src/utils/tournament'

const props = defineProps({
  standings: { type: Object, required: true }, // pool → rows
  entries: { type: Object, required: true },
  advance: { type: Number, default: 0 },
})
const poolCount = computed(() => Object.keys(props.standings || {}).length)
</script>

<style scoped lang="scss">
.play-card {
  color: var(--ink); // own color: also sits on the dark TV monitor
}
.t-pool-head {
  display: flex;
  align-items: center;
  padding: 12px 14px 8px;
}
.t-pool-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-top: 1px solid var(--line);
  font-size: 14px;
  &.is-advancing { background: rgba(199, 240, 0, 0.12); }
}
.t-rank { width: 18px; color: var(--ink-faint); font-weight: 700; }
.t-rec { width: 36px; text-align: right; font-weight: 700; }
.t-dim { width: 36px; text-align: right; color: var(--ink-muted); }
.t-diff { width: 34px; text-align: right; }
</style>
