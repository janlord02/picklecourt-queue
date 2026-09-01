<template>
  <transition name="promo-slide">
    <div v-if="visible" class="promo-banner" role="complementary" aria-label="List your court">
      <button class="promo-close" type="button" aria-label="Dismiss" @click="dismiss">
        <q-icon name="eva-close-outline" size="16px" />
      </button>

      <div class="promo-eyebrow">
        <q-icon name="eva-star" size="14px" class="promo-spark" />
        <span>OWN A COURT?</span>
      </div>

      <div class="promo-message">List your court on PickleCourt now.</div>

      <a class="promo-btn" :href="DEMO_URL" target="_blank" rel="noopener noreferrer">
        Request for a Free Demo
      </a>
    </div>
  </transition>
</template>

<script setup>
import { onMounted, ref } from 'vue'

// Lead-gen CTA for the PickleCourt SaaS — the queue app's version of the
// booking frontend's RegisterCourtBanner. Many queue sessions happen at
// venues NOT on PickleCourt yet; the organizer holding the phone is the
// exact person who can bring their venue onboard. Dismissible, and the
// dismissal is remembered for a cooldown so regulars aren't nagged.
const DEMO_URL = 'https://picklecourt.ph/'
const STORAGE_KEY = 'play_register_court_banner_dismissed'
const DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000 // 3 days

const visible = ref(false)

function dismiss() {
  visible.value = false
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    /* storage unavailable (private mode) — banner just reappears next load */
  }
}

onMounted(() => {
  let inCooldown = false
  try {
    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY))
    inCooldown =
      Number.isFinite(dismissedAt) &&
      dismissedAt > 0 &&
      Date.now() - dismissedAt < DISMISS_COOLDOWN_MS
  } catch {
    inCooldown = false
  }
  if (!inCooldown) visible.value = true
})
</script>

<style scoped>
.promo-banner {
  position: fixed;
  right: 12px;
  /* Phones/tablets: dock above the fixed bottom tab bar. */
  bottom: calc(56px + max(10px, env(safe-area-inset-bottom)) + 10px);
  z-index: 1500; /* below the bottom nav (2000) and all dialogs (6000) */
  width: 290px;
  max-width: calc(100vw - 24px);
  background: var(--surface, #fff);
  border: 1px solid var(--line, #e7ece9);
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(12, 43, 35, 0.18);
  padding: 14px 16px 16px;
}

/* Desktop: no bottom nav, sit in the corner. */
@media (min-width: 1024px) {
  .promo-banner {
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  }
}

.promo-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-muted, #64748b);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.promo-close:hover {
  background: var(--surface-sunken, rgba(15, 23, 42, 0.06));
  color: var(--ink, #0f172a);
}

.promo-eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--ink, #0f172a);
  padding-right: 26px; /* clear the close button */
}

.promo-spark {
  color: #9db800; /* lime, darkened for the white card */
}

.promo-message {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ink, #1e293b);
  margin: 6px 0 12px;
}

.promo-btn {
  display: block;
  width: 100%;
  text-align: center;
  background: var(--brand-deep, #0c2b23);
  color: #fff;
  font-weight: 700;
  font-size: 13.5px;
  text-decoration: none;
  border-radius: 999px;
  padding: 10px 16px;
  transition:
    filter 0.15s ease,
    transform 0.05s ease;
  -webkit-tap-highlight-color: transparent;
}

.promo-btn:hover {
  filter: brightness(1.35);
}

.promo-btn:active {
  transform: translateY(1px);
}

.promo-slide-enter-active,
.promo-slide-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.promo-slide-enter-from,
.promo-slide-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

@media (prefers-reduced-motion: reduce) {
  .promo-slide-enter-active,
  .promo-slide-leave-active {
    transition: opacity 0.2s ease;
  }

  .promo-slide-enter-from,
  .promo-slide-leave-to {
    transform: none;
  }
}
</style>
