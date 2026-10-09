<template>
  <q-page>
    <q-pull-to-refresh no-mouse color="primary" :disable="!playStore.session" @refresh="onPull">
    <div class="app-page app-page--console" style="max-width: 760px">
      <div v-if="playStore.loading && !playStore.session" aria-busy="true">
        <div class="row items-center q-mb-md" style="gap: 8px">
          <q-skeleton type="text" width="40%" />
          <q-space />
          <q-skeleton type="QBtn" width="80px" />
        </div>
        <q-skeleton type="rect" height="36px" class="q-mb-md" style="border-radius: 10px" />
        <SkeletonList variant="courts" :rows="2" />
      </div>

      <template v-else-if="playStore.session">
        <!-- Header + session controls -->
        <div class="console-head q-mb-sm">
          <div class="console-head-info">
            <div class="row items-center no-wrap text-caption text-grey-7" style="gap: 8px">
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
          <div class="console-head-actions">
          <q-btn v-if="!readOnly" flat dense round icon="eva-edit-outline" color="grey-8" aria-label="Edit session" @click="openEditSession">
            <q-tooltip>Edit session</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="eva-share-outline" color="grey-8" aria-label="Invite players" @click="shareOpen = true">
            <q-tooltip>Invite players (QR / link)</q-tooltip>
          </q-btn>
          <q-btn v-if="playStore.canManage" flat dense no-caps icon="eva-person-add-outline" label="Host" color="grey-8" @click="openHostsDialog">
            <q-tooltip>Invite host</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="eva-tv-outline" color="grey-8" aria-label="Open TV board" @click="openDisplay">
            <q-tooltip>Open TV board</q-tooltip>
          </q-btn>
          <q-btn
            flat
            dense
            round
            :icon="voiceSettings.enabled ? 'eva-volume-up-outline' : 'eva-volume-off-outline'"
            :color="voiceSettings.enabled ? 'primary' : 'grey-8'"
            :aria-label="voiceSettings.enabled ? 'Voice announcements on' : 'Voice announcements off'"
            @click="voiceDialog = true"
          >
            <q-tooltip>Voice announcements</q-tooltip>
          </q-btn>
          <q-btn
            v-if="['draft', 'open'].includes(playStore.session.status)"
            class="console-status-btn"
            color="primary"
            unelevated
            no-caps
            label="Go live"
            :loading="statusBusy"
            @click="setStatus('live')"
          />
          <q-btn
            v-else-if="playStore.session.status === 'live'"
            class="console-status-btn"
            flat
            no-caps
            color="grey-8"
            label="End"
            @click="confirmEnd"
          />
          <q-btn
            v-else-if="canReopen"
            class="console-status-btn"
            outline
            no-caps
            color="primary"
            label="Reopen"
            :loading="statusBusy"
            @click="confirmReopen"
          />
          <q-btn
            v-if="playStore.canManage"
            flat
            dense
            round
            icon="eva-more-vertical-outline"
            color="grey-8"
            aria-label="More session actions"
          >
            <q-menu auto-close>
              <q-list style="min-width: 220px">
                <q-item clickable @click="downloadCsv('players')">
                  <q-item-section avatar><q-icon name="eva-download-outline" size="18px" /></q-item-section>
                  <q-item-section>Export players (CSV)</q-item-section>
                </q-item>
                <q-item clickable @click="downloadCsv('matches')">
                  <q-item-section avatar><q-icon name="eva-download-outline" size="18px" /></q-item-section>
                  <q-item-section>Export games (CSV)</q-item-section>
                </q-item>
                <q-item
                  v-if="['draft', 'open', 'live'].includes(playStore.session.status)"
                  clickable
                  @click="confirmCancelSession"
                >
                  <q-item-section avatar><q-icon name="eva-close-circle-outline" color="negative" size="18px" /></q-item-section>
                  <q-item-section class="text-negative">Cancel session</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
          </div>
        </div>

        <SyncStatusBanner
          :last-synced-at="playStore.lastSyncedAt"
          :error="playStore.error"
          :on-retry="() => playStore.fetchState()"
        />
        <ShareSessionDialog v-if="shareLoaded" v-model="shareOpen" :code="playStore.session.join_code" :session-name="playStore.session.name" />

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

        <!-- Guests who joined from the QR wait here until approved -->
        <div v-if="pendingGuests.length && !readOnly" class="play-card pending-card q-mb-md">
          <div class="row items-center q-mb-xs">
            <q-icon name="eva-person-add-outline" size="18px" class="q-mr-xs" />
            <div class="text-weight-bold col">
              {{ pendingGuests.length }} {{ pendingGuests.length === 1 ? 'guest wants' : 'guests want' }} to join
            </div>
          </div>
          <div v-for="g in pendingGuests" :key="g.id" class="list-row">
            <div class="col">
              <div class="text-weight-bold">{{ g.display_name }}</div>
              <div class="text-caption text-grey-7">
                guest<template v-if="g.rating"> · {{ Number(g.rating).toFixed(1) }}</template><template v-if="g.guest_phone"> · {{ g.guest_phone }}</template>
              </div>
            </div>
            <q-btn flat no-caps color="negative" label="Decline" padding="8px 10px" :disable="approvingId === g.id" @click="decideGuest(g, 'reject')" />
            <q-btn unelevated no-caps color="primary" label="Approve" padding="8px 14px" :loading="approvingId === g.id" @click="decideGuest(g, 'approve')" />
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

          <div v-for="{ court, match, menu } in courtRows" :key="court.id" class="court-card q-mb-md">
            <div class="court-card-head">
              <span class="text-subtitle1 text-weight-bold">{{ court.label }}</span>
              <span class="status-tag">
                <i class="status-dot" :class="courtDot(court.status)" />
                <span>{{ courtStatusLabel(court.status) }}</span>
              </span>
              <q-space />
              <!-- Own 1s interval: only this text re-renders each second. -->
              <CourtTimer v-if="match?.status === 'playing'" :started-at="match.started_at" />
              <q-btn
                v-if="menu.length"
                flat
                round
                class="tap-44"
                icon="eva-more-vertical-outline"
                color="grey-7"
                :aria-label="`${court.label} options`"
              >
                <q-menu auto-close>
                  <q-list style="min-width: 220px">
                    <q-item
                      v-for="option in menu"
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
            <template v-if="match">
              <div class="court-card-body">
                <MatchTeams
                  :match="match"
                  :show-ready="match.status === 'called'"
                />
                <WhyThisMatch :match="match" class="q-mt-sm" />
              </div>
              <div class="court-card-actions" :class="{ 'is-busy': busyMatchIds.has(match.id) }">
                <q-btn
                  v-if="match.status === 'staged'"
                  class="col"
                  color="primary"
                  unelevated
                  no-caps
                  label="Call players"
                  @click="callPlayers(match)"
                />
                <q-btn
                  v-if="match.status === 'staged'"
                  class="col"
                  outline
                  no-caps
                  color="primary"
                  label="Start"
                  @click="doMatch(startMatch, match)"
                />
                <q-btn
                  v-if="match.status === 'called'"
                  class="col"
                  color="primary"
                  unelevated
                  no-caps
                  label="Start match"
                  @click="doMatch(startMatch, match)"
                />
                <!-- Phone: round bell only. Tablet/desktop: room for a label. -->
                <q-btn
                  v-if="match.status === 'called'"
                  outline
                  no-caps
                  color="primary"
                  icon="eva-bell-outline"
                  :round="!$q.screen.gt.xs"
                  :label="$q.screen.gt.xs ? 'Call again' : undefined"
                  :class="$q.screen.gt.xs ? 'col' : 'tap-44'"
                  aria-label="Call players again"
                  @click="callPlayers(match)"
                >
                  <q-tooltip v-if="!$q.screen.gt.xs">Call again</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="match.status === 'playing'"
                  class="col"
                  color="primary"
                  unelevated
                  no-caps
                  label="End match"
                  @click="openScoreDialog(match)"
                />
                <q-btn
                  v-if="match.status !== 'playing'"
                  flat
                  no-caps
                  color="negative"
                  label="Cancel"
                  padding="8px 10px"
                  @click="confirmCancelStaged(match)"
                />
              </div>
            </template>

            <!-- Free court -->
            <div v-else-if="court.status === 'available'" class="court-card-body text-center">
              <template v-if="!readOnly">
                <div class="row q-col-gutter-sm q-mt-sm justify-center items-center">
                  <div class="col-auto">
                    <q-btn
                      outline
                      no-caps
                      color="primary"
                      icon="eva-flash-outline"
                      label="Start next"
                      :disable="playStore.queue.length < neededPlayers"
                      :loading="suggestingCourtId === court.id"
                      @click="suggestFor(court)"
                    >
                      <q-tooltip>Auto-pick a balanced match</q-tooltip>
                    </q-btn>
                  </div>
                  <div v-if="isFirstRollout" class="col-auto">
                    <q-btn
                      outline
                      no-caps
                      color="primary"
                      icon="eva-people-outline"
                      label="Choose players"
                      :disable="choosablePlayers.length < neededPlayers"
                      @click="openChooseDialog(court)"
                    >
                      <q-tooltip>Hand-pick the opening match</q-tooltip>
                    </q-btn>
                  </div>
                </div>
                <div
                  v-if="playStore.queue.length < neededPlayers"
                  class="text-caption text-grey-6 q-mt-sm"
                >
                  Needs {{ neededPlayers - playStore.queue.length }} more waiting
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
            <span class="empty-state-icon"><q-icon name="eva-people-outline" size="28px" /></span>
            <div class="empty-state-title">Nobody is waiting</div>
            <div class="text-caption q-mb-md">Players appear here when they check in. Share the code or QR to get them in.</div>
            <q-btn color="primary" outline no-caps icon="eva-share-outline" label="Invite players" @click="shareOpen = true" />
          </div>
          <div v-else class="play-card">
            <div v-for="{ entry, player, partner, pool } in queueRows" :key="entry.player_id" class="list-row">
              <div class="queue-pos">{{ entry.position }}</div>
              <div class="col cursor-pointer" @click="openPlayerDetail(entry.player_id)">
                <div class="text-weight-bold">
                  {{ player?.display_name }}
                  <span v-if="player?.paid === false" class="unpaid-tag q-ml-xs">Unpaid</span>
                </div>
                <div class="text-caption text-grey-7">
                  {{ player?.games_played }} games
                  <template v-if="player?.rating">
                    · {{ player.rating.toFixed(1) }}
                  </template>
                  <span v-if="partner" class="pair-tag q-ml-xs">
                    <q-icon name="eva-link-outline" />
                    {{ partner }}
                  </span>
                  <span v-if="pool" class="pool-tag q-ml-xs" :class="pool.cls">
                    {{ pool.label }}
                  </span>
                </div>
              </div>
              <div class="text-caption text-grey-7 tnum">
                {{ formatSeconds(entry.effective_wait_seconds) }}
              </div>
              <PlayerActionMenu v-if="!readOnly" :player="player" @action="onPlayerAction" />
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
          <!-- Search by name + "not checked in" filter, for fast check-in at the door. -->
          <q-input
            v-model="playerSearch"
            outlined
            dense
            clearable
            placeholder="Search player name"
            class="q-mb-sm"
            @clear="playerSearch = ''"
          >
            <template #prepend><q-icon name="eva-search-outline" /></template>
          </q-input>
          <div class="row items-center q-mb-md">
            <q-chip
              clickable
              dense
              :outline="!playerNotCheckedIn"
              :color="playerNotCheckedIn ? 'primary' : 'grey-7'"
              :text-color="playerNotCheckedIn ? 'white' : 'grey-8'"
              icon="eva-clock-outline"
              :label="`Not checked in (${notCheckedInCount})`"
              @click="playerNotCheckedIn = !playerNotCheckedIn"
            />
            <q-space />
            <span v-if="playerFilterActive" class="text-caption text-grey-7">
              {{ filteredPlayers.length }} of {{ playStore.players.length }}
            </span>
          </div>
          <div class="play-card">
            <div v-if="playerFilterActive && !filteredPlayers.length" class="empty-state">
              <div class="empty-state-title">No players match</div>
              <div class="text-caption">Try a different name or clear the filter.</div>
            </div>
            <div v-for="player in filteredPlayers" :key="player.id" class="list-row">
              <div class="col cursor-pointer" @click="openPlayerDetail(player.id)">
                <div class="text-weight-bold">
                  {{ player.display_name }}
                  <span v-if="player.is_guest" class="text-caption text-grey-6">guest</span>
                  <span v-if="player.paid === false" class="unpaid-tag q-ml-xs">Unpaid</span>
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
              <span class="empty-state-icon"><q-icon name="eva-award-outline" size="28px" /></span>
              <div class="empty-state-title">No games yet</div>
              <div class="text-caption">Finished games and scores show up here.</div>
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
                round
                class="tap-44"
                color="grey-7"
                icon="eva-edit-outline"
                aria-label="Edit result"
                @click="openScoreDialog(match, true)"
              >
                <q-tooltip>Edit result</q-tooltip>
              </q-btn>
            </div>
          </div>
        </div>
      </template>
    </div>
    </q-pull-to-refresh>

    <!-- Score dialog -->
    <q-dialog v-model="scoreDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section v-if="scoringMatch" class="q-pa-md">
          <div class="sheet-title q-mb-md">
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
      <q-card class="sheet sheet--tall">
        <q-card-section class="q-pa-md">
          <div class="sheet-title q-mb-md">Add player</div>
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
          <div class="sheet-title q-mb-xs">Edit teams</div>
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
      <q-card class="sheet sheet--tall">
        <q-card-section class="q-pa-md">
          <div class="sheet-title q-mb-md">Replace a player</div>

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
                  <span v-if="partnerNameOf(candidate)" class="pair-tag q-ml-xs">
                    <q-icon name="eva-link-outline" />
                    {{ partnerNameOf(candidate) }}
                  </span>
                  <span
                    v-if="poolTagOf(candidate.id)"
                    class="pool-tag q-ml-xs"
                    :class="poolTagOf(candidate.id).cls"
                  >
                    {{ poolTagOf(candidate.id).label }}
                  </span>
                </div>
              </div>
              <StatusChip :status="candidate.status" />
            </div>
          </template>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Choose players: hand-pick a match instead of auto-suggest -->
    <q-dialog v-model="chooseDialog" position="bottom">
      <q-card class="sheet sheet--tall">
        <q-card-section class="q-pa-md">
          <div class="sheet-title q-mb-xs">
            Choose players<template v-if="chooseCourt"> — {{ chooseCourt.label }}</template>
          </div>
          <div class="text-caption text-grey-7 q-mb-md">
            Tap {{ neededPlayers }} players in the order you want them paired.
            <b>{{ chosenIds.length }}/{{ neededPlayers }} picked.</b>
          </div>

          <div v-if="choosablePlayers.length < neededPlayers" class="text-caption text-grey-6 q-pa-sm">
            Not enough available players — need {{ neededPlayers }}.
          </div>

          <template v-else>
            <div
              v-for="cand in choosablePlayers"
              :key="cand.id"
              class="list-row cursor-pointer"
              :class="{ 'choose-row--picked': chooseIndex(cand.id) >= 0 }"
              @click="toggleChoose(cand.id)"
            >
              <div
                class="choose-badge"
                :class="{ 'choose-badge--on': chooseIndex(cand.id) >= 0 }"
              >
                <template v-if="chooseIndex(cand.id) >= 0">{{ chooseIndex(cand.id) + 1 }}</template>
                <q-icon v-else name="eva-plus-outline" size="16px" />
              </div>
              <div class="col">
                <div class="text-weight-bold">{{ cand.display_name }}</div>
                <div class="text-caption text-grey-7">
                  {{ cand.games_played }} games
                  <template v-if="cand.rating"> · {{ cand.rating.toFixed(1) }}</template>
                  <span v-if="partnerNameOf(cand)" class="pair-tag q-ml-xs">
                    <q-icon name="eva-link-outline" />
                    {{ partnerNameOf(cand) }}
                  </span>
                  <span
                    v-if="poolTagOf(cand.id)"
                    class="pool-tag q-ml-xs"
                    :class="poolTagOf(cand.id).cls"
                  >
                    {{ poolTagOf(cand.id).label }}
                  </span>
                </div>
              </div>
              <div class="text-caption text-grey-7 tnum">
                {{ formatSeconds(cand.effective_wait_seconds) }}
              </div>
            </div>

            <!-- Match preview + one-tap swap of the pairing -->
            <div v-if="chosenIds.length === neededPlayers" class="choose-preview q-mt-md">
              <div class="row items-center no-wrap">
                <div class="col">
                  <div class="micro-label q-mb-xs">Match preview</div>
                  <div class="text-weight-bold">
                    {{ chosenTeams.teamA.map((p) => p.display_name).join(' + ') }}
                  </div>
                  <div class="text-caption text-grey-6">vs</div>
                  <div class="text-weight-bold">
                    {{ chosenTeams.teamB.map((p) => p.display_name).join(' + ') }}
                  </div>
                </div>
                <q-btn
                  v-if="neededPlayers === 4"
                  flat
                  dense
                  no-caps
                  color="primary"
                  icon="eva-swap-outline"
                  label="Swap"
                  @click="swapTeams"
                >
                  <q-tooltip>Try a different pairing</q-tooltip>
                </q-btn>
              </div>
            </div>

            <div class="row justify-end q-mt-md" style="gap: 8px">
              <q-btn flat no-caps color="grey-8" label="Cancel" @click="chooseDialog = false" />
              <q-btn
                unelevated
                no-caps
                color="primary"
                label="Stage match"
                :disable="chosenIds.length !== neededPlayers"
                :loading="staging"
                @click="stageChosen"
              />
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
        <div class="sheet-title q-mb-sm">Please review before continuing</div>
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
      <q-card class="sheet sheet--tall">
        <q-card-section class="q-pa-md">
          <div class="sheet-title q-mb-md">Edit session</div>
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
            <q-toggle
              v-model="editForm.guest_self_join"
              label="Let guests join from the QR (you approve each one)"
              class="q-mb-sm"
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
          <div class="sheet-title q-mb-xs">Add court</div>
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

    <!-- Invite / manage hosts -->
    <q-dialog v-model="hostsDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section class="q-pa-md">
          <div class="sheet-title q-mb-xs">Hosts</div>
          <div class="text-caption text-grey-7 q-mb-md">
            Invite someone by email to co-host this session. They'll accept in their
            profile and can then run the queue. Access applies only to this session.
          </div>
          <q-form ref="hostFormRef" class="row items-start q-gutter-sm no-wrap q-mb-md" @submit.prevent="submitHostInvite">
            <q-input
              v-model="hostEmail"
              class="col"
              outlined
              dense
              type="email"
              label="Host email"
              hide-bottom-space
              :rules="[(v) => !!v || 'Email is required', (v) => /.+@.+\..+/.test(v) || 'Enter a valid email']"
            />
            <q-btn
              color="primary" unelevated no-caps label="Invite" type="submit"
              :loading="invitingHost" :disable="!hostEmail" style="min-height: 40px"
            />
          </q-form>

          <div v-if="loadingHosts" class="text-center q-pa-md"><q-spinner size="24px" color="primary" /></div>
          <div v-else-if="!hosts.length" class="text-caption text-grey-6 q-pb-sm">No hosts yet.</div>
          <template v-else>
            <div
              v-for="h in hosts"
              :key="h.id"
              class="row items-center no-wrap q-py-sm"
              style="border-top: 1px solid var(--surface-sunken, #eee)"
            >
              <div class="col">
                <div class="text-weight-bold ellipsis">{{ h.name || h.email }}</div>
                <div class="text-caption text-grey-7">
                  <span v-if="h.name">{{ h.email }} · </span>{{ h.status === 'accepted' ? 'Host' : 'Invited' }}
                </div>
              </div>
              <q-btn
                flat dense no-caps color="negative" size="sm"
                :label="h.status === 'accepted' ? 'Remove' : 'Cancel'"
                :loading="removingHostId === h.id"
                @click="removeHost(h)"
              />
            </div>
          </template>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Rename court -->
    <q-dialog v-model="renameDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section class="q-pa-md">
          <div class="sheet-title q-mb-xs">Rename court</div>
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
          <div class="sheet-title q-mb-xs">
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
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
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
  updatePlayerName,
  updatePlayerRating,
  exportSessionCsv,
  stageMatch,
  startMatch,
  suggestMatches,
  updateCourt,
  updateSession,
  updateTeams,
  listSessionHosts,
  inviteSessionHost,
  removeSessionHost,
} from 'src/api/openPlay'
import MatchTeams from 'src/components/MatchTeams.vue'
import { validateSessionForm } from 'src/utils/sessionForm'
import SyncStatusBanner from 'src/components/SyncStatusBanner.vue'
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
import { isInWinnersPool } from 'src/utils/pairs'
import { haptic } from 'src/utils/native'
import CourtTimer from 'src/components/CourtTimer.vue'
import SkeletonList from 'src/components/SkeletonList.vue'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const playStore = usePlaySessionStore()

