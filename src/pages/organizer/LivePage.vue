<template>
  <q-page>
    <div class="app-page" style="max-width: 760px">
      <div v-if="playStore.loading && !playStore.session" class="text-center q-pa-xl">
        <q-spinner size="32px" color="primary" />
      </div>

      <template v-else-if="playStore.session">
        <!-- Header + session controls -->
        <div class="row items-center no-wrap q-mb-sm">
          <div class="col">
            <div class="row items-center text-caption text-grey-7" style="gap: 8px">
              <span>{{ playStore.session.player_count }} players</span>
              <span>·</span>
              <span
                >code <b>{{ playStore.session.join_code }}</b></span
              >
              <span v-if="playStore.session.status === 'live'" class="live-tag">
                <i class="live-dot" />Live
              </span>
            </div>
          </div>
          <q-btn flat dense round icon="eva-edit-outline" color="grey-8" @click="openEditSession">
            <q-tooltip>Edit session</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="eva-tv-outline" color="grey-8" @click="openDisplay">
            <q-tooltip>Open TV board</q-tooltip>
          </q-btn>
          <q-btn
            flat
            dense
            round
            :icon="voiceSettings.enabled ? 'eva-volume-up-outline' : 'eva-volume-off-outline'"
            :color="voiceSettings.enabled ? 'primary' : 'grey-8'"
            @click="voiceDialog = true"
          >
            <q-tooltip>Voice announcements</q-tooltip>
          </q-btn>
          <q-btn
            v-if="playStore.session.status === 'open'"
            color="primary"
            unelevated
            no-caps
            label="Go live"
            @click="setStatus('live')"
          />
          <q-btn
            v-else-if="playStore.session.status === 'live'"
            flat
            no-caps
            color="grey-8"
            label="End"
            @click="confirmEnd"
          />
        </div>

        <!-- Ended: share the night's results -->
        <div v-if="playStore.session.status === 'ended'" class="play-card q-mb-md">
          <div class="text-subtitle2 text-weight-bold">Session ended</div>
          <div class="text-caption text-grey-7 q-mb-sm">
            Share the final standings with your players — perfect for the group chat.
          </div>
          <div class="row" style="gap: 8px">
            <q-btn
              class="col"
              color="primary"
              unelevated
              no-caps
              icon="eva-share-outline"
              label="Share results"
              :loading="sharingRecap"
              @click="shareRecap(true)"
            />
            <q-btn
              class="col"
              outline
              color="primary"
              no-caps
              icon="eva-download-outline"
              label="Download"
              :loading="sharingRecap"
              @click="shareRecap(false)"
            />
          </div>
        </div>

        <q-tabs
          v-model="tab"
          dense
          no-caps
          class="text-grey-7 q-mb-sm"
          active-color="primary"
          indicator-color="primary"
          align="justify"
        >
          <q-tab name="courts" label="Courts" />
          <q-tab name="queue" :label="`Queue (${playStore.queue.length})`" />
          <q-tab name="players" :label="`Players (${playStore.players.length})`" />
          <q-tab name="leaderboard" label="Board" />
        </q-tabs>

        <!-- ======================= COURTS ======================= -->
        <div v-if="tab === 'courts'">
          <q-btn
            v-if="!readOnly && openCourtCount > 0 && playStore.queue.length >= 4"
            class="full-width q-mb-md"
            color="primary"
            unelevated
            no-caps
            icon="eva-flash-outline"
            :label="`Fill ${openCourtCount} open ${openCourtCount === 1 ? 'court' : 'courts'}`"
            :loading="filling"
            @click="fillOpenCourts"
          />

          <div v-for="court in playStore.courts" :key="court.id" class="court-card q-mb-md">
            <div class="court-card-head">
              <span class="text-subtitle1 text-weight-bold">{{ court.label }}</span>
              <span class="status-tag">
                <i class="status-dot" :class="courtDot(court.status)" />
                <span>{{ courtStatusLabel(court.status) }}</span>
              </span>
              <q-space />
              <span v-if="matchFor(court)?.status === 'playing'" class="court-timer">
                {{ elapsed(matchFor(court)) }}
              </span>
              <q-btn
                v-if="courtMenuOptions(court).length"
                flat
                dense
                round
                size="sm"
                icon="eva-more-vertical-outline"
                color="grey-7"
              >
                <q-menu auto-close>
                  <q-list dense style="min-width: 200px">
                    <q-item
                      v-for="option in courtMenuOptions(court)"
                      :key="option.key"
                      clickable
                      @click="option.handler()"
                    >
                      <q-item-section :class="option.danger ? 'text-negative' : ''">
                        {{ option.label }}
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>

            <!-- Active match on this court -->
            <template v-if="matchFor(court)">
              <div class="court-card-body">
                <MatchTeams
                  :match="matchFor(court)"
                  :show-ready="matchFor(court).status === 'called'"
                />
                <WhyThisMatch :match="matchFor(court)" class="q-mt-sm" />
              </div>
              <div class="court-card-actions">
                <q-btn
                  v-if="matchFor(court).status === 'staged'"
                  class="col"
                  color="primary"
                  unelevated
                  no-caps
                  label="Call players"
                  @click="doMatch(callMatch, matchFor(court))"
                />
                <q-btn
                  v-if="matchFor(court).status === 'staged'"
                  class="col"
                  outline
                  no-caps
                  color="primary"
                  label="Start"
                  @click="doMatch(startMatch, matchFor(court))"
                />
                <q-btn
                  v-if="matchFor(court).status === 'called'"
                  class="col"
                  color="primary"
                  unelevated
                  no-caps
                  label="Start match"
                  @click="doMatch(startMatch, matchFor(court))"
                />
                <!-- Phone: round bell only. Tablet/desktop: room for a label. -->
                <q-btn
                  v-if="matchFor(court).status === 'called'"
                  outline
                  no-caps
                  color="primary"
                  icon="eva-bell-outline"
                  :round="!$q.screen.gt.xs"
                  :size="$q.screen.gt.xs ? undefined : '12px'"
                  :label="$q.screen.gt.xs ? 'Call again' : undefined"
                  :class="$q.screen.gt.xs ? 'col' : undefined"
                  @click="doMatch(callMatch, matchFor(court))"
                >
                  <q-tooltip v-if="!$q.screen.gt.xs">Call again</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="matchFor(court).status === 'playing'"
                  class="col"
                  color="primary"
                  unelevated
                  no-caps
                  label="End match"
                  @click="openScoreDialog(matchFor(court))"
                />
                <q-btn
                  v-if="matchFor(court).status !== 'playing'"
                  flat
                  dense
                  no-caps
                  color="negative"
                  label="Cancel"
                  @click="doMatch(cancelMatch, matchFor(court))"
                />
              </div>
            </template>

            <!-- Free court -->
            <div v-else-if="court.status === 'available'" class="court-card-body text-center">
              <template v-if="!readOnly">
                <q-btn
                  class="q-mt-sm"
                  outline
                  no-caps
                  color="primary"
                  icon="eva-flash-outline"
                  label="Start next"
                  :disable="playStore.queue.length < 4"
                  :loading="suggestingCourtId === court.id"
                  @click="suggestFor(court)"
                />
                <div v-if="playStore.queue.length < 4" class="text-caption text-grey-6 q-mt-sm">
                  Needs {{ 4 - playStore.queue.length }} more waiting
                </div>
              </template>
              <div v-else class="text-caption text-grey-6 q-mt-sm">Session over</div>
            </div>
          </div>

          <q-btn
            v-if="!readOnly"
            class="full-width q-mb-md"
            outline
            no-caps
            color="primary"
            icon="eva-plus-outline"
            label="Add court"
            @click="openAddCourt"
          />

          <!-- Recent results (undo entry point) -->
          <template v-if="playStore.recentMatches.length">
            <span class="section-label">Recent results</span>
            <div class="play-card">
              <div
                v-for="match in playStore.recentMatches.slice(0, 5)"
                :key="match.id"
                class="list-row"
              >
                <div class="col text-caption">
                  {{ teamNames(match.team_a) }} <span class="text-grey-5">vs</span>
                  {{ teamNames(match.team_b) }}
                </div>
                <div class="text-weight-bold tnum">
                  {{ match.team_a_score }}–{{ match.team_b_score }}
                </div>
                <q-btn
                  flat
                  dense
                  round
                  size="sm"
                  color="grey-7"
                  icon="eva-edit-outline"
                  @click="openScoreDialog(match, true)"
                >
                  <q-tooltip>Edit result</q-tooltip>
                </q-btn>
              </div>
            </div>
          </template>
        </div>

        <!-- ======================= QUEUE ======================= -->
        <div v-if="tab === 'queue'">
          <div v-if="!playStore.queue.length" class="play-card empty-state">
            <div class="empty-state-title">Nobody is waiting</div>
            <div class="text-caption">Players appear here when they check in.</div>
          </div>
          <div v-else class="play-card">
            <div v-for="entry in playStore.queue" :key="entry.player_id" class="list-row">
              <div class="queue-pos">{{ entry.position }}</div>
              <div class="col cursor-pointer" @click="openPlayerDetail(entry.player_id)">
                <div class="text-weight-bold">
                  {{ playerById(entry.player_id)?.display_name }}
                </div>
                <div class="text-caption text-grey-7">
                  {{ playerById(entry.player_id)?.games_played }} games
                  <template v-if="playerById(entry.player_id)?.rating">
                    · {{ playerById(entry.player_id).rating.toFixed(1) }}
                  </template>
                  <span v-if="partnerNameOf(playerById(entry.player_id))" class="pair-tag q-ml-xs">
                    <q-icon name="eva-link-outline" />
                    {{ partnerNameOf(playerById(entry.player_id)) }}
                  </span>
                  <span v-if="poolTagOf(entry.player_id)" class="pool-tag q-ml-xs" :class="poolTagOf(entry.player_id).cls">
                    {{ poolTagOf(entry.player_id).label }}
                  </span>
                </div>
              </div>
              <div class="text-caption text-grey-7 tnum">
                {{ formatSeconds(entry.effective_wait_seconds) }}
              </div>
              <PlayerActionMenu v-if="!readOnly" :player="playerById(entry.player_id)" @action="onPlayerAction" />
            </div>
          </div>

          <!-- Sidelined players -->
          <template v-if="sidelined.length">
            <span class="section-label">Not in queue</span>
            <div class="play-card">
              <div v-for="player in sidelined" :key="player.id" class="list-row">
                <div class="col cursor-pointer" @click="openPlayerDetail(player.id)">
                  <div class="text-weight-bold">{{ player.display_name }}</div>
                </div>
                <StatusChip :status="player.status" />
                <PlayerActionMenu v-if="!readOnly" :player="player" @action="onPlayerAction" />
              </div>
            </div>
          </template>
        </div>

        <!-- ======================= PLAYERS ======================= -->
        <div v-if="tab === 'players'">
          <q-btn
            v-if="!readOnly"
            class="full-width q-mb-md"
            color="primary"
            outline
            no-caps
            icon="eva-person-add-outline"
            label="Add player or guest"
            @click="addDialog = true"
          />
          <div class="play-card">
            <div v-for="player in playStore.players" :key="player.id" class="list-row">
              <div class="col cursor-pointer" @click="openPlayerDetail(player.id)">
                <div class="text-weight-bold">
                  {{ player.display_name }}
                  <span v-if="player.is_guest" class="text-caption text-grey-6">guest</span>
                </div>
                <div class="text-caption text-grey-7 tnum">
                  {{ player.wins }}–{{ player.losses }} ·
                  {{ player.rating ? player.rating.toFixed(1) : 'unrated' }}
                  <span v-if="player.consecutive_games > 1">
                    · {{ player.consecutive_games }} straight</span
                  >
                  <span v-if="partnerNameOf(player)" class="pair-tag q-ml-xs">
                    <q-icon name="eva-link-outline" />
                    {{ partnerNameOf(player) }}
                  </span>
                </div>
              </div>
              <StatusChip :status="player.status" />
              <PlayerActionMenu v-if="!readOnly" :player="player" @action="onPlayerAction" />
            </div>
          </div>
        </div>

        <!-- ======================= LEADERBOARD ======================= -->
        <div v-if="tab === 'leaderboard'">
          <SessionLeaderboard :leaderboard="playStore.leaderboard" />

          <span class="section-label">Game log</span>
          <div class="play-card">
            <div v-if="!playStore.recentMatches.length" class="empty-state">
              <div class="empty-state-title">No games yet</div>
              <div class="text-caption">Completed games will show here.</div>
            </div>
            <div v-for="match in playStore.recentMatches" :key="match.id" class="list-row">
              <div class="col">
                <div class="text-caption">
                  <span :class="match.winning_team === 'A' ? 'text-weight-bold' : 'text-grey-7'">{{
                    teamNames(match.team_a)
                  }}</span>
                  <span class="text-grey-5"> vs </span>
                  <span :class="match.winning_team === 'B' ? 'text-weight-bold' : 'text-grey-7'">{{
                    teamNames(match.team_b)
                  }}</span>
                </div>
                <div class="text-caption text-grey-6">
                  Game {{ match.game_number }} · {{ match.court_label || 'Court' }}
                </div>
              </div>
              <div class="text-weight-bold tnum">
                {{ match.team_a_score }}–{{ match.team_b_score }}
              </div>
              <q-btn
                flat
                dense
                round
                size="sm"
                color="grey-7"
                icon="eva-edit-outline"
                @click="openScoreDialog(match, true)"
              >
                <q-tooltip>Edit result</q-tooltip>
              </q-btn>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Score dialog -->
    <q-dialog v-model="scoreDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section v-if="scoringMatch" class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold q-mb-md">
            {{ amending ? 'Edit result' : 'Match result' }}
          </div>
          <div class="row q-col-gutter-md items-end">
            <!-- mask="##": digits only, two max — fat-finger-proof. Focus
                 selects the current value so typing replaces the 0. -->
            <div class="col text-center">
              <div class="text-caption text-grey-7 q-mb-xs">{{ teamNames(scoringMatch.team_a) }}</div>
              <q-input
                v-model="scoreA"
                outlined
                mask="##"
                inputmode="numeric"
                placeholder="0"
                input-class="text-center text-h5 tnum"
                @focus="(evt) => evt.target.select()"
              />
            </div>
            <div class="col-auto text-h6 text-grey-5 q-pb-sm">–</div>
            <div class="col text-center">
              <div class="text-caption text-grey-7 q-mb-xs">{{ teamNames(scoringMatch.team_b) }}</div>
              <q-input
                v-model="scoreB"
                outlined
                mask="##"
                inputmode="numeric"
                placeholder="0"
                input-class="text-center text-h5 tnum"
                @focus="(evt) => evt.target.select()"
              />
            </div>
          </div>
          <q-btn
            class="big-action full-width q-mt-md"
            color="primary"
            unelevated
            :label="amending ? 'Save correction' : 'Save result'"
            :loading="scoring"
            @click="saveScore"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Add player dialog -->
    <q-dialog v-model="addDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold q-mb-md">Add player</div>
          <q-form class="form-stack" @submit.prevent="addWalkIn">
            <q-input
              v-model="addForm.display_name"
              outlined
              dense
              label="Name"
              hide-bottom-space
              :rules="[(v) => !!v || 'Name is required']"
            />
            <q-select
              v-model="addForm.rating"
              outlined
              dense
              label="Skill level"
              emit-value
              map-options
              :options="RATING_OPTIONS"
            >
              <template #option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                    <q-item-label caption>{{ scope.opt.description }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
            <q-input v-model="addForm.guest_phone" outlined dense label="Mobile (optional)" />
            <q-toggle v-model="addForm.check_in" label="Check in now (enter the queue)" />
            <q-btn
              class="big-action full-width"
              color="primary"
              unelevated
              label="Add player"
              type="submit"
              :loading="adding"
            />
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Edit teams: same four players, pick one of the 3 splits -->
    <q-dialog v-model="teamsDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold q-mb-xs">Edit teams</div>
          <div class="text-caption text-grey-7 q-mb-md">
            Same four players — choose the arrangement.
          </div>
          <div
            v-for="option in splitOptions"
            :key="option.key"
            class="split-option"
            :class="{ 'split-option--current': option.current }"
            @click="option.current ? (teamsDialog = false) : applySplit(option)"
          >
            <div class="col">
              <div class="text-weight-bold">
                {{ option.teamA.map((s) => s.display_name).join(' + ') }}
              </div>
              <div class="text-caption text-grey-6">vs</div>
              <div class="text-weight-bold">
                {{ option.teamB.map((s) => s.display_name).join(' + ') }}
              </div>
            </div>
            <q-icon
              v-if="option.current"
              name="eva-checkmark-circle-2"
              color="primary"
              size="20px"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Replace a player -->
    <q-dialog v-model="replaceDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold q-mb-md">Replace a player</div>

          <div class="micro-label q-mb-xs">Who's coming out?</div>
          <div class="row q-col-gutter-sm q-mb-md">
            <div v-for="slot in courtPlayers" :key="slot.player_id" class="col-6">
              <q-btn
                class="full-width"
                no-caps
                :outline="replaceOutId !== slot.player_id"
                :unelevated="replaceOutId === slot.player_id"
                color="primary"
                :label="slot.display_name"
                @click="replaceOutId = slot.player_id"
              />
            </div>
          </div>

          <template v-if="replaceOutId">
            <div class="micro-label q-mb-xs">Who's coming in?</div>
            <div v-if="!benchCandidates.length" class="text-caption text-grey-6 q-pa-sm">
              Nobody is available in the queue.
            </div>
            <div
              v-for="candidate in benchCandidates"
              :key="candidate.id"
              class="list-row cursor-pointer"
              @click="applyReplace(candidate)"
            >
              <div class="col">
                <div class="text-weight-bold">{{ candidate.display_name }}</div>
                <div class="text-caption text-grey-7">
                  {{ candidate.games_played }} games
                  <template v-if="candidate.rating"> · {{ candidate.rating.toFixed(1) }}</template>
                </div>
              </div>
              <StatusChip :status="candidate.status" />
            </div>
          </template>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Voice announcements (per device) -->
    <VoiceSettingsSheet v-model="voiceDialog" />

    <!-- Player session card -->
    <PlayerDetailSheet
      v-model="playerDetailOpen"
      :session-id="sessionId"
      :player-id="playerDetailId"
    />

    <!-- Fairness override confirmation -->
    <q-dialog v-model="fairnessDialog" persistent>
      <q-card class="dialog-card q-pa-md">
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Please review before continuing</div>
        <ul class="fairness-list">
          <li v-for="(warning, i) in fairnessWarnings" :key="i">{{ warning }}</li>
        </ul>
        <div class="text-caption text-grey-7 q-mb-md">
          If you continue, this will be logged as a fairness override.
        </div>
        <div class="row justify-end" style="gap: 8px">
          <q-btn flat no-caps color="grey-8" label="Cancel" @click="fairnessDialog = false" />
          <q-btn
            unelevated
            no-caps
            color="primary"
            label="I understand and want to proceed"
            @click="proceedFairness"
          />
        </div>
      </q-card>
    </q-dialog>

    <!-- Edit session -->
    <q-dialog v-model="editDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold q-mb-md">Edit session</div>
          <q-form class="form-stack" @submit.prevent="saveSession">
            <q-input
              v-model="editForm.name"
              outlined
              dense
              label="Session name"
              hide-bottom-space
              :rules="[(v) => !!v?.trim() || 'Session name is required']"
            />
            <q-input
              v-model="editForm.date"
              outlined
              dense
              label="Date"
              type="date"
              hide-bottom-space
              :rules="[(v) => !!v || 'Date is required']"
            />
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input v-model="editForm.start_time" outlined dense label="Start" type="time" />
              </div>
              <div class="col-6">
                <q-input v-model="editForm.end_time" outlined dense label="End" type="time" />
              </div>
            </div>
            <div>
              <q-select
                v-model="editForm.format"
                outlined
                dense
                label="Match format"
                emit-value
                map-options
                :options="formatOptions"
              />
              <div
                v-if="editForm.format !== playStore.session?.format"
                class="text-caption text-warning q-mt-xs"
              >
                Up Next matches will be re-suggested — games in progress finish as they are.
              </div>
            </div>
            <q-input
              v-model.number="editForm.max_players"
              outlined
              dense
              type="number"
              label="Max players (optional)"
            />
            <q-btn
              class="big-action full-width"
              color="primary"
              unelevated
              label="Save changes"
              type="submit"
              :loading="savingSession"
            />
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Add court -->
    <q-dialog v-model="addCourtDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold q-mb-xs">Add court</div>
          <div class="text-caption text-grey-7 q-mb-md">
            Another court freed up? It can host matches right away.
          </div>
          <q-form class="form-stack" @submit.prevent="applyAddCourt">
            <q-input
              v-model="addCourtLabel"
              outlined
              dense
              autofocus
              label="Court name"
              maxlength="60"
              hide-bottom-space
              :rules="[(v) => !!v?.trim() || 'Name is required']"
            />
            <q-btn
              class="big-action full-width"
              color="primary"
              unelevated
              label="Add court"
              type="submit"
              :loading="addingCourt"
            />
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Rename court -->
    <q-dialog v-model="renameDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold q-mb-xs">Rename court</div>
          <div class="text-caption text-grey-7 q-mb-md">
            Boards and voice announcements use the new name right away.
          </div>
          <q-form class="form-stack" @submit.prevent="applyRename">
            <q-input
              v-model="renameLabel"
              outlined
              dense
              autofocus
              label="Court name"
              maxlength="60"
              hide-bottom-space
              :rules="[(v) => !!v?.trim() || 'Name is required']"
            />
            <q-btn
              class="big-action full-width"
              color="primary"
              unelevated
              label="Save name"
              type="submit"
            />
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Lock partner -->
    <q-dialog v-model="lockDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold q-mb-xs">
            Lock a partner for {{ lockPlayer?.display_name }}
          </div>
          <div class="text-caption text-grey-7 q-mb-md">
            Locked pairs always play on the same team. You can break the lock anytime.
          </div>
          <div
            v-for="candidate in lockCandidates"
            :key="candidate.id"
            class="list-row cursor-pointer"
            @click="applyLock(candidate)"
          >
            <div class="col">
              <div class="text-weight-bold">{{ candidate.display_name }}</div>
              <div v-if="partnerNameOf(candidate)" class="text-caption text-warning">
                Currently locked with {{ partnerNameOf(candidate) }} — selecting re-links them
              </div>
              <div v-else-if="candidate.rating" class="text-caption text-grey-7">
                {{ candidate.rating.toFixed(1) }}
              </div>
            </div>
            <q-icon name="eva-link-outline" size="18px" class="text-grey-5" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import {
  addCourt,
  addPlayer,
  callMatch,
  cancelMatch,
  playerAction,
  replaceInMatch,
  scoreMatch,
  amendMatch,
  setLockedPartner,
  stageMatch,
  startMatch,
  suggestMatches,
  updateCourt,
  updateSession,
  updateTeams,
} from 'src/api/openPlay'
import MatchTeams from 'src/components/MatchTeams.vue'
import PlayerActionMenu from 'src/components/PlayerActionMenu.vue'
import PlayerDetailSheet from 'src/components/PlayerDetailSheet.vue'
import SessionLeaderboard from 'src/components/SessionLeaderboard.vue'
import StatusChip from 'src/components/StatusChip.vue'
import VoiceSettingsSheet from 'src/components/VoiceSettingsSheet.vue'
import WhyThisMatch from 'src/components/WhyThisMatch.vue'
import { useAnnouncer, useCallAnnouncer } from 'src/composables/useAnnouncer'
import { usePlaySessionRealtime } from 'src/composables/usePlayRealtime'
import { usePlaySessionStore } from 'src/stores/playSession'
import { courtStatusLabel, formatSeconds } from 'src/utils/format'
import { FORMAT_OPTIONS } from 'src/utils/formats'
import { RATING_OPTIONS } from 'src/utils/ratings'
import { recapBlob } from 'src/utils/recapImage'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const playStore = usePlaySessionStore()

