<template>
  <!-- One court, one referee phone: open this link once and keep scoring.
       It finds the match for this court (or gives the court the next playable
       one) and hands over to the scoring screen. -->
  <div class="court-page">
    <header class="court-top">
      <q-btn flat round class="tap-44" icon="eva-arrow-back-outline" color="white" aria-label="Back to the tournament" @click="back" />
      <div class="col ellipsis">
        <div class="court-top__title ellipsis">{{ court }}</div>
        <div class="court-top__sub ellipsis">{{ tournament?.name || 'Tournament' }} · referee</div>
      </div>
    </header>

    <div class="court-center">
      <template v-if="state === 'loading'">
        <q-spinner color="white" size="40px" />
        <div class="court-note q-mt-md">Finding the next match for {{ court }}…</div>
      </template>

      <template v-else-if="state === 'waiting'">
        <div class="court-badge">{{ court }}</div>
        <div class="court-title">No match to play yet</div>
        <div class="court-note">
          Every team that could play next is still on another court, or their earlier matches aren't finished.
          This screen checks again on its own as matches end.
        </div>
        <q-btn class="q-mt-lg" outline no-caps color="white" icon="eva-refresh-outline" label="Check now" :loading="checking" @click="check" />
        <div v-if="tournament" class="court-others">
          <div class="micro-label" style="color: rgba(255, 255, 255, 0.55)">Other courts</div>
          <div v-for="c in otherCourts" :key="c.court" class="court-row">
            <span class="text-weight-bold">{{ c.court }}</span>
            <span class="court-row__state">{{ c.text }}</span>
          </div>
        </div>
      </template>

      <template v-else-if="state === 'error'">
        <div class="court-title">Can't open {{ court }}</div>
        <div class="court-note">{{ errorText }}</div>
        <q-btn class="q-mt-lg" outline no-caps color="white" label="Back" @click="back" />
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as T from 'src/api/tournament'
import { useTournamentRealtime } from 'src/composables/useTournamentRealtime'

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)
const court = String(route.params.court || '')

const tournament = ref(null)
const state = ref('loading') // loading | waiting | error
const errorText = ref('')
const checking = ref(false)

const otherCourts = computed(() => {
  const all = (tournament.value?.divisions || []).flatMap((d) => d.matches)
  return (tournament.value?.courts || [])
    .filter((c) => c !== court)
    .map((c) => {
      const live = all.find((m) => m.court === c && m.status === 'live')
      const next = all.find((m) => m.court === c && m.status === 'ready')
      return { court: c, text: live ? `Playing M${live.number}` : next ? `M${next.number} up next` : 'Free' }
    })
})

async function check() {
  checking.value = true
  try {
    const match = await T.nextOnCourt(id, court)
    if (match) {
      router.replace({ name: 'tournament-referee', params: { id, matchId: match.id }, query: { court } })
      return
    }
    state.value = 'waiting'
    tournament.value = await T.getTournament(id)
  } catch (e) {
    state.value = 'error'
    errorText.value = e.response?.data?.message || 'Check your connection and try again.'
  } finally {
    checking.value = false
  }
}

// Any match finishing anywhere may free a team for this court.
useTournamentRealtime(computed(() => tournament.value?.code), () => {
  if (state.value === 'waiting' && !checking.value) check()
})

function back() {
  router.push({ name: 'organizer-tournament', params: { id } })
}

onMounted(check)
</script>

<style scoped lang="scss">
.court-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #0c2b23;
  color: #fff;
  display: flex;
  flex-direction: column;
}
.court-top {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: calc(6px + env(safe-area-inset-top)) 12px 6px 4px;
  border-bottom: 1px solid #1d4a3d;
}
.court-top__title { font-weight: 800; font-size: 17px; }
.court-top__sub { font-size: 12px; color: rgba(255, 255, 255, 0.6); }
.court-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px 20px;
  gap: 8px;
}
.court-badge {
  font-size: 15px;
  font-weight: 800;
  color: #0c2b23;
  background: var(--lime);
  border-radius: 999px;
  padding: 4px 16px;
}
.court-title { font-size: 24px; font-weight: 800; margin-top: 6px; }
.court-note { max-width: 34ch; color: rgba(255, 255, 255, 0.7); }
.court-others { margin-top: 32px; width: 100%; max-width: 360px; text-align: left; }
.court-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-top: 1px solid #1d4a3d;
}
.court-row__state { color: rgba(255, 255, 255, 0.65); }
</style>
