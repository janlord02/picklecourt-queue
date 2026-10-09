<template>
  <q-page>
    <q-pull-to-refresh no-mouse color="primary" @refresh="onPull">
    <div class="app-page app-page--console">
      <div class="row items-center q-mb-md">
        <div class="text-h6 text-weight-bold">Sessions</div>
        <q-space />
        <q-btn
          color="primary"
          unelevated
          no-caps
          icon="eva-plus-outline"
          label="New session"
          @click="createDialog = true"
        />
      </div>

      <SkeletonList v-if="loading && !loaded" :rows="4" />

      <div v-else-if="!sessions.length" class="play-card empty-state">
        <span class="empty-state-icon"><q-icon name="eva-calendar-outline" size="28px" /></span>
        <div class="empty-state-title">No sessions yet</div>
        <div class="text-caption q-mb-md">
          Create your first open play session — players join with a code or QR. Hosting is free.
        </div>
        <q-btn color="primary" unelevated no-caps icon="eva-plus-outline" label="Create a session" @click="createDialog = true" />
      </div>

      <template v-else>
      <!-- History: live now / coming up / past (ended, cancelled, or dated before today) -->
      <q-tabs v-model="listTab" dense no-caps inline-label align="left" active-color="primary" indicator-color="primary" class="q-mb-sm">
        <q-tab v-for="t in listTabs" :key="t.value" :name="t.value" :label="`${t.label} (${grouped[t.value].length})`" />
      </q-tabs>
      <div v-if="!grouped[listTab].length" class="play-card empty-state">
        <span class="empty-state-icon">
          <q-icon :name="listTab === 'past' ? 'eva-clock-outline' : listTab === 'live' ? 'eva-radio-outline' : 'eva-calendar-outline'" size="28px" />
        </span>
        <div class="empty-state-title">
          {{ listTab === 'past' ? 'No past sessions yet' : listTab === 'live' ? 'Nothing live right now' : 'No upcoming sessions' }}
        </div>
        <q-btn
          v-if="listTab !== 'past'"
          class="q-mt-sm"
          color="primary"
          outline
          no-caps
          icon="eva-plus-outline"
          label="New session"
          @click="createDialog = true"
        />
      </div>
      <div v-else class="play-card q-pa-none">
        <div
          v-for="session in grouped[listTab]"
          :key="session.id"
          class="session-row tappable"
          role="link"
          tabindex="0"
          @click="open(session)"
          @keyup.enter="open(session)"
        >
          <div class="col">
            <div class="row items-center no-wrap" style="gap: 8px">
              <span class="text-weight-bold">{{ session.name }}</span>
              <span v-if="session.status === 'live'" class="live-tag"><i class="live-dot" />Live</span>
              <span v-else class="status-tag">
                <i class="status-dot" :class="sessionDot(session.status)" />
                <span>{{ sessionStatusLabel(session.status) }}</span>
              </span>
            </div>
            <div class="text-caption text-grey-7">
              {{ session.date }}
              <template v-if="session.start_time"
                >· {{ session.start_time.slice(0, 5) }}–{{ session.end_time?.slice(0, 5) }}</template
              >
              · {{ session.players_count }} players · code {{ session.join_code }}
            </div>
          </div>
          <q-btn
            flat
            round
            class="tap-44"
            icon="eva-copy-outline"
            color="grey-7"
            :aria-label="`Duplicate ${session.name} to another date`"
            @click.stop="openDuplicate(session)"
          >
            <q-tooltip>Duplicate to another date</q-tooltip>
          </q-btn>
          <q-icon name="eva-chevron-right-outline" size="18px" class="text-grey-5" />
        </div>
      </div>
      </template>
    </div>
    </q-pull-to-refresh>

    <!-- Duplicate session: same setup (format, courts, settings), new date -->
    <q-dialog v-model="dupDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section class="q-pa-md" style="display: grid; gap: 12px">
          <div class="sheet-title">Duplicate “{{ dupSource?.name }}”</div>
          <div class="text-caption text-grey-7">Copies the format, courts and settings. Players and games aren't copied.</div>
          <q-input v-model="dupForm.name" outlined dense label="Name" maxlength="120" />
          <q-input v-model="dupForm.date" outlined dense type="date" label="Date" />
          <div class="row q-col-gutter-sm">
            <div class="col-6"><q-input v-model="dupForm.start_time" outlined dense type="time" label="Start" /></div>
            <div class="col-6"><q-input v-model="dupForm.end_time" outlined dense type="time" label="End" /></div>
          </div>
          <q-btn class="big-action full-width" color="primary" unelevated label="Create copy" :loading="duplicating" @click="duplicate" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Create session -->
    <q-dialog v-model="createDialog" position="bottom">
      <q-card class="sheet sheet--tall">
        <q-card-section class="q-pa-md">
          <div class="sheet-title q-mb-md">New open play session</div>
          <q-form class="form-stack" @submit.prevent="create">
            <q-input
              v-model="form.name"
              outlined
              dense
              label="Session name"
              hide-bottom-space
              :rules="[(v) => !!v || 'Session name is required']"
            />
            <q-input
              v-model="form.date"
              outlined
              dense
              label="Date"
              type="date"
              hide-bottom-space
              :rules="[(v) => !!v || 'Date is required']"
            />
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input v-model="form.start_time" outlined dense label="Start" type="time" />
              </div>
              <div class="col-6">
                <q-input v-model="form.end_time" outlined dense label="End" type="time" />
              </div>
            </div>
            <q-select
              v-model="form.format"
              outlined
              dense
              label="Match format"
              emit-value
              map-options
              :options="formatOptions"
            />
            <div class="row items-center">
              <div class="text-body2 col">Courts</div>
              <q-btn
                round
                outline
                color="primary"
                icon="eva-minus-outline"
                aria-label="Fewer courts"
                :disable="form.courtCount <= 1"
                @click="form.courtCount--"
              />
              <div class="text-subtitle1 text-weight-bold text-center tnum" style="width: 40px">
                {{ form.courtCount }}
              </div>
              <q-btn
                round
                outline
                color="primary"
                icon="eva-plus-outline"
                aria-label="More courts"
                :disable="form.courtCount >= 12"
                @click="form.courtCount++"
              />
            </div>
            <q-input
              v-model.number="form.max_players"
              outlined
              dense
              type="number"
              min="2"
              max="200"
              label="Max players (optional)"
            />
            <q-select
              v-if="organizeAsOptions.length > 1"
              v-model="form.organizeAs"
              :options="organizeAsOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              label="Organize as"
            />
            <q-btn
              class="big-action full-width"
              color="primary"
              unelevated
              label="Create session"
              type="submit"
              :loading="creating"
            />
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { computed } from 'vue'
import { createSession, duplicateSession, getOrganizerContext, listSessions } from 'src/api/openPlay'
import { useAuthStore } from 'src/stores/auth'
import { FORMAT_OPTIONS } from 'src/utils/formats'
import { validateSessionForm } from 'src/utils/sessionForm'
import { haptic } from 'src/utils/native'
import SkeletonList from 'src/components/SkeletonList.vue'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()