const tab = ref('courts')
const filling = ref(false)
const suggestingCourtId = ref(null)
const scoreDialog = ref(false)
const scoringMatch = ref(null)
const amending = ref(false)
const scoreA = ref('0')
const scoreB = ref('0')
const scoring = ref(false)
const addDialog = ref(false)
const adding = ref(false)

const addForm = reactive({ display_name: '', rating: 3.5, guest_phone: '', check_in: true })

const sessionId = Number(route.params.id)

// Winners/losers sessions: show which pool a queued player feeds.
function poolTagOf(playerId) {
  if (playStore.session?.format !== 'winners_losers') return null
  const player = playerById(playerId)
  if (!player) return null
  return player.last_game_result === 'win'
    ? { label: 'Winners', cls: 'pool-tag--win' }
    : { label: 'Challenger', cls: 'pool-tag--challenger' }
}

const openCourtCount = computed(
  () => playStore.courts.filter((c) => c.status === 'available').length,
)

// Ended/cancelled sessions are an archive: every operational control
// (stage, call, add, court ops, player actions) disappears — only the
// board, results and sharing remain.
const readOnly = computed(() =>
  ['ended', 'cancelled'].includes(playStore.session?.status),
)
const sidelined = computed(() =>
  playStore.players.filter((p) =>
    ['on_break', 'cooling_down', 'no_show', 'injured', 'checked_out', 'registered'].includes(
      p.status,
    ),
  ),
)

