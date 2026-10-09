<template>
  <q-layout view="lHh Lpr lFf">
    <q-header class="player-header safe-top text-white">
      <q-toolbar>
        <router-link :to="{ name: 'home' }" class="row items-center no-wrap" style="gap: 8px; text-decoration: none" aria-label="PickleCourt Queue home">
          <img :src="logoUrl" alt="PickleCourt" class="header-logo" height="26" />
          <span class="brand-badge">QUEUE</span>
        </router-link>

        <!-- Desktop: nav lives in the header (the thumb bar hides ≥1024px) -->
        <nav class="header-nav">
          <router-link
            v-for="tab in tabs"
            :key="tab.name"
            :to="{ name: tab.name }"
            class="header-nav-link"
            :class="{ active: $route.name === tab.name }"
          >
            {{ tab.label }}
          </router-link>
        </nav>

        <q-space />
        <!-- Live-session shortcut: pulsing dot + session name → Play tab -->
        <button
          v-if="playStore.sessionId && playStore.session"
          class="header-session"
          type="button"
          :aria-label="`Open live session ${playStore.session.name}`"
          @click="$router.push({ name: 'play' })"
        >
          <i class="header-session-dot" />
          <span class="header-session-name">{{ playStore.session.name }}</span>
        </button>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view v-slot="{ Component, route: viewRoute }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="viewRoute.path" />
        </transition>
      </router-view>
    </q-page-container>

    <!-- Lead-gen: player surfaces only (never the organizer console/TV).
         Not over the signed-out welcome screen — its CTAs come first. -->
    <RegisterCourtBanner v-if="!($route.name === 'home' && !auth.isAuthenticated)" />

    <nav class="bottom-nav" aria-label="Main">
      <router-link
        v-for="tab in tabs"
        :key="tab.name"
        :to="{ name: tab.name }"
        class="bottom-nav-tab"
        :class="{ active: $route.name === tab.name }"
        :aria-current="$route.name === tab.name ? 'page' : undefined"
        @click="onTab(tab)"
      >
        <span class="bottom-nav-icon"><q-icon :name="$route.name === tab.name ? tab.activeIcon : tab.icon" /></span>
        <span>{{ tab.label }}</span>
      </router-link>
    </nav>
  </q-layout>
</template>

<script setup>
import logoUrl from 'src/assets/logo.png'
import RegisterCourtBanner from 'src/components/RegisterCourtBanner.vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from 'src/stores/auth'
import { usePlaySessionStore } from 'src/stores/playSession'
import { haptic } from 'src/utils/native'

const route = useRoute()
const auth = useAuthStore()
const playStore = usePlaySessionStore()

// Filled icon marks the active tab (outline otherwise), like native tab bars.
const tabs = [
  { name: 'home', label: 'Home', icon: 'eva-home-outline', activeIcon: 'eva-home' },
  { name: 'play', label: 'Play', icon: 'eva-flash-outline', activeIcon: 'eva-flash' },
  { name: 'stats', label: 'Stats', icon: 'eva-bar-chart-outline', activeIcon: 'eva-bar-chart' },
  { name: 'me', label: 'Profile', icon: 'eva-person-outline', activeIcon: 'eva-person' },
]

// Re-tapping the current tab scrolls back to the top (native convention).
function onTab(tab) {
  haptic('light')
  if (route.name === tab.name) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<style scoped>
/* Same dark teal as the bottom nav; the full-color wordmark sits on it
   like on the TV board. */
.player-header {
  background: #0c2b23;
  border-bottom: 1px solid #1d4a3d;
}

.header-logo {
  height: 26px;
  width: auto;
  display: block;
}

/* "You're in a live session" pill — tap returns to the Play tab. */
.header-session {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  /* Phones: truncate early ("Seeded Op…") so the pill never crowds the
     logo; roomier screens can show more of the name. */
  max-width: clamp(110px, 34vw, 340px);
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  min-height: 36px;
}

.header-session-dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #c7f000;
  animation: live-pulse 1.6s ease-in-out infinite;
}

.header-session-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Desktop header nav — hidden below 1024px (the bottom bar takes over). */
.header-nav {
  display: none;
  align-items: center;
  gap: 4px;
  margin-left: 32px;
}

@media (min-width: 1024px) {
  .header-nav {
    display: flex;
  }
}

.header-nav-link {
  color: rgba(255, 255, 255, 0.66);
  font-size: 13.5px;
  font-weight: 600;
  padding: 7px 15px;
  border-radius: 999px;
  text-decoration: none;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.header-nav-link:hover {
  color: #fff;
}

.header-nav-link.active {
  color: #c7f000;
  background: rgba(255, 255, 255, 0.07);
}
</style>
