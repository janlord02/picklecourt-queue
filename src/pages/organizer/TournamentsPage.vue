<template>
  <q-page>
    <q-pull-to-refresh no-mouse color="primary" @refresh="onPull">
      <div class="app-page app-page--console">
        <div class="row items-center q-mb-xs">
          <div class="text-h6 text-weight-bold">Tournaments</div>
          <span class="beta-tag q-ml-sm">Beta</span>
          <q-space />
          <q-btn
            v-if="canCreate"
            color="primary"
            unelevated
            no-caps
            icon="eva-plus-outline"
            label="New tournament"
            @click="createDialog = true"
          />
        </div>
        <div class="text-caption text-grey-7 q-mb-md">
          Brackets, pools and referee scoring. Only super admins see this while it's in beta.
        </div>

        <SkeletonList v-if="loading && !loaded" :rows="3" />

        <div v-else-if="!tournaments.length" class="play-card empty-state">
          <span class="empty-state-icon"><q-icon name="eva-award-outline" size="28px" /></span>
          <div class="empty-state-title">No tournaments yet</div>
          <div class="text-caption q-mb-md">
            {{ canCreate ? 'Set up divisions, add teams, and let referees score from their phones.' : 'Tournaments you host or referee show up here.' }}
          </div>
          <q-btn
            v-if="canCreate"
            color="primary"
            unelevated
            no-caps
            icon="eva-plus-outline"
            label="Create a tournament"
            @click="createDialog = true"
          />
        </div>

        <div v-else class="play-card q-pa-none">
          <div
            v-for="t in tournaments"
            :key="t.id"
            class="session-row tappable"
            role="link"
            tabindex="0"
            @click="open(t)"
            @keyup.enter="open(t)"
          >
            <div class="col">
              <div class="row items-center no-wrap" style="gap: 8px">
                <span class="text-weight-bold ellipsis">{{ t.name }}</span>
                <span v-if="t.status === 'live'" class="live-tag">Live</span>
                <span v-else class="status-tag">{{ TOURNAMENT_STATUS[t.status] || t.status }}</span>
              </div>
              <div class="text-caption text-grey-7">
                <template v-if="t.start_date">{{ t.start_date }} · </template>
                <template v-if="t.venue">{{ t.venue }} · </template>
                {{ t.divisions_count }} division{{ t.divisions_count === 1 ? '' : 's' }}
                <template v-if="t.role === 'referee'"> · you referee</template>
              </div>
            </div>
            <q-icon name="eva-chevron-right-outline" size="18px" class="text-grey-5" />
          </div>
        </div>
      </div>
    </q-pull-to-refresh>

    <q-dialog v-model="createDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section class="q-pa-md form-stack">
          <div class="sheet-title">New tournament</div>
          <q-input v-model="form.name" outlined dense label="Name" maxlength="120" autofocus hide-bottom-space />
          <q-input v-model="form.venue" outlined dense label="Venue (optional)" maxlength="160" hide-bottom-space />
          <div class="row q-col-gutter-sm">
            <div class="col-6"><q-input v-model="form.start_date" outlined dense type="date" label="Starts" stack-label /></div>
            <div class="col-6"><q-input v-model="form.end_date" outlined dense type="date" label="Ends" stack-label /></div>
          </div>
          <q-input
            v-model.number="form.courts"
            outlined
            dense
            type="number"
            min="1"
            max="40"
            label="Courts"
            hint="Named Court 1, Court 2, … — rename them later."
          />
          <div class="text-caption text-grey-7">Next you'll add divisions (e.g. Men's Doubles 3.5) and their teams.</div>
          <q-btn
            class="big-action full-width"
            color="primary"
            unelevated
            no-caps
            label="Create tournament"
            :disable="!form.name.trim()"
            :loading="creating"
            @click="create"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import SkeletonList from 'components/SkeletonList.vue'
import { createTournament, listTournaments } from 'src/api/tournament'
import { TOURNAMENT_STATUS } from 'src/utils/tournament'

const $q = useQuasar()
const router = useRouter()

const tournaments = ref([])
const canCreate = ref(false)
const loading = ref(false)
const loaded = ref(false)
const createDialog = ref(false)
const creating = ref(false)
const today = new Date().toISOString().slice(0, 10)
const form = reactive({ name: '', venue: '', start_date: today, end_date: today, courts: 4 })

async function load() {
  loading.value = true
  try {
    const res = await listTournaments()
    tournaments.value = res.data
    canCreate.value = !!res.can_create
    loaded.value = true
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Could not load tournaments' })
  } finally {
    loading.value = false
  }
}

async function onPull(done) {
  await load()
  done()
}

function open(t) {
  router.push({ name: 'organizer-tournament', params: { id: t.id } })
}

async function create() {
  creating.value = true
  try {
    const count = Math.min(40, Math.max(1, Number(form.courts) || 1))
    const t = await createTournament({
      name: form.name.trim(),
      venue: form.venue.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || form.start_date || null,
      courts: Array.from({ length: count }, (_, i) => `Court ${i + 1}`),
    })
    createDialog.value = false
    router.push({ name: 'organizer-tournament', params: { id: t.id } })
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Could not create the tournament' })
  } finally {
    creating.value = false
  }
}

onMounted(load)
</script>

<style scoped>
/* Same row as the sessions list. */
.session-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 10px 16px;
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
.beta-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--lime);
  color: var(--brand-deep);
}
</style>
