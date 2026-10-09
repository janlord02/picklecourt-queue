<template>
  <q-page>
    <q-pull-to-refresh no-mouse color="primary" @refresh="onPull">
      <!-- ================= Signed out: welcome / onboarding ================= -->
      <template v-if="!auth.isAuthenticated">
        <section class="welcome-hero">
          <img
            :src="heroUrl"
            alt=""
            class="welcome-hero-img"
            width="1200"
            height="676"
            fetchpriority="high"
            decoding="async"
          />
          <div class="welcome-hero-inner">
            <span class="free-pill">
              <q-icon name="eva-gift-outline" size="15px" />
              100% free — forever, for everyone
            </span>
            <h1 class="welcome-title">Open play, made easy.</h1>
            <p class="welcome-sub">
              Check in with a code, see your spot in line, and get called to your court. No whiteboard, no paddle
              stack, no guessing who's next.
            </p>
            <div class="welcome-ctas">
              <q-btn
                class="big-action full-width welcome-primary"
                unelevated
                no-caps
                label="Create free account"
                :to="{ name: 'register' }"
              />
              <q-btn
                class="big-action full-width"
                outline
                no-caps
                color="white"
                label="Log in"
                :to="{ name: 'login' }"
              />
            </div>
          </div>
        </section>

        <div class="app-page welcome-body">
          <!-- Join by code (guests can join without an account) -->
          <div class="play-card q-mb-md">
            <div class="row items-center no-wrap q-mb-sm" style="gap: 10px">
              <span class="value-icon"><q-icon name="eva-hash-outline" size="20px" /></span>
              <div>
                <div class="text-weight-bold">Have a code? Join a session</div>
                <div class="text-caption text-grey-7">No account needed — join as a guest.</div>
              </div>
            </div>
            <form class="row no-wrap" style="gap: 8px" @submit.prevent="goToCode">
              <q-input
                v-model="code"
                outlined
                dense
                class="col code-input"
                placeholder="e.g. XK4T2M"
                maxlength="12"
                autocapitalize="characters"
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
                aria-label="Session code"
              />
              <q-btn
                color="primary"
                unelevated
                no-caps
                label="Join"
                type="submit"
                class="code-go"
                :disable="!code || !code.trim()"
              />
            </form>
          </div>

          <span class="section-label">Why players love it</span>
          <div class="play-card q-pa-none q-mb-md">
            <div v-for="item in values" :key="item.title" class="value-row">
              <span class="value-icon"><q-icon :name="item.icon" size="20px" /></span>
              <div class="col">
                <div class="text-weight-bold">{{ item.title }}</div>
                <div class="text-caption text-grey-7">{{ item.text }}</div>
              </div>
            </div>
          </div>

          <!-- Hosts: the same app runs the session -->
          <div class="play-card host-card q-mb-md">
            <img
              :src="courtsPhoneUrl"
              alt="Players on a court with the queue on a phone"
              class="host-card-img"
              width="560"
              height="590"
              loading="lazy"
              decoding="async"
            />
            <div class="host-card-copy">
              <div class="micro-label q-mb-xs">For organizers</div>
              <div class="text-subtitle1 text-weight-bold q-mb-xs">Run your open play from your phone</div>
              <div class="text-caption text-grey-7 q-mb-sm">
                Share a QR, approve walk-ins, fill courts with one tap and put the live board on the venue TV. Free
                for hosts too.
              </div>
              <q-btn
                outline
                no-caps
                color="primary"
                icon-right="eva-arrow-forward-outline"
                label="Host a session"
                :to="{ name: 'register', query: { redirect: '/organizer' } }"
              />
            </div>
          </div>

          <template v-if="sessions.length">
            <span class="section-label">Open sessions</span>
            <div class="play-card q-pa-none q-mb-md">
              <div v-for="session in sessions" :key="session.id" class="session-row tappable" @click="join(session)">
                <div class="col">
                  <div class="row items-center no-wrap" style="gap: 8px">
                    <span class="text-weight-bold ellipsis">{{ session.name }}</span>
                    <span v-if="session.status === 'live'" class="live-tag"><i class="live-dot" />Live</span>
                  </div>
                  <div class="text-caption text-grey-7">{{ sessionMeta(session) }}</div>
                </div>
                <q-icon name="eva-chevron-right-outline" size="20px" class="text-grey-5" />
              </div>
            </div>
          </template>

          <div class="any-screen">
            <img
              :src="anyScreenUrl"
              alt=""
              width="560"
              height="590"
              loading="lazy"
              decoding="async"
              class="any-screen-img"
            />
            <div class="text-caption text-grey-7 text-center">
              Works on any phone, tablet or TV — in the app or the browser. No fees, ever.
            </div>
          </div>
        </div>
      </template>

      <!-- ================= Signed in ================= -->
      <div v-else class="app-page">
        <div class="row items-center q-mb-md">
          <div class="text-h6 text-weight-bold">Open play</div>
          <q-space />
          <q-btn
            flat
            round
            class="tap-44"
            color="grey-8"
            icon="eva-refresh-outline"
            aria-label="Refresh sessions"
            :loading="loading"
            @click="load"
          >
            <q-tooltip>Refresh</q-tooltip>
          </q-btn>
        </div>

        <!-- Join by code -->
        <div class="play-card q-mb-md">
          <div class="micro-label q-mb-sm">Have a session code?</div>
          <form class="row no-wrap" style="gap: 8px" @submit.prevent="goToCode">
            <q-input
              v-model="code"
              outlined
              dense
              class="col code-input"
              placeholder="e.g. XK4T2M"
              maxlength="12"
              autocapitalize="characters"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
              aria-label="Session code"
            />
            <q-btn
              color="primary"
              unelevated
              no-caps
              label="Go"
              type="submit"
              class="code-go"
              :disable="!code || !code.trim()"
            />
          </form>
        </div>

        <SkeletonList v-if="loading && !loaded" :rows="3" />

        <template v-else>
          <!-- Sessions you're in — always visible regardless of which
               business the public browse below is scoped to. -->
          <template v-if="mySessions.length">
            <span class="section-label">Your sessions</span>
            <div class="play-card q-pa-none q-mb-md">
              <div
                v-for="session in mySessions"
                :key="`mine-${session.id}`"
                class="session-row tappable"
                @click="openMine(session)"
              >
                <div class="col">
                  <div class="row items-center no-wrap" style="gap: 8px">
                    <span class="text-weight-bold ellipsis">{{ session.name }}</span>
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
                  padding="8px 16px"
                  :label="playStore.sessionId === session.id ? 'Resume' : 'Open'"
                  @click.stop="openMine(session)"
                />
              </div>
            </div>
          </template>

          <div v-if="!sessions.length && !mySessions.length" class="play-card empty-state">
            <span class="empty-state-icon"><q-icon name="eva-calendar-outline" size="28px" /></span>
            <div class="empty-state-title">No open play sessions right now</div>
            <div class="text-caption q-mb-md">Ask your club for a session code, or start one yourself — it's free.</div>
            <!-- Anyone can host: point new users at creating their own session. -->
            <q-btn
              color="primary"
              unelevated
              no-caps
              icon="eva-plus-outline"
              label="Host your own open play"
              :to="{ name: 'organizer-sessions' }"
            />
          </div>

          <template v-if="sessions.length">
            <span class="section-label">Open sessions</span>
            <div class="play-card q-pa-none">
              <div v-for="session in sessions" :key="session.id" class="session-row">
                <div class="col">
                  <div class="row items-center no-wrap" style="gap: 8px">
                    <span class="text-weight-bold ellipsis">{{ session.name }}</span>
                    <span v-if="session.status === 'live'" class="live-tag"><i class="live-dot" />Live</span>
                    <span v-else class="status-tag">
                      <i class="status-dot dot-waiting" /><span>Open</span>
                    </span>
                  </div>
                  <div class="text-caption text-grey-7">{{ sessionMeta(session) }}</div>
                </div>
                <q-btn
                  v-if="playStore.sessionId === session.id"
                  color="primary"
                  unelevated
                  no-caps
                  padding="8px 16px"
                  label="Resume"
                  @click="$router.push({ name: 'play' })"
                />
                <q-btn
                  v-else
                  color="primary"
                  outline
                  no-caps
                  padding="8px 16px"
                  label="Join"
                  :loading="joiningId === session.id"
                  @click="join(session)"
                />
              </div>
            </div>
          </template>
        </template>
      </div>
    </q-pull-to-refresh>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { listSessions } from 'src/api/openPlay'
