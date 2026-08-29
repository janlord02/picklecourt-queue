<template>
  <q-page class="auth-page">
    <div class="auth-wrap">
      <div class="auth-brand">
        <img :src="logoUrl" alt="PickleCourt" class="auth-logo" />
        <span class="brand-badge">QUEUE</span>
      </div>
      <div class="auth-tagline">Open play queues &amp; smart matchmaking</div>

      <div class="auth-card">
        <div class="auth-title">Welcome back</div>
        <div class="auth-sub">Sign in to join queues and track your games.</div>

        <q-form class="form-stack" @submit.prevent="submit">
          <q-input
            v-model="email"
            outlined
            type="email"
            label="Email"
            autocomplete="email"
            hide-bottom-space
            :rules="[(v) => !!v || 'Email is required']"
          />
          <q-input
            v-model="password"
            outlined
            :type="showPassword ? 'text' : 'password'"
            label="Password"
            autocomplete="current-password"
            hide-bottom-space
            :rules="[(v) => !!v || 'Password is required']"
          >
            <template #append>
              <q-icon
                :name="showPassword ? 'eva-eye-off-outline' : 'eva-eye-outline'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <div class="row justify-end">
            <a class="auth-link cursor-pointer" @click="openForgot">Forgot password?</a>
          </div>

          <div v-if="auth.error" class="text-negative text-caption">{{ auth.error }}</div>

          <q-btn
            class="big-action full-width"
            color="primary"
            unelevated
            label="Sign in"
            type="submit"
            :loading="auth.loading"
          />
        </q-form>
      </div>

      <div class="auth-alt">
        New to PickleCourt?
        <router-link :to="{ name: 'register', query: route.query }">Create an account</router-link>
      </div>
      <div class="auth-note">One account — the same login works in the booking app.</div>
    </div>

    <!-- Forgot password -->
    <q-dialog v-model="forgotDialog">
      <q-card class="dialog-card q-pa-md" style="max-width: 360px">
        <div class="text-subtitle1 text-weight-bold q-mb-xs">Reset your password</div>
        <div class="text-caption text-grey-7 q-mb-md">
          Enter your account email and we’ll send you a reset link.
        </div>
        <q-form @submit.prevent="sendReset">
          <q-input
            v-model="forgotEmail"
            outlined
            dense
            type="email"
            label="Email"
            autofocus
            hide-bottom-space
            :rules="[(v) => !!v || 'Email is required']"
          />
          <div class="row justify-end q-mt-md" style="gap: 8px">
            <q-btn flat no-caps color="grey-8" label="Cancel" @click="forgotDialog = false" />
            <q-btn
              unelevated
              no-caps
              color="primary"
              label="Send reset link"
              type="submit"
              :loading="sendingReset"
            />
          </div>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import logoUrl from 'src/assets/logo.png'
import { api } from 'src/boot/axios'
import { useAuthStore } from 'src/stores/auth'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)

const forgotDialog = ref(false)
const forgotEmail = ref('')
const sendingReset = ref(false)

// Only in-app paths — "//evil.com" or absolute URLs are dropped.
function safeRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : null
}

async function submit() {
  try {
    await auth.login(email.value, password.value)
    router.replace(safeRedirect(route.query.redirect) || { name: 'home' })
  } catch {
    // auth.error is shown inline
  }
}

function openForgot() {
  forgotEmail.value = forgotEmail.value || email.value
  forgotDialog.value = true
}

async function sendReset() {
  sendingReset.value = true
  try {
    await api.post('/password/forgot', { email: forgotEmail.value })
    forgotDialog.value = false
    $q.notify({
      message: `If an account exists for ${forgotEmail.value}, a reset link is on its way.`,
      color: 'positive',
    })
  } catch (e) {
    $q.notify({
      message:
        e.response?.data?.errors?.email?.[0] ||
        e.response?.data?.message ||
        'Could not send the reset link',
      color: 'negative',
    })
  } finally {
    sendingReset.value = false
  }
}
</script>
