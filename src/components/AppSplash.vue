<template>
  <transition name="splash-fade">
    <div v-if="visible" class="app-splash">
      <img v-if="!logoLoaded" class="app-splash-icon" :src="iconUrl" alt="" />
      <img
        ref="logoEl"
        class="app-splash-logo"
        :src="logoUrl"
        alt="PickleCourt"
        @load="logoLoaded = true"
      />
      <div class="app-splash-tag">Open Play · Live Queues</div>
      <q-spinner-dots color="primary" size="28px" class="q-mt-md" />
    </div>
  </transition>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import iconUrl from 'src/assets/picklecourt-icon.png'
import logoUrl from 'src/assets/logo.png'

const props = defineProps({
  // Cold-start splash: always plays through min, never past max. In between
  // it waits for `ready` (e.g. the auth fetch settling).
  ready: { type: Boolean, default: true },
  minDurationMs: { type: Number, default: 900 },
  maxDurationMs: { type: Number, default: 2500 },
})

const visible = ref(true)
const minElapsed = ref(false)
// The icon is only a placeholder while the wordmark loads — once the
// wordmark is up, showing both is redundant.
const logoLoaded = ref(false)
const logoEl = ref(null)
let minTimer = null
let maxTimer = null

function maybeHide() {
  if (minElapsed.value && props.ready) {
    visible.value = false
  }
}

watch(() => props.ready, maybeHide)

onMounted(() => {
  // Cached wordmark can complete before the @load listener attaches.
  if (logoEl.value?.complete) {
    logoLoaded.value = true
  }
  minTimer = setTimeout(() => {
    minElapsed.value = true
    maybeHide()
  }, props.minDurationMs)
  maxTimer = setTimeout(() => {
    visible.value = false
  }, props.maxDurationMs)
})

onBeforeUnmount(() => {
  clearTimeout(minTimer)
  clearTimeout(maxTimer)
})
</script>

<style scoped>
.app-splash {
  position: fixed;
  inset: 0;
  z-index: 6000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #ffffff;
}

.app-splash-icon {
  width: 76px;
  height: auto;
  margin-bottom: 18px;
}

.app-splash-logo {
  width: min(240px, 60vw);
  height: auto;
}

.app-splash-tag {
  margin-top: 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #2c8670;
}

.splash-fade-leave-active {
  transition: opacity 0.35s ease;
}

.splash-fade-leave-to {
  opacity: 0;
}
</style>
