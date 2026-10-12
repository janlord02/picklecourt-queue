<template>
  <q-page>
    <div class="app-page legal">
      <q-btn
        flat
        no-caps
        dense
        icon="eva-arrow-back-outline"
        label="Back"
        color="grey-8"
        class="q-mb-sm"
        @click="goBack"
      />

      <!-- Privacy policy (store listing + in-app link) -->
      <template v-if="kind === 'privacy'">
        <h1>Privacy policy</h1>
        <p class="legal-meta">PickleCourt Queue · last updated {{ UPDATED }}</p>
        <p>
          PickleCourt Queue is our free app and website (openplay.picklecourt.ph) for running pickleball open play.
          This page explains what it collects and why.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li><b>Name</b> — shown in the session queue, on court assignments and on the venue TV board.</li>
          <li>
            <b>Email address and password</b> — to create your account, sign you in and reset your password. Passwords
            are stored hashed, never in plain text.
          </li>
          <li><b>Mobile number (optional)</b> — so organizers of sessions you join can contact you.</li>
          <li>
            <b>Skill level and game results</b> — to place you in the queue, build balanced games and show leaderboards.
          </li>
          <li>
            <b>Guest sign-ups</b> — if you join without an account, we store the name, skill level and optional mobile
            number you enter so the organizer can approve you and place you in games.
          </li>
        </ul>

        <h2>What we don't collect</h2>
        <p>
          We don't collect your location, contacts, photos, camera, microphone, health or payment data. The app has no
          ads, no analytics or tracking tools, and we never sell your data or share it with advertisers.
        </p>

        <h2>Who can see it</h2>
        <p>
          Other players and organizers in a session see your name, skill level, queue position and game results.
          Organizers can also see your mobile number if you provided one. Leaderboards and the venue TV board show
          names (as "First L.") and results.
        </p>

        <h2>Security</h2>
        <p>All data is sent over encrypted connections (HTTPS) and stored on our servers.</p>

        <h2>Deleting your account</h2>
        <p>
          You can delete your account at any time in the app: <b>Profile → Delete account</b>. You can also email
          <a :href="`mailto:${SUPPORT}`">{{ SUPPORT }}</a> from your account email.
          <router-link :to="{ name: 'delete-account' }">How account deletion works</router-link>.
        </p>

        <h2>Contact</h2>
        <p>
          Questions: <a :href="`mailto:${SUPPORT}`">{{ SUPPORT }}</a>
        </p>
      </template>

      <!-- Account deletion (Google Play "Data deletion" web link) -->
      <template v-else>
        <h1>Delete your PickleCourt Queue account</h1>
        <p class="legal-meta">PickleCourt Queue · last updated {{ UPDATED }}</p>

        <h2>In the app</h2>
        <p>
          Open PickleCourt Queue, go to <b>Profile → Delete account</b>, enter your password and confirm. Your account
          is deleted straight away.
        </p>
        <q-btn
          v-if="auth.isAuthenticated"
          outline
          no-caps
          color="negative"
          icon="eva-trash-2-outline"
          label="Go to Delete account"
          class="q-mb-md"
          :to="{ name: 'me' }"
        />

        <h2>Without the app</h2>
        <p>
          Email <a :href="deleteMailto">{{ SUPPORT }}</a> from the email address on your account, with the subject
          <b>Delete my account</b>. We delete it within 30 days and reply to confirm.
        </p>

        <h2>What is deleted</h2>
        <p>Your name, email address, mobile number, password, profile details and sign-in sessions on every device.</p>

        <h2>What is kept</h2>
        <p>
          Results of games you played (and the skill level used to balance them) stay in past session records so other
          players' standings stay correct, but they show as "Deleted player" and are no longer linked to you.
        </p>

        <p class="q-mt-lg">
          <router-link :to="{ name: 'privacy' }">Privacy policy</router-link>
        </p>
      </template>
    </div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth'

const UPDATED = 'October 2026'
const SUPPORT = 'support@picklecourt.ph'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const kind = computed(() => (route.name === 'privacy' ? 'privacy' : 'delete'))
const deleteMailto = `mailto:${SUPPORT}?subject=${encodeURIComponent('Delete my account')}`

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace({ name: 'home' })
}
</script>

<style scoped>
.legal {
  max-width: 720px;
  margin: 0 auto;
  line-height: 1.6;
}
.legal h1 {
  font-size: 26px;
  line-height: 1.2;
  font-weight: 800;
  margin: 4px 0 4px;
}
.legal h2 {
  font-size: 17px;
  font-weight: 700;
  margin: 22px 0 6px;
}
.legal p,
.legal ul {
  margin: 0 0 10px;
}
.legal ul {
  padding-left: 20px;
}
.legal li {
  margin-bottom: 6px;
}
.legal-meta {
  color: var(--q-grey-7, #6b7c75);
  font-size: 13px;
}
</style>
