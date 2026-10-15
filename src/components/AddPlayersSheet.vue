<template>
  <!-- Add players: one by one, a pasted group (one name per line), or
       people from the organizer's earlier sessions. -->
  <q-dialog :model-value="modelValue" position="bottom" @update:model-value="emit('update:modelValue', $event)">
    <q-card class="sheet sheet--tall add-sheet">
      <q-card-section class="q-pa-md q-pb-none">
        <div class="sheet-title q-mb-sm">Add players</div>
        <q-tabs
          v-model="mode"
          dense
          no-caps
          active-color="primary"
          indicator-color="primary"
          align="justify"
          class="add-tabs"
        >
          <q-tab name="one" label="One player" />
          <q-tab name="group" label="Group" />
          <q-tab name="history" label="History" />
        </q-tabs>
      </q-card-section>

      <q-card-section class="q-pa-md">
        <!-- 1) One player -->
        <q-form v-if="mode === 'one'" class="form-stack" @submit.prevent="addOne">
          <q-input
            v-model="one.display_name"
            outlined
            dense
            label="Name"
            hide-bottom-space
            :rules="[(v) => !!(v || '').trim() || 'Name is required']"
          />
          <q-select v-model="one.rating" outlined dense label="Skill level" emit-value map-options :options="RATING_OPTIONS">
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption>{{ scope.opt.description }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <q-input v-model="one.guest_phone" outlined dense label="Mobile (optional)" />
          <q-select
            v-if="groupOptions.length > 1"
            v-model="groupId"
            outlined
            dense
            label="Group"
            emit-value
            map-options
            :options="groupOptions"
          />
          <q-toggle v-model="checkIn" label="Check in now (enter the queue)" />
          <q-btn class="big-action full-width" color="primary" unelevated label="Add player" type="submit" :loading="saving" />
        </q-form>

        <!-- 2) Group: one name per line -->
        <div v-else-if="mode === 'group'" class="form-stack">
          <q-input
            v-model="groupText"
            outlined
            type="textarea"
            autogrow
            label="Names — one per line"
            :placeholder="'Janlord Luga\nIvy Dawn Luga\nJamil Badong\nJoshua Pascua'"
            input-style="min-height: 132px"
            hide-bottom-space
          />
          <div class="parsed">
            <div class="parsed__count">
              <template v-if="parsedNames.length">
                <b>{{ parsedNames.length }}</b> {{ parsedNames.length === 1 ? 'player' : 'players' }} will be added
              </template>
              <template v-else>Type or paste names, one per line.</template>
              <span v-if="repeatedCount" class="text-grey-6"> · {{ repeatedCount }} repeated {{ repeatedCount === 1 ? 'name' : 'names' }} left out</span>
            </div>
            <div v-if="parsedNames.length" class="parsed__chips">
              <span v-for="name in parsedNames.slice(0, 40)" :key="name" class="parsed__chip">{{ name }}</span>
              <span v-if="parsedNames.length > 40" class="parsed__chip parsed__chip--more">+{{ parsedNames.length - 40 }} more</span>
            </div>
          </div>
          <q-select v-model="groupRating" outlined dense label="Skill level (everyone)" emit-value map-options :options="GROUP_RATING_OPTIONS" />
          <q-select
            v-if="groupOptions.length > 1"
            v-model="groupId"
            outlined
            dense
            label="Group"
            emit-value
            map-options
            :options="groupOptions"
          />
          <q-toggle v-model="checkIn" label="Check in now (enter the queue)" />
          <q-btn
            class="big-action full-width"
            color="primary"
            unelevated
            :label="parsedNames.length ? `Add ${parsedNames.length} ${parsedNames.length === 1 ? 'player' : 'players'}` : 'Add players'"
            :disable="!parsedNames.length || parsedNames.length > 100"
            :loading="saving"
            @click="addGroup"
          />
          <div v-if="parsedNames.length > 100" class="text-caption text-negative">Add up to 100 players at a time.</div>
        </div>

        <!-- 3) From history -->
        <div v-else class="form-stack">
          <q-input v-model="historySearch" outlined dense clearable debounce="300" placeholder="Search past players" hide-bottom-space>
            <template #prepend><q-icon name="eva-search-outline" /></template>
          </q-input>
          <div class="text-caption text-grey-7">Players from your earlier sessions. Tap to select.</div>

          <div v-if="historyLoading && !history.length" class="q-py-lg text-center"><q-spinner size="28px" color="primary" /></div>
          <div v-else-if="!history.length" class="history-empty">
            <q-icon name="eva-people-outline" size="28px" />
            <div class="text-weight-bold q-mt-xs">{{ historySearch ? 'No one matches' : 'No past players yet' }}</div>
            <div class="text-caption">{{ historySearch ? 'Try another name.' : 'Players you add to your sessions will show up here next time.' }}</div>
          </div>
          <template v-else>
            <div class="row items-center">
              <div class="col text-caption text-grey-7">{{ selectableCount }} available{{ selected.size ? ` · ${selected.size} selected` : '' }}</div>
              <q-btn flat dense no-caps color="primary" :label="allSelected ? 'Clear' : 'Select all'" :disable="!selectableCount" @click="toggleAll" />
            </div>
            <div class="history-list">
              <button
                v-for="p in history"
                :key="p.key"
                type="button"
                class="history-row"
                :class="{ 'is-selected': selected.has(p.key), 'is-in': p.in_session }"
                :disabled="p.in_session"
                @click="toggle(p)"
              >
                <q-checkbox :model-value="selected.has(p.key)" :disable="p.in_session" dense tabindex="-1" class="no-pointer-events" />
                <span class="history-row__main">
                  <span class="history-row__name">{{ p.display_name }}</span>
                  <span class="history-row__meta">
                    <template v-if="p.rating">{{ p.rating.toFixed(1) }} · </template>{{ p.sessions_count }} {{ p.sessions_count === 1 ? 'session' : 'sessions' }}<template v-if="p.last_played_at"> · last {{ shortDate(p.last_played_at) }}</template>
                  </span>
                </span>
                <span v-if="p.in_session" class="history-row__tag">In session</span>
                <q-icon v-else-if="p.user_id" name="eva-person-done-outline" size="16px" color="grey-6"><q-tooltip>Has an account</q-tooltip></q-icon>
              </button>
            </div>
          </template>

          <q-select
            v-if="groupOptions.length > 1"
            v-model="groupId"
            outlined
            dense
            label="Group"
            emit-value
            map-options
            :options="groupOptions"
          />
          <q-toggle v-model="checkIn" label="Check in now (enter the queue)" />
          <q-btn
            class="big-action full-width"
            color="primary"
            unelevated
            :label="selected.size ? `Add ${selected.size} ${selected.size === 1 ? 'player' : 'players'}` : 'Select players to add'"
            :disable="!selected.size"
            :loading="saving"
            @click="addFromHistory"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { addPlayer, bulkAddPlayers, getPlayerHistory } from 'src/api/openPlay'
