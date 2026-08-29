<template>
  <q-layout view="lHh Lpr lFf">
    <q-header class="player-header text-white">
      <q-toolbar>
        <router-link :to="{ name: 'home' }" class="row items-center no-wrap" style="gap: 8px">
          <img :src="logoUrl" alt="PickleCourt" class="header-logo" />
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
          @click="$router.push({ name: 'play' })"
        >
          <i class="header-session-dot" />
          <span class="header-session-name">{{ playStore.session.name }}</span>
        </button>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <nav class="bottom-nav">
      <router-link
        v-for="tab in tabs"
        :key="tab.name"
        :to="{ name: tab.name }"
        class="bottom-nav-tab"
        :class="{ active: $route.name === tab.name }"
      >
        <q-icon :name="tab.icon" />
        <span>{{ tab.label }}</span>
      </router-link>
    </nav>
  </q-layout>
</template>

<script setup>
import logoUrl from 'src/assets/logo.png'
import { usePlaySessionStore } from 'src/stores/playSession'

const playStore = usePlaySessionStore()

const tabs = [
  { name: 'home', label: 'Home', icon: 'eva-home-outline' },
  { name: 'play', label: 'Play', icon: 'eva-flash-outline' },
  { name: 'stats', label: 'Stats', icon: 'eva-bar-chart-outline' },
  { name: 'me', label: 'Profile', icon: 'eva-person-outline' },
]
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
