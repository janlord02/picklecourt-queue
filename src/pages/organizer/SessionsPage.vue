<template>
  <q-page>
    <div class="app-page">
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

      <div v-if="loading && !sessions.length" class="text-center q-pa-xl">
        <q-spinner size="32px" color="primary" />
      </div>

      <div v-else-if="!sessions.length" class="play-card empty-state">
        <div class="empty-state-title">No sessions yet</div>
        <div class="text-caption">Create your first open play session to get started.</div>
      </div>

      <div v-else class="play-card q-pa-none">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="session-row"
          @click="open(session)"
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
          <q-icon name="eva-chevron-right-outline" size="18px" class="text-grey-5" />
        </div>
      </div>
    </div>

    <!-- Create session -->
    <q-dialog v-model="createDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold q-mb-md">New open play session</div>
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
            <div
              v-if="!organizeAsOptions.length"
              class="text-caption text-negative"
            >
              Your account isn't linked to a business or an affiliated club yet, so you can't
              create sessions. Business staff are added by their admin; club admins need an
              approved venue affiliation in PickleCourt.
            </div>
            <q-select
              v-else-if="organizeAsOptions.length > 1"
              v-model="form.organizeAs"
              outlined
              dense
              label="Organizing as"
              emit-value
              map-options
              :options="organizeAsOptions"
            />
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
                dense
                outline
                color="primary"
                icon="eva-minus-outline"
                :disable="form.courtCount <= 1"
                @click="form.courtCount--"
              />
              <div class="text-subtitle1 text-weight-bold text-center tnum" style="width: 40px">
                {{ form.courtCount }}
              </div>
              <q-btn
                round
                dense
                outline
                color="primary"
                icon="eva-plus-outline"
                :disable="form.courtCount >= 12"
                @click="form.courtCount++"
              />
            </div>
            <q-input
              v-model.number="form.max_players"
              outlined
              dense
              type="number"
              label="Max players (optional)"
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
import { onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { computed } from 'vue'
import { createSession, getOrganizerContext, listSessions } from 'src/api/openPlay'
import { useAuthStore } from 'src/stores/auth'
import { FORMAT_OPTIONS } from 'src/utils/formats'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()

const sessions = ref([])
const loading = ref(false)
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
  if (!form.organizeAs && organizeAsOptions.value.length) {
    form.organizeAs = organizeAsOptions.value[0].value
  }
}

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
    $q.notify({ message: e.response?.data?.message || 'Could not load sessions', color: 'negative' })
  } finally {
    loading.value = false
  }
}

async function create() {
  const organizeAs = organizeAsOptions.value.find((o) => o.value === form.organizeAs)
  if (!organizeAs) {
    $q.notify({
      message: 'Your account isn’t linked to a business or an affiliated club yet.',
      color: 'negative',
    })
    return
  }

  creating.value = true
  try {
    const payload = {
      name: form.name,
      date: form.date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      business_id: organizeAs.business_id,
      club_id: organizeAs.club_id || undefined,
      format: form.format,
      max_players: form.max_players || null,
      courts: Array.from({ length: form.courtCount }, (_, i) => ({ label: `Court ${i + 1}` })),
    }
    const session = await createSession(payload)
    createDialog.value = false
    $q.notify({ message: `${session.name} created — code ${session.join_code}`, color: 'positive' })
    router.push({ name: 'organizer-live', params: { id: session.id } })
  } catch (e) {
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
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.12s ease;
}

.session-row:hover {
  background: var(--surface-sunken);
}

.session-row + .session-row {
  border-top: 1px solid var(--line);
}
</style>