const sessions = ref([])
const loading = ref(false)
const loaded = ref(false)
const createDialog = ref(false)
const creating = ref(false)

// Local-timezone YMD (house rule: never toISOString().slice for dates).
function todayYmd() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatOptions = FORMAT_OPTIONS

const form = reactive({
  name: '',
  date: todayYmd(),
  start_time: '18:00',
  end_time: '22:00',
  organizeAs: null,
  format: 'smart',
  courtCount: 4,
  max_players: null,
})

// Who can I organize for? Businesses I staff + my clubs' APPROVED venue
// affiliations (club admins have no business membership at login — this
// is what used to dead-end them with "No business context").
const context = ref({ businesses: [], clubs: [] })

const organizeAsOptions = computed(() => {
  const options = []
  for (const business of context.value.businesses) {
    options.push({
      label: business.name,
      value: `b:${business.id}`,
      business_id: business.id,
      club_id: null,
    })
  }
  for (const club of context.value.clubs) {
    for (const business of club.businesses) {
      options.push({
        label:
          club.businesses.length > 1 ? `${club.name} · at ${business.name}` : club.name,
        value: `c:${club.id}:${business.id}`,
        business_id: business.id,
        club_id: club.id,
      })
    }
  }
  // A personal session (no business/club) is always possible — offer it
  // explicitly so staff/club admins don't attach personal games by accident.
  if (options.length) {
    options.push({ label: 'Personal (just me)', value: 'personal', business_id: null, club_id: null })
  }
  return options
})

async function loadContext() {
  try {
    context.value = await getOrganizerContext()
  } catch {
    // Fall back to the login payload's businesses.
    context.value = {
      businesses: auth.businesses.map((b) => ({ id: b.id, name: b.name })),
      clubs: [],
    }
  }
}

// Always keep a valid default selected, even when the context arrives
// after the dialog was opened (the field is required, not optional).
watch(organizeAsOptions, (options) => {
  const stillValid = options.some((o) => o.value === form.organizeAs)
  if (!stillValid) {
    form.organizeAs = options[0]?.value ?? null
  }
})

function sessionDot(status) {
  return { open: 'dot-waiting', draft: 'dot-checked_out', ended: 'dot-checked_out', cancelled: 'dot-no_show' }[
    status
  ] || 'dot-checked_out'
}

