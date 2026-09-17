<template>
  <!-- Lead-gen pop-out card. Auto-opens shortly after load (so viewers see the
       board first); dismiss hides it; the footer logo re-opens it. -->
  <transition name="dp-fade">
    <div v-if="open" class="dp-card" role="complementary" aria-label="List your court on PickleCourt">
      <button class="dp-close" type="button" aria-label="Dismiss" @click="collapse">
        <q-icon name="eva-close-outline" size="18px" />
      </button>

      <div class="dp-eyebrow">
        <q-icon name="eva-star" size="15px" class="dp-spark" />
        <span>OWN A COURT?</span>
      </div>

      <div class="dp-message">List your court on <b>PickleCourt PH</b>.</div>

      <a class="dp-btn" :href="DEMO_URL" target="_blank" rel="noopener noreferrer">
        Request a Free Demo
      </a>
    </div>
  </transition>

  <!-- Bottom footer: logo button (left) opens the promo · "Powered by" centered.
       Fixed on desktop; on mobile it sits in normal flow at the page bottom. -->
  <footer class="dp-footer">
    <!-- Left: logo button opens the promo. Hidden while the card is open. -->
    <transition name="dp-pop">
      <button
        v-if="!open"
        class="dp-logo-btn"
        type="button"
        aria-label="List your court on PickleCourt"
        @click="expand"
      >
        <img :src="logoUrl" alt="PickleCourt" class="dp-logo-btn-img" />
      </button>
    </transition>

    <!-- Center: powered-by, links to picklecourt.ph -->
    <a class="dp-powered" :href="DEMO_URL" target="_blank" rel="noopener noreferrer">
      <span>Powered by</span>
      <img :src="logoUrl" alt="PickleCourt" class="dp-powered-logo" />
    </a>
  </footer>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import logoUrl from 'src/assets/logo.png'

// Public SaaS lead-gen for the venue TV board — spectators (and venue owners
// watching their own board) are exactly who can bring a court onto PickleCourt.
const DEMO_URL = 'https://picklecourt.ph/'
const OPEN_DELAY_MS = 4000

const open = ref(false)
let timer = null

function collapse() {
  open.value = false
}
function expand() {
  open.value = true
}

onMounted(() => {
  timer = setTimeout(() => {
    open.value = true
  }, OPEN_DELAY_MS)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
/* ——— Bottom footer bar ——— */
.dp-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 12;
  display: flex;
  align-items: center;
  min-height: 56px; /* stays put when the logo button hides (card open) */
  padding: 12px 24px calc(12px + env(safe-area-inset-bottom, 0px));
  pointer-events: none; /* don't block the board; children re-enable */
}
.dp-footer > * {
  pointer-events: auto;
}

/* Logo button — left */
.dp-logo-btn {
  flex: none;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(199, 240, 0, 0.4);
  border-radius: 50%;
  background: #113329;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.4);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.dp-logo-btn:hover {
  border-color: #c7f000;
}
.dp-logo-btn-img {
  width: 30px;
  height: 30px;
  object-fit: contain;
  display: block;
}

/* Powered-by — centered in the footer */
.dp-powered {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: clamp(11px, 1.1vw, 14px);
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #8fb5a9;
  opacity: 0.85;
  text-decoration: none;
  transition: opacity 0.15s ease;
}
.dp-powered:hover {
  opacity: 1;
}
.dp-powered-logo {
  height: clamp(16px, 1.8vw, 22px);
  width: auto;
  display: block;
}

/* ——— Pop-out card (floats above the footer) ——— */
.dp-card {
  position: fixed;
  left: 24px;
  bottom: 84px;
  z-index: 12;
  width: 300px;
  max-width: calc(100vw - 48px);
  background: #113329;
  border: 1px solid rgba(199, 240, 0, 0.35);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  padding: 16px 18px 18px;
}
.dp-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #8fb5a9;
  cursor: pointer;
}
.dp-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.dp-eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 28px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #fff;
}
.dp-spark {
  color: #c7f000;
}
.dp-message {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  color: #dfeee7;
  margin: 8px 0 14px;
}
.dp-message b {
  color: #fff;
}
.dp-btn {
  display: block;
  width: 100%;
  text-align: center;
  background: #c7f000;
  color: #17321f;
  font-weight: 800;
  font-size: 14px;
  text-decoration: none;
  border-radius: 999px;
  padding: 11px 16px;
  transition:
    filter 0.15s ease,
    transform 0.05s ease;
}
.dp-btn:hover {
  filter: brightness(1.08);
}
.dp-btn:active {
  transform: translateY(1px);
}

/* ——— Mobile / narrow board: footer sits in normal flow at the page bottom
   (not floating over content); logo stays left, powered-by stays centered. */
@media (max-width: 800px) {
  .dp-footer {
    position: relative;
    padding: 20px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  }
  .dp-logo-btn {
    width: 44px;
    height: 44px;
  }
  .dp-card {
    left: 16px;
    right: 16px;
    width: auto;
    bottom: 16px;
    max-width: none;
  }
}

/* ——— Transition ——— */
.dp-fade-enter-active,
.dp-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.dp-fade-enter-from,
.dp-fade-leave-to {
  opacity: 0;
  transform: translateY(14px);
}
.dp-pop-enter-active,
.dp-pop-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.dp-pop-enter-from,
.dp-pop-leave-to {
  opacity: 0;
  transform: scale(0.6);
}

@media (prefers-reduced-motion: reduce) {
  .dp-fade-enter-active,
  .dp-fade-leave-active,
  .dp-pop-enter-active,
  .dp-pop-leave-active {
    transition: opacity 0.2s ease;
  }
  .dp-fade-enter-from,
  .dp-fade-leave-to,
  .dp-pop-enter-from,
  .dp-pop-leave-to {
    transform: none;
  }
}
</style>