const tab = ref('courts')
const shareOpen = ref(false)
// The invite sheet pulls in the QR encoder — fetch it the first time it's
// opened, not with the console.
const ShareSessionDialog = defineAsyncComponent(() => import('src/components/ShareSessionDialog.vue'))
const shareLoaded = ref(false)
watch(shareOpen, (open) => {
  if (open) shareLoaded.value = true
})

// ——— Guest self-join approvals ———
const pendingGuests = computed(() => playStore.players.filter((p) => p.status === 'pending_approval'))
const approvingId = ref(null)
async function decideGuest(guest, action) {
  if (approvingId.value) return
  approvingId.value = guest.id
  try {
    await playerAction(sessionId, guest.id, action)
    haptic(action === 'approve' ? 'success' : 'light')
    await refresh()
    $q.notify({
      message: action === 'approve' ? `${guest.display_name} is checked in and in the queue` : `${guest.display_name} declined`,
      color: action === 'approve' ? 'positive' : 'grey-8',
    })
  } catch (e) {
    notifyError(e, 'Could not update the guest')
  } finally {
    approvingId.value = null
  }
}

// Players tab: name search + "not checked in" (registered) filter.
const playerSearch = ref('')
const playerNotCheckedIn = ref(false)
// Case- and accent-insensitive ("jose" matches "José").
const foldText = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const notCheckedInCount = computed(() => playStore.players.filter((p) => p.status === 'registered').length)
const playerFilterActive = computed(() => !!foldText(playerSearch.value) || playerNotCheckedIn.value)
const filteredPlayers = computed(() => {
  const q = foldText(playerSearch.value)
  return playStore.players.filter(
    (p) =>
      (!playerNotCheckedIn.value || p.status === 'registered') &&
      (!q || foldText(p.display_name).includes(q)),
  )
})
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
// Winners/Challenger tag — same rule as the engine, so a locked pair always
// shows in the same pool (a winner locked to a fresh walk-in = Challenger).
const playersByIdMap = computed(() => new Map(playStore.players.map((p) => [p.id, p])))
const queuedIdSet = computed(() => new Set(playStore.queue.map((e) => e.player_id)))
function poolTagOf(playerId) {
  if (playStore.session?.format !== 'winners_losers') return null
  const player = playerById(playerId)
  if (!player) return null
  return isInWinnersPool(player, playersByIdMap.value, queuedIdSet.value)
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

// One sheet submit at a time — a second tap on a row while the first
// request is in flight would otherwise send it twice.
const sheetBusy = ref(false)
async function guarded(fn) {
  if (sheetBusy.value) return
  sheetBusy.value = true
  try {
    await fn()
  } finally {
    sheetBusy.value = false
  }
}

function withFairnessCheck(warnings, action) {
  if (sheetBusy.value) return
  if (!warnings.length) {
    guarded(() => action(null))
    return
  }
  fairnessWarnings.value = warnings
  fairnessProceed = () => guarded(() => action({ reasons: warnings }))
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
  guest_self_join: true,
})