function sessionStatusLabel(status) {
  return { open: 'Open', draft: 'Draft', ended: 'Ended', cancelled: 'Cancelled' }[status] || status
}

async function load() {
  loading.value = true
  try {
    // mine=1: every session this user organizes, regardless of tenant.
    sessions.value = await listSessions({ mine: 1 })
  } catch (e) {
    haptic('error')
    $q.notify({ message: e.response?.data?.message || 'Could not load sessions', color: 'negative' })
  } finally {
    loading.value = false
    loaded.value = true
  }
}

async function onPull(done) {
  try {
    await load()
  } finally {
    done()
  }
}

// ——— History tabs ———
const listTab = ref('upcoming')
const listTabs = [
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
]
const grouped = computed(() => {
  const today = todayYmd()
  const out = { live: [], upcoming: [], past: [] }
  for (const s of sessions.value) {
    const date = String(s.date || '').slice(0, 10)
    if (s.status === 'live') out.live.push(s)
    else if (['ended', 'cancelled'].includes(s.status) || (date && date < today)) out.past.push(s)
    else out.upcoming.push(s)
  }
  out.upcoming.sort((a, b) => String(a.date).localeCompare(String(b.date)))
  out.past.sort((a, b) => String(b.date).localeCompare(String(a.date)))
  return out
})
// Open on whatever's happening now (once, after the first load).
let initialTabSet = false
watch(grouped, (g) => {
  if (initialTabSet || !sessions.value.length) return
  listTab.value = g.live.length ? 'live' : 'upcoming'
  initialTabSet = true
})

// ——— Duplicate ———
const dupDialog = ref(false)
const dupSource = ref(null)
const duplicating = ref(false)
const dupForm = reactive({ name: '', date: todayYmd(), start_time: '', end_time: '' })
function openDuplicate(session) {
  dupSource.value = session
  Object.assign(dupForm, {
    name: session.name,
    date: todayYmd(),
    start_time: (session.start_time || '').slice(0, 5),
    end_time: (session.end_time || '').slice(0, 5),
  })
  dupDialog.value = true
}
async function duplicate() {
  const invalid = validateSessionForm({ ...dupForm, max_players: null }, { isNew: true })
  if (invalid) {
    $q.notify({ message: invalid, color: 'negative' })
    return
  }
  duplicating.value = true
  try {
    const copy = await duplicateSession(dupSource.value.id, {
      name: dupForm.name.trim(),
      date: dupForm.date,
      start_time: dupForm.start_time || null,
      end_time: dupForm.end_time || null,
    })
    dupDialog.value = false
    $q.notify({ message: `${copy.name} created — code ${copy.join_code}`, color: 'positive' })
    router.push({ name: 'organizer-live', params: { id: copy.id } })
  } catch (e) {
    $q.notify({ message: e.response?.data?.message || 'Could not duplicate the session', color: 'negative' })
  } finally {
    duplicating.value = false
  }
}

async function create() {
  const invalid = validateSessionForm(form, { isNew: true })
  if (invalid) {
    $q.notify({ message: invalid, color: 'negative' })
    return
  }
  // Silent attachment: staff/club-admin sessions land under their
  // business automatically; everyone else gets a personal session
  // (no business needed — anyone can organize).
  const organizeAs =
    organizeAsOptions.value.find((o) => o.value === form.organizeAs) ||
    organizeAsOptions.value[0] ||
    null

  creating.value = true
  try {
    const payload = {
      name: form.name,
      date: form.date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      business_id: organizeAs?.business_id || undefined,
      club_id: organizeAs?.club_id || undefined,
      format: form.format,
      max_players: form.max_players || null,
      courts: Array.from({ length: form.courtCount }, (_, i) => ({ label: `Court ${i + 1}` })),
    }
    const session = await createSession(payload)
    haptic('success')
    createDialog.value = false
    // Fresh form next time (keep the organizer choice).
    Object.assign(form, { name: '', date: todayYmd(), start_time: '18:00', end_time: '22:00', format: 'smart', courtCount: 4, max_players: null })
    $q.notify({ message: `${session.name} created — code ${session.join_code}`, color: 'positive' })
    router.push({ name: 'organizer-live', params: { id: session.id } })
  } catch (e) {
    haptic('error')
    $q.notify({ message: e.response?.data?.message || 'Could not create session', color: 'negative' })
  } finally {
    creating.value = false
  }
}

function open(session) {
  router.push({ name: 'organizer-live', params: { id: session.id } })
}

onMounted(() => {
  load()
  loadContext()
})
</script>

<style scoped>
.session-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 8px 10px 16px;
  min-height: 64px;
  cursor: pointer;
}

@media (hover: hover) {
  .session-row:hover {
    background: var(--surface-sunken);
  }
}

.session-row + .session-row {
  border-top: 1px solid var(--line);
}
</style>
