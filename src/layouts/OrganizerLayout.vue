<template>
  <q-layout view="lHh Lpr lFf">
    <q-header class="organizer-header safe-top text-white">
      <q-toolbar>
        <q-btn
          v-if="$route.name !== 'organizer-sessions'"
          flat
          round
          class="tap-44"
          icon="eva-arrow-back-outline"
          aria-label="Back to your sessions"
          @click="$router.push({ name: 'organizer-sessions' })"
        />
        <q-toolbar-title class="text-weight-bold row items-center no-wrap">
          <img
            :src="iconUrl"
            alt=""
            width="24"
            height="24"
            style="border-radius: 6px; display: block"
            class="q-mr-sm"
          />
          <span class="ellipsis">{{ headerTitle }}</span>
        </q-toolbar-title>
        <!-- Phones: icon-only to keep room for the session name. -->
        <q-btn
          outline
          no-caps
          color="white"
          icon="eva-person-outline"
          :label="$q.screen.gt.xs ? 'Player view' : undefined"
          :round="!$q.screen.gt.xs"
          :padding="$q.screen.gt.xs ? '6px 12px' : undefined"
          :class="$q.screen.gt.xs ? undefined : 'tap-44'"
          aria-label="Switch to player view"
          :to="{ name: 'home' }"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <!-- Keyed so navigating between two live sessions remounts the page
           (a reused component would keep operating on the old session id). -->
      <router-view v-slot="{ Component, route: viewRoute }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="viewRoute.fullPath" />
        </transition>
      </router-view>
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

<style scoped>
/* Same deep brand green + hairline as the player header. */
.organizer-header {
  background: #0c2b23;
  border-bottom: 1px solid #1d4a3d;
}
</style>
