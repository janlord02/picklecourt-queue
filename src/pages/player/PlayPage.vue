<template>
  <q-page>
    <!-- Full-screen "you're up" takeover -->
    <div v-if="showCalledTakeover" class="called-takeover" @click="dismissTakeover">
      <div class="text-h4 text-weight-bolder">You're up! 🎾</div>
      <div v-if="calledCourtLabel" class="text-h5 text-weight-bold takeover-court">
        {{ calledCourtLabel }}
      </div>
      <MatchTeams v-if="playStore.myActiveMatch" :match="playStore.myActiveMatch" show-ready />
      <q-btn
        class="big-action q-mt-lg full-width"
        style="max-width: 320px"
        color="white"
        text-color="primary"
        unelevated
        label="I'm ready"
        :loading="readyLoading"
        @click.stop="confirmReady"
      />
      <div class="text-caption q-mt-sm" style="opacity: 0.7">Tap anywhere to dismiss</div>
    </div>

    <q-pull-to-refresh no-mouse color="primary" :disable="!playStore.sessionId" @refresh="onPull">
    <div class="app-page">
      <!-- No active session -->
      <div v-if="!playStore.sessionId" class="play-card empty-state">
        <span class="empty-state-icon"><q-icon name="eva-flash-outline" size="28px" /></span>
        <div class="empty-state-title">You're not in a session</div>
        <div class="text-caption q-mb-md">Join an open play session with its code or QR to see your live queue.</div>
        <q-btn color="primary" unelevated no-caps label="Find a session" :to="{ name: 'home' }" />
      </div>

      <template v-else-if="playStore.session">
        <!-- Session header -->
        <div class="text-center q-mb-md">
          <div class="text-h6 text-weight-bold">{{ playStore.session.name }}</div>
          <div class="text-caption text-grey-7">
            {{ playStore.session.date }} · code {{ playStore.session.join_code }}
          </div>
        </div>

        <SyncStatusBanner
          :last-synced-at="playStore.lastSyncedAt"
          :error="playStore.error"
          :on-retry="() => playStore.fetchState()"
        />

        <!-- "You're up" alerts: sound/notifications need a tap to enable;
             keeping the screen on stops the phone locking while you wait. -->
        <div v-if="me && sessionRunning && !['checked_out', 'no_show'].includes(me.status)" class="alerts-row q-mb-md">
          <q-btn
            v-if="!alertsOn"
            outline
            no-caps
            dense
            color="primary"
            icon="eva-bell-outline"
            label="Turn on “you're up” alerts"
            class="q-px-sm"
            @click="enableAlerts"
          />
          <span v-else class="text-caption text-positive row items-center" style="gap: 4px">
            <q-icon name="eva-bell-outline" /> Alerts on
          </span>
          <q-toggle
            v-if="wakeLockSupported"
            :model-value="keepScreenOn"
            dense
            size="sm"
            label="Keep screen on"
            class="text-caption"
            @update:model-value="toggleScreen"
          />
        </div>

        <!-- Session over / cancelled: no more queue actions -->
        <div v-if="playStore.session.status === 'ended'" class="play-card q-mb-md text-center">
          <div class="text-subtitle1 text-weight-bold q-mb-xs">Session ended — thanks for playing! 🏆</div>
          <div v-if="me" class="text-body2 text-grey-8 q-mb-md tnum">
            Your record: {{ me.wins }}–{{ me.losses }} in {{ me.games_played }} {{ me.games_played === 1 ? 'game' : 'games' }}
          </div>
          <q-btn color="primary" unelevated no-caps label="See the leaderboard" :to="{ name: 'stats' }" class="q-mr-sm" />
          <q-btn flat no-caps color="grey-8" label="Leave session" @click="leaveSession" />
        </div>
        <div v-else-if="playStore.session.status === 'cancelled'" class="play-card q-mb-md text-center">
          <div class="text-subtitle1 text-weight-bold q-mb-xs">This session was cancelled</div>
          <div class="text-caption text-grey-7 q-mb-md">The organizer cancelled it. Check with them for a new session.</div>
          <q-btn color="primary" unelevated no-caps label="Find another session" @click="leaveSession" />
        </div>

        <!-- Not checked in yet -->
        <div v-else-if="me && me.status === 'registered'" class="play-card q-mb-md text-center">
          <div class="text-subtitle1 text-weight-bold q-mb-sm">You're registered 🎟</div>
          <div class="text-caption text-grey-7 q-mb-md">
            Check in when you arrive at the venue to enter the queue.
          </div>
          <q-btn
            class="big-action full-width"
            color="primary"
            unelevated
            label="Check in"
            :loading="actionLoading"
            @click="doCheckIn"
          />
        </div>

        <!-- Queue hero -->
        <div v-else-if="me && myQueue" class="play-card queue-hero q-mb-md">
          <div class="queue-hero-label">You're in the queue</div>
          <div class="queue-hero-number">#{{ myQueue.position }}</div>
          <div class="text-body2 text-grey-8 q-mt-sm">
            {{ formatWaitRange(myQueue.estimated_wait_min_seconds, myQueue.estimated_wait_max_seconds) }}
            <template v-if="myQueue.matches_before_estimate > 0">
              · {{ myQueue.matches_before_estimate }}
              {{ myQueue.matches_before_estimate === 1 ? 'match' : 'matches' }} before you
            </template>
          </div>
          <div class="text-caption text-grey-6 tnum">
            waiting {{ formatSeconds(me.effective_wait_seconds) }}
          </div>
          <div v-if="myPartnerName" class="q-mt-sm">
            <span class="pair-tag">
              <q-icon name="eva-link-outline" />
              Locked with {{ myPartnerName }}
            </span>
          </div>
        </div>

        <!-- In a match (up next / called / playing) -->
        <div v-else-if="me && playStore.myActiveMatch" class="play-card q-mb-md text-center">
          <StatusChip :status="me.status" class="q-mb-sm" />
          <div
            v-if="playStore.myActiveMatch.court_label"
            class="text-h6 text-weight-bold q-mb-sm"
          >
            {{ playStore.myActiveMatch.court_label }}
          </div>
          <MatchTeams :match="playStore.myActiveMatch" show-ready />
          <q-btn
            v-if="me.status === 'called' && !myReadyAt"
            class="big-action full-width q-mt-md"
            color="primary"
            unelevated
            label="I'm ready"
            :loading="readyLoading"
            @click="confirmReady"
          />
          <WhyThisMatch :match="playStore.myActiveMatch" class="q-mt-md" />
        </div>

        <!-- On break / other states -->
        <div v-else-if="me" class="play-card q-mb-md text-center">
          <StatusChip :status="me.status" class="q-mb-sm" />
          <div v-if="me.status === 'on_break'" class="q-mt-sm">
            <div v-if="me.break_until" class="text-caption text-grey-7 q-mb-md">
              Back around
              {{ new Date(me.break_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
            </div>
            <q-btn
              class="big-action full-width"
              color="primary"
              unelevated
              label="I'm back"
              :loading="actionLoading"
              @click="doAction('back')"
            />
          </div>
          <div v-else-if="me.status === 'cooling_down'" class="text-caption text-grey-7">
            Nice game! You'll rejoin the queue in a moment.
          </div>
          <div v-else-if="me.status === 'checked_out'" class="q-mt-sm">
            <div class="text-caption text-grey-7 q-mb-md">You've checked out of this session.</div>
            <q-btn
              color="primary"
              outline
              no-caps
              label="Check back in"
              :loading="actionLoading"
              @click="doAction('check_in')"
            />
          </div>
          <div v-else-if="me.status === 'no_show'" class="text-caption text-grey-7 q-mt-sm">
            You were marked as a no-show when your match was called. Please see the organizer to
            get back into the queue.
          </div>
          <div v-else-if="me.status === 'injured'" class="text-caption text-grey-7 q-mt-sm">
            You're marked as injured and out of the queue. When you're ready to play again, ask
            the organizer to reinstate you.
          </div>
        </div>

        <!-- Up next (session-wide) -->
        <template v-if="upNextMatches.length">
          <span class="section-label">Up next</span>
          <div v-for="match in upNextMatches" :key="match.id" class="play-card q-mb-sm">
            <div class="text-caption text-grey-6 text-center q-mb-xs">
              {{ match.court_label || 'Court TBA' }}
            </div>
            <MatchTeams :match="match" :show-ready="match.status === 'called'" />
          </div>
        </template>

        <!-- My session stats -->
        <div v-if="me" class="play-card q-my-md">
          <div class="row text-center">
            <div class="col">
              <div class="text-h6 text-weight-bold tnum">{{ me.games_played }}</div>
              <div class="text-caption text-grey-7">Games</div>
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold tnum">{{ me.wins }}–{{ me.losses }}</div>
              <div class="text-caption text-grey-7">Record</div>
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold tnum">
                {{ playStore.stats.waiting_count ?? '—' }}
              </div>
              <div class="text-caption text-grey-7">In queue</div>
            </div>
          </div>
        </div>

        <!-- Break / leave controls -->
        <div v-if="me && me.status === 'waiting'" class="row q-col-gutter-sm">
          <div class="col-6">
            <q-btn
              class="full-width"
              outline
              no-caps
              color="grey-8"
              icon="eva-clock-outline"
              label="Take a break"
              @click="breakDialog = true"
            />
          </div>
          <div class="col-6">
            <q-btn
              class="full-width"
              flat
              no-caps
              color="negative"
              icon="eva-log-out-outline"
              label="Check out"
              @click="confirmCheckOut"
            />
          </div>
        </div>

        <!-- Not part of this session (wait for the auth fetch — myPlayer
             matches on user_id, so an early render would flash this card) -->
        <div v-if="auth.user && !me && !playStore.loading" class="play-card text-center q-pa-lg">
          <div class="text-caption text-grey-7 q-mb-md">You haven't joined this session yet.</div>
          <q-btn
            class="big-action full-width"
            color="primary"
            unelevated
            label="Join session"
            :loading="actionLoading"
            @click="doJoin"
          />
        </div>
      </template>

      <SkeletonList v-else-if="playStore.loading" hero :rows="2" />

      <!-- First load failed (bad venue wifi) — don't leave a blank page -->
      <div v-else-if="playStore.error" class="play-card empty-state">
        <span class="empty-state-icon"><q-icon name="eva-wifi-off-outline" size="28px" /></span>
        <div class="empty-state-title">Couldn't load your session</div>
        <div class="text-caption q-mb-md">Check your connection and try again.</div>
        <q-btn color="primary" unelevated no-caps label="Retry" :loading="retrying" @click="retryLoad" />
      </div>
    </div>
    </q-pull-to-refresh>

  <!-- Break duration sheet -->
  <q-dialog v-model="breakDialog" position="bottom">
    <q-card class="sheet">
      <q-card-section class="q-pa-md">
        <div class="sheet-title q-mb-xs">Take a break</div>
        <div class="text-caption text-grey-7 q-mb-md">
          Your queue priority is saved — break time doesn't count as waiting.
        </div>
        <div class="row q-col-gutter-sm">
          <div v-for="minutes in [5, 10, 15]" :key="minutes" class="col-4">
            <q-btn
              class="full-width"
              outline
              no-caps
              color="primary"
              padding="12px 0"
              :label="`${minutes} min`"
              @click="startBreak(minutes)"
            />
          </div>
        </div>
        <q-btn
          class="full-width q-mt-sm"
          outline
          no-caps
          color="grey-8"
          padding="12px 0"
          label="Until I return"
          @click="startBreak(null)"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import MatchTeams from 'src/components/MatchTeams.vue'
import StatusChip from 'src/components/StatusChip.vue'
import WhyThisMatch from 'src/components/WhyThisMatch.vue'
import { usePlayCalledRealtime, usePlaySessionRealtime } from 'src/composables/usePlayRealtime'
import { useAuthStore } from 'src/stores/auth'
import { usePlaySessionStore } from 'src/stores/playSession'
import { formatSeconds, formatWaitRange } from 'src/utils/format'
import SyncStatusBanner from 'src/components/SyncStatusBanner.vue'
import SkeletonList from 'src/components/SkeletonList.vue'
import { haptic } from 'src/utils/native'
import { alertCalled, alertsState, alertsSupported, primeAlerts, setKeepScreenOn } from 'src/utils/calledAlert'

const $q = useQuasar()
const auth = useAuthStore()
const playStore = usePlaySessionStore()

const breakDialog = ref(false)
const actionLoading = ref(false)
const readyLoading = ref(false)
const showCalledTakeover = ref(false)
const calledCourtLabel = ref(null)

const me = computed(() => playStore.myPlayer)
const myQueue = computed(() => playStore.myQueueEntry)
const myPartnerName = computed(() => {
  const partnerId = me.value?.locked_partner_id
  if (!partnerId) return null
  return playStore.players.find((p) => p.id === partnerId)?.display_name || null
})
const myReadyAt = computed(() => {
  const match = playStore.myActiveMatch
  const mine = me.value
  if (!match || !mine) return null
  const slot = [...(match.team_a || []), ...(match.team_b || [])].find(
    (s) => s.player_id === mine.id,
  )
  return slot?.ready_at || null
})
const upNextMatches = computed(() =>
  playStore.activeMatches.filter((m) => ['staged', 'called'].includes(m.status)),
)

const sessionIdRef = computed(() => playStore.sessionId)
usePlaySessionRealtime(sessionIdRef, () => playStore.fetchState().catch(() => {}))

const userIdRef = computed(() => auth.user?.id)
usePlayCalledRealtime(userIdRef, (payload) => {
  calledCourtLabel.value = payload?.court_label || null
  showCalledTakeover.value = true
  haptic('warning')
  alertCalled({ courtLabel: calledCourtLabel.value })
  playStore.fetchState().catch(() => {})
}, { onResync: () => playStore.fetchState().catch(() => {}) })

// ——— Alerts / keep screen on ———
const sessionRunning = computed(() => ['open', 'live'].includes(playStore.session?.status))
const alertsOn = ref(alertsState().sound)
const wakeLockSupported = alertsSupported().wakeLock
const keepScreenOn = ref(false)
async function enableAlerts() {
  const st = await primeAlerts()
  alertsOn.value = st.sound
  $q.notify({
    message: st.notifications === 'denied'
      ? 'Sound is on. Notifications are blocked in your browser settings.'
      : 'Alerts on — we’ll chime when you’re called.',
    color: 'positive',
  })
}
async function toggleScreen(on) {
  keepScreenOn.value = await setKeepScreenOn(on)
  if (on && !keepScreenOn.value) $q.notify({ message: 'Your browser won’t keep the screen on.', color: 'warning' })
}
onBeforeUnmount(() => setKeepScreenOn(false))

const retrying = ref(false)
async function retryLoad() {
  retrying.value = true
  try {
    await playStore.fetchState()
  } catch {
    // card stays
  } finally {
    retrying.value = false
  }
}

function leaveSession() {
  setKeepScreenOn(false)
  playStore.setActive(null)
}

// Also raise the takeover when a refetch reveals we're called (e.g. app was
// backgrounded and the socket event was missed).
watch(
  () => me.value?.status,
  (status, prev) => {
    if (status === 'called' && prev !== 'called' && !myReadyAt.value) {
      showCalledTakeover.value = true
      // Missed the socket ping (phone slept) — alert now that we know.
      if (prev) alertCalled({ courtLabel: calledCourtLabel.value })
    }
    if (status !== 'called') {
      showCalledTakeover.value = false
    }
  },
)

function dismissTakeover() {
  showCalledTakeover.value = false
}

async function confirmReady() {
  readyLoading.value = true
  try {
    await playStore.ready()
    haptic('success')
    showCalledTakeover.value = false
    $q.notify({ message: 'You’re marked ready — head to your court! 🎾', color: 'positive' })
  } catch (e) {
    haptic('error')
    $q.notify({
      message: e.response?.data?.message || e.message || 'Could not mark ready',
      color: 'negative',
    })
  } finally {
    readyLoading.value = false
  }
}

async function doCheckIn() {
  // The tap is our chance to unlock sound + ask for notifications.
  primeAlerts().then((st) => (alertsOn.value = st.sound))
  actionLoading.value = true
  try {
    await playStore.checkIn()
    haptic('success')
    $q.notify({ message: 'Checked in — you’re in the queue!', color: 'positive' })
  } catch (e) {
    haptic('error')
    $q.notify({ message: e.response?.data?.message || 'Check-in failed', color: 'negative' })
  } finally {
    actionLoading.value = false
  }
}

async function doJoin() {
  actionLoading.value = true
  try {
    await playStore.join(playStore.sessionId, { check_in: true })
    haptic('success')
  } catch (e) {
    haptic('error')
    $q.notify({ message: e.response?.data?.message || 'Could not join', color: 'negative' })
  } finally {
    actionLoading.value = false
  }
}

async function doAction(action, extra = {}) {
  actionLoading.value = true
  try {
    await playStore.myAction(action, extra)
    haptic('light')
  } catch (e) {
    haptic('error')
    $q.notify({ message: e.response?.data?.message || 'Action failed', color: 'negative' })
  } finally {
    actionLoading.value = false
  }
}

function startBreak(minutes) {
  breakDialog.value = false
  doAction('break', minutes ? { break_minutes: minutes } : {})
}

function confirmCheckOut() {
  $q.dialog({
    title: 'Check out?',
    message: 'You’ll leave the queue. Your games and wait history are saved if you come back.',
    cancel: true,
    ok: { label: 'Check out', color: 'negative', unelevated: true },
  }).onOk(() => doAction('check_out'))
}

async function onPull(done) {
  try {
    await playStore.fetchState()
  } catch {
    // SyncStatusBanner shows the error
  } finally {
    done()
  }
}

onMounted(() => {
  if (playStore.sessionId) {
    playStore.fetchState().catch(() => {})
  }
})
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