// ——— Hosts / co-organizer invitations ———
const hostsDialog = ref(false)
const hostFormRef = ref(null)
const hostEmail = ref('')
const invitingHost = ref(false)
const loadingHosts = ref(false)
const hosts = ref([])
const removingHostId = ref(null)

function openHostsDialog() {
  hostEmail.value = ''
  hostsDialog.value = true
  nextTick(() => hostFormRef.value?.resetValidation())
  loadHosts()
}

async function loadHosts() {
  loadingHosts.value = true
  try {
    hosts.value = await listSessionHosts(sessionId)
  } catch {
    hosts.value = []
  } finally {
    loadingHosts.value = false
  }
}

async function submitHostInvite() {
  if (!hostEmail.value) return
  invitingHost.value = true
  try {
    await inviteSessionHost(sessionId, hostEmail.value.trim())
    $q.notify({ type: 'positive', message: `Invitation sent to ${hostEmail.value.trim()}.` })
    hostEmail.value = ''
    // Clear the "required" error that would otherwise flash on the now-empty field.
    nextTick(() => hostFormRef.value?.resetValidation())
    await loadHosts()
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || e.response?.data?.errors?.email?.[0] || 'Could not send the invite.',
    })
  } finally {
    invitingHost.value = false
  }
}

async function removeHost(h) {
  removingHostId.value = h.id
  try {
    await removeSessionHost(sessionId, h.id)
    $q.notify({ type: 'positive', message: 'Host access removed.' })
    await loadHosts()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Could not remove.' })
  } finally {
    removingHostId.value = null
  }
}