import SkeletonList from 'src/components/SkeletonList.vue'
import { useAuthStore } from 'src/stores/auth'
import { usePlaySessionStore } from 'src/stores/playSession'
import { statusLabel } from 'src/utils/format'
import { haptic } from 'src/utils/native'
import heroUrl from 'src/assets/onboarding/hero.webp'
import courtsPhoneUrl from 'src/assets/onboarding/courts-phone.webp'
import anyScreenUrl from 'src/assets/onboarding/any-screen.webp'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()
const playStore = usePlaySessionStore()

const sessions = ref([])
const mySessions = ref([])
const loading = ref(false)
const loaded = ref(false)
const joiningId = ref(null)
const code = ref('')

const values = [
  {
    icon: 'eva-people-outline',
    title: 'A fair queue',
    text: 'Your spot is saved on breaks, and whoever has waited longest plays next.',
  },
  {
    icon: 'eva-shuffle-2-outline',
    title: 'Smart matchmaking',
    text: 'Balanced games by skill level that mix up partners and opponents.',
  },
  {
    icon: 'eva-tv-outline',
    title: 'Live courts on any phone or TV',
    text: "Get a ping when you're up. The whole venue sees who's on which court.",
  },
]

function sessionMeta(session) {
  let text = session.date || ''
  if (session.start_time) text += ` · ${session.start_time.slice(0, 5)}–${session.end_time?.slice(0, 5) || ''}`
  const count = session.players_count ?? 0
  text += ` · ${count}${session.max_players ? `/${session.max_players}` : ''} players`
  return text
}

