<template>
  <div v-if="reasons.length" class="why-this-match">
    <button type="button" class="why-toggle" @click="open = !open">
      Why this match?
      <q-icon :name="open ? 'eva-chevron-up-outline' : 'eva-chevron-down-outline'" size="14px" />
    </button>
    <q-slide-transition>
      <ul v-show="open" class="why-list">
        <li v-for="(reason, i) in reasons" :key="i">{{ reason }}</li>
      </ul>
    </q-slide-transition>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  match: { type: Object, required: true },
})

const open = ref(false)

// Algorithmic transparency: the engine stores its reasons in
// score_breakdown.reasons when the match was staged from a proposal.
const reasons = computed(() => props.match?.score_breakdown?.reasons || [])
</script>

<style scoped>
.why-this-match {
  text-align: center;
}

.why-toggle {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: 0;
  background: none;
  padding: 2px 4px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-faint);
  cursor: pointer;
}

.why-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  text-align: left;
}

.why-list li {
  position: relative;
  padding: 2px 0 2px 18px;
  font-size: 12px;
  color: var(--ink-muted);
}

.why-list li::before {
  content: '✓';
  position: absolute;
  left: 2px;
  color: var(--brand-teal);
  font-weight: 700;
}
</style>