// Overflow actions per court state. Empty array = no button (never an
// empty menu).
function courtMenuOptions(court) {
  if (readOnly.value) return []
  const options = []
  const match = matchFor(court)

  options.push({
    key: 'rename',
    label: 'Rename court…',
    handler: () => openRenameDialog(court),
  })
  if (court.status === 'available') {
    options.push({
      key: 'maintenance',
      label: 'Set maintenance',
      handler: () => setCourtStatus(court, 'maintenance'),
    })
    options.push({
      key: 'close',
      label: 'Close court',
      handler: () => setCourtStatus(court, 'closed'),
    })
  }
  if (['maintenance', 'closed'].includes(court.status)) {
    options.push({
      key: 'reopen',
      label: 'Reopen court',
      handler: () => setCourtStatus(court, 'available'),
    })
  }
  if (match) {
    // Real-life staples: rearrange lopsided teams, or sub in someone from
    // the queue (no-show after calling, injury, early departure).
    if ((match.team_a?.length || 0) === 2) {
      options.push({
        key: 'teams',
        label: 'Edit teams',
        handler: () => openTeamsDialog(match),
      })
    }
    options.push({
      key: 'replace',
      label: 'Replace a player…',
      handler: () => openReplaceDialog(match),
    })
  }
  // A playing match has no inline Cancel (only "End match") — abandoning a
  // game without a result (injury, rain) lives here.
  if (match?.status === 'playing') {
    options.push({
      key: 'abandon',
      label: 'Cancel match (no result)',
      danger: true,
      handler: () => confirmAbandon(match),
    })
  }

  return options
}

