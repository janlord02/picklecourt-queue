<template>
  <div class="lineup">
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
import { isLockedPair } from 'src/utils/pairs'

defineProps({
  match: { type: Object, required: true },
  showReady: { type: Boolean, default: false },
})
</script>

<style scoped>
.pair-link {
  color: #6f8f00;
  font-size: 15px;
  margin: 0 4px;
  vertical-align: -2px;
}
</style>
