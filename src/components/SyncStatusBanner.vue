<template>
  <!-- Courtside wifi drops: say so instead of silently showing old data. -->
  <div v-if="state" class="sync-banner" :class="`sync-banner--${state}`" role="status">
    <q-icon :name="state === 'offline' ? 'eva-wifi-off-outline' : 'eva-sync-outline'" size="18px" />
    <span class="col">
      <template v-if="state === 'offline'">You're offline — showing the last update{{ agoText }}.</template>
      <template v-else>Can't reach the server — last updated{{ agoText }}.</template>
    </span>
    <q-btn flat dense no-caps size="sm" label="Retry" :loading="retrying" @click="retry" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  // ms timestamp of the last successful sync (store.lastSyncedAt)
  lastSyncedAt: { type: Number, default: null },
  // last fetch error (store.error) — set while the server is unreachable
  error: { type: [String, Object], default: null },
  // async () => refetch
  onRetry: { type: Function, default: null },
  // only warn once data is this old (ms)
  staleAfter: { type: Number, default: 30000 },
})

const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const now = ref(Date.now())
const retrying = ref(false)
let tick = null
const setOnline = () => (online.value = true)
const setOffline = () => (online.value = false)

onMounted(() => {
  window.addEventListener('online', setOnline)
  window.addEventListener('offline', setOffline)
  tick = setInterval(() => (now.value = Date.now()), 5000)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', setOnline)
  window.removeEventListener('offline', setOffline)
  clearInterval(tick)
})

const state = computed(() => {
  if (!online.value) return 'offline'
  if (props.error && props.lastSyncedAt && now.value - props.lastSyncedAt > props.staleAfter) return 'stale'
  return null
})

const agoText = computed(() => {
  if (!props.lastSyncedAt) return ''
  const s = Math.max(0, Math.round((now.value - props.lastSyncedAt) / 1000))
  if (s < 60) return ` ${s}s ago`
  return ` ${Math.round(s / 60)} min ago`
})

async function retry() {
  if (!props.onRetry) return
  retrying.value = true
  try {
    await props.onRetry()
  } catch {
    // banner stays up; error is already on the store
  } finally {
    retrying.value = false
  }
}
</script>

<style scoped>
.sync-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
}
.sync-banner--offline {
  background: #fdecea;
  color: #8c2a14;
}
.sync-banner--stale {
  background: #fff6db;
  color: #7a5300;
}
</style>