// ——— Player session card (tap a row in Queue/Players) ———
const playerDetailOpen = ref(false)
const playerDetailId = ref(null)

function openPlayerDetail(playerId) {
  playerDetailId.value = playerId
  playerDetailOpen.value = true
}

// ——— Fairness overrides: warn + log, never block ———
const fairnessDialog = ref(false)
const fairnessWarnings = ref([])
let fairnessProceed = null

function withFairnessCheck(warnings, action) {
  if (!warnings.length) {
    action(null)
    return
  }
  fairnessWarnings.value = warnings
  fairnessProceed = () => action({ reasons: warnings })
  fairnessDialog.value = true
}

function proceedFairness() {
  fairnessDialog.value = false
  fairnessProceed?.()
  fairnessProceed = null
}

function pairKey(a, b) {
  return `${Math.min(a, b)}-${Math.max(a, b)}`
}

function repeatPartnerWarning(idA, idB) {
  const count = playStore.state?.pair_history?.partners?.[pairKey(idA, idB)] || 0
  if (!count) return null
  const a = playerById(idA)
  const b = playerById(idB)
  if (!a || !b) return null
  const locked = a.locked_partner_id === b.id
  if (locked) return null // locked pairs are SUPPOSED to repeat
  const times = count > 1 ? `${count}×` : 'recently'
  return `${a.display_name} + ${b.display_name} already played together this session (${times}) and are not a locked pair.`
}

