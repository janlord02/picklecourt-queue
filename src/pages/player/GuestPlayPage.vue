<template>
  <q-page>
    <!-- Full-screen "you're up" takeover (same as signed-in players) -->
    <div v-if="showTakeover && myMatch" class="called-takeover" @click="showTakeover = false">
      <div class="text-h4 text-weight-bolder">You're up! 🎾</div>
      <div v-if="myMatch.court_label" class="text-h5 text-weight-bold takeover-court">{{ myMatch.court_label }}</div>
      <MatchTeams :match="myMatch" show-ready />
      <q-btn
        class="big-action q-mt-lg full-width"
        style="max-width: 320px"
        color="white"
        text-color="primary"
        unelevated
        label="I'm ready"
        :loading="busy"
        @click.stop="ready"
      />
      <div class="text-caption q-mt-sm" style="opacity: 0.7">Tap anywhere to dismiss</div>
    </div>

    <q-pull-to-refresh no-mouse color="primary" :disable="!token || removed" @refresh="onPull">
    <div class="app-page">
      <div v-if="!token && !removed" class="play-card empty-state">
        <span class="empty-state-icon"><q-icon name="eva-person-outline" size="28px" /></span>
        <div class="empty-state-title">No guest sign-up on this phone</div>
        <div class="text-caption q-mb-md">Join the session as a guest from its QR or link.</div>
        <q-btn color="primary" unelevated no-caps label="Open the session" :to="{ name: 'join', params: { code } }" />
      </div>

      <div v-else-if="removed" class="play-card empty-state">
        <span class="empty-state-icon"><q-icon name="eva-close-circle-outline" size="28px" /></span>
        <div class="empty-state-title">Your sign-up wasn't approved</div>
        <div class="text-caption q-mb-md">The organizer declined or removed it. Ask them at the venue if this is a mistake.</div>
        <q-btn color="primary" outline no-caps label="Back to the session" :to="{ name: 'join', params: { code } }" />
      </div>

      <div v-else-if="!data && loadError" class="play-card empty-state">
        <span class="empty-state-icon"><q-icon name="eva-wifi-off-outline" size="28px" /></span>
        <div class="empty-state-title">Couldn't load your spot</div>
        <div class="text-caption q-mb-md">Check your connection and try again.</div>
        <q-btn color="primary" unelevated no-caps label="Retry" @click="load" />
      </div>

      <SkeletonList v-else-if="!data" hero :rows="2" />

      <template v-else>
        <div class="text-center q-mb-md">
          <div class="text-h6 text-weight-bold">{{ data.session.name }}</div>
          <div class="text-caption text-grey-7">
            {{ data.session.date }} · code {{ code }} · playing as <b>{{ me.display_name }}</b> (guest)
          </div>
        </div>

        <SyncStatusBanner :last-synced-at="lastSyncedAt" :error="loadError ? 'offline' : null" :on-retry="load" />

        <div v-if="data.session.status === 'cancelled'" class="play-card q-mb-md text-center">
          <div class="text-subtitle1 text-weight-bold">This session was cancelled</div>
        </div>
        <div v-else-if="data.session.status === 'ended'" class="play-card q-mb-md text-center">
          <div class="text-subtitle1 text-weight-bold q-mb-xs">Session ended — thanks for playing! 🏆</div>
          <div class="text-body2 text-grey-8 tnum">Your record: {{ me.wins }}–{{ me.losses }}</div>
        </div>

        <!-- Waiting for the organizer -->
        <div v-else-if="me.status === 'pending_approval'" class="play-card q-mb-md text-center">
          <q-spinner-dots size="36px" color="primary" class="q-mb-sm" />
          <div class="text-subtitle1 text-weight-bold">Waiting for the organizer to approve you</div>
          <div class="text-caption text-grey-7">You'll enter the queue as soon as they tap Approve. Keep this page open.</div>
        </div>

        <!-- Approved but not in the queue (checked out / not checked in) -->
        <div v-else-if="['registered', 'checked_out'].includes(me.status)" class="play-card q-mb-md text-center">
          <div class="text-subtitle1 text-weight-bold q-mb-sm">
            {{ me.status === 'checked_out' ? 'You checked out' : "You're approved 🎟" }}
          </div>
          <q-btn class="big-action full-width" color="primary" unelevated label="Check in" :loading="busy" @click="act('check_in')" />
        </div>

        <!-- In a match -->
        <div v-else-if="myMatch" class="play-card q-mb-md text-center">
          <div class="queue-hero-label">
            {{ myMatch.status === 'playing' ? 'Playing now' : myMatch.status === 'called' ? "You're up!" : 'Up next' }}
          </div>
          <div v-if="myMatch.court_label" class="text-h5 text-weight-bold q-my-sm">{{ myMatch.court_label }}</div>
          <MatchTeams :match="myMatch" :show-ready="myMatch.status === 'called'" />
          <q-btn
            v-if="myMatch.status === 'called' && !myReady"
            class="big-action full-width q-mt-md"
            color="primary"
            unelevated
            label="I'm ready"
            :loading="busy"
            @click="ready"
          />
        </div>

        <!-- In the queue -->
        <div v-else-if="myQueue" class="play-card queue-hero q-mb-md">
          <div class="queue-hero-label">You're in the queue</div>
          <div class="queue-hero-number">#{{ myQueue.position }}</div>
          <div class="text-body2 text-grey-8 q-mt-sm">
            {{ formatWaitRange(myQueue.estimated_wait_min_seconds, myQueue.estimated_wait_max_seconds) }}
          </div>
        </div>

        <div v-else-if="me.status === 'on_break'" class="play-card q-mb-md text-center">
          <div class="text-subtitle1 text-weight-bold q-mb-sm">You're on a break</div>
          <q-btn class="big-action full-width" color="primary" unelevated label="I'm back" :loading="busy" @click="act('back')" />
        </div>

        <!-- Alerts + self-service -->
        <template v-if="running && !['pending_approval', 'checked_out'].includes(me.status)">
          <div class="alerts-row q-mb-md">
            <q-btn v-if="!alertsOn" outline no-caps dense color="primary" icon="eva-bell-outline" label="Turn on “you're up” alerts" @click="enableAlerts" />
            <span v-else class="text-caption text-positive row items-center" style="gap: 4px"><q-icon name="eva-bell-outline" /> Alerts on</span>
            <q-toggle v-if="wakeLockSupported" :model-value="keepScreenOn" dense size="sm" label="Keep screen on" class="text-caption" @update:model-value="toggleScreen" />
          </div>
          <div v-if="['waiting', 'cooling_down'].includes(me.status)" class="row q-col-gutter-sm q-mb-md">
            <div class="col-6"><q-btn class="full-width" outline no-caps color="primary" label="Take a break" :loading="busy" @click="act('break', { break_minutes: 10 })" /></div>
            <div class="col-6"><q-btn class="full-width" flat no-caps color="negative" label="Check out" :loading="busy" @click="confirmCheckOut" /></div>
          </div>
        </template>

        <!-- Keep the games: move this guest spot onto an account -->
        <div class="play-card q-mb-md text-center">
          <template v-if="auth.isAuthenticated">
            <div class="text-caption text-grey-7 q-mb-sm">Signed in as {{ auth.user?.name || 'you' }}.</div>
            <q-btn outline no-caps color="primary" label="Move my games to my account" :loading="busy" @click="claim" />
          </template>
          <template v-else>
            <div class="text-caption text-grey-7 q-mb-sm">Want your stats saved? Create an account — it's free forever, and your games come with you.</div>
            <q-btn outline no-caps color="primary" label="Create free account" :to="{ name: 'register', query: { redirect: `/guest/${code}` } }" />
          </template>
        </div>

        <q-btn flat no-caps color="primary" class="full-width" icon="eva-tv-outline" label="View live board" :to="{ name: 'display', params: { code } }" />
      </template>
    </div>
    </q-pull-to-refresh>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import MatchTeams from 'src/components/MatchTeams.vue'
