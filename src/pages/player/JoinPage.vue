<template>
  <q-page>
    <div class="app-page">
      <div v-if="loading" class="play-card skeleton-card text-center q-pa-lg" aria-busy="true" aria-label="Loading session">
        <q-skeleton type="text" width="30%" class="q-mx-auto" />
        <q-skeleton type="text" width="65%" height="34px" class="q-mx-auto q-mt-sm" />
        <q-skeleton type="text" width="45%" class="q-mx-auto q-mb-md" />
        <q-skeleton type="rect" height="54px" style="border-radius: 14px" />
      </div>

      <div v-else-if="error === 'network'" class="play-card empty-state">
        <span class="empty-state-icon"><q-icon name="eva-wifi-off-outline" size="28px" /></span>
        <div class="empty-state-title">Couldn't reach PickleCourt</div>
        <div class="text-caption text-grey-7 q-mb-md">Check your connection and try again.</div>
        <q-btn color="primary" unelevated no-caps label="Retry" @click="load" />
      </div>

      <div v-else-if="error" class="play-card empty-state">
        <span class="empty-state-icon"><q-icon name="eva-search-outline" size="28px" /></span>
        <div class="empty-state-title">Session not found</div>
        <div class="text-caption text-grey-7 q-mb-md">
          The code <b class="text-dark">{{ code }}</b> doesn't match any session. Double-check it with your organizer.
        </div>
        <q-btn color="primary" unelevated no-caps label="Try another code" :to="{ name: 'home' }" />
      </div>

      <div v-else-if="session" class="play-card text-center q-pa-lg">
        <div class="micro-label">You're joining</div>
        <div class="text-h5 text-weight-bold q-mt-sm">{{ session.name }}</div>
        <div class="text-caption text-grey-7 q-mb-md">
          {{ session.date }}
          <template v-if="session.start_time">· {{ String(session.start_time).slice(0, 5) }}<template v-if="session.end_time">–{{ String(session.end_time).slice(0, 5) }}</template></template>
          <br />
          {{ session.player_count }}<template v-if="session.max_players">/{{ session.max_players }}</template>
          players
        </div>

        <!-- Already checked in: don't offer "Check in" again (a second
             check-in duplicates the player's name). Steer them to the board. -->
        <template v-if="session.already_joined">
          <div class="text-positive text-weight-bold q-mb-md">
            <q-icon name="eva-checkmark-circle-2" size="20px" class="q-mr-xs" />You're already checked in
          </div>
          <q-btn
            class="big-action full-width q-mb-sm"
            color="primary"
            unelevated
            icon="eva-tv-outline"
            label="View live board"
            :to="{ name: 'display', params: { code } }"
          />
          <q-btn
            flat
            no-caps
            color="primary"
            class="full-width"
            label="Go to my queue"
            @click="goToMyQueue"
          />
        </template>

        <template v-else-if="session.joinable && isFull">
          <div class="text-caption text-negative q-mb-md">
            This session is full ({{ session.player_count }}/{{ session.max_players }}). Ask the organizer if a spot opens up.
          </div>
          <q-btn outline no-caps color="primary" class="full-width" icon="eva-tv-outline" label="View live board" :to="{ name: 'display', params: { code } }" />
        </template>

        <!-- Logged out: sign in, or join as a guest (organizer approves) -->
        <template v-else-if="session.joinable && !auth.isAuthenticated">
          <q-btn
            v-if="myGuestToken"
            class="big-action full-width q-mb-sm"
            color="primary"
            unelevated
            label="Open my guest spot"
            :to="{ name: 'guest-play', params: { code } }"
          />
          <template v-else-if="!guestFormOpen">
            <q-btn class="big-action full-width q-mb-sm" color="primary" unelevated label="Log in to join" @click="joinAndCheckIn" />
            <template v-if="session.guest_self_join !== false">
              <q-btn class="full-width q-mb-sm" outline no-caps color="primary" icon="eva-person-outline" label="Join as guest (no account)" @click="guestFormOpen = true" />
              <div class="text-caption text-grey-6 q-mb-md">Guests are approved by the organizer before entering the queue.</div>
            </template>
          </template>
          <q-form v-else class="text-left q-mb-md" style="display: grid; gap: 10px" @submit.prevent="joinAsGuest">
            <q-input v-model="guest.display_name" outlined dense label="Your name" maxlength="40" autocomplete="name" hide-bottom-space :rules="[(v) => (v && v.trim().length >= 2) || 'Enter your name']" />
            <q-input v-model="guest.guest_phone" outlined dense label="Mobile (optional)" type="tel" inputmode="tel" maxlength="20" hide-bottom-space />
            <q-select v-model="guest.rating" outlined dense emit-value map-options clearable :options="RATING_OPTIONS" label="Skill level (optional)" />
            <q-btn class="big-action full-width" color="primary" unelevated label="Join as guest" type="submit" :loading="guestJoining" />
            <q-btn flat no-caps color="grey-8" label="Back" @click="guestFormOpen = false" />
          </q-form>
        </template>

        <template v-else-if="session.joinable">
          <q-btn
            class="big-action full-width q-mb-sm"
            color="primary"
            unelevated
            label="Check in"
            :loading="joining"
            @click="joinAndCheckIn"
          />
          <div class="text-caption text-grey-6 q-mb-md">Joins the session and puts you in the queue.</div>
          <q-btn
            outline
            no-caps
            color="primary"
            class="full-width"
            icon="eva-tv-outline"
            label="View live board instead"
            :to="{ name: 'display', params: { code } }"
          />
        </template>

        <template v-else>
          <div class="text-caption text-negative q-mb-md">{{ notJoinableReason }}</div>
          <q-btn
            outline
            no-caps
            color="primary"
            class="full-width"
            icon="eva-tv-outline"
            label="View live board"
            :to="{ name: 'display', params: { code } }"
          />
        </template>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { guestJoin, guestTokens, resolveCode, saveGuestToken } from 'src/api/openPlay'
