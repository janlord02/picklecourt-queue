<template>
  <q-page class="auth-page">
    <div class="auth-wrap">
      <div class="auth-brand">
        <img :src="logoUrl" alt="PickleCourt" class="auth-logo" />
        <span class="brand-badge">QUEUE</span>
      </div>
      <div class="auth-tagline">Open play queues &amp; smart matchmaking</div>

      <div class="auth-card">
        <div class="auth-title">Create your account</div>
        <div class="auth-sub">Free for players — join queues and track every game.</div>

        <q-form class="form-stack" @submit.prevent="submit">
          <q-input
            v-model="form.name"
            outlined
            label="Full name"
            autocomplete="name"
            hide-bottom-space
            :error="!!fieldErrors.name"
            :error-message="fieldErrors.name"
            :rules="[(v) => !!v?.trim() || 'Name is required']"
          />
          <q-input
            v-model="form.email"
            outlined
            type="email"
            label="Email"
            autocomplete="email"
            hide-bottom-space
            :error="!!fieldErrors.email"
            :error-message="fieldErrors.email"
            :rules="[(v) => !!v || 'Email is required']"
          />
          <q-input v-model="form.phone" outlined label="Mobile (optional)" autocomplete="tel" />
          <q-input
            v-model="form.password"
            outlined
            :type="showPassword ? 'text' : 'password'"
            label="Password"
            autocomplete="new-password"
            hide-bottom-space
            :error="!!fieldErrors.password"
            :error-message="fieldErrors.password"
            :rules="[(v) => (v && v.length >= 8) || 'At least 8 characters']"
          >
            <template #append>
              <q-icon
                :name="showPassword ? 'eva-eye-off-outline' : 'eva-eye-outline'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>
          <q-input
            v-model="form.password_confirmation"
            outlined
            :type="showPassword ? 'text' : 'password'"
            label="Confirm password"
            autocomplete="new-password"
            hide-bottom-space
            :rules="[(v) => v === form.password || 'Passwords don’t match']"
          />

          <div v-if="generalError" class="text-negative text-caption">{{ generalError }}</div>

          <q-btn
            class="big-action full-width"
            color="primary"
            unelevated
            label="Create account"
            type="submit"
            :loading="auth.loading"
          />
        </q-form>
      </div>

      <div class="auth-alt">
        Already have an account?
        <router-link :to="{ name: 'login', query: route.query }">Sign in</router-link>
      </div>
      <div class="auth-note">
        Venue owner? Subscribe your business on PickleCourt and your organizer tools unlock here
        automatically.
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import logoUrl from 'src/assets/logo.png'
import { useAuthStore } from 'src/stores/auth'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
  password_confirmation: '',
})
const showPassword = ref(false)
const fieldErrors = reactive({ name: '', email: '', password: '' })
const generalError = ref('')

async function submit() {
  fieldErrors.name = ''
  fieldErrors.email = ''
  fieldErrors.password = ''
  generalError.value = ''
  try {
    await auth.register({
      name: form.name.trim(),
      email: form.email,
      phone: form.phone || null,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })
    $q.notify({ message: `Welcome to PickleCourt, ${auth.user?.name}!`, color: 'positive' })
    // Only in-app paths — "//evil.com" or absolute URLs are dropped.
    const redirect = route.query.redirect
    const safe =
      typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
        ? redirect
        : null
    router.replace(safe || { name: 'home' })
  } catch (e) {
    const errors = e.response?.data?.errors || {}
    fieldErrors.name = errors.name?.[0] || ''
    fieldErrors.email = errors.email?.[0] || ''
    fieldErrors.password = errors.password?.[0] || ''
    if (!fieldErrors.name && !fieldErrors.email && !fieldErrors.password) {
      generalError.value = e.response?.data?.message || 'Registration failed — please try again.'
    }
  }
}
</script>