import SyncStatusBanner from 'src/components/SyncStatusBanner.vue'
import SkeletonList from 'src/components/SkeletonList.vue'
import { haptic } from 'src/utils/native'
import { claimGuest, forgetGuestToken, guestAction, guestReady, guestSession, guestTokens, markGuestDeclined, wasGuestDeclined } from 'src/api/openPlay'
import { usePlayDisplayRealtime } from 'src/composables/usePlayRealtime'
import { useAuthStore } from 'src/stores/auth'
import { usePlaySessionStore } from 'src/stores/playSession'
import { alertCalled, alertsState, alertsSupported, primeAlerts, setKeepScreenOn } from 'src/utils/calledAlert'
import { formatWaitRange } from 'src/utils/format'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const playStore = usePlaySessionStore()

const code = String(route.params.code || '').toUpperCase()
const token = guestTokens()[code] || null
const data = ref(null)
const loadError = ref(false)
const removed = ref(!token && wasGuestDeclined(code))
const busy = ref(false)
const lastSyncedAt = ref(null)
const showTakeover = ref(false)

const me = computed(() => data.value?.me || {})
const myQueue = computed(() => data.value?.my_queue || null)
const myMatch = computed(() => data.value?.my_match || null)
const myReady = computed(() => {
  const m = myMatch.value
  const slot = m && [...(m.team_a || []), ...(m.team_b || [])].find((s) => s.player_id === me.value.id)
  return !!slot?.ready_at
})
const running = computed(() => ['open', 'live'].includes(data.value?.session?.status))