// ——— Edit session (name, schedule, format, capacity) ———
const editDialog = ref(false)
const savingSession = ref(false)
const editForm = reactive({
  name: '',
  date: '',
  start_time: '',
  end_time: '',
  format: 'smart',
  max_players: null,
})

const formatOptions = FORMAT_OPTIONS

function openEditSession() {
  const session = playStore.session
  editForm.name = session.name
  editForm.date = (session.date || '').slice(0, 10)
  editForm.start_time = session.start_time ? session.start_time.slice(0, 5) : ''
  editForm.end_time = session.end_time ? session.end_time.slice(0, 5) : ''
  editForm.format = session.format
  editForm.max_players = session.max_players || null
  editDialog.value = true
}

function saveSession() {
  // Format switches change who plays next — confirm before rebuilding.
  if (playStore.session && editForm.format !== playStore.session.format) {
    const newLabel = formatOptions.find((o) => o.value === editForm.format)?.label || editForm.format
    $q.dialog({
      title: 'Change match format?',
      message: `Games in progress and called matches finish as they are. Up Next matches go back to the queue (wait time kept) and will be re-suggested by ${newLabel}.`,
      cancel: true,
      persistent: true,
      ok: { label: 'Change format', color: 'primary', unelevated: true },
    }).onOk(() => doSaveSession())
    return
  }
  doSaveSession()
}

