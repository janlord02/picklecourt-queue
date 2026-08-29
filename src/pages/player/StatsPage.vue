<template>
  <q-page>
    <div class="app-page">
      <div class="text-h6 text-weight-bold q-mb-md">Stats</div>

      <!-- All-time (across every session, account holders) -->
      <template v-if="auth.isAuthenticated && myStats">
        <span class="section-label">All-time</span>
        <div class="play-card">
          <div class="row text-center">
            <div class="col">
              <div class="text-h6 text-weight-bold tnum">{{ myStats.totals.games }}</div>
              <div class="text-caption text-grey-7">Games</div>
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold tnum">
                {{ myStats.totals.wins }}–{{ myStats.totals.losses }}
              </div>
              <div class="text-caption text-grey-7">Record</div>
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold tnum">
                {{ myStats.totals.win_rate != null ? `${myStats.totals.win_rate}%` : '—' }}
              </div>
              <div class="text-caption text-grey-7">Win rate</div>
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold tnum">{{ myStats.totals.sessions_played }}</div>
              <div class="text-caption text-grey-7">Sessions</div>
            </div>
          </div>
          <div v-if="myStats.totals.avg_wait_seconds != null" class="text-caption text-grey-6 text-center q-mt-sm">
            Average wait per game: {{ formatSeconds(myStats.totals.avg_wait_seconds) }}
          </div>
        </div>
      </template>

      <!-- Current session -->
      <template v-if="playStore.sessionId">
        <span class="section-label">{{ playStore.session?.name || 'This session' }}</span>
        <div v-if="me" class="play-card">
          <div class="row text-center">
            <div class="col">
              <div class="text-h6 text-weight-bold tnum">{{ me.games_played }}</div>
              <div class="text-caption text-grey-7">Games</div>
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold tnum">{{ me.wins }}</div>
              <div class="text-caption text-grey-7">Wins</div>
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold tnum">{{ me.losses }}</div>
              <div class="text-caption text-grey-7">Losses</div>
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold tnum">{{ winRate }}</div>
              <div class="text-caption text-grey-7">Win rate</div>
            </div>
          </div>
        </div>

        <span class="section-label">Leaderboard</span>
        <SessionLeaderboard
          :leaderboard="playStore.leaderboard"
          :highlight-player-id="me?.id ?? null"
        />

        <span class="section-label">Recent games</span>
        <div class="play-card">
          <div v-if="!playStore.recentMatches.length" class="empty-state">
            <div class="empty-state-title">No games yet</div>
            <div class="text-caption">Games will show here as they finish.</div>
          </div>
          <div v-for="match in playStore.recentMatches" :key="match.id" class="list-row">
            <div class="col">
              <div class="text-caption">
                <span class="text-weight-bold">{{ teamNames(match.team_a) }}</span>
                <span class="text-grey-5"> vs </span>
                <span class="text-weight-bold">{{ teamNames(match.team_b) }}</span>
              </div>
              <div class="text-caption text-grey-6">
                Game {{ match.game_number }} · {{ match.court_label || 'Court' }}
              </div>
            </div>
            <div class="text-weight-bold tnum">{{ match.team_a_score }}–{{ match.team_b_score }}</div>
          </div>
        </div>
      </template>

      <div v-else-if="!auth.isAuthenticated || !myStats" class="play-card empty-state">
        <div class="empty-state-title">No session yet</div>
        <div class="text-caption">Join a session to see live stats and the leaderboard.</div>
      </div>

      <!-- Session history: tap to review that session's board -->
      <template v-if="myStats && myStats.history.length">
        <span class="section-label">Session history</span>
        <div class="play-card q-pa-none">
          <div
            v-for="entry in myStats.history"
            :key="entry.session_id"
            class="list-row cursor-pointer"
            @click="openHistory(entry)"
          >
            <div class="col">
              <div class="row items-center no-wrap" style="gap: 8px">
                <span class="text-weight-bold ellipsis">{{ entry.name || 'Session' }}</span>
                <span v-if="entry.session_id === playStore.sessionId" class="live-tag">
                  <i class="live-dot" />Viewing
                </span>
              </div>
              <div class="text-caption text-grey-7">
                {{ entry.date }}
                <template v-if="entry.games"> · {{ entry.games }} games</template>
              </div>
            </div>
            <div class="text-weight-bold tnum">{{ entry.wins }}–{{ entry.losses }}</div>
            <q-icon name="eva-chevron-right-outline" size="16px" class="text-grey-5" />
          </div>
        </div>
      </template>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getMyStats } from 'src/api/openPlay'
import SessionLeaderboard from 'src/components/SessionLeaderboard.vue'
import { usePlaySessionRealtime } from 'src/composables/usePlayRealtime'
import { useAuthStore } from 'src/stores/auth'
import { usePlaySessionStore } from 'src/stores/playSession'
import { formatSeconds } from 'src/utils/format'

const auth = useAuthStore()
const playStore = usePlaySessionStore()
const me = computed(() => playStore.myPlayer)
const myStats = ref(null)

const winRate = computed(() => {
  if (!me.value || !me.value.games_played) return '—'
  return `${Math.round((me.value.wins / me.value.games_played) * 100)}%`
})

function teamNames(team) {
  return (team || []).map((slot) => slot.display_name).join(' + ')
}

// Reviewing a past session = pointing the state mirror at it — the
// leaderboard/recent-games sections above simply show that session.
function openHistory(entry) {
  playStore.setActive(entry.session_id)
  playStore.fetchState().catch(() => {})
}

const sessionIdRef = computed(() => playStore.sessionId)
usePlaySessionRealtime(sessionIdRef, () => playStore.fetchState().catch(() => {}))

onMounted(() => {
  if (playStore.sessionId) playStore.fetchState().catch(() => {})
  if (auth.isAuthenticated) {
    getMyStats()
      .then((data) => {
        myStats.value = data
      })
      .catch(() => {})
  }
})
</script>