async function load() {
  if (!token) return
  try {
    data.value = await guestSession(token)
    loadError.value = false
    lastSyncedAt.value = Date.now()
  } catch (e) {
    if (e.response?.status === 404) {
      removed.value = true
      forgetGuestToken(code)
      markGuestDeclined(code)
    } else {
      loadError.value = true
    }
  }
}

// The session's public board channel pings on every change; refetch our spot.
usePlayDisplayRealtime(computed(() => (token ? code : null)), load)

// Called (socket ping or noticed after the phone woke up): takeover + alert.
watch(
  () => me.value.status,
  (status, prev) => {
    if (status === 'called' && prev !== 'called' && !myReady.value) {
      showTakeover.value = true
      haptic('warning')
      if (prev) alertCalled({ courtLabel: myMatch.value?.court_label })
    }
    if (status !== 'called') showTakeover.value = false
  },
)

async function act(action, extra = {}) {
  if (action === 'check_in') primeAlerts().then((st) => (alertsOn.value = st.sound))
  busy.value = true
  try {
    await guestAction(token, action, extra)
    haptic(action === 'check_in' ? 'success' : 'light')
    await load()
  } catch (e) {
    haptic('error')
    $q.notify({ message: e.response?.data?.message || 'That didn’t work — try again.', color: 'negative' })
  } finally {
    busy.value = false
  }
}

function confirmCheckOut() {
  $q.dialog({
    title: 'Check out?',
    message: 'You’ll leave the queue. You can check in again later.',
    cancel: true,
    ok: { label: 'Check out', color: 'negative', unelevated: true },
  }).onOk(() => act('check_out'))
}

async function ready() {
  busy.value = true
  try {
    await guestReady(token)
    haptic('success')
    showTakeover.value = false
    await load()
    $q.notify({ message: 'You’re marked ready — head to your court! 🎾', color: 'positive' })
  } catch (e) {
    $q.notify({ message: e.response?.data?.message || 'Could not mark ready', color: 'negative' })
  } finally {
    busy.value = false
  }
}

async function claim() {
  busy.value = true
  try {
    await claimGuest(token)
    forgetGuestToken(code)
    playStore.setActive(data.value.session.id)
    $q.notify({ message: 'Done — your games are on your account now.', color: 'positive' })
    router.replace({ name: 'play' })
  } catch (e) {
    $q.notify({ message: e.response?.data?.message || 'Could not move your games', color: 'negative' })
  } finally {
    busy.value = false
  }
}

// ——— alerts / keep screen on ———
const alertsOn = ref(alertsState().sound)
const wakeLockSupported = alertsSupported().wakeLock
const keepScreenOn = ref(false)
async function enableAlerts() {
  const st = await primeAlerts()
  alertsOn.value = st.sound
}
async function toggleScreen(on) {
  keepScreenOn.value = await setKeepScreenOn(on)
}
onBeforeUnmount(() => setKeepScreenOn(false))

async function onPull(done) {
  try {
    await load()
  } finally {
    done()
  }
}

onMounted(load)
</script>

<style scoped>
.alerts-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
