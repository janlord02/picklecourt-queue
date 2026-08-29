<template>
  <q-page>
    <div class="app-page">
      <div v-if="loading" class="text-center q-pa-xl">
        <q-spinner size="32px" color="primary" />
      </div>

      <div v-else-if="error" class="play-card text-center q-pa-lg">
        <q-icon name="eva-alert-triangle-outline" size="42px" color="warning" class="q-mb-sm" />
        <div class="text-subtitle1 text-weight-bold q-mb-xs">Session not found</div>
        <div class="text-caption text-grey-7 q-mb-md">
          The code <b>{{ code }}</b> doesn't match any session. Double-check with your organizer.
        </div>
        <q-btn color="primary" outline no-caps label="Back to home" :to="{ name: 'home' }" />
      </div>

      <div v-else-if="session" class="play-card text-center q-pa-lg">
        <div class="micro-label">You're joining</div>
        <div class="text-h5 text-weight-bold q-mt-sm">{{ session.name }}</div>
        <div class="text-caption text-grey-7 q-mb-md">
          {{ session.date }}
          <template v-if="session.start_time">· {{ session.start_time }}–{{ session.end_time }}</template>
          <br />
          {{ session.player_count }}<template v-if="session.max_players">/{{ session.max_players }}</template>
          players
        </div>

        <template v-if="session.joinable">
          <q-btn
            class="big-action full-width q-mb-sm"
            color="primary"
            unelevated
            label="Check in"
            :loading="joining"
            @click="joinAndCheckIn"
          />
          <div class="text-caption text-grey-6">Joins the session and puts you in the queue.</div>
        </template>
        <div v-else class="text-caption text-negative">
          This session is not open for registration.
        </div>

        <q-btn
          flat
          no-caps
          color="grey-7"
          class="q-mt-md"
          label="View live board instead"
          :to="{ name: 'display', params: { code } }"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { resolveCode } from 'src/api/openPlay'
import { useAuthStore } from 'src/stores/auth'
import { usePlaySessionStore } from 'src/stores/playSession'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const playStore = usePlaySessionStore()

const code = String(route.params.code || '').toUpperCase()
const session = ref(null)
const loading = ref(true)
const error = ref(false)
const joining = ref(false)

async function joinAndCheckIn() {
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: `/join/${code}` } })
    return
  }
  joining.value = true
  try {
    await playStore.join(session.value.id, { check_in: true })
    $q.notify({ message: 'Checked in — you’re in the queue! 🎾', color: 'positive' })
    router.push({ name: 'play' })
  } catch (e) {
    const message = e.response?.data?.message || 'Could not join'
    if (message.toLowerCase().includes('already')) {
      playStore.setActive(session.value.id)
      router.push({ name: 'play' })
      return
    }
    $q.notify({ message, color: 'negative' })
  } finally {
    joining.value = false
  }
}

onMounted(async () => {
  try {
    session.value = await resolveCode(code)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})
</script>