async function doSaveSession() {
  savingSession.value = true
  try {
    await updateSession(sessionId, {
      name: editForm.name.trim(),
      date: editForm.date,
      start_time: editForm.start_time || null,
      end_time: editForm.end_time || null,
      format: editForm.format,
      max_players: editForm.max_players || null,
    })
    editDialog.value = false
    await refresh()
    $q.notify({ message: 'Session updated', color: 'positive' })
  } catch (e) {
    notifyError(e, 'Could not update the session')
  } finally {
    savingSession.value = false
  }
}

// ——— End-of-session recap: share / download the standings image ———
const sharingRecap = ref(false)

async function shareRecap(preferShare) {
  sharingRecap.value = true
  try {
    const blob = await recapBlob(playStore.state)
    const name = `${(playStore.session?.name || 'open-play').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-results.png`
    const file = new File([blob], name, { type: 'image/png' })

    // Native share sheet (mobile: straight into chat apps); download otherwise.
    if (preferShare && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: playStore.session?.name || 'Open Play results' })
      return
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch (e) {
    if (e?.name !== 'AbortError') {
      $q.notify({ message: 'Could not build the results image', color: 'negative' })
    }
  } finally {
    sharingRecap.value = false
  }
}

// ——— Add court (venue freed one up mid-session) ———
const addCourtDialog = ref(false)
const addCourtLabel = ref('')
const addingCourt = ref(false)

function openAddCourt() {
  addCourtLabel.value = `Court ${playStore.courts.length + 1}`
  addCourtDialog.value = true
}

async function applyAddCourt() {
  const label = addCourtLabel.value.trim()
  if (!label) return
  addingCourt.value = true
  try {
    await addCourt(sessionId, { label })
    addCourtDialog.value = false
    await refresh()
    $q.notify({ message: `${label} added`, color: 'positive' })
  } catch (e) {
    notifyError(e, 'Could not add the court')
  } finally {
    addingCourt.value = false
  }
}

// ——— Rename court (announcements pick up the new name automatically) ———
const renameDialog = ref(false)
const renameCourt = ref(null)
const renameLabel = ref('')

function openRenameDialog(court) {
  renameCourt.value = court
  renameLabel.value = court.label
  renameDialog.value = true
}

async function applyRename() {
  const label = renameLabel.value.trim()
  if (!label) return
  try {
    await updateCourt(sessionId, renameCourt.value.id, { label })
    renameDialog.value = false
    await refresh()
  } catch (e) {
    notifyError(e, 'Could not rename the court')
  }
}

// ——— Edit teams (same four players, one of the 3 possible splits) ———
const teamsDialog = ref(false)
const teamsMatch = ref(null)

function openTeamsDialog(match) {
  teamsMatch.value = match
  teamsDialog.value = true
}

const splitOptions = computed(() => {
  const m = teamsMatch.value
  if (!m) return []
  const ps = [...(m.team_a || []), ...(m.team_b || [])]
  if (ps.length !== 4) return []
  return [
    [[0, 1], [2, 3]],
    [[0, 2], [1, 3]],
    [[0, 3], [1, 2]],
  ].map(([a, b]) => {
    const teamA = a.map((i) => ps[i])
    const teamB = b.map((i) => ps[i])
    const currentIds = (m.team_a || []).map((s) => s.player_id).sort((x, y) => x - y)
    const optionIds = teamA.map((s) => s.player_id).sort((x, y) => x - y)
    return {
      key: optionIds.join('-'),
      teamA,
      teamB,
      current: JSON.stringify(currentIds) === JSON.stringify(optionIds),
    }
  })
})

function applySplit(option) {
  const warnings = []
  for (const team of [option.teamA, option.teamB]) {
    if (team.length === 2) {
      const warning = repeatPartnerWarning(team[0].player_id, team[1].player_id)
      if (warning) warnings.push(warning)
    }
  }

  withFairnessCheck(warnings, async (fairness) => {
    try {
      await updateTeams(
        teamsMatch.value.id,
        option.teamA.map((s) => s.player_id),
        option.teamB.map((s) => s.player_id),
        fairness,
      )
      teamsDialog.value = false
      await refresh()
    } catch (e) {
      notifyError(e, 'Could not change the teams')
    }
  })
}

