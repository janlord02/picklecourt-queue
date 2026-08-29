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

    <div class="app-page">
      <!-- No active session -->
      <div v-if="!playStore.sessionId" class="play-card empty-state">
        <q-icon name="eva-flash-outline" size="40px" class="q-mb-sm" />
        <div class="empty-state-title">You're not in a session</div>
        <div class="text-caption q-mb-md">Join an open play session to see your live queue.</div>
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

        <!-- Not checked in yet -->
        <div v-if="me && me.status === 'registered'" class="play-card q-mb-md text-center">
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

      <div v-else-if="playStore.loading" class="text-center q-pa-xl">
        <q-spinner size="32px" color="primary" />
      </div>
    </div>
  </q-page>

  <!-- Break duration sheet -->
  <q-dialog v-model="breakDialog" position="bottom">
    <q-card class="sheet">
      <q-card-section class="q-pa-md">
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Take a break</div>
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
          label="Until I return"
          @click="startBreak(null)"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import MatchTeams from 'src/components/MatchTeams.vue'
import StatusChip from 'src/components/StatusChip.vue'
import WhyThisMatch from 'src/components/WhyThisMatch.vue'
import { usePlayCalledRealtime, usePlaySessionRealtime } from 'src/composables/usePlayRealtime'
import { useAuthStore } from 'src/stores/auth'
import { usePlaySessionStore } from 'src/stores/playSession'
import { formatSeconds, formatWaitRange } from 'src/utils/format'

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
  try {
    navigator.vibrate?.([200, 100, 200, 100, 400])
  } catch {
    // vibration unsupported — ignore
  }
  playStore.fetchState().catch(() => {})
})

// Also raise the takeover when a refetch reveals we're called (e.g. app was
// backgrounded and the socket event was missed).
watch(
  () => me.value?.status,
  (status, prev) => {
    if (status === 'called' && prev !== 'called' && !myReadyAt.value) {
      showCalledTakeover.value = true
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
    showCalledTakeover.value = false
    $q.notify({ message: 'You’re marked ready — head to your court! 🎾', color: 'positive' })
  } catch (e) {
    $q.notify({
      message: e.response?.data?.message || e.message || 'Could not mark ready',
      color: 'negative',
    })
  } finally {
    readyLoading.value = false
  }
}

async function doCheckIn() {
  actionLoading.value = true
  try {
    await playStore.checkIn()
    $q.notify({ message: 'Checked in — you’re in the queue!', color: 'positive' })
  } catch (e) {
    $q.notify({ message: e.response?.data?.message || 'Check-in failed', color: 'negative' })
  } finally {
    actionLoading.value = false
  }
}

async function doJoin() {
  actionLoading.value = true
  try {
    await playStore.join(playStore.sessionId, { check_in: true })
  } catch (e) {
    $q.notify({ message: e.response?.data?.message || 'Could not join', color: 'negative' })
  } finally {
    actionLoading.value = false
  }
}

async function doAction(action, extra = {}) {
  actionLoading.value = true
  try {
    await playStore.myAction(action, extra)
  } catch (e) {
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

onMounted(() => {
  if (playStore.sessionId) {
    playStore.fetchState().catch(() => {})
  }
})
</script>
