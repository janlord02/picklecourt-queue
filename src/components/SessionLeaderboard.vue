<template>
  <div class="play-card">
    <div v-if="!leaderboard.length && !pairs.length" class="empty-state">
      <span class="empty-state-icon"><q-icon name="eva-award-outline" size="28px" /></span>
      <div class="empty-state-title">No completed games yet</div>
      <div class="text-caption">The standings build as results come in.</div>
    </div>

    <template v-else>
      <!-- One section per court group (each ranked on its own), or a single
           section when the session has no groups. -->
      <section v-for="sec in (leaderboard.length ? sections : [])" :key="sec.key" class="lb-section" :class="{ 'lb-section--grouped': grouped }">
        <div v-if="grouped" class="lb-section-head">
          <GroupChip v-if="sec.group" :group="sec.group" size="md" />
          <span v-else class="lb-section-none">No group</span>
          <span class="lb-section-count">{{ sec.rows.length }} {{ sec.rows.length === 1 ? 'player' : 'players' }}</span>
        </div>

        <!-- Podium: 2nd · 1st · 3rd -->
        <div v-if="podiumOf(sec.rows)" class="podium">
          <div
            v-for="entry in podiumOf(sec.rows)"
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
            <span v-if="entry.row.locked_partner_name" class="pair-tag podium-pair">
              <q-icon name="eva-link-outline" />{{ entry.row.locked_partner_name }}
            </span>
            <GroupChip v-if="!grouped && entry.row.play_group_id" :group="groupsById.get(entry.row.play_group_id)" />
            <div class="podium-record tnum">{{ entry.row.wins }}–{{ entry.row.losses }}</div>
            <div class="podium-rate">{{ winRate(entry.row) }}</div>
            <div class="podium-step" :style="{ height: `${entry.step}px` }">{{ entry.place }}</div>
          </div>
        </div>

        <!-- Everyone else in this section -->
        <div
          v-for="(row, i) in restOf(sec.rows)"
          :key="row.player_id"
          class="list-row"
          :class="{ 'text-weight-bold': highlightPlayerId === row.player_id }"
        >
          <div class="rank">{{ i + (podiumOf(sec.rows) ? 3 : 0) + 1 }}</div>
          <div class="col">
            {{ row.display_name }}
            <span v-if="row.locked_partner_name" class="pair-tag q-ml-xs">
              <q-icon name="eva-link-outline" />{{ row.locked_partner_name }}
            </span>
            <GroupChip v-if="!grouped && row.play_group_id" :group="groupsById.get(row.play_group_id)" class="q-ml-xs" />
          </div>
          <div class="text-caption text-grey-6 tnum">{{ winRate(row) }}</div>
          <div class="record tnum">{{ row.wins }}–{{ row.losses }}</div>
        </div>
      </section>

      <!-- Locked pairs aren't ranked (organizer can turn that on in settings). -->
      <div v-if="pairs.length" class="lb-unranked">
        <div class="lb-unranked-head">
          <q-icon name="eva-link-outline" size="15px" />
          Locked pairs · not ranked
        </div>
        <div v-for="p in pairs" :key="p.key" class="lb-unranked-row">
          <span class="col">{{ p.names }}</span>
          <GroupChip v-if="p.play_group_id" :group="groupsById.get(p.play_group_id)" class="q-mr-sm" />
          <span class="record tnum">{{ p.wins }}–{{ p.losses }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import GroupChip from 'src/components/GroupChip.vue'
import { standingsSections, podiumOf, unrankedPairs } from 'src/utils/standings'

const props = defineProps({
  leaderboard: { type: Array, default: () => [] },
  // Court segregation group lookup (Map id → group).
  groupsById: { type: Map, default: () => new Map() },
  highlightPlayerId: { type: Number, default: null },
  // Locked pairs left out of the winners (state.leaderboard_unranked).
  unranked: { type: Array, default: () => [] },
})

// Winners per court group when the session uses groups.
const sections = computed(() => standingsSections(props.leaderboard, [...props.groupsById.values()]))
const grouped = computed(() => sections.value.length > 1 || !!sections.value[0]?.group || !!sections.value[0]?.ungrouped)
const restOf = (rows) => rows.slice(podiumOf(rows) ? 3 : 0)
const pairs = computed(() => unrankedPairs(props.unranked))

function winRate(row) {
  if (!row.games_played) return ''
  return `${Math.round((row.wins / row.games_played) * 100)}%`
}
</script>

<style scoped>
.lb-unranked {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
}
.lb-unranked-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8a9893;
  padding: 0 4px 6px;
}
.lb-unranked-row {
  display: flex;
  align-items: center;
  padding: 8px 4px;
  font-size: 14px;
  color: #5f6f69;
}
.lb-section--grouped + .lb-section--grouped {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 2px solid var(--line);
}
.lb-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 4px 4px;
}
.lb-section-none {
  font-size: 13px;
  font-weight: 700;
  color: #5f6f69;
}
.lb-section-count {
  font-size: 12px;
  color: #8a9893;
}
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

.podium-pair {
  max-width: 100%;
  overflow: hidden;
  margin-bottom: 4px;
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