// ——— Replace a player (out: someone on court; in: someone from the queue) ———
const replaceDialog = ref(false)
const replaceMatch = ref(null)
const replaceOutId = ref(null)

function openReplaceDialog(match) {
  replaceMatch.value = match
  replaceOutId.value = null
  replaceDialog.value = true
}

const courtPlayers = computed(() => {
  const m = replaceMatch.value
  if (!m) return []
  return [...(m.team_a || []), ...(m.team_b || [])]
})

// Queue order first (fairness-visible), cooling-down players after.
const benchCandidates = computed(() => {
  const queued = playStore.queue
    .map((entry) => playerById(entry.player_id))
    .filter(Boolean)
    .map((p) => ({ ...p, wait: p.effective_wait_seconds }))
  const cooling = playStore.players.filter((p) => p.status === 'cooling_down')
  return [...queued, ...cooling]
})

function applyReplace(inPlayer) {
  const warnings = []

  // Queue jump: someone else has waited longer than the chosen sub.
  if (inPlayer.status === 'waiting') {
    const position = playStore.queue.findIndex((q) => q.player_id === inPlayer.id)
    if (position > 0) {
      warnings.push(
        `${position} waiting ${position === 1 ? 'player has' : 'players have'} been waiting longer than ${inPlayer.display_name}.`,
      )
    }
  }

  // Repeat partnership with the new teammate(s).
  const match = replaceMatch.value
  const outSlot = [...(match.team_a || []), ...(match.team_b || [])].find(
    (s) => s.player_id === replaceOutId.value,
  )
  const outTeam = (match.team_a || []).some((s) => s.player_id === replaceOutId.value)
    ? match.team_a
    : match.team_b
  if (outSlot) {
    for (const teammate of outTeam) {
      if (teammate.player_id === replaceOutId.value) continue
      const warning = repeatPartnerWarning(inPlayer.id, teammate.player_id)
      if (warning) warnings.push(warning)
    }
  }

  withFairnessCheck(warnings, async (fairness) => {
    try {
      await replaceInMatch(match.id, replaceOutId.value, inPlayer.id, fairness)
      replaceDialog.value = false
      await refresh()
    } catch (e) {
      notifyError(e, 'Could not replace the player')
    }
  })
}

// ——— Partner lock ———
const lockDialog = ref(false)
const lockPlayer = ref(null)

const lockCandidates = computed(() => {
  if (!lockPlayer.value) return []
  return playStore.players.filter(
    (p) => p.id !== lockPlayer.value.id && !['checked_out', 'no_show'].includes(p.status),
  )
})

function partnerNameOf(player) {
  if (!player?.locked_partner_id) return null
  return playerById(player.locked_partner_id)?.display_name || null
}

async function applyLock(partner) {
  try {
    await setLockedPartner(sessionId, lockPlayer.value.id, partner ? partner.id : null)
    lockDialog.value = false
    await refresh()
  } catch (e) {
    notifyError(e, 'Could not update the partner lock')
  }
}

function confirmAbandon(match) {
  $q.dialog({
    title: 'Cancel this match?',
    message:
      'No result is recorded — all four players go straight back into the queue with their wait priority intact.',
    cancel: true,
    ok: { label: 'Cancel match', color: 'negative', unelevated: true },
  }).onOk(() => doMatch(cancelMatch, match))
}

// Court status → status-dot color class (shared dot palette).
function courtDot(status) {
  const map = {
    available: 'dot-waiting',
    reserved: 'dot-up_next',
    players_called: 'dot-called',
    playing: 'dot-playing',
    result_pending: 'dot-cooling_down',
    maintenance: 'dot-no_show',
    closed: 'dot-checked_out',
  }
  return map[status] || 'dot-checked_out'
}

function playerById(id) {
  return playStore.players.find((p) => p.id === id) || null
}

function matchFor(court) {
  if (!court.active_match_id) return null
  return playStore.activeMatches.find((m) => m.id === court.active_match_id) || null
}

function teamNames(team) {
  return (team || []).map((slot) => slot.display_name).join(' + ')
}

// Live court timer
const nowTick = ref(Date.now())
const tickInterval = setInterval(() => (nowTick.value = Date.now()), 1000)
onBeforeUnmount(() => clearInterval(tickInterval))

