<template>
  <q-layout view="lHh Lpr lFf">
    <q-header class="bg-dark text-white">
      <q-toolbar>
        <q-btn
          v-if="$route.name !== 'organizer-sessions'"
          flat
          dense
          round
          icon="eva-arrow-back-outline"
          @click="$router.push({ name: 'organizer-sessions' })"
        />
        <q-toolbar-title class="text-weight-bold row items-center no-wrap">
          <img
            :src="iconUrl"
            alt=""
            style="height: 24px; border-radius: 6px; display: block"
            class="q-mr-sm"
          />
          <span class="ellipsis">{{ headerTitle }}</span>
        </q-toolbar-title>
        <q-btn
          outline
          dense
          no-caps
          color="white"
          icon="eva-person-outline"
          label="Player view"
          padding="4px 12px"
          :to="{ name: 'home' }"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <!-- Keyed so navigating between two live sessions remounts the page
           (a reused component would keep operating on the old session id). -->
      <router-view :key="$route.fullPath" />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import iconUrl from 'src/assets/picklecourt-icon.png'
import { usePlaySessionStore } from 'src/stores/playSession'

const route = useRoute()
const playStore = usePlaySessionStore()

// Inside a session the header carries the session's name; the list page
// says what it is. "Organizer" told you nothing you didn't already know.
const headerTitle = computed(() => {
  if (route.name === 'organizer-live' && playStore.session?.name) {
    return playStore.session.name
  }
  return 'Your sessions'
})
</script>
