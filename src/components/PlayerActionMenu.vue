<template>
  <q-btn flat dense round icon="eva-more-vertical-outline">
    <q-menu auto-close>
      <q-list dense style="min-width: 200px">
        <q-item
          v-for="option in options"
          :key="option.action"
          clickable
          @click="emitAction(option)"
        >
          <q-item-section avatar>
            <q-icon :name="option.icon" :color="option.color || 'grey-8'" size="18px" />
          </q-item-section>
          <q-item-section :class="option.color ? `text-${option.color}` : ''">
            {{ option.label }}
          </q-item-section>
        </q-item>
        <q-item v-if="!options.length" disable>
          <q-item-section class="text-grey-6">No actions (in a match)</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  player: { type: Object, default: null },
})
const emit = defineEmits(['action'])

// Which organizer actions make sense per player state. In-match players are
// managed through the match card (cancel / replace), not here.
const options = computed(() => {
  const status = props.player?.status
  if (!status) return []
  const acts = []
  if (status === 'registered') {
    acts.push({ action: 'check_in', label: 'Check in', icon: 'eva-checkmark-circle-outline' })
  }
  if (status === 'waiting') {
    acts.push({ action: 'break', label: 'Put on break', icon: 'eva-clock-outline' })
    acts.push({ action: 'no_show', label: 'Mark no-show', icon: 'eva-eye-off-outline', color: 'negative' })
    acts.push({ action: 'injured', label: 'Mark injured', icon: 'eva-thermometer-outline', color: 'negative' })
    acts.push({ action: 'check_out', label: 'Check out', icon: 'eva-log-out-outline', color: 'negative' })
  }
  if (status === 'on_break') {
    acts.push({ action: 'back', label: 'Return to queue', icon: 'eva-undo-outline' })
    acts.push({ action: 'check_out', label: 'Check out', icon: 'eva-log-out-outline', color: 'negative' })
  }
  if (['no_show', 'injured', 'checked_out'].includes(status)) {
    acts.push({ action: 'reinstate', label: 'Back to queue', icon: 'eva-undo-outline' })
  }
  if (status === 'cooling_down') {
    acts.push({ action: 'reinstate', label: 'Skip cooldown', icon: 'eva-flash-outline' })
  }
  // Partner lock (handled by the page, not a queue transition): pairs stay
  // on the same team in every generated match until unlocked.
  if (!['checked_out', 'no_show'].includes(status)) {
    if (props.player?.locked_partner_id) {
      acts.push({ action: 'unlock_partner', label: 'Unlock partner', icon: 'eva-link-2-outline' })
    } else {
      acts.push({ action: 'lock_partner', label: 'Lock partner…', icon: 'eva-link-outline' })
    }
  }
  return acts
})

function emitAction(option) {
  emit('action', { player: props.player, action: option.action, extra: option.extra })
}
</script>