function elapsed(match) {
  if (!match?.started_at) return ''
  const seconds = Math.max(0, Math.floor((nowTick.value - new Date(match.started_at)) / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function notifyError(e, fallback) {
  $q.notify({ message: e.response?.data?.message || fallback, color: 'negative' })
}

async function refresh() {
  await playStore.fetchState().catch(() => {})
}

async function setStatus(status) {
  try {
    await updateSession(sessionId, { status })
    await refresh()
  } catch (e) {
    notifyError(e, 'Could not update session')
  }
}

function confirmEnd() {
  // Courts must be cleared first — ending mid-game would throw away
  // unscored results (the backend refuses too; this explains it upfront).
  const busy = playStore.activeMatches.length
  if (busy) {
    $q.dialog({
      title: 'Courts still busy',
      message: `${busy === 1 ? 'A game is' : `${busy} games are`} still on court. Score or cancel each game first, then end the session.`,
      ok: { label: 'Got it', color: 'primary', unelevated: true },
    })
    return
  }

  $q.dialog({
    title: 'End session?',
    message: 'The queue stops and remaining players are released.',
    cancel: true,
    ok: { label: 'End session', color: 'negative', unelevated: true },
  }).onOk(() => setStatus('ended'))
}

function openDisplay() {
  const url = router.resolve({
    name: 'display',
    params: { code: playStore.session.join_code },
  }).href
  window.open(url, '_blank')
}

async function suggestFor(court) {
  suggestingCourtId.value = court.id
  try {
    const proposals = await suggestMatches(sessionId, { court_id: court.id })
    if (!proposals.length) {
      $q.notify({ message: 'Not enough eligible players for a match.', color: 'warning' })
      return
    }
    await stageFromProposal(proposals[0])
  } catch (e) {
    notifyError(e, 'Could not generate a match')
  } finally {
    suggestingCourtId.value = null
  }
}

async function fillOpenCourts() {
  filling.value = true
  try {
    const proposals = await suggestMatches(sessionId)
    if (!proposals.length) {
      $q.notify({ message: 'Not enough eligible players.', color: 'warning' })
      return
    }
    for (const proposal of proposals) {
      await stageFromProposal(proposal)
    }
  } catch (e) {
    notifyError(e, 'Could not fill courts')
  } finally {
    filling.value = false
  }
}

async function stageFromProposal(proposal) {
  await stageMatch(sessionId, {
    team_a: proposal.team_a,
    team_b: proposal.team_b,
    court_id: proposal.court_id,
    created_by: 'engine',
    quality: proposal.quality,
    breakdown: proposal.breakdown,
    reasons: proposal.reasons,
  })
  await refresh()
}

async function doMatch(fn, match) {
  try {
    await fn(match.id)
    await refresh()
  } catch (e) {
    notifyError(e, 'Match action failed')
  }
}

function openScoreDialog(match, isAmend = false) {
  scoringMatch.value = match
  amending.value = isAmend
  scoreA.value = isAmend ? String(match.team_a_score ?? 0) : '0'
  scoreB.value = isAmend ? String(match.team_b_score ?? 0) : '0'
  scoreDialog.value = true
}

async function saveScore() {
  const a = parseInt(scoreA.value, 10) || 0
  const b = parseInt(scoreB.value, 10) || 0
  if (a === b) {
    $q.notify({ message: 'Scores can’t be equal — one team must win.', color: 'negative' })
    return
  }

  scoring.value = true
  try {
    if (amending.value) {
      await amendMatch(scoringMatch.value.id, a, b)
    } else {
      await scoreMatch(scoringMatch.value.id, a, b)
    }
    scoreDialog.value = false
    await refresh()
  } catch (e) {
    notifyError(e, 'Could not save the score')
  } finally {
    scoring.value = false
  }
}

async function onPlayerAction({ player, action, extra }) {
  // Partner-lock entries aren't queue transitions — handle them here.
  if (action === 'lock_partner') {
    lockPlayer.value = player
    lockDialog.value = true
    return
  }
  if (action === 'unlock_partner') {
    try {
      await setLockedPartner(sessionId, player.id, null)
      await refresh()
    } catch (e) {
      notifyError(e, 'Could not unlock the partner')
    }
    return
  }

  try {
    await playerAction(sessionId, player.id, action, extra || {})
    await refresh()
  } catch (e) {
    notifyError(e, 'Player action failed')
  }
}

async function addWalkIn() {
  adding.value = true
  try {
    await addPlayer(sessionId, { ...addForm })
    addDialog.value = false
    addForm.display_name = ''
    addForm.guest_phone = ''
    await refresh()
  } catch (e) {
    notifyError(e, 'Could not add player')
  } finally {
    adding.value = false
  }
}

async function setCourtStatus(court, status) {
  try {
    await updateCourt(sessionId, court.id, { status })
    await refresh()
  } catch (e) {
    notifyError(e, 'Could not update court')
  }
}

const sessionIdRef = computed(() => playStore.sessionId)
usePlaySessionRealtime(sessionIdRef, refresh)

// ——— Voice announcements: speak whenever a match becomes "called" (no
// matter which device pressed the button) and repeat while it stays called.
const voiceDialog = ref(false)
const { settings: voiceSettings } = useAnnouncer()
const { sync: syncAnnouncer } = useCallAnnouncer(
  () => playStore.activeMatches.filter((m) => m.status === 'called'),
  () => !!playStore.state, // never prime on the empty pre-fetch state
)
watch(() => playStore.activeMatches, syncAnnouncer)

// The console borrows the shared session pointer — remember the player's
// own active session so opening (or being denied) a console never nukes it.
const prevSessionId = playStore.sessionId

function bailOut(message) {
  playStore.setActive(prevSessionId !== sessionId ? prevSessionId : null)
  $q.notify({ message, color: 'negative' })
  router.replace({ name: 'organizer-sessions' })
}

onMounted(async () => {
  playStore.setActive(sessionId)
  try {
    await playStore.fetchState()
  } catch (e) {
    const status = e.response?.status
    bailOut(
      status === 403
        ? 'You are not an organizer of this session.'
        : 'Could not open this session.',
    )
    return
  }
  syncAnnouncer()
  if (playStore.state && !playStore.canManage) {
    bailOut('You are not an organizer of this session.')
  }
})

onBeforeUnmount(() => {
  // Restore the player's session pointer — but only if it still points at
  // this console's session (another page may have retargeted it already).
  if (prevSessionId && prevSessionId !== sessionId && playStore.sessionId === sessionId) {
    playStore.setActive(prevSessionId)
  }
})
</script>

<style scoped>
.split-option {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  text-align: center;
}

.split-option .col {
  text-align: center;
}

.split-option + .split-option {
  margin-top: 8px;
}

.split-option--current {
  border-color: var(--brand-teal);
  background: var(--surface-sunken);
}

.fairness-list {
  margin: 0 0 12px;
  padding-left: 18px;
}

.fairness-list li {
  font-size: 13px;
  margin-bottom: 4px;
}
</style>
