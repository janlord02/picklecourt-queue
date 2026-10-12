<template>
  <div class="lineup">
    <!-- Whole game is one group and no court header shows it (player
         screens): one chip for the lineup. -->
    <div v-if="lineupGroup && courtGroupId === undefined" class="lineup-group">
      <GroupChip :group="lineupGroup" size="md" />
    </div>
    <div class="lineup-team">
      <template v-for="(slot, i) in match.team_a" :key="`a-${slot.player_id}`">
        <q-icon
          v-if="i > 0 && isLockedPair(match.team_a)"
          name="eva-link-outline"
          class="pair-link"
          title="Locked partners"
        />
        <span v-else-if="i > 0" class="text-grey-5"> · </span>
        <span>{{ slot.display_name }}</span>
        <GroupChip v-if="showSlotGroup(slot)" :group="groupsById.get(slot.play_group_id)" compact class="q-ml-xs" />
        <q-icon
          v-if="showReady && slot.ready_at"
          name="eva-checkmark-circle-2"
          color="positive"
          size="15px"
          class="q-ml-xs"
          style="vertical-align: -2px"
        />
      </template>
    </div>
    <div class="lineup-vs"><span>vs</span></div>
    <div class="lineup-team">
      <template v-for="(slot, i) in match.team_b" :key="`b-${slot.player_id}`">
        <q-icon
          v-if="i > 0 && isLockedPair(match.team_b)"
          name="eva-link-outline"
          class="pair-link"
          title="Locked partners"
        />
        <span v-else-if="i > 0" class="text-grey-5"> · </span>
        <span>{{ slot.display_name }}</span>
        <GroupChip v-if="showSlotGroup(slot)" :group="groupsById.get(slot.play_group_id)" compact class="q-ml-xs" />
        <q-icon
          v-if="showReady && slot.ready_at"
          name="eva-checkmark-circle-2"
          color="positive"
          size="15px"
          class="q-ml-xs"
          style="vertical-align: -2px"
        />
      </template>
    </div>
    <div
      v-if="match.quality_score !== null && match.quality_score !== undefined"
      class="lineup-meta"
    >
      {{ Math.round(match.quality_score) }}% balance
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import GroupChip from 'src/components/GroupChip.vue'
import { isLockedPair } from 'src/utils/pairs'

const props = defineProps({
  match: { type: Object, required: true },
  showReady: { type: Boolean, default: false },
  // Court segregation: group lookup (Map id → group). Empty = no chips.
  groupsById: { type: Map, default: () => new Map() },
  // The court's own group (null = open court). Undefined = no court header
  // on this screen, so a one-group lineup gets its own chip.
  courtGroupId: { type: Number, default: undefined },
})

const slots = computed(() => [...(props.match.team_a || []), ...(props.match.team_b || [])])
const lineupGroup = computed(() => {
  const ids = new Set(slots.value.map((s) => s.play_group_id ?? null))
  const [only] = ids
  return ids.size === 1 && only ? props.groupsById.get(only) || null : null
})
// Per-player chip only where the court header / lineup chip doesn't already
// say it: a mixed game, or a grouped player on someone else's court.
function showSlotGroup(slot) {
  if (!slot.play_group_id || !props.groupsById.has(slot.play_group_id)) return false
  if (lineupGroup.value) return props.courtGroupId !== undefined && props.courtGroupId !== slot.play_group_id
  return true
}
</script>

<style scoped>
.lineup-group {
  margin-bottom: 6px;
}
.pair-link {
  color: #6f8f00;
  font-size: 15px;
  margin: 0 4px;
  vertical-align: -2px;
}
</style>
