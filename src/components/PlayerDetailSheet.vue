<template>
  <q-dialog
    :model-value="modelValue"
    position="bottom"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="sheet">
      <q-card-section class="q-pa-md">
        <div v-if="loading" class="text-center q-pa-lg">
          <q-spinner size="28px" color="primary" />
        </div>

        <template v-else-if="summary">
          <!-- Header -->
          <div class="row items-center q-mb-md" style="gap: 12px">
            <q-avatar color="primary" text-color="white" size="44px">
              {{ initials }}
            </q-avatar>
            <div class="col">
              <div class="text-subtitle1 text-weight-bold">
                {{ summary.player.display_name }}
                <span v-if="summary.player.is_guest" class="text-caption text-grey-6">guest</span>
              </div>
              <div class="row items-center" style="gap: 8px">
                <StatusChip :status="summary.player.status" />
                <span v-if="summary.player.rating" class="text-caption text-grey-7">
                  {{ summary.player.rating.toFixed(1) }} ({{ summary.player.rating_source }})
                </span>
              </div>
            </div>
          </div>

          <!-- Stat tiles -->
          <div class="stat-grid q-mb-md">
            <div class="stat-tile">
              <div class="stat-value tnum">{{ summary.stats.wins }}–{{ summary.stats.losses }}</div>
              <div class="stat-label">Record</div>
            </div>
            <div class="stat-tile">
              <div class="stat-value tnum">
                {{ summary.stats.win_rate !== null ? `${summary.stats.win_rate}%` : '—' }}
              </div>
              <div class="stat-label">Win rate</div>
            </div>
            <div class="stat-tile">
              <div class="stat-value tnum">{{ summary.stats.streak || '—' }}</div>
              <div class="stat-label">Streak</div>
            </div>
            <div class="stat-tile">
              <div class="stat-value tnum">
                {{ summary.stats.avg_wait_seconds !== null ? formatSeconds(summary.stats.avg_wait_seconds) : '—' }}
              </div>
              <div class="stat-label">Avg wait</div>
            </div>
            <div class="stat-tile">
              <div class="stat-value tnum">
                {{ summary.stats.avg_point_diff !== null ? signed(summary.stats.avg_point_diff) : '—' }}
              </div>
              <div class="stat-label">Avg diff</div>
            </div>
            <div class="stat-tile">
              <div class="stat-value tnum">{{ formatSeconds(summary.stats.current_wait_seconds) }}</div>
              <div class="stat-label">Waiting now</div>
            </div>
          </div>

          <!-- Game history -->
          <div class="micro-label q-mb-xs">Games this session</div>
          <div v-if="!summary.history.length" class="text-caption text-grey-6 q-mb-md">
            No completed games yet.
          </div>
          <div v-for="game in summary.history" :key="game.match_id" class="list-row">
            <q-badge
              :color="game.won ? 'positive' : 'grey-5'"
              :label="game.won ? 'W' : 'L'"
              style="width: 22px; justify-content: center"
            />
            <div class="col">
              <div class="text-caption">
                <template v-if="game.partners.length">
                  with <b>{{ game.partners.join(' + ') }}</b>
                </template>
                <span class="text-grey-6"> vs {{ game.opponents.join(' + ') }}</span>
              </div>
              <div class="text-caption text-grey-6">
                Game {{ game.game_number }} · {{ game.court_label || 'Court' }}
              </div>
            </div>
            <div class="text-weight-bold tnum">{{ game.my_score }}–{{ game.opponent_score }}</div>
          </div>

          <!-- Variety -->
          <template v-if="summary.partners.length">
            <div class="micro-label q-mt-md q-mb-xs">Played with</div>
            <div class="row" style="gap: 6px; flex-wrap: wrap">
              <q-chip
                v-for="row in summary.partners"
                :key="`p-${row.name}`"
                dense
                outline
                color="primary"
                :label="row.count > 1 ? `${row.name} ×${row.count}` : row.name"
              />
            </div>
          </template>
          <template v-if="summary.opponents.length">
            <div class="micro-label q-mt-md q-mb-xs">Played against</div>
            <div class="row" style="gap: 6px; flex-wrap: wrap">
              <q-chip
                v-for="row in summary.opponents"
                :key="`o-${row.name}`"
                dense
                outline
                color="grey-7"
                :label="row.count > 1 ? `${row.name} ×${row.count}` : row.name"
              />
            </div>
          </template>
        </template>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { getPlayerSummary } from 'src/api/openPlay'
import StatusChip from 'src/components/StatusChip.vue'
import { formatSeconds } from 'src/utils/format'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  sessionId: { type: Number, default: null },
  playerId: { type: Number, default: null },
})
const emit = defineEmits(['update:modelValue'])

const summary = ref(null)
const loading = ref(false)

const initials = computed(() =>
  (summary.value?.player?.display_name || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase(),
)

function signed(value) {
  return value > 0 ? `+${value}` : `${value}`
}

watch(
  () => [props.modelValue, props.playerId],
  async ([open, playerId]) => {
    if (!open || !playerId || !props.sessionId) return
    loading.value = true
    summary.value = null
    try {
      summary.value = await getPlayerSummary(props.sessionId, playerId)
    } catch {
      emit('update:modelValue', false)
    } finally {
      loading.value = false
    }
  },
)
</script>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat-tile {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 8px;
  text-align: center;
}

.stat-value {
  font-size: 17px;
  font-weight: 800;
}

.stat-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-top: 2px;
}
</style>
