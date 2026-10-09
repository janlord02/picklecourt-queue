<template>
  <q-page class="auth-page">
    <div class="auth-wrap">
      <div class="auth-brand">
        <img :src="logoUrl" alt="PickleCourt" class="auth-logo" />
        <span class="brand-badge">QUEUE</span>
      </div>

      <div class="auth-card">
        <template v-if="done">
          <div class="auth-title">Password updated</div>
          <div class="auth-sub">You can now sign in with your new password.</div>
          <q-btn class="big-action full-width" color="primary" unelevated label="Sign in" :to="{ name: 'login' }" />
        </template>

        <template v-else-if="!token || !email">
          <div class="auth-title">Link incomplete</div>
          <div class="auth-sub">Open the reset link from your email again, or request a new one from Sign in.</div>
          <q-btn class="big-action full-width" color="primary" outline label="Back to sign in" :to="{ name: 'login' }" />
        </template>

        <template v-else>
          <div class="auth-title">Choose a new password</div>
          <div class="auth-sub">For {{ email }}</div>
          <q-form class="form-stack" @submit.prevent="submit">
            <q-input
              v-model="password"
              outlined
              :type="show ? 'text' : 'password'"
              label="New password"
              autocomplete="new-password"
              hide-bottom-space
              :rules="[(v) => (v && v.length >= 8) || 'At least 8 characters']"
            >
              <template #append>
                <q-icon :name="show ? 'eva-eye-off-outline' : 'eva-eye-outline'" class="cursor-pointer" @click="show = !show" />
              </template>
            </q-input>
            <q-input
              v-model="confirm"
              outlined
              :type="show ? 'text' : 'password'"
              label="Confirm new password"
              autocomplete="new-password"
              hide-bottom-space
              :rules="[(v) => v === password || 'Passwords don’t match']"
            />
            <div v-if="error" class="text-negative text-caption">{{ error }}</div>
            <q-btn class="big-action full-width" color="primary" unelevated label="Update password" type="submit" :loading="saving" />
          </q-form>
        </template>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from 'src/boot/axios'
import logoUrl from 'src/assets/logo.png'

const route = useRoute()
const token = String(route.query.token || '')
const email = String(route.query.email || '')
const password = ref('')
const confirm = ref('')
const show = ref(false)
const saving = ref(false)
const error = ref('')
const done = ref(false)

async function submit() {
  error.value = ''
  saving.value = true
  try {
    await api.post('/password/reset', {
      token,
      email,
      password: password.value,
      password_confirmation: confirm.value,
    })
    done.value = true
  } catch (e) {
    const errs = e.response?.data?.errors
    error.value =
      errs?.password?.[0] || errs?.email?.[0] || e.response?.data?.message || 'This reset link is invalid or has expired.'
  } finally {
    saving.value = false
  }
}
</script>
