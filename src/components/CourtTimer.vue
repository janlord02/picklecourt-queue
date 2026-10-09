<template>
  <span :class="plain ? undefined : 'court-timer'">{{ text }}</span>
</template>

<script setup>
// Live mm:ss since a match started. Owns its own 1s interval so only this
// tiny text node re-renders each second — not the whole page around it.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  startedAt: { type: [String, Number, Date], default: null },
  // Plain mode: no built-in class (the parent styles it, e.g. the TV board).
  plain: { type: Boolean, default: false },
})

const now = ref(Date.now())
let timer = null

function start() {
  stop()
  if (!props.startedAt) return
  now.value = Date.now()
  timer = setInterval(() => (now.value = Date.now()), 1000)
}
function stop() {
  if (timer) clearInterval(timer)
  timer = null
}

const text = computed(() => {
  if (!props.startedAt) return ''
  const seconds = Math.max(0, Math.floor((now.value - new Date(props.startedAt)) / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
})

watch(() => props.startedAt, start)
onMounted(start)
onBeforeUnmount(stop)
</script>