async function load({ quiet = false } = {}) {
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
    // Signed-out welcome screen: the session list is a bonus — stay quiet.
    if (!quiet && auth.isAuthenticated) {
      haptic('error')
      $q.notify({ message: e.response?.data?.message || 'Could not load sessions', color: 'negative' })
    }
  } finally {
    loading.value = false
    loaded.value = true
  }
}

async function onPull(done) {
  try {
    await load()
  } finally {
    done()
  }
}

function openMine(session) {
  playStore.setActive(session.id)
  router.push({ name: 'play' })
}

async function join(session) {
  if (!auth.isAuthenticated) {
    // The join page offers sign-in or a guest spot.
    if (session.join_code) router.push({ name: 'join', params: { code: session.join_code } })
    else router.push({ name: 'login' })
    return
  }
  joiningId.value = session.id
  try {
    await playStore.join(session.id, session.join_code ? { join_code: session.join_code } : {})
    haptic('success')
    $q.notify({ message: `Joined ${session.name}`, color: 'positive' })
    router.push({ name: 'play' })
  } catch (e) {
    const message = e.response?.data?.message || 'Could not join'
    // Already in the session? Just open it.
    if (e.response?.status === 409 || message.toLowerCase().includes('already')) {
      playStore.setActive(session.id)
      router.push({ name: 'play' })
      return
    }
    haptic('error')
    $q.notify({ message, color: 'negative' })
  } finally {
    joiningId.value = null
  }
}

function goToCode() {
  const clean = String(code.value || '').replace(/\s+/g, '').toUpperCase()
  if (clean) router.push({ name: 'join', params: { code: clean } })
}

onMounted(() => load({ quiet: !auth.isAuthenticated }))
</script>

<style scoped>
.session-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  min-height: 64px;
}

.session-row + .session-row {
  border-top: 1px solid var(--line);
}

.code-input :deep(input) {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.code-input :deep(input::placeholder) {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

.code-go {
  min-width: 64px;
  min-height: 40px;
}

/* ——— signed-out welcome ——— */
.welcome-hero {
  position: relative;
  overflow: hidden;
  background: var(--brand-deep);
  color: #fff;
}

.welcome-hero-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 60% 40%;
}

/* Photo fades into the brand green so the copy stays readable. */
.welcome-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(12, 43, 35, 0.35) 0%, rgba(12, 43, 35, 0.78) 45%, #0c2b23 100%);
}

.welcome-hero-inner {
  position: relative;
  z-index: 1;
  max-width: 640px;
  margin: 0 auto;
  padding: 120px 20px 28px;
}

.free-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #c6ef09;
  color: #0c2b23;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.welcome-title {
  margin: 14px 0 8px;
  font-size: 34px;
  line-height: 1.08;
  font-weight: 800;
  letter-spacing: -0.025em;
}

.welcome-sub {
  margin: 0 0 22px;
  font-size: 15.5px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.82);
}

.welcome-ctas {
  display: grid;
  gap: 10px;
}

.welcome-primary {
  background: #c6ef09 !important;
  color: #0c2b23 !important;
}

.welcome-body {
  padding-top: 20px;
}

.value-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
}

.value-row + .value-row {
  border-top: 1px solid var(--line);
}

.value-icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(44, 134, 112, 0.1);
  color: var(--brand-teal);
}

.host-card {
  display: flex;
  align-items: center;
  gap: 14px;
  overflow: hidden;
}

.host-card-img {
  flex: none;
  width: 120px;
  height: auto;
  aspect-ratio: 560 / 590;
  margin: -6px -4px -6px -8px;
}

.host-card-copy {
  min-width: 0;
}

.any-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 24px 12px;
}

.any-screen-img {
  width: 200px;
  height: auto;
  aspect-ratio: 560 / 590;
}

@media (min-width: 600px) {
  .welcome-hero-inner {
    padding-top: 160px;
    padding-bottom: 40px;
  }

  .welcome-title {
    font-size: 44px;
  }

  .welcome-ctas {
    grid-template-columns: 1fr 1fr;
    max-width: 440px;
  }

  .host-card-img {
    width: 170px;
  }
}
</style>
