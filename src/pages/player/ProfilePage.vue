<template>
  <q-page>
    <div class="app-page">
      <div class="text-h6 text-weight-bold q-mb-md">Profile</div>

      <div v-if="!auth.isAuthenticated" class="play-card text-center q-pa-lg">
        <q-icon name="eva-person-outline" size="42px" class="text-grey-5 q-mb-sm" />
        <div class="text-caption text-grey-7 q-mb-md">
          Sign in to join sessions and track your games.
        </div>
        <q-btn class="big-action full-width" color="primary" unelevated label="Sign in" :to="{ name: 'login' }" />
        <q-btn
          class="full-width q-mt-sm"
          outline
          no-caps
          color="primary"
          label="Create account"
          :to="{ name: 'register' }"
        />
      </div>

      <template v-else>
        <!-- Identity + career -->
        <div class="play-card q-mb-md">
          <div class="row items-center">
            <q-avatar color="primary" text-color="white" size="52px" class="q-mr-md">
              {{ initials }}
            </q-avatar>
            <div class="col">
              <div class="row items-center no-wrap" style="gap: 8px">
                <span class="text-subtitle1 text-weight-bold ellipsis">{{ auth.user?.name }}</span>
                <span class="role-tag" :class="{ 'role-tag--organizer': auth.isOrganizerRole }">
                  {{ auth.isOrganizerRole ? 'Organizer' : 'Player' }}
                </span>
              </div>
              <div class="text-caption text-grey-7">{{ auth.user?.email }}</div>
            </div>
          </div>

          <template v-if="myStats && myStats.totals.games > 0">
            <q-separator class="q-my-md" />
            <div class="row text-center">
              <div class="col">
                <div class="text-subtitle1 text-weight-bold tnum">{{ myStats.totals.games }}</div>
                <div class="text-caption text-grey-7">Games</div>
              </div>
              <div class="col">
                <div class="text-subtitle1 text-weight-bold tnum">
                  {{ myStats.totals.wins }}–{{ myStats.totals.losses }}
                </div>
                <div class="text-caption text-grey-7">Record</div>
              </div>
              <div class="col">
                <div class="text-subtitle1 text-weight-bold tnum">
                  {{ myStats.totals.win_rate != null ? `${myStats.totals.win_rate}%` : '—' }}
                </div>
                <div class="text-caption text-grey-7">Win rate</div>
              </div>
              <div class="col">
                <div class="text-subtitle1 text-weight-bold tnum">
                  {{ myStats.totals.sessions_played }}
                </div>
                <div class="text-caption text-grey-7">Sessions</div>
              </div>
            </div>
          </template>
        </div>

        <!-- Plan: business members (booking-app subscribers) ride free
             forever; everyone else is free during early access. -->
        <div v-if="auth.isOrganizerRole" class="play-card q-mb-md">
          <div class="row items-center no-wrap" style="gap: 10px">
            <div class="col">
              <div class="row items-center no-wrap" style="gap: 8px">
                <span class="text-subtitle2 text-weight-bold">Plan</span>
                <span class="plan-tag" :class="{ 'plan-tag--free': plan.forever }">
                  {{ plan.tag }}
                </span>
              </div>
              <div class="text-caption text-grey-7 q-mt-xs">{{ plan.caption }}</div>
            </div>
          </div>
        </div>

        <q-list class="play-card q-pa-none" separator>
          <q-item
            v-if="playStore.sessionId && playStore.session"
            clickable
            :to="{ name: 'play' }"
          >
            <q-item-section avatar>
              <div class="profile-live-icon">
                <q-icon name="eva-flash-outline" size="20px" />
                <i class="profile-live-dot" />
              </div>
            </q-item-section>
            <q-item-section>
              <q-item-label class="ellipsis">{{ playStore.session.name }}</q-item-label>
              <q-item-label caption>Current session — back to your queue</q-item-label>
            </q-item-section>
            <q-item-section side><q-icon name="eva-chevron-right-outline" /></q-item-section>
          </q-item>
          <q-item v-if="auth.isOrganizerRole" clickable :to="{ name: 'organizer-sessions' }">
            <q-item-section avatar><q-icon name="eva-settings-2-outline" /></q-item-section>
            <q-item-section>Organizer console</q-item-section>
            <q-item-section side><q-icon name="eva-chevron-right-outline" /></q-item-section>
          </q-item>
          <q-item clickable @click="openMySessions">
            <q-item-section avatar><q-icon name="eva-people-outline" /></q-item-section>
            <q-item-section>My sessions</q-item-section>
            <q-item-section side><q-icon name="eva-chevron-right-outline" /></q-item-section>
          </q-item>
          <q-item clickable :to="{ name: 'stats' }">
            <q-item-section avatar><q-icon name="eva-bar-chart-outline" /></q-item-section>
            <q-item-section>Stats &amp; session history</q-item-section>
            <q-item-section side><q-icon name="eva-chevron-right-outline" /></q-item-section>
          </q-item>
          <q-item clickable @click="doLogout">
            <q-item-section avatar><q-icon name="eva-log-out-outline" color="negative" /></q-item-section>
            <q-item-section class="text-negative">Sign out</q-item-section>
          </q-item>
        </q-list>

        <div class="text-caption text-center text-grey-5 q-mt-lg">
          PickleCourt Queue · open play queues &amp; smart matchmaking
        </div>
      </template>
    </div>

    <!-- My sessions: view one, or leave a specific one -->
    <q-dialog v-model="sessionsDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold q-mb-xs">My sessions</div>
          <div class="text-caption text-grey-7 q-mb-md">
            Tap a session to open it. Leaving checks you out of that queue only.
          </div>

          <div v-if="loadingSessions" class="text-center q-pa-md">
            <q-spinner size="24px" color="primary" />
          </div>

          <div v-else-if="!mySessions.length" class="empty-state q-pa-md">
            <div class="empty-state-title">No active sessions</div>
            <div class="text-caption">Join a session from Home or scan a venue QR code.</div>
          </div>

          <template v-else>
            <div
              v-for="entry in mySessions"
              :key="entry.id"
              class="list-row cursor-pointer"
              @click="viewSession(entry)"
            >
              <div class="col">
                <div class="row items-center no-wrap" style="gap: 8px">
                  <span class="text-weight-bold ellipsis">{{ entry.name }}</span>
                  <span v-if="entry.id === playStore.sessionId" class="live-tag">
                    <i class="live-dot" />Viewing
                  </span>
                </div>
                <div class="text-caption text-grey-7">
                  {{ entry.date }} · {{ entry.players_count }} players ·
                  {{ statusLabel(entry.my_status) }}
                </div>
              </div>
              <q-btn
                v-if="canLeave(entry)"
                flat
                dense
                no-caps
                color="negative"
                label="Leave"
                :loading="leavingId === entry.id"
                @click.stop="confirmLeave(entry)"
              />
              <q-icon v-else name="eva-chevron-right-outline" size="18px" class="text-grey-5" />
            </div>
          </template>

          <q-btn
            v-if="playStore.sessionId"
            class="full-width q-mt-md"
            flat
            no-caps
            color="grey-8"
            label="Just stop viewing (stay in the queue)"
            @click="stopViewing"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { getMyStats, listSessions, playerAction } from 'src/api/openPlay'
