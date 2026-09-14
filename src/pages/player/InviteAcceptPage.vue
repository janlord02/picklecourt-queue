<template>
  <q-page>
    <div class="app-page">
      <div class="play-card q-pa-lg text-center">
        <div v-if="loading" class="q-py-lg">
          <q-spinner color="primary" size="32px" />
        </div>

        <template v-else-if="!invite">
          <q-icon name="eva-alert-triangle-outline" size="42px" class="text-grey-5 q-mb-sm" />
          <div class="text-subtitle1 text-weight-bold q-mb-xs">Invitation not found</div>
          <div class="text-caption text-grey-7 q-mb-md">
            This invitation link is invalid or has been removed.
          </div>
          <q-btn class="full-width" unelevated color="primary" no-caps label="Go home" :to="{ name: 'home' }" />
        </template>

        <template v-else>
          <q-icon name="eva-people-outline" size="42px" color="primary" class="q-mb-sm" />
          <div class="text-h6 text-weight-bold">Host invitation</div>
          <div class="text-subtitle1 q-mt-xs">{{ invite.session_title }}</div>
          <div class="text-caption text-grey-7 q-mb-md">
            Invited by {{ invite.invited_by || 'an organizer' }}<template v-if="invite.business_name"> · {{ invite.business_name }}</template>
          </div>

          <!-- Not pending: explain and stop -->
          <template v-if="invite.status !== 'pending'">
            <q-banner class="bg-grey-2 text-grey-8 rounded-borders q-mb-md">
              {{ statusMessage }}
            </q-banner>
            <q-btn class="full-width" unelevated color="primary" no-caps label="Go to organizer console" :to="{ name: 'organizer-sessions' }" />
          </template>

          <!-- Pending + signed in: accept / decline -->
          <template v-else-if="auth.isAuthenticated">
            <p class="text-body2 text-grey-8 q-mb-md">
              Accept to become a host — you'll be able to run this session (matchmaking,
              courts, scoring) from the organizer console.
            </p>
            <q-btn
              class="full-width big-action q-mb-sm"
              unelevated color="primary" no-caps label="Accept invitation"
              :loading="acting"
              @click="accept"
            />
            <q-btn
              class="full-width"
              flat color="grey-7" no-caps label="Decline"
              :disable="acting"
              @click="decline"
            />
          </template>

          <!-- Pending + signed out: sign in or create an account -->
          <template v-else>
            <p class="text-body2 text-grey-8 q-mb-md">
              Sign in to accept this invitation. New here? Create an account with
              <span class="text-weight-bold">{{ invite.email }}</span> first, then you'll come
              right back to accept.
            </p>
            <q-btn
              class="full-width big-action q-mb-sm"
              unelevated color="primary" no-caps label="Sign in to accept"
              :to="{ name: 'login', query: { redirect: route.fullPath } }"
            />
            <q-btn
              class="full-width"
              outline color="primary" no-caps label="Create an account"
              :to="{ name: 'register', query: { redirect: route.fullPath } }"
            />
          </template>
        </template>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { getInvitation, acceptInvitation, declineInvitation } from 'src/api/openPlay'
import { useAuthStore } from 'src/stores/auth'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const acting = ref(false)
const invite = ref(null)

const token = computed(() => route.params.token)

const statusMessage = computed(() => {
  switch (invite.value?.status) {
    case 'accepted':
      return 'This invitation has already been accepted.'
    case 'declined':
      return 'This invitation was declined.'
    case 'revoked':
      return 'This invitation is no longer available.'
    case 'expired':
      return 'This invitation has expired. Ask the organizer to send a new one.'
    default:
      return 'This invitation is no longer pending.'
  }
})

onMounted(load)

async function load() {
  loading.value = true
  try {
    invite.value = await getInvitation(token.value)
  } catch {
    invite.value = null
  } finally {
    loading.value = false
  }
}

async function accept() {
  acting.value = true
  try {
    const result = await acceptInvitation(token.value)
    $q.notify({ type: 'positive', message: `You're now a host of ${invite.value.session_title}.` })
    if (result?.play_session_id) {
      router.push({ name: 'organizer-live', params: { id: result.play_session_id } })
    } else {
      router.push({ name: 'organizer-sessions' })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Could not accept the invitation.' })
  } finally {
    acting.value = false
  }
}

async function decline() {
  acting.value = true
  try {
    await declineInvitation(token.value)
    $q.notify({ type: 'info', message: 'Invitation declined.' })
    router.push({ name: 'home' })
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Could not decline.' })
  } finally {
    acting.value = false
  }
}
</script>