const formatOptions = FORMAT_OPTIONS

function openEditSession() {
  const session = playStore.session
  editForm.name = session.name
  editForm.date = (session.date || '').slice(0, 10)
  editForm.start_time = session.start_time ? session.start_time.slice(0, 5) : ''
  editForm.end_time = session.end_time ? session.end_time.slice(0, 5) : ''
  editForm.format = session.format
  editForm.max_players = session.max_players || null
  editForm.guest_self_join = session.settings?.guest_self_join !== false
  editDialog.value = true
}

function saveSession() {
  const invalid = validateSessionForm(editForm, { playerCount: playStore.session?.player_count || 0 })
  if (invalid) {
    $q.notify({ message: invalid, color: 'negative' })
    return
  }
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
      // config is merged server-side — send only what this form owns.
      config: { guest_self_join: !!editForm.guest_self_join },
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
    // Canvas renderer is only needed at the end of a night — load on demand.
    const { recapBlob } = await import('src/utils/recapImage')
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
  if (!label || sheetBusy.value) return
  sheetBusy.value = true
  try {
    await updateCourt(sessionId, renameCourt.value.id, { label })
    renameDialog.value = false
    await refresh()
  } catch (e) {
    notifyError(e, 'Could not rename the court')
  } finally {
    sheetBusy.value = false
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

  // Queue jump: someone else has waited longer than the chosen sub. Show the
  // wait time of everyone ahead of them so the organizer can weigh the call.
  if (inPlayer.status === 'waiting') {
    const position = playStore.queue.findIndex((q) => q.player_id === inPlayer.id)
    if (position > 0) {
      const inWait = formatSeconds(inPlayer.effective_wait_seconds)
      const ahead = playStore.queue
        .slice(0, position)
        .map((q) => {
          const p = playerById(q.player_id)
          return p ? `${p.display_name} (${formatSeconds(q.effective_wait_seconds)})` : null
        })
        .filter(Boolean)
      const shown = ahead.slice(0, 6)
      const extra = ahead.length - shown.length
      warnings.push(
        `${position} waiting ${position === 1 ? 'player has' : 'players have'} been waiting longer than ${inPlayer.display_name} (${inWait}): ${shown.join(', ')}${extra > 0 ? `, +${extra} more` : ''}.`,
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

// ——— Choose players (manual match): hand-pick who plays instead of the
// auto-suggest engine. Works for every format — all matches are doubles, and
// the format only changes how AUTO picks; a manual match just stages the
// exact players chosen. ———
const chooseDialog = ref(false)
const chooseCourt = ref(null)
const chosenIds = ref([]) // ordered selection of player ids
const arrangementIndex = ref(0)
const staging = ref(false)

// team_size comes from session settings (doubles by default); two teams of it.
const teamSize = computed(() => Number(playStore.session?.settings?.team_size) || 2)
const neededPlayers = computed(() => teamSize.value * 2)

// "Choose players" (manual pick) is only offered on the FIRST roll-out —
// while seeding the opening matches, before any game has finished. Once the
// first game completes, courts fill via auto "Start next" only.
const isFirstRollout = computed(() => (playStore.stats?.games_completed || 0) === 0)

// The three distinct doubles pairings for four chosen players (indices into
// the ordered selection) — "Swap" cycles through them.
const ARRANGEMENTS = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]],
]

// Who can be dropped into a manual match: the waiting queue (in order, with
// their live wait) followed by cooling-down players.
const choosablePlayers = computed(() => {
  const queued = playStore.queue
    .map((entry) => {
      const p = playerById(entry.player_id)
      return p ? { ...p, effective_wait_seconds: entry.effective_wait_seconds } : null
    })
    .filter(Boolean)
  const cooling = playStore.players
    .filter((p) => p.status === 'cooling_down')
    .map((p) => ({ ...p, effective_wait_seconds: p.effective_wait_seconds || 0 }))
  return [...queued, ...cooling]
})

const chosenTeams = computed(() => {
  const ids = chosenIds.value
  const half = teamSize.value
  if (ids.length === 4) {
    const [aIdx, bIdx] = ARRANGEMENTS[arrangementIndex.value % ARRANGEMENTS.length]
    return {
      teamA: aIdx.map((i) => playerById(ids[i])).filter(Boolean),
      teamB: bIdx.map((i) => playerById(ids[i])).filter(Boolean),
    }
  }
  return {
    teamA: ids.slice(0, half).map((id) => playerById(id)).filter(Boolean),
    teamB: ids.slice(half, half * 2).map((id) => playerById(id)).filter(Boolean),
  }
})

function openChooseDialog(court) {
  chooseCourt.value = court
  chosenIds.value = []
  arrangementIndex.value = 0
  chooseDialog.value = true
}

function chooseIndex(id) {
  return chosenIds.value.indexOf(id)
}

function toggleChoose(id) {
  const idx = chosenIds.value.indexOf(id)
  if (idx >= 0) {
    chosenIds.value.splice(idx, 1)
  } else if (chosenIds.value.length < neededPlayers.value) {
    chosenIds.value.push(id)
  } else {
    $q.notify({ message: `Pick ${neededPlayers.value} players.`, color: 'warning' })
    return
  }
  arrangementIndex.value = 0 // selection changed — reset the pairing
}

function swapTeams() {
  if (chosenIds.value.length === 4) {
    arrangementIndex.value = (arrangementIndex.value + 1) % ARRANGEMENTS.length
  }
}

// Advisory: which waiting players got skipped by this manual pick (with their
// wait times), shown in the "review before continuing" dialog.
function chooseFairnessWarnings(ids) {
  const chosen = new Set(ids)
  let deepest = -1
  playStore.queue.forEach((q, idx) => {
    if (chosen.has(q.player_id)) deepest = idx
  })
  const skipped = []
  for (let i = 0; i < deepest; i++) {
    const entry = playStore.queue[i]
    if (chosen.has(entry.player_id)) continue
    const p = playerById(entry.player_id)
    if (p) skipped.push(`${p.display_name} (${formatSeconds(entry.effective_wait_seconds)})`)
  }
  if (!skipped.length) return []
  const shown = skipped.slice(0, 6)
  const extra = skipped.length - shown.length
  return [
    `${skipped.length} waiting ${skipped.length === 1 ? 'player was' : 'players were'} skipped: ${shown.join(', ')}${extra > 0 ? `, +${extra} more` : ''}.`,
  ]
}

function stageChosen() {
  const { teamA, teamB } = chosenTeams.value
  if (teamA.length !== teamSize.value || teamB.length !== teamSize.value) {
    $q.notify({ message: `Pick ${neededPlayers.value} players.`, color: 'warning' })
    return
  }
  const teamAIds = teamA.map((p) => p.id)
  const teamBIds = teamB.map((p) => p.id)
  const warnings = chooseFairnessWarnings([...teamAIds, ...teamBIds])

  withFairnessCheck(warnings, async () => {
    staging.value = true
    try {
      await stageMatch(sessionId, {
        team_a: teamAIds,
        team_b: teamBIds,
        court_id: chooseCourt.value.id,
        created_by: 'manual',
      })
      chooseDialog.value = false
      await refresh()
    } catch (e) {
      notifyError(e, 'Could not stage the match')
    } finally {
      staging.value = false
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
  if (sheetBusy.value) return
  sheetBusy.value = true
  try {
    await setLockedPartner(sessionId, lockPlayer.value.id, partner ? partner.id : null)
    lockDialog.value = false
    await refresh()
  } catch (e) {
    notifyError(e, 'Could not update the partner lock')
  } finally {
    sheetBusy.value = false
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

// O(1) lookups — the template and helpers hit these many times per render.
function playerById(id) {
  return playersByIdMap.value.get(id) || null
}

const activeMatchesById = computed(() => new Map(playStore.activeMatches.map((m) => [m.id, m])))
function matchFor(court) {
  if (!court.active_match_id) return null
  return activeMatchesById.value.get(court.active_match_id) || null
}

// One pass per state change: each court with its match and overflow menu,
// instead of ~10 matchFor() calls per court on every render.
const courtRows = computed(() =>
  playStore.courts.map((court) => ({ court, match: matchFor(court), menu: courtMenuOptions(court) })),
)

// Queue rows with the player, partner name and pool tag resolved once.
const queueRows = computed(() =>
  playStore.queue.map((entry) => {
    const player = playerById(entry.player_id)
    return { entry, player, partner: partnerNameOf(player), pool: poolTagOf(entry.player_id) }
  }),
)

function teamNames(team) {
  return (team || []).map((slot) => slot.display_name).join(' + ')
}

// Court timers tick inside <CourtTimer> — no page-wide 1s re-render.

function notifyError(e, fallback) {
  haptic('error')
  $q.notify({ message: e.response?.data?.message || fallback, color: 'negative' })
}

async function refresh() {
  await playStore.fetchState().catch(() => {})
}

async function onPull(done) {
  try {
    await refresh()
  } finally {
    done()
  }
}

const statusBusy = ref(false)
async function setStatus(status, extra = {}) {
  if (statusBusy.value) return
  statusBusy.value = true
  try {
    await updateSession(sessionId, { status, ...extra })
    await refresh()
  } catch (e) {
    notifyError(e, 'Could not update session')
  } finally {
    statusBusy.value = false
  }
}

// Undo an accidental End — the server allows it within 24h of ending.
const canReopen = computed(() => {
  const s = playStore.session
  if (s?.status !== 'ended' || !playStore.canManage) return false
  return !s.ended_at || Date.now() - new Date(s.ended_at).getTime() < 24 * 3600 * 1000
})
function confirmReopen() {
  $q.dialog({
    title: 'Reopen this session?',
    message: 'It goes back to live with everyone’s games and queue kept.',
    cancel: { label: 'Not now', flat: true, noCaps: true },
    ok: { label: 'Reopen', color: 'primary', unelevated: true, noCaps: true },
  }).onOk(() => setStatus('live', { reopen: true }))
}

async function downloadCsv(type) {
  try {
    const res = await exportSessionCsv(sessionId, type)
    // Server sets the filename; fall back to a sensible one.
    const disposition = res.headers?.['content-disposition'] || ''
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
    const name = match ? decodeURIComponent(match[1]) : `${playStore.session.name}-${type}.csv`
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch (e) {
    notifyError(e, 'Could not export')
  }
}

function confirmCancelSession() {
  $q.dialog({
    title: 'Cancel this session?',
    message: 'Players see it as cancelled and can’t check in. Games waiting to start are released. This can’t be undone.',
    cancel: { label: 'Keep session', flat: true, noCaps: true },
    ok: { label: 'Cancel session', color: 'negative', unelevated: true, noCaps: true },
  }).onOk(() => setStatus('cancelled'))
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

// One action per court at a time: a double tap on Call/Start/Cancel would
// fire twice (duplicate calls + announcements, or an error toast after the
// first tap already worked). The court's buttons go inactive meanwhile.
const busyMatchIds = ref(new Set())
async function doMatch(fn, match) {
  if (!match || busyMatchIds.value.has(match.id)) return false
  busyMatchIds.value = new Set(busyMatchIds.value).add(match.id)
  try {
    await fn(match.id)
    await refresh()
    return true
  } catch (e) {
    notifyError(e, 'Match action failed')
    return false
  } finally {
    const next = new Set(busyMatchIds.value)
    next.delete(match.id)
    busyMatchIds.value = next
  }
}

async function callPlayers(match) {
  if (await doMatch(callMatch, match)) haptic('medium')
}

// Short "Undo" toast after a removal (check-out, no-show, cancelled match).
function offerUndo(message, undo) {
  $q.notify({
    message,
    color: 'grey-9',
    timeout: 6000,
    actions: [
      {
        label: 'Undo',
        color: 'lime-4',
        noCaps: true,
        handler: async () => {
          try {
            await undo()
          } catch (e) {
            notifyError(e, 'Could not undo — the queue has moved on')
          }
        },
      },
    ],
  })
}

function confirmCancelStaged(match) {
  const names = [...(match.team_a || []), ...(match.team_b || [])].map((s) => s.display_name).join(', ')
  $q.dialog({
    title: 'Cancel this match?',
    message: `${names} go back to the queue with their place kept.`,
    cancel: { label: 'Keep it', flat: true, noCaps: true },
    ok: { label: 'Cancel match', color: 'negative', unelevated: true, noCaps: true },
  }).onOk(async () => {
    const teamA = (match.team_a || []).map((s) => s.player_id)
    const teamB = (match.team_b || []).map((s) => s.player_id)
    const courtId = match.court_id
    await doMatch(cancelMatch, match)
    if (playStore.activeMatches.some((m) => m.id === match.id)) return // cancel failed
    offerUndo('Match cancelled', async () => {
      await stageMatch(sessionId, { team_a: teamA, team_b: teamB, court_id: courtId, created_by: 'manual' })
      await refresh()
    })
  })
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
    haptic('success')
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
  // Rename a guest — a small prompt, then persist.
  if (action === 'edit_name') {
    $q.dialog({
      title: 'Edit name',
      message: 'Update this guest player’s name.',
      prompt: { model: player.display_name || '', type: 'text', isValid: (v) => !!v && v.trim().length > 0 },
      cancel: true,
      ok: { label: 'Save', unelevated: true, color: 'primary' },
    }).onOk(async (val) => {
      try {
        await updatePlayerName(sessionId, player.id, val.trim())
        await refresh()
      } catch (e) {
        notifyError(e, 'Could not update the name')
      }
    })
    return
  }

  // Skill level — pick from the standard scale, preselecting the closest
  // level to the current rating (computed ratings can be e.g. 3.9).
  if (action === 'edit_rating') {
    const current = player.rating != null ? Number(player.rating) : null
    const closest =
      current == null
        ? 3.5
        : RATING_OPTIONS.reduce((best, o) =>
            Math.abs(o.value - current) < Math.abs(best.value - current) ? o : best,
          ).value
    $q.dialog({
      title: 'Edit skill level',
      message: `${player.display_name} · currently ${current != null ? current.toFixed(1) : 'unrated'}. Used for balanced matchmaking from the next match on.`,
      options: {
        type: 'radio',
        model: closest,
        items: RATING_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
      },
      cancel: true,
      ok: { label: 'Save', unelevated: true, color: 'primary' },
    }).onOk(async (val) => {
      try {
        await updatePlayerRating(sessionId, player.id, val)
        await refresh()
        $q.notify({ type: 'positive', message: `${player.display_name} set to ${Number(val).toFixed(1)}` })
      } catch (e) {
        notifyError(e, 'Could not update the skill level')
      }
    })
    return
  }

  const run = async () => {
    try {
      await playerAction(sessionId, player.id, action, extra || {})
      await refresh()
      // Mis-tap insurance: put them straight back.
      if (['check_out', 'no_show', 'injured'].includes(action)) {
        offerUndo(`${player.display_name} removed from the queue`, async () => {
          await playerAction(sessionId, player.id, 'reinstate')
          await refresh()
        })
      }
    } catch (e) {
      notifyError(e, 'Player action failed')
    }
  }

  // Taking someone out of the queue is one tap in a dense menu — confirm it.
  const REMOVALS = {
    check_out: ['Check out', 'leaves the session and the queue'],
    no_show: ['Mark no-show', 'is taken out of the queue as a no-show'],
    injured: ['Mark injured', 'is taken out of the queue (injured)'],
    reject: ['Decline', "won't be added to the session"],
  }
  if (REMOVALS[action]) {
    const [label, effect] = REMOVALS[action]
    $q.dialog({
      title: `${label}?`,
      message: `${player.display_name} ${effect}. You can bring them back later from Players.`,
      cancel: { label: 'Keep', flat: true, noCaps: true },
      ok: { label, color: 'negative', unelevated: true, noCaps: true },
    }).onOk(run)
    return
  }
  await run()
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

watch(
  () => playStore.accessLost,
  (lost) => {
    if (lost) bailOut('This session is no longer available to you (removed as host, or deleted).')
  },
)

// The console borrows the shared session pointer — remember the player's
// own active session so opening (or being denied) a console never nukes it.
const prevSessionId = playStore.sessionId

let bailedOut = false
function bailOut(message) {
  if (bailedOut) return
  bailedOut = true
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
/* Session info + actions. Phones: info on its own line, actions below
   (they used to squeeze the code/live tag into a stacked column). */
.console-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.console-head-info {
  flex: 1 1 auto;
  min-width: 0;
}

.console-head-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}

@media (max-width: 599px) {
  .console-head-info {
    flex-basis: 100%;
  }

  .console-head-actions {
    margin-left: -8px;
    width: calc(100% + 8px);
  }

  .console-status-btn {
    margin-left: auto;
  }
}

.pending-card {
  border: 1.5px solid #c6ef09;
  background: #fbfee8;
}

.unpaid-tag {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 999px;
  background: #fff1e6;
  color: #b4530b;
  font-size: 11px;
  font-weight: 700;
  vertical-align: 1px;
}

.court-card-actions.is-busy {
  opacity: 0.55;
  pointer-events: none;
}

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