import { useAuthStore } from 'src/stores/auth'
import { usePlaySessionStore } from 'src/stores/playSession'
import { statusLabel } from 'src/utils/format'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()
const playStore = usePlaySessionStore()

const myStats = ref(null)

onMounted(() => {
  if (auth.isAuthenticated) {
    getMyStats()
      .then((data) => {
        myStats.value = data
      })
      .catch(() => {})
  }
})

// The login/handoff payload carries the user's business memberships —
// a business on the platform IS a PickleCourt booking subscriber, so
// membership = the queue app is free for them, permanently.
const plan = computed(() => {
  const businesses = auth.businesses || []
  if (businesses.length) {
    const name = businesses[0]?.name || 'your business'
    const extra = businesses.length > 1 ? ` (+${businesses.length - 1} more)` : ''
    return {
      forever: true,
      tag: '100% Free',
      caption: `Included with ${name}${extra}'s PickleCourt booking subscription — unlimited sessions, forever.`,
    }
  }
  return {
    forever: false,
    tag: 'Early access · Free',
    caption:
      'Unlimited sessions during early access. Businesses subscribed to PickleCourt booking keep the queue app 100% free.',
  }
})

const initials = computed(() =>
  (auth.user?.name || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase(),
)

// ——— My sessions (choose which to view, leave one at a time) ———
const sessionsDialog = ref(false)
const loadingSessions = ref(false)
const mySessions = ref([])
const leavingId = ref(null)

async function loadMySessions() {
  loadingSessions.value = true
  try {
    mySessions.value = await listSessions({ joined: 1 })
  } catch (e) {
    $q.notify({
      message: e.response?.data?.message || 'Could not load your sessions',
      color: 'negative',
    })
  } finally {
    loadingSessions.value = false
  }
}

function openMySessions() {
  sessionsDialog.value = true
  loadMySessions()
}

function viewSession(entry) {
  playStore.setActive(entry.id)
  sessionsDialog.value = false
  router.push({ name: 'play' })
}

function canLeave(entry) {
  return !['checked_out', 'no_show'].includes(entry.my_status) && !!entry.my_player_id
}

function confirmLeave(entry) {
  $q.dialog({
    title: `Leave ${entry.name}?`,
    message: 'You’ll be checked out of this queue only. Your games and wait history are saved if you come back.',
    cancel: true,
    ok: { label: 'Leave session', color: 'negative', unelevated: true },
  }).onOk(() => leaveOne(entry))
}

async function leaveOne(entry) {
  leavingId.value = entry.id
  try {
    await playerAction(entry.id, entry.my_player_id, 'check_out')
    if (entry.id === playStore.sessionId) {
      playStore.setActive(null)
    }
    await loadMySessions()
  } catch (e) {
    $q.notify({
      message: e.response?.data?.message || 'Could not leave the session',
      color: 'negative',
    })
  } finally {
    leavingId.value = null
  }
}

function stopViewing() {
  playStore.setActive(null)
  sessionsDialog.value = false
}

async function doLogout() {
  await auth.logout()
  playStore.setActive(null)
  router.push({ name: 'home' })
}
</script>

<style scoped>
.role-tag {
  flex: none;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: var(--surface-sunken);
  color: var(--ink-muted);
}

.role-tag--organizer {
  background: rgba(199, 240, 0, 0.35);
  color: #3c5200;
}

.plan-tag {
  flex: none;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(44, 134, 112, 0.14);
  color: var(--brand-teal);
}

.plan-tag--free {
  background: rgba(199, 240, 0, 0.35);
  color: #3c5200;
}

/* Flash icon with a pulsing "live" dot pinned to its corner. */
.profile-live-icon {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-teal);
}

.profile-live-dot {
  position: absolute;
  top: -1px;
  right: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dc2626;
  animation: live-pulse 1.6s ease-in-out infinite;
}
</style>