import { RATING_OPTIONS } from 'src/utils/ratings'
import { useAuthStore } from 'src/stores/auth'
import { usePlaySessionStore } from 'src/stores/playSession'
import { haptic } from 'src/utils/native'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const playStore = usePlaySessionStore()

const code = String(route.params.code || '').toUpperCase()
const session = ref(null)
const loading = ref(true)
const error = ref(null) // 'not_found' | 'network'
const isFull = computed(() => !!session.value?.max_players && session.value.player_count >= session.value.max_players)
const notJoinableReason = computed(() => ({
  draft: "This session hasn't opened for check-in yet.",
  ended: 'This session has ended.',
  cancelled: 'This session was cancelled.',
})[session.value?.status] || 'This session is not open for registration.')
const joining = ref(false)

// ——— Guest self-join (no account) ———
const myGuestToken = guestTokens()[code] || null
const guestFormOpen = ref(false)
const guestJoining = ref(false)
const guest = ref({ display_name: '', guest_phone: '', rating: null })
async function joinAsGuest() {
  guestJoining.value = true
  try {
    const res = await guestJoin(code, {
      display_name: guest.value.display_name.trim(),
      guest_phone: guest.value.guest_phone || null,
      rating: guest.value.rating || null,
    })
    saveGuestToken(code, res.guest_token)
    haptic('success')
    router.push({ name: 'guest-play', params: { code } })
  } catch (e) {
    haptic('error')
    $q.notify({ message: e.response?.data?.message || 'Could not join as guest', color: 'negative' })
  } finally {
    guestJoining.value = false
  }
}

async function joinAndCheckIn() {
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: `/join/${code}` } })
    return
  }
  joining.value = true
  try {
    // The code proves you were invited (private sessions require it).
    await playStore.join(session.value.id, { check_in: true, join_code: code })
    haptic('success')
    $q.notify({ message: 'Checked in — you’re in the queue! 🎾', color: 'positive' })
    router.push({ name: 'play' })
  } catch (e) {
    const message = e.response?.data?.message || 'Could not join'
    if (e.response?.status === 409 || message.toLowerCase().includes('already')) {
      playStore.setActive(session.value.id)
      router.push({ name: 'play' })
      return
    }
    haptic('error')
    $q.notify({ message, color: 'negative' })
  } finally {
    joining.value = false
  }
}

function goToMyQueue() {
  playStore.setActive(session.value.id)
  router.push({ name: 'play' })
}

async function load() {
  loading.value = true
  error.value = null
  try {
    session.value = await resolveCode(code)
  } catch (e) {
    error.value = e.response && [404, 422].includes(e.response.status) ? 'not_found' : 'network'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