import { RATING_OPTIONS } from 'src/utils/ratings'
import { haptic } from 'src/utils/native'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  sessionId: { type: Number, required: true },
  // [{ label, value }] incl. "No group"; hidden when the session has no groups.
  groupOptions: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'added'])
const $q = useQuasar()

const GROUP_RATING_OPTIONS = [{ label: 'Not set — rate later', value: null }, ...RATING_OPTIONS]

const mode = ref('one')
const saving = ref(false)
const checkIn = ref(true)
const groupId = ref(null)

// ——— 1) One player ———
const one = reactive({ display_name: '', rating: 3.5, guest_phone: '' })

async function addOne() {
  if (!one.display_name.trim()) return
  await run(async () => {
    await addPlayer(props.sessionId, { ...one, display_name: one.display_name.trim(), check_in: checkIn.value, play_group_id: groupId.value })
    one.display_name = ''
    one.guest_phone = ''
    $q.notify({ message: 'Player added', color: 'positive' })
    return true
  }, 'Could not add player')
}

// ——— 2) Group ———
const groupText = ref('')
const groupRating = ref(null)
// Lines pasted from chats often carry "1." / "-" / "•" in front — drop them.
const cleanLine = (line) => line.replace(/^\s*(?:\d+\s*[.)-]|[-*•·])\s*/, '').replace(/\s+/g, ' ').trim()
const parsedAll = computed(() => groupText.value.split(/\r?\n/).map(cleanLine).filter(Boolean))
const parsedNames = computed(() => {
  const seen = new Set()
  return parsedAll.value.filter((n) => {
    const k = n.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
})
const repeatedCount = computed(() => parsedAll.value.length - parsedNames.value.length)

async function addGroup() {
  const players = parsedNames.value.map((display_name) => ({ display_name, rating: groupRating.value }))
  await run(async () => {
    const res = await bulkAddPlayers(props.sessionId, { players, check_in: checkIn.value, play_group_id: groupId.value })
    report(res)
    if (res.added.length) groupText.value = ''
    return res.added.length > 0
  }, 'Could not add the players')
}

// ——— 3) History ———
const history = ref([])
const historyLoading = ref(false)
const historySearch = ref('')
const selected = ref(new Set())
let loadedOnce = false

async function loadHistory() {
  historyLoading.value = true
  try {
    history.value = await getPlayerHistory(props.sessionId, (historySearch.value || '').trim())
    loadedOnce = true
  } catch (e) {
    $q.notify({ message: e.response?.data?.message || 'Could not load your past players', color: 'negative' })
  } finally {
    historyLoading.value = false
  }
}
watch(mode, (m) => { if (m === 'history' && !loadedOnce) loadHistory() })
watch(historySearch, loadHistory)

const selectable = computed(() => history.value.filter((p) => !p.in_session))
const selectableCount = computed(() => selectable.value.length)
const allSelected = computed(() => selectableCount.value > 0 && selectable.value.every((p) => selected.value.has(p.key)))
function toggle(p) {
  if (p.in_session) return
  const next = new Set(selected.value)
  next.has(p.key) ? next.delete(p.key) : next.add(p.key)
  selected.value = next
}
function toggleAll() {
  selected.value = allSelected.value ? new Set() : new Set(selectable.value.map((p) => p.key))
}
// Selection survives searching — keep the picked people's details.
const picked = new Map()
watch(history, (list) => list.forEach((p) => picked.set(p.key, p)))

async function addFromHistory() {
  const players = [...selected.value].map((k) => picked.get(k)).filter(Boolean)
    .map((p) => ({ display_name: p.display_name, user_id: p.user_id, rating: p.rating }))
  await run(async () => {
    const res = await bulkAddPlayers(props.sessionId, { players, check_in: checkIn.value, play_group_id: groupId.value })
    report(res)
    selected.value = new Set()
    await loadHistory()
    return res.added.length > 0
  }, 'Could not add the players')
}

const shortDate = (iso) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

// ——— shared ———
function report({ added, skipped }) {
  const parts = []
  if (added.length) parts.push(`${added.length} added`)
  if (skipped.length) parts.push(`${skipped.length} skipped`)
  $q.notify({
    message: parts.join(' · ') || 'No one was added',
    caption: skipped.length
      ? skipped.slice(0, 4).map((s) => `${s.display_name} — ${s.reason}`).join('; ') + (skipped.length > 4 ? '…' : '')
      : undefined,
    color: added.length ? 'positive' : 'warning',
    timeout: skipped.length ? 6000 : 2500,
  })
}

async function run(fn, fallback) {
  saving.value = true
  try {
    const changed = await fn()
    if (changed) {
      haptic('success')
      emit('added')
    }
  } catch (e) {
    haptic('error')
    $q.notify({ message: e.response?.data?.message || fallback, color: 'negative' })
  } finally {
    saving.value = false
  }
}

watch(() => props.modelValue, (open) => {
  if (open) {
    loadedOnce = false
    selected.value = new Set()
    if (mode.value === 'history') loadHistory()
  }
})
</script>

<style scoped>
.add-tabs {
  border-bottom: 1px solid var(--line, #e3e8e6);
}
.parsed__count {
  font-size: 13px;
  color: #3d4b46;
}
.parsed__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.parsed__chip {
  padding: 3px 10px;
  border-radius: 999px;
  background: #eef3f1;
  font-size: 12px;
  font-weight: 600;
}
.parsed__chip--more {
  background: transparent;
  color: #6b7a75;
}
.history-list {
  max-height: 46vh;
  overflow-y: auto;
  border: 1px solid var(--line, #e3e8e6);
  border-radius: 12px;
}
.history-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  padding: 8px 12px;
  border: 0;
  background: #fff;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.history-row + .history-row {
  border-top: 1px solid var(--line, #e3e8e6);
}
.history-row:hover:not(:disabled) {
  background: #f6f9f8;
}
.history-row.is-selected {
  background: rgba(13, 148, 136, 0.07);
}
.history-row:disabled {
  cursor: default;
  opacity: 0.55;
}
.history-row:focus-visible {
  outline: 2px solid var(--q-primary);
  outline-offset: -2px;
}
.history-row__main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.history-row__name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.history-row__meta {
  font-size: 12px;
  color: #6b7a75;
}
.history-row__tag {
  font-size: 11px;
  font-weight: 700;
  color: #6b7a75;
  white-space: nowrap;
}
.history-empty {
  padding: 24px 12px;
  text-align: center;
  color: #6b7a75;
  border: 1px dashed var(--line, #e3e8e6);
  border-radius: 12px;
}
</style>
