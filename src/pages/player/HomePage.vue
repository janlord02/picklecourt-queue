<template>
  <q-page>
    <div class="app-page">
      <div class="row items-center q-mb-md">
        <div class="text-h6 text-weight-bold">Open Play</div>
        <q-space />
        <q-btn
          flat
          dense
          round
          color="grey-8"
          icon="eva-refresh-outline"
          :loading="loading"
          @click="load"
        >
          <q-tooltip>Refresh</q-tooltip>
        </q-btn>
      </div>

      <!-- Join by code -->
      <div class="play-card q-mb-md">
        <div class="micro-label q-mb-sm">Have a session code?</div>
        <div class="row" style="gap: 8px">
          <q-input
            v-model="code"
            outlined
            dense
            class="col"
            placeholder="e.g. XK4T2M"
            maxlength="12"
            @keyup.enter="goToCode"
          />
          <q-btn color="primary" unelevated no-caps label="Go" :disable="!code" @click="goToCode" />
        </div>
      </div>

      <div v-if="loading && !sessions.length && !mySessions.length" class="text-center q-pa-xl">
        <q-spinner size="32px" color="primary" />
      </div>

      <template v-else>
        <!-- Sessions you're in — always visible regardless of which
             business the public browse below is scoped to. -->
        <template v-if="mySessions.length">
          <span class="section-label">Your sessions</span>
          <div class="play-card q-pa-none q-mb-md">
            <div v-for="session in mySessions" :key="`mine-${session.id}`" class="session-row">
              <div class="col">
                <div class="row items-center no-wrap" style="gap: 8px">
                  <span class="text-weight-bold">{{ session.name }}</span>
                  <span v-if="session.status === 'live'" class="live-tag"><i class="live-dot" />Live</span>
                </div>
                <div class="text-caption text-grey-7">
                  {{ session.date }} · {{ statusLabel(session.my_status) }}
                </div>
              </div>
              <q-btn
                color="primary"
                :unelevated="playStore.sessionId === session.id"
                :outline="playStore.sessionId !== session.id"
                no-caps
                dense
                padding="6px 14px"
                :label="playStore.sessionId === session.id ? 'Resume' : 'Open'"
                @click="openMine(session)"
              />
            </div>
          </div>
        </template>

        <div v-if="!sessions.length && !mySessions.length" class="play-card empty-state">
          <q-icon name="eva-calendar-outline" size="40px" class="q-mb-sm" />
          <div class="empty-state-title">No open play sessions right now</div>
          <div class="text-caption">Ask your club for a session QR code, or check back later.</div>
        </div>
      </template>

      <template v-if="sessions.length">
        <span class="section-label">Open sessions</span>
        <div class="play-card q-pa-none">
          <div v-for="session in sessions" :key="session.id" class="session-row">
            <div class="col">
              <div class="row items-center no-wrap" style="gap: 8px">
                <span class="text-weight-bold">{{ session.name }}</span>
                <span v-if="session.status === 'live'" class="live-tag"><i class="live-dot" />Live</span>
                <span v-else class="status-tag">
                  <i class="status-dot dot-waiting" /><span>Open</span>
                </span>
              </div>
              <div class="text-caption text-grey-7">
                {{ session.date }}
                <template v-if="session.start_time">
                  · {{ session.start_time.slice(0, 5) }}–{{ session.end_time?.slice(0, 5) }}
                </template>
                · {{ session.players_count
                }}<template v-if="session.max_players">/{{ session.max_players }}</template>
                players
              </div>
            </div>
            <q-btn
              v-if="playStore.sessionId === session.id"
              color="primary"
              unelevated
              no-caps
              dense
              padding="6px 14px"
              label="Resume"
              @click="$router.push({ name: 'play' })"
            />
            <q-btn
              v-else
              color="primary"
              outline
              no-caps
              dense
              padding="6px 14px"
              label="Join"
              @click="join(session)"
            />
          </div>
        </div>
      </template>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { listSessions } from 'src/api/openPlay'
import { useAuthStore } from 'src/stores/auth'
import { usePlaySessionStore } from 'src/stores/playSession'
import { statusLabel } from 'src/utils/format'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()
const playStore = usePlaySessionStore()

const sessions = ref([])
const mySessions = ref([])
const loading = ref(false)
const code = ref('')

async function load() {
  loading.value = true
  try {
    const [browse, mine] = await Promise.all([
      listSessions(),
      auth.isAuthenticated ? listSessions({ joined: 1 }).catch(() => []) : Promise.resolve([]),
    ])
    mySessions.value = mine
    // A session you're in shows under "Your sessions" only.
    const mineIds = new Set(mine.map((s) => s.id))
    sessions.value = browse.filter((s) => !mineIds.has(s.id))
  } catch (e) {
    $q.notify({ message: e.response?.data?.message || 'Could not load sessions', color: 'negative' })
  } finally {
    loading.value = false
  }
}

function openMine(session) {
  playStore.setActive(session.id)
  router.push({ name: 'play' })
}

async function join(session) {
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: `/join/${session.join_code}` } })
    return
  }
  try {
    await playStore.join(session.id)
    $q.notify({ message: `Joined ${session.name}`, color: 'positive' })
    router.push({ name: 'play' })
  } catch (e) {
    const message = e.response?.data?.message || 'Could not join'
    // Already in the session? Just open it.
    if (message.toLowerCase().includes('already')) {
      playStore.setActive(session.id)
      router.push({ name: 'play' })
      return
    }
    $q.notify({ message, color: 'negative' })
  }
}

function goToCode() {
  if (code.value) {
    router.push({ name: 'join', params: { code: code.value.trim().toUpperCase() } })
  }
}

onMounted(load)
</script>

<style scoped>
.session-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}

.session-row + .session-row {
  border-top: 1px solid var(--line);
}
</style>
