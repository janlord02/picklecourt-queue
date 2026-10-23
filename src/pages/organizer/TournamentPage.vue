<template>
  <q-page>
    <q-pull-to-refresh no-mouse color="primary" @refresh="onPull">
      <div class="app-page app-page--console t-page">
        <SkeletonList v-if="!t" :rows="4" />

        <template v-else>
          <!-- Header -->
          <div class="row items-start no-wrap q-mb-sm" style="gap: 8px">
            <div class="col">
              <div class="row items-center no-wrap" style="gap: 8px">
                <div class="text-h6 text-weight-bold ellipsis">{{ t.name }}</div>
                <span v-if="t.status === 'live'" class="live-tag">Live</span>
                <span v-else class="status-tag">{{ TOURNAMENT_STATUS[t.status] }}</span>
              </div>
              <div class="text-caption text-grey-7">
                <template v-if="t.start_date">{{ dateRange }}</template>
                <template v-if="t.venue"> · {{ t.venue }}</template>
                <template v-if="!canManage"> · you're refereeing</template>
              </div>
            </div>
            <q-btn outline no-caps color="primary" icon="eva-grid-outline" :label="$q.screen.gt.xs ? 'Courts' : undefined" aria-label="Courts" @click="courtsDialog = true">
              <q-tooltip>Courts and referee links</q-tooltip>
            </q-btn>
            <q-btn outline no-caps color="primary" icon="eva-tv-outline" :label="$q.screen.gt.xs ? 'Board' : undefined" aria-label="Spectator board" @click="shareDialog = true">
              <q-tooltip>Spectator board link</q-tooltip>
            </q-btn>
            <q-btn v-if="canManage" flat round class="tap-44" icon="eva-more-vertical-outline" aria-label="Tournament options">
              <q-menu auto-close>
                <q-list style="min-width: 200px">
                  <q-item clickable @click="openDetails"><q-item-section avatar><q-icon name="eva-edit-outline" /></q-item-section><q-item-section>Details &amp; courts</q-item-section></q-item>
                  <q-item clickable @click="staffDialog = true"><q-item-section avatar><q-icon name="eva-people-outline" /></q-item-section><q-item-section>Hosts &amp; referees</q-item-section></q-item>
                  <q-separator />
                  <q-item v-if="t.status !== 'cancelled'" clickable @click="cancelTournament"><q-item-section avatar><q-icon name="eva-slash-outline" color="negative" /></q-item-section><q-item-section class="text-negative">Cancel tournament</q-item-section></q-item>
                  <q-item clickable @click="removeTournament"><q-item-section avatar><q-icon name="eva-trash-2-outline" color="negative" /></q-item-section><q-item-section class="text-negative">Delete</q-item-section></q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>

          <!-- Division picker -->
          <div class="t-divisions q-mb-md">
            <button
              v-for="d in t.divisions"
              :key="d.id"
              type="button"
              class="t-division-chip"
              :class="{ 'is-active': d.id === divisionId }"
              @click="divisionId = d.id"
            >
              <span class="ellipsis">{{ d.name }}</span>
              <span v-if="d.matches.some((m) => m.status === 'live')" class="t-dot" />
            </button>
            <q-btn v-if="canManage" flat dense no-caps color="primary" icon="eva-plus-outline" label="Division" class="t-add-division" @click="openDivision(null)" />
          </div>

          <div v-if="!t.divisions.length" class="play-card empty-state">
            <span class="empty-state-icon"><q-icon name="eva-layers-outline" size="28px" /></span>
            <div class="empty-state-title">Add your first division</div>
            <div class="text-caption q-mb-md">A division is one event: e.g. Men's Doubles 3.5, Women's Singles Open.</div>
            <q-btn v-if="canManage" color="primary" unelevated no-caps icon="eva-plus-outline" label="Add division" @click="openDivision(null)" />
          </div>

          <template v-else-if="division">
            <!-- Division summary -->
            <div class="play-card q-mb-md">
              <div class="row items-center no-wrap" style="gap: 8px">
                <q-icon :name="formatMeta.icon" size="20px" color="primary" />
                <div class="col">
                  <div class="text-weight-bold">{{ formatLabel(division.format) }} · {{ division.team_size === 2 ? 'Doubles' : 'Singles' }}</div>
                  <div class="text-caption text-grey-7">{{ rulesLine }}</div>
                </div>
                <q-btn v-if="canManage" flat round class="tap-44" icon="eva-settings-2-outline" aria-label="Division settings" @click="openDivision(division)" />
              </div>
              <div v-if="division.podium.length" class="t-podium q-mt-md">
                <div v-for="p in division.podium" :key="`${p.place}-${p.entry_id}`" class="t-podium__row">
                  <span class="t-medal" :class="`t-medal--${p.place}`">{{ p.place }}</span>
                  <span class="text-weight-bold ellipsis">{{ entries[p.entry_id]?.name }}</span>
                  <q-space />
                  <span class="text-caption text-grey-7">{{ PLACE_LABEL[p.place] }}</span>
                </div>
              </div>
            </div>

            <q-tabs v-model="tab" dense no-caps inline-label align="left" active-color="primary" indicator-color="primary" class="q-mb-md">
              <q-tab name="matches" :label="`Matches${liveCount ? ` (${liveCount} live)` : ''}`" :disable="!division.matches.length" />
              <q-tab name="bracket" :label="hasPools ? 'Standings' : 'Bracket'" :disable="!division.matches.length" />
              <q-tab name="teams" :label="`Teams (${activeEntries.length})`" />
            </q-tabs>

            <!-- Teams -->
            <div v-if="tab === 'teams'">
              <div v-if="canManage && !hasMatches" class="row items-center q-mb-sm" style="gap: 8px">
                <q-btn color="primary" outline no-caps icon="eva-person-add-outline" label="Add teams" @click="openAddTeams" />
                <q-btn flat no-caps color="primary" icon="eva-flash-outline" label="Sample teams" @click="openSample">
                  <q-tooltip>Testing: fill this division with made-up teams</q-tooltip>
                </q-btn>
                <q-btn-dropdown v-if="division.entries.length > 1" flat no-caps color="primary" label="Seeding" icon="eva-shuffle-2-outline">
                  <q-list>
                    <q-item v-close-popup clickable @click="seed('rating')"><q-item-section>By rating (highest first)</q-item-section></q-item>
                    <q-item v-close-popup clickable @click="seed('random')"><q-item-section>Random draw</q-item-section></q-item>
                  </q-list>
                </q-btn-dropdown>
              </div>

              <div v-if="!division.entries.length" class="play-card empty-state">
                <span class="empty-state-icon"><q-icon name="eva-people-outline" size="28px" /></span>
                <div class="empty-state-title">No teams yet</div>
                <div class="text-caption">Paste a list — one {{ division.team_size === 2 ? 'team per line, like “Ana / Ben”' : 'player per line' }}.</div>
              </div>

              <div v-else class="play-card q-pa-none">
                <div v-for="(e, i) in division.entries" :key="e.id" class="t-entry" :class="{ 'is-withdrawn': e.status === 'withdrawn' }">
                  <span class="t-entry__seed tnum">{{ e.seed ?? '–' }}</span>
                  <div class="col" style="min-width: 0">
                    <div class="text-weight-bold ellipsis">{{ e.name }}</div>
                    <div class="text-caption text-grey-7 ellipsis">
                      <template v-if="e.name !== playersLine(e)">{{ playersLine(e) }} · </template>
                      <template v-if="e.rating">{{ Number(e.rating).toFixed(2) }} · </template>
                      <template v-if="e.pool && hasPools">Pool {{ poolName(e.pool) }} · </template>
                      <template v-if="e.status === 'withdrawn'">Withdrawn</template>
                    </div>
                  </div>
                  <template v-if="canManage">
                    <q-btn v-if="!hasMatches" flat round dense icon="eva-arrow-upward-outline" color="grey-7" :disable="i === 0" aria-label="Move up" @click="move(i, -1)" />
                    <q-btn v-if="!hasMatches" flat round dense icon="eva-arrow-downward-outline" color="grey-7" :disable="i === division.entries.length - 1" aria-label="Move down" @click="move(i, 1)" />
                    <q-btn flat round dense icon="eva-more-horizontal-outline" color="grey-7" aria-label="Team options">
                      <q-menu auto-close>
                        <q-list style="min-width: 170px">
                          <q-item clickable @click="openEditEntry(e)"><q-item-section>Edit</q-item-section></q-item>
                          <q-item v-if="hasMatches" clickable @click="toggleWithdraw(e)">
                            <q-item-section>{{ e.status === 'withdrawn' ? 'Reinstate' : 'Withdraw' }}</q-item-section>
                          </q-item>
                          <q-item v-else clickable @click="deleteEntry(e)"><q-item-section class="text-negative">Remove</q-item-section></q-item>
                        </q-list>
                      </q-menu>
                    </q-btn>
                  </template>
                </div>
              </div>

              <div v-if="canManage" class="q-mt-md">
                <q-btn
                  v-if="!hasMatches"
                  class="big-action full-width"
                  color="primary"
                  unelevated
                  no-caps
                  :label="hasPools ? 'Make pools & schedule' : 'Make the bracket'"
                  :disable="activeEntries.length < 2"
                  :loading="busy"
                  @click="generate"
                />
                <q-btn
                  v-else
                  class="full-width"
                  flat
                  no-caps
                  color="negative"
                  icon="eva-refresh-outline"
                  label="Reset bracket (deletes all results)"
                  @click="resetDivision"
                />
                <div v-if="!hasMatches" class="text-caption text-grey-7 q-mt-sm text-center">
                  Seed 1 is the strongest. {{ seedingHint }}
                </div>
              </div>
            </div>

            <!-- Bracket / standings -->
            <div v-else-if="tab === 'bracket'">
              <template v-if="hasPools">
                <PoolStandings
                  :standings="division.standings"
                  :entries="entries"
                  :advance="division.format === 'pool_playoff' ? division.settings.advance_per_pool : 0"
                />
                <div
                  v-if="division.format === 'pool_playoff' && !division.has_playoff && division.playoff_plan"
                  class="text-caption text-grey-8 q-my-sm q-px-xs"
                >
                  <b>Playoff:</b>
                  <template v-if="division.playoff_plan.pairing === 'crossover'">
                    {{ crossoverText(division.playoff_plan.pools) }}{{ division.playoff_plan.draw === 'random' ? ' — semifinal pairings drawn at random' : '' }}
                  </template>
                  <template v-else>top {{ division.playoff_plan.teams }} by record (best v worst)</template>
                </div>
                <div v-if="division.playoff_ready && canManage" class="q-my-md">
                  <q-btn class="big-action full-width" color="primary" unelevated no-caps icon="eva-award-outline" label="Start the playoff" :loading="busy" @click="startPlayoff" />
                </div>
                <div v-if="division.has_playoff" class="section-label">Playoff</div>
              </template>
              <BracketView :division="division" :entries="entries" clickable @open="openMatch" />
              <div v-if="canRedoPlayoff" class="q-mt-sm">
                <q-btn flat no-caps color="primary" icon="eva-refresh-outline" label="Redo playoff" @click="redoPlayoff" />
                <span class="text-caption text-grey-7">Rebuilds the playoff from the standings with the current settings (e.g. after turning on the bronze match). Only before a playoff match starts.</span>
              </div>
            </div>

            <!-- Matches -->
            <div v-else>
              <div v-if="canManage && canFillCourts" class="t-fill row items-center no-wrap q-mb-sm">
                <q-icon name="eva-grid-outline" size="20px" color="primary" />
                <div class="col text-caption">
                  <b>{{ freeCourts.length }} free court{{ freeCourts.length === 1 ? '' : 's' }}</b> and matches waiting.
                  Fill them, or let each court referee tap <i>Next match</i>.
                </div>
                <q-btn unelevated no-caps color="primary" label="Fill free courts" :loading="busy" @click="fillFreeCourts" />
              </div>
              <template v-for="group in matchGroups" :key="group.key">
                <template v-if="group.matches.length">
                  <div class="section-label">{{ group.title }} <span class="tnum">({{ group.matches.length }})</span></div>
                  <div class="t-match-list">
                    <div v-for="m in group.matches" :key="m.id">
                      <MatchCard :match="m" :entries="entries" clickable @open="openMatch" />
                      <div v-if="m.busy" class="text-caption text-warning q-px-xs">A team is still on court</div>
                      <div v-else-if="m.referee_user_id" class="text-caption text-grey-7 q-px-xs">Ref: {{ staffName(m.referee_user_id) }}</div>
                    </div>
                  </div>
                </template>
              </template>
              <div v-if="division.format === 'pool_playoff' && division.playoff_ready && canManage" class="q-mt-md">
                <q-btn class="big-action full-width" color="primary" unelevated no-caps icon="eva-award-outline" label="Pools done — start the playoff" :loading="busy" @click="startPlayoff" />
              </div>
            </div>
          </template>
        </template>
      </div>
    </q-pull-to-refresh>

    <!-- Match actions -->
    <q-dialog v-model="matchDialog" position="bottom">
      <q-card v-if="activeMatch" class="sheet">
        <q-card-section class="q-pa-md form-stack">
          <div>
            <div class="sheet-title">M{{ activeMatch.number }} · {{ activeMatch.label }}</div>
            <div class="text-caption text-grey-7">
              Games to {{ activeMatch.points_to }}, win by {{ activeMatch.win_by }}, best of {{ activeMatch.best_of }}
            </div>
          </div>
          <MatchCard :match="activeMatch" :entries="entries" />

          <template v-if="['ready', 'live', 'completed'].includes(activeMatch.status)">
            <div v-if="canManage && activeMatch.status !== 'completed'" class="row q-col-gutter-sm">
              <div class="col-6">
                <q-select v-model="assign.court" :options="t.courts" outlined dense clearable label="Court" @update:model-value="saveAssign" />
              </div>
              <div class="col-6">
                <q-select v-model="assign.referee_user_id" :options="refereeOptions" emit-value map-options outlined dense clearable label="Referee" @update:model-value="saveAssign" />
              </div>
            </div>

            <q-btn
              v-if="activeMatch.status !== 'completed'"
              class="big-action full-width"
              color="primary"
              unelevated
              no-caps
              :icon="activeMatch.status === 'live' ? 'eva-activity-outline' : 'eva-play-circle-outline'"
              :label="activeMatch.status === 'live' ? 'Open scoring' : 'Score this match'"
              @click="goScore(activeMatch)"
            />
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-btn class="full-width" outline no-caps color="primary" :label="activeMatch.status === 'completed' ? 'Correct result' : 'Enter result'" @click="openResult" />
              </div>
              <div class="col-6">
                <q-btn class="full-width" flat no-caps color="grey-8" label="Walkover…" @click="walkoverDialog = true" />
              </div>
            </div>
          </template>
          <div v-else class="text-caption text-grey-7">
            {{ activeMatch.status === 'pending' ? 'Waiting for the matches that feed it.' : activeMatch.status === 'bye' ? 'Bye — the team advanced automatically.' : 'This match was not needed.' }}
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Enter / correct result -->
    <q-dialog v-model="resultDialog" position="bottom">
      <q-card v-if="activeMatch" class="sheet">
        <q-card-section class="q-pa-md form-stack">
          <div class="sheet-title">Result · M{{ activeMatch.number }}</div>
          <div class="t-result-grid">
            <span />
            <span class="ellipsis text-weight-bold">{{ slotName(activeMatch, 'A', entries) }}</span>
            <span class="ellipsis text-weight-bold">{{ slotName(activeMatch, 'B', entries) }}</span>
            <template v-for="(g, i) in resultGames" :key="i">
              <span class="micro-label">Game {{ i + 1 }}</span>
              <q-input v-model.number="g.a" outlined dense type="number" min="0" input-class="text-center tnum" />
              <q-input v-model.number="g.b" outlined dense type="number" min="0" input-class="text-center tnum" />
            </template>
          </div>
          <div class="text-caption text-grey-7">
            Best of {{ activeMatch.best_of }} — leave unplayed games empty.
            <template v-if="activeMatch.status === 'completed'"> Correcting moves the new winner on, as long as their next match hasn't started.</template>
          </div>
          <q-btn class="big-action full-width" color="primary" unelevated no-caps label="Save result" :loading="busy" @click="saveResult" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Walkover -->
    <q-dialog v-model="walkoverDialog">
      <q-card v-if="activeMatch" class="dialog-card" style="min-width: 300px">
        <q-card-section>
          <div class="sheet-title q-mb-xs">Walkover</div>
          <div class="text-caption text-grey-7 q-mb-md">No-show, forfeit or injury: who advances?</div>
          <q-btn v-for="side in ['A', 'B']" :key="side" class="full-width q-mb-sm" outline no-caps color="primary" :label="slotName(activeMatch, side, entries)" :loading="busy" @click="walkover(side)" />
          <q-btn v-close-popup class="full-width" flat no-caps label="Cancel" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Division settings -->
    <q-dialog v-model="divisionDialog" position="bottom">
      <q-card class="sheet sheet--tall">
        <q-card-section class="q-pa-md form-stack">
          <div class="sheet-title">{{ divisionForm.id ? 'Division settings' : 'New division' }}</div>
          <q-input v-model="divisionForm.name" outlined dense label="Name" placeholder="Men's Doubles 3.5" maxlength="80" hide-bottom-space />
          <q-btn-toggle
            v-model="divisionForm.team_size"
            spread
            no-caps
            unelevated
            toggle-color="primary"
            color="white"
            text-color="primary"
            class="t-toggle"
            :disable="divisionLocked"
            :options="[{ label: 'Doubles', value: 2 }, { label: 'Singles', value: 1 }]"
          />
          <div>
            <div class="micro-label q-mb-xs">Format</div>
            <div class="t-formats">
              <button
                v-for="f in FORMATS"
                :key="f.value"
                type="button"
                class="t-format"
                :class="{ 'is-active': divisionForm.format === f.value }"
                :disabled="divisionLocked"
                @click="divisionForm.format = f.value"
              >
                <q-icon :name="f.icon" size="20px" />
                <div>
                  <div class="text-weight-bold">
                    {{ f.label }}
                    <span v-if="f.tag" class="t-format-tag" :class="{ 't-format-tag--muted': f.value === 'double_elim' }">{{ f.tag }}</span>
                  </div>
                  <div class="text-caption text-grey-7">{{ f.caption }}</div>
                </div>
              </button>
            </div>
            <div v-if="divisionLocked" class="text-caption text-grey-7 q-mt-xs">Reset the bracket to change the format or singles/doubles.</div>
            <div v-else-if="divisionForm.format === 'double_elim'" class="text-caption text-warning q-mt-xs">
              {{ doubleElimHint }}
            </div>
          </div>

          <div class="micro-label">Games</div>
          <div class="row q-col-gutter-sm">
            <div class="col-4"><q-select v-model="divisionForm.settings.points_to" :options="[7, 9, 11, 15, 21]" outlined dense label="To" /></div>
            <div class="col-4"><q-select v-model="divisionForm.settings.win_by" :options="[2, 1]" outlined dense label="Win by" /></div>
            <div class="col-4"><q-select v-model="divisionForm.settings.best_of" :options="[1, 3, 5]" outlined dense label="Best of" /></div>
          </div>
          <q-btn-toggle
            v-model="divisionForm.settings.scoring"
            spread
            no-caps
            unelevated
            toggle-color="primary"
            color="white"
            text-color="primary"
            class="t-toggle"
            :options="[{ label: 'Side-out (traditional)', value: 'sideout' }, { label: 'Rally scoring', value: 'rally' }]"
          />

          <template v-if="['round_robin', 'pool_playoff'].includes(divisionForm.format)">
            <div class="row q-col-gutter-sm">
              <div class="col-6"><q-input v-model.number="divisionForm.settings.pool_count" type="number" min="1" max="16" outlined dense label="Pools" :disable="divisionLocked" /></div>
              <div v-if="divisionForm.format === 'pool_playoff'" class="col-6">
                <q-input v-model.number="divisionForm.settings.advance_per_pool" type="number" min="1" max="8" outlined dense label="Advance per pool" />
              </div>
            </div>
          </template>
          <template v-if="divisionForm.format === 'pool_playoff'">
            <div class="micro-label">Playoff games</div>
            <div class="row q-col-gutter-sm">
              <div class="col-6"><q-select v-model="divisionForm.settings.playoff_points_to" :options="[7, 9, 11, 15, 21]" outlined dense label="To" /></div>
              <div class="col-6"><q-select v-model="divisionForm.settings.playoff_best_of" :options="[1, 3, 5]" outlined dense label="Best of" /></div>
            </div>
            <div class="micro-label">Playoff pairing</div>
            <q-btn-toggle
              v-model="divisionForm.settings.playoff_pairing"
              spread
              no-caps
              unelevated
              toggle-color="primary"
              color="white"
              text-color="primary"
              class="t-toggle"
              :options="[{ label: 'Crossover', value: 'crossover' }, { label: 'By record', value: 'seeded' }]"
            />
            <div class="text-caption text-grey-7">{{ pairingHint }}</div>
            <q-btn-toggle
              v-if="formUsesCrossover"
              v-model="divisionForm.settings.playoff_draw"
              spread
              no-caps
              unelevated
              toggle-color="primary"
              color="white"
              text-color="primary"
              class="t-toggle"
              :options="[{ label: 'Fixed bracket', value: 'fixed' }, { label: 'Random draw', value: 'random' }]"
            />
            <div v-if="formUsesCrossover" class="text-caption text-grey-7">
              {{ divisionForm.settings.playoff_draw === 'random'
                ? 'Who meets whom in the semifinals is drawn when you start the playoff (shown in the bracket right away).'
                : 'Two teams from the same pool can only meet in the final.' }}
            </div>
          </template>
          <template v-if="divisionForm.format !== 'round_robin'">
            <q-select
              v-model="divisionForm.settings.final_best_of"
              :options="[{ label: 'Same as other matches', value: null }, { label: 'Best of 3', value: 3 }, { label: 'Best of 5', value: 5 }]"
              emit-value
              map-options
              outlined
              dense
              label="Final"
            />
            <q-toggle v-if="divisionForm.format !== 'double_elim'" v-model="divisionForm.settings.third_place" label="Play a bronze match (3rd place)" />
            <q-toggle v-else v-model="divisionForm.settings.grand_final_reset" label="Grand final reset if the losers-bracket team wins" />
          </template>
          <div v-if="divisionLocked" class="text-caption text-grey-7">Game-length changes apply to matches created after saving.</div>

          <q-btn class="big-action full-width" color="primary" unelevated no-caps :label="divisionForm.id ? 'Save' : 'Add division'" :disable="!divisionForm.name.trim()" :loading="busy" @click="saveDivision" />
          <q-btn v-if="divisionForm.id && !divisionHasPlayed" flat no-caps color="negative" class="full-width" label="Delete division" @click="deleteDivisionNow" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Add teams (paste) -->
    <q-dialog v-model="teamsDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section class="q-pa-md form-stack">
          <div class="sheet-title">Add {{ division?.team_size === 2 ? 'teams' : 'players' }}</div>
          <q-input
            v-model="teamsText"
            outlined
            type="textarea"
            autogrow
            :input-style="{ minHeight: '140px' }"
            :label="division?.team_size === 2 ? 'One team per line: Ana Cruz / Ben Lim, 4.0' : 'One player per line: Ana Cruz, 4.0'"
            hide-bottom-space
          />
          <div class="text-caption text-grey-7">
            Optional rating after a comma (used for “Seed by rating”). Order = seeding, best first.
            <template v-if="hasPools">
              <br />Already have the groups? Start a line with the pool: <b>A: Ana / Ben</b> (or “Pool A:”, “Bracket A:”).
              Teams without one are spread across pools by seed.
            </template>
            <template v-if="parsedTeams.errors.length"><br /><span class="text-negative">{{ parsedTeams.errors[0] }}</span></template>
          </div>
          <q-btn
            class="big-action full-width"
            color="primary"
            unelevated
            no-caps
            :label="`Add ${parsedTeams.entries.length || ''}`.trim()"
            :disable="!parsedTeams.entries.length || parsedTeams.errors.length > 0"
            :loading="busy"
            @click="saveTeams"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Edit team -->
    <q-dialog v-model="entryDialog" position="bottom">
      <q-card v-if="entryForm" class="sheet">
        <q-card-section class="q-pa-md form-stack">
          <div class="sheet-title">Edit team</div>
          <q-input v-for="(p, i) in entryForm.players" :key="i" v-model="p.name" outlined dense :label="`Player ${i + 1}`" maxlength="60" hide-bottom-space />
          <q-input v-model="entryForm.name" outlined dense label="Team name" maxlength="120" hint="Leave as is to show the players' names." />
          <div class="row q-col-gutter-sm">
            <div class="col-6"><q-input v-model.number="entryForm.rating" outlined dense type="number" step="0.01" min="1" max="8" label="Rating" /></div>
            <div v-if="hasPools && !hasMatches" class="col-6">
              <q-input v-model.number="entryForm.pool" outlined dense type="number" min="1" :max="division.settings.pool_count" label="Pool (optional)" />
            </div>
          </div>
          <q-btn class="big-action full-width" color="primary" unelevated no-caps label="Save" :loading="busy" @click="saveEntry" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Details & courts -->
    <q-dialog v-model="detailsDialog" position="bottom">
      <q-card class="sheet">
        <q-card-section class="q-pa-md form-stack">
          <div class="sheet-title">Details &amp; courts</div>
          <q-input v-model="details.name" outlined dense label="Name" maxlength="120" hide-bottom-space />
          <q-input v-model="details.venue" outlined dense label="Venue" maxlength="160" hide-bottom-space />
          <div class="row q-col-gutter-sm">
            <div class="col-6"><q-input v-model="details.start_date" outlined dense type="date" label="Starts" stack-label /></div>
            <div class="col-6"><q-input v-model="details.end_date" outlined dense type="date" label="Ends" stack-label /></div>
          </div>
          <q-input v-model="details.courts" outlined type="textarea" autogrow label="Courts (one per line)" />
          <q-btn class="big-action full-width" color="primary" unelevated no-caps label="Save" :loading="busy" @click="saveDetails" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Staff -->
    <q-dialog v-model="staffDialog" position="bottom">
      <q-card v-if="t" class="sheet">
        <q-card-section class="q-pa-md form-stack">
          <div>
            <div class="sheet-title">Hosts &amp; referees</div>
            <div class="text-caption text-grey-7">Hosts run everything. Referees open the matches and score them from their phone. They need a PickleCourt account.</div>
          </div>
          <div v-if="t.staff.length" class="play-card q-py-none">
            <div v-for="s in t.staff" :key="s.id" class="list-row">
              <div class="col" style="min-width: 0">
                <div class="text-weight-bold ellipsis">{{ s.name || s.email }}</div>
                <div class="text-caption text-grey-7 ellipsis">{{ s.email }}</div>
              </div>
              <span class="status-tag">{{ s.role === 'host' ? 'Host' : 'Referee' }}</span>
              <q-btn flat round dense icon="eva-close-outline" color="grey-7" :aria-label="`Remove ${s.name}`" @click="dropStaff(s)" />
            </div>
          </div>
          <q-input v-model="staffForm.email" outlined dense type="email" label="Email" hide-bottom-space />
          <q-btn-toggle
            v-model="staffForm.role"
            spread
            no-caps
            unelevated
            toggle-color="primary"
            color="white"
            text-color="primary"
            class="t-toggle"
            :options="[{ label: 'Referee', value: 'referee' }, { label: 'Host', value: 'host' }]"
          />
          <q-btn class="big-action full-width" color="primary" unelevated no-caps label="Add" :disable="!staffForm.email.includes('@')" :loading="busy" @click="saveStaff" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Sample teams (testing) -->
    <q-dialog v-model="sampleDialog">
      <q-card class="dialog-card" style="min-width: 300px; max-width: 400px">
        <q-card-section class="form-stack">
          <div class="sheet-title">Sample teams</div>
          <div class="text-caption text-grey-7">
            For testing: adds made-up {{ division?.team_size === 2 ? 'doubles teams' : 'players' }} with random ratings, seeded best first.
            Remove them or reset the division before the real event.
          </div>
          <q-input v-model.number="sampleCount" outlined dense type="number" min="2" max="64" label="How many" :hint="sampleHint" />
          <div class="row justify-end q-gutter-sm">
            <q-btn v-close-popup flat no-caps label="Cancel" />
            <q-btn unelevated no-caps color="primary" label="Add sample teams" :loading="busy" @click="addSample" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Courts + referee links -->
    <q-dialog v-model="courtsDialog" position="bottom">
      <q-card v-if="t" class="sheet">
        <q-card-section class="q-pa-md form-stack">
          <div>
            <div class="sheet-title">Courts</div>
            <div class="text-caption text-grey-7">
              Give each referee their court's link. They open it once and keep scoring: when a match ends they tap
              <b>Next match</b> and get the next one that can be played. Referees need to be added under Hosts &amp; referees.
            </div>
          </div>
          <div v-if="!courtRows.length" class="text-caption text-grey-7">No courts yet. Add them in Details &amp; courts.</div>
          <div v-else class="play-card q-py-none">
            <div v-for="c in courtRows" :key="c.court" class="list-row">
              <div class="col" style="min-width: 0">
                <div class="text-weight-bold">{{ c.court }}</div>
                <div class="text-caption ellipsis" :class="c.live ? 'text-negative' : 'text-grey-7'">{{ c.text }}</div>
              </div>
              <q-btn flat round dense icon="eva-link-2-outline" color="grey-8" :aria-label="`Copy referee link for ${c.court}`" @click="copyCourtLink(c.court)">
                <q-tooltip>Copy referee link</q-tooltip>
              </q-btn>
              <q-btn unelevated dense no-caps color="primary" label="Score" class="q-px-sm" @click="openCourt(c.court)" />
            </div>
          </div>
          <q-btn v-if="canManage && canFillCourts" outline no-caps color="primary" label="Fill free courts" :loading="busy" @click="fillFreeCourts" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Share board -->
    <q-dialog v-model="shareDialog">
      <q-card v-if="t" class="dialog-card" style="min-width: 300px; max-width: 420px">
        <q-card-section class="form-stack">
          <div class="sheet-title">Spectator board</div>
          <div class="text-caption text-grey-7">Live brackets and scores for players, families and a TV at the venue. No sign-in needed.</div>
          <div class="t-code tnum">{{ t.code }}</div>
          <q-input :model-value="boardLink" outlined dense readonly />
          <div class="row q-col-gutter-sm">
            <div class="col-6"><q-btn class="full-width" outline no-caps color="primary" icon="eva-copy-outline" label="Copy link" @click="copyBoard" /></div>
            <div class="col-6"><q-btn class="full-width" unelevated no-caps color="primary" icon="eva-external-link-outline" label="Open" :href="boardLink" target="_blank" /></div>
          </div>
          <q-separator />
          <div>
            <div class="text-weight-bold">TV live monitor</div>
            <div class="text-caption text-grey-7">For a TV at the venue: every court's live score, plus brackets and standings that rotate on their own. Open it on the TV browser and press full screen.</div>
          </div>
          <q-btn class="full-width" outline no-caps color="primary" icon="eva-monitor-outline" label="Open TV monitor" :href="monitorLink" target="_blank" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import SkeletonList from 'components/SkeletonList.vue'
import MatchCard from 'components/tournament/MatchCard.vue'
import BracketView from 'components/tournament/BracketView.vue'
import PoolStandings from 'components/tournament/PoolStandings.vue'
import * as T from 'src/api/tournament'
import { useTournamentRealtime } from 'src/composables/useTournamentRealtime'
import { boardUrl, monitorUrl, publicAppUrl } from 'src/utils/publicUrl'
import {
  FORMATS,
  PLACE_LABEL,
  TOURNAMENT_STATUS,
  entryMap,
  formatLabel,
  poolName,
  slotName,
  upNext,
} from 'src/utils/tournament'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)

const t = ref(null)
const busy = ref(false)
const divisionId = ref(Number(route.query.d) || null)
const tab = ref('matches')

const canManage = computed(() => !!t.value?.permissions?.can_manage)
const division = computed(() => t.value?.divisions.find((d) => d.id === divisionId.value) || null)
const entries = computed(() => entryMap(division.value))
const activeEntries = computed(() => (division.value?.entries || []).filter((e) => e.status === 'active'))
const hasMatches = computed(() => !!division.value?.matches.length)
const hasPools = computed(() => ['round_robin', 'pool_playoff'].includes(division.value?.format))
const liveCount = computed(() => division.value?.matches.filter((m) => m.status === 'live').length || 0)
const formatMeta = computed(() => FORMATS.find((f) => f.value === division.value?.format) || FORMATS[0])
const dateRange = computed(() => {
  const { start_date: s, end_date: e } = t.value || {}
  return e && e !== s ? `${s} – ${e}` : s
})
const rulesLine = computed(() => {
  const s = division.value?.settings || {}
  const parts = [`Games to ${s.points_to}, win by ${s.win_by}`, `best of ${s.best_of}`, s.scoring === 'rally' ? 'rally scoring' : 'side-out scoring']
  if (division.value?.format === 'pool_playoff') {
    const plan = division.value.playoff_plan
    parts.push(`${plan?.pools ?? s.pool_count} pools, top ${s.advance_per_pool} advance`)
    if (plan?.pairing === 'crossover') parts.push(plan.draw === 'random' ? 'crossover, random semifinal draw' : 'crossover playoff')
    else parts.push('playoff by record')
  }
  else if (division.value?.format === 'round_robin' && s.pool_count > 1) parts.push(`${s.pool_count} pools`)
  if (s.final_best_of && division.value?.format !== 'round_robin') parts.push(`final best of ${s.final_best_of}`)
  return parts.join(' · ')
})
const seedingHint = computed(() => {
  switch (division.value?.format) {
    case 'single_elim':
    case 'double_elim':
      return 'Top seeds get byes and meet as late as possible.'
    case 'pool_playoff':
      return 'Seeds are spread across pools (snake order).'
    default:
      return 'Everyone plays everyone.'
  }
})

const matchGroups = computed(() => {
  const d = division.value
  if (!d) return []
  const ready = upNext(d)
  return [
    { key: 'live', title: 'Live now', matches: d.matches.filter((m) => m.status === 'live') },
    { key: 'ready', title: 'Up next', matches: ready },
    { key: 'pending', title: 'Waiting on earlier matches', matches: d.matches.filter((m) => m.status === 'pending') },
    { key: 'done', title: 'Finished', matches: d.matches.filter((m) => m.status === 'completed').slice().reverse() },
  ]
})

const refereeOptions = computed(() => [
  ...(t.value?.staff || []).map((s) => ({ label: `${s.name || s.email}${s.role === 'host' ? ' (host)' : ''}`, value: s.user_id })),
])
const staffName = (userId) => t.value?.staff.find((s) => s.user_id === userId)?.name || 'Assigned'
const playersLine = (e) => e.players.map((p) => p.name).join(' / ')

// ——— loading ———
async function load() {
  try {
    t.value = await T.getTournament(id)
    if (!division.value && t.value.divisions.length) divisionId.value = t.value.divisions[0].id
  } catch (e) {
    if (e.response?.status === 403 || e.response?.status === 404) {
      $q.notify({ type: 'warning', message: e.response?.data?.message || 'Tournament not found' })
      router.replace({ name: 'organizer-tournaments' })
      return
    }
    $q.notify({ type: 'negative', message: 'Could not load the tournament' })
  }
}
async function onPull(done) {
  await load()
  done()
}
useTournamentRealtime(computed(() => t.value?.code), () => load())

// Land on the tab that matters: teams while setting up, matches once playing.
watch(divisionId, (dId) => {
  router.replace({ query: { ...route.query, d: dId || undefined } })
  tab.value = division.value?.matches.length ? 'matches' : 'teams'
})

// ——— helpers ———
async function run(fn, success) {
  busy.value = true
  try {
    const result = await fn()
    if (result?.divisions) t.value = result
    if (success) $q.notify({ type: 'positive', message: success, timeout: 1500 })
    return result || true
  } catch (e) {
    const msg = e.response?.data?.message || Object.values(e.response?.data?.errors || {})[0]?.[0] || 'Something went wrong'
    $q.notify({ type: 'negative', message: msg })
    return null
  } finally {
    busy.value = false
  }
}
function confirm(title, message, okLabel = 'OK', color = 'negative') {
  return new Promise((resolve) => {
    $q.dialog({ title, message, cancel: { flat: true, noCaps: true }, ok: { label: okLabel, color, unelevated: true, noCaps: true }, persistent: true })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false))
  })
}

// ——— divisions ———
const divisionDialog = ref(false)
const blankSettings = () => ({ points_to: 11, win_by: 2, best_of: 1, scoring: 'sideout', pool_count: 2, advance_per_pool: 2, playoff_points_to: 11, playoff_best_of: 1, final_best_of: null, third_place: false, grand_final_reset: true, playoff_pairing: 'crossover', playoff_draw: 'fixed' })
const divisionForm = reactive({ id: null, name: '', team_size: 2, format: 'pool_playoff', settings: blankSettings() })
const divisionLocked = computed(() => !!divisionForm.id && !!t.value?.divisions.find((d) => d.id === divisionForm.id)?.matches.length)
const divisionHasPlayed = computed(() => !!t.value?.divisions.find((d) => d.id === divisionForm.id)?.matches.some((m) => ['live', 'completed'].includes(m.status)))

// Double elimination costs about 2N−1 matches vs N−1 for single elimination —
// worth saying, since clubs mostly use it only for mini tournaments.
const doubleElimHint = computed(() => {
  const teams = divisionForm.id ? (t.value?.divisions.find((d) => d.id === divisionForm.id)?.entries.length || 0) : 0
  if (teams >= 2) {
    return `With ${teams} teams: about ${2 * teams - 1} matches, vs ${teams - 1} in single elimination. Usually only for mini tournaments.`
  }
  return 'About twice the matches of single elimination (2 × teams − 1, vs teams − 1). Usually only for mini tournaments.'
})

// Crossover = each pool winner v another pool's runner-up (A1 v C2 …): top 2
// of 2, 4, 8 or 16 pools. Mirrors BracketService::usesCrossover().
const usesCrossover = (s, pools) =>
  s.playoff_pairing === 'crossover' && Number(s.advance_per_pool) === 2 && pools >= 2 && (pools & (pools - 1)) === 0
const formUsesCrossover = computed(() => usesCrossover(divisionForm.settings, Number(divisionForm.settings.pool_count)))
const pairingHint = computed(() => {
  const s = divisionForm.settings
  if (s.playoff_pairing === 'seeded') return 'Qualifiers are ranked by record (wins, then point difference): best v worst, 2nd v 2nd-worst, …'
  if (formUsesCrossover.value) return `Pool winners play another pool's runner-up: ${crossoverText(Number(s.pool_count))}.`
  return 'Crossover needs the top 2 of 2, 4, 8 or 16 pools — with these settings the playoff is ranked by record instead.'
})
// "A1 v C2 · B1 v D2 · C1 v A2 · D1 v B2"
function crossoverText(pools) {
  return Array.from({ length: pools }, (_, k) => `${poolName(k + 1)}1 v ${poolName(((k + pools / 2) % pools) + 1)}2`).join(' · ')
}

function openDivision(d) {
  Object.assign(divisionForm, d
    ? { id: d.id, name: d.name, team_size: d.team_size, format: d.format, settings: { ...blankSettings(), ...d.settings } }
    : { id: null, name: '', team_size: 2, format: 'pool_playoff', settings: blankSettings() })
  divisionDialog.value = true
}
async function saveDivision() {
  const payload = { name: divisionForm.name.trim(), team_size: divisionForm.team_size, format: divisionForm.format, settings: { ...divisionForm.settings } }
  if (divisionForm.format === 'round_robin' && !divisionForm.id && payload.settings.pool_count === 2) payload.settings.pool_count = 1
  const before = new Set(t.value.divisions.map((d) => d.id))
  const res = await run(() => (divisionForm.id ? T.updateDivision(id, divisionForm.id, payload) : T.addDivision(id, payload)))
  if (!res) return
  divisionDialog.value = false
  if (!divisionForm.id) divisionId.value = res.divisions.find((d) => !before.has(d.id))?.id ?? divisionId.value
}
async function deleteDivisionNow() {
  if (!(await confirm('Delete division?', `“${divisionForm.name}” and its teams will be removed.`, 'Delete'))) return
  const res = await run(() => T.deleteDivision(id, divisionForm.id))
  if (res) {
    divisionDialog.value = false
    divisionId.value = res.divisions[0]?.id ?? null
  }
}

// ——— teams ———
const teamsDialog = ref(false)
const teamsText = ref('')
function openAddTeams() {
  teamsText.value = ''
  teamsDialog.value = true
}
// "Ana Cruz / Ben Lim, 4.0" → { players: [{name}, {name}], rating }
const parsedTeams = computed(() => {
  const size = division.value?.team_size || 2
  const out = { entries: [], errors: [] }
  teamsText.value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((raw, i) => {
      // Optional pool prefix: "A: Ana / Ben", "Pool B: …", "Bracket C: …"
      const prefixed = raw.match(/^(?:pool|bracket|group)?\s*([a-p])\s*:\s*(.+)$/i)
      const pool = prefixed ? prefixed[1].toUpperCase().charCodeAt(0) - 64 : null
      const line = prefixed ? prefixed[2] : raw
      const [namesPart, ratingPart] = line.split(',').map((s) => s.trim())
      const names = namesPart.split(/\s*[/&+]\s*|\s+and\s+/i).map((s) => s.trim()).filter(Boolean)
      if (names.length !== size) {
        out.errors.push(`Line ${i + 1}: ${size === 2 ? 'needs two names, like “Ana / Ben”' : 'one name per line'}.`)
        return
      }
      const rating = ratingPart ? Number(ratingPart) : null
      out.entries.push({ players: names.map((name) => ({ name })), rating: Number.isFinite(rating) && rating > 0 ? rating : null, pool })
    })
  return out
})
async function saveTeams() {
  const res = await run(() => T.addEntries(id, divisionId.value, parsedTeams.value.entries))
  if (res) teamsDialog.value = false
}
async function seed(mode) {
  await run(() => T.seedEntries(id, divisionId.value, { mode }), mode === 'random' ? 'Seeds drawn' : 'Seeded by rating')
}
async function move(index, delta) {
  const order = division.value.entries.map((e) => e.id)
  const [item] = order.splice(index, 1)
  order.splice(index + delta, 0, item)
  await run(() => T.seedEntries(id, divisionId.value, { mode: 'order', order }))
}
const entryDialog = ref(false)
const entryForm = ref(null)
function openEditEntry(e) {
  entryForm.value = { id: e.id, name: e.name, rating: e.rating, pool: e.pool, players: e.players.map((p) => ({ ...p })), originalName: e.name, originalPlayers: playersLine(e) }
  entryDialog.value = true
}
async function saveEntry() {
  const f = entryForm.value
  const players = f.players.map((p) => ({ name: p.name.trim(), user_id: p.user_id ?? null }))
  // Name still the auto "A / B" → follow the new player names.
  const name = f.name.trim() === f.originalPlayers || !f.name.trim() ? players.map((p) => p.name).join(' / ') : f.name.trim()
  const payload = { name, players, rating: f.rating || null }
  if (hasPools.value && !hasMatches.value) payload.pool = f.pool || null
  const res = await run(() => T.updateEntry(id, divisionId.value, f.id, payload))
  if (res) entryDialog.value = false
}
async function toggleWithdraw(e) {
  const withdraw = e.status !== 'withdrawn'
  if (withdraw && !(await confirm('Withdraw team?', `Give ${e.name}'s remaining matches as walkovers from the Matches tab.`, 'Withdraw'))) return
  await run(() => T.updateEntry(id, divisionId.value, e.id, { status: withdraw ? 'withdrawn' : 'active' }))
}
async function deleteEntry(e) {
  if (!(await confirm('Remove team?', e.name, 'Remove'))) return
  await run(() => T.removeEntry(id, divisionId.value, e.id))
}

// ——— brackets ———
async function generate() {
  const res = await run(() => T.generateBracket(id, divisionId.value), hasPools.value ? 'Pools scheduled' : 'Bracket ready')
  if (res) tab.value = 'matches'
}
async function startPlayoff() {
  const res = await run(() => T.generatePlayoff(id, divisionId.value), 'Playoff bracket ready')
  if (res) tab.value = 'bracket'
}
async function resetDivision() {
  if (!(await confirm('Reset bracket?', 'Every match and score in this division is deleted. Teams stay.', 'Reset'))) return
  const res = await run(() => T.resetBracket(id, divisionId.value))
  if (res) tab.value = 'teams'
}

// ——— matches ———
const matchDialog = ref(false)
const activeMatchId = ref(null)
const activeMatch = computed(() => division.value?.matches.find((m) => m.id === activeMatchId.value) || null)
const assign = reactive({ court: null, referee_user_id: null })
function openMatch(m) {
  if (m.status === 'void') return
  activeMatchId.value = m.id
  assign.court = m.court
  assign.referee_user_id = m.referee_user_id
  matchDialog.value = true
}
async function saveAssign() {
  const res = await run(() => T.assignMatch(activeMatchId.value, { court: assign.court || null, referee_user_id: assign.referee_user_id || null }))
  if (res) await load()
}
function goScore(m) {
  matchDialog.value = false
  router.push({ name: 'tournament-referee', params: { id, matchId: m.id } })
}
const resultDialog = ref(false)
const resultGames = ref([])
function openResult() {
  const m = activeMatch.value
  resultGames.value = Array.from({ length: m.best_of }, (_, i) => ({ a: m.games[i]?.a ?? null, b: m.games[i]?.b ?? null }))
  resultDialog.value = true
}
async function saveResult() {
  const games = resultGames.value.filter((g) => g.a !== null && g.a !== '' && g.b !== null && g.b !== '').map((g) => ({ a: Number(g.a), b: Number(g.b) }))
  const res = await run(() => T.recordResult(activeMatchId.value, games), 'Result saved')
  if (res) {
    resultDialog.value = false
    matchDialog.value = false
    await load()
  }
}
const walkoverDialog = ref(false)
async function walkover(side) {
  const res = await run(() => T.recordWalkover(activeMatchId.value, side), 'Walkover recorded')
  if (res) {
    walkoverDialog.value = false
    matchDialog.value = false
    await load()
  }
}

// ——— tournament ———
const detailsDialog = ref(false)
const details = reactive({ name: '', venue: '', start_date: '', end_date: '', courts: '' })
function openDetails() {
  Object.assign(details, { name: t.value.name, venue: t.value.venue || '', start_date: t.value.start_date || '', end_date: t.value.end_date || '', courts: (t.value.courts || []).join('\n') })
  detailsDialog.value = true
}
async function saveDetails() {
  const res = await run(() => T.updateTournament(id, {
    name: details.name.trim(),
    venue: details.venue.trim() || null,
    start_date: details.start_date || null,
    end_date: details.end_date || details.start_date || null,
    courts: details.courts.split('\n').map((c) => c.trim()).filter(Boolean),
  }))
  if (res) detailsDialog.value = false
}
async function cancelTournament() {
  if (!(await confirm('Cancel tournament?', 'It stays in your list as cancelled. Results are kept.', 'Cancel tournament'))) return
  await run(() => T.updateTournament(id, { status: 'cancelled' }))
}
async function removeTournament() {
  if (!(await confirm('Delete tournament?', 'Only possible before any match is played. This cannot be undone.', 'Delete'))) return
  const res = await run(() => T.deleteTournament(id))
  if (res) router.replace({ name: 'organizer-tournaments' })
}

const staffDialog = ref(false)
const staffForm = reactive({ email: '', role: 'referee' })
async function saveStaff() {
  const res = await run(() => T.addStaff(id, { email: staffForm.email.trim(), role: staffForm.role }), 'Added')
  if (res) staffForm.email = ''
}
async function dropStaff(s) {
  if (!(await confirm('Remove?', `${s.name || s.email} loses access to this tournament.`, 'Remove'))) return
  await run(() => T.removeStaff(id, s.id))
}

// ——— courts ———
const allMatches = computed(() => (t.value?.divisions || []).flatMap((d) => d.matches.map((m) => ({ ...m, division: d.name }))))
const courtRows = computed(() =>
  (t.value?.courts || []).map((court) => {
    const live = allMatches.value.find((m) => m.court === court && m.status === 'live')
    const next = allMatches.value.find((m) => m.court === court && m.status === 'ready')
    const m = live || next
    return {
      court,
      live: !!live,
      text: live ? `Playing M${live.number} · ${live.division}` : next ? `M${next.number} up next · ${next.division}` : 'Free',
      match: m,
    }
  }),
)
const freeCourts = computed(() => courtRows.value.filter((c) => !c.match))
const canFillCourts = computed(() => freeCourts.value.length > 0 && allMatches.value.some((m) => m.status === 'ready' && !m.court))
const courtsDialog = ref(false)
async function fillFreeCourts() {
  busy.value = true
  try {
    const res = await T.fillCourts(id)
    t.value = res.data
    $q.notify({
      type: res.assigned ? 'positive' : 'info',
      message: res.assigned ? `${res.assigned} court${res.assigned === 1 ? '' : 's'} filled` : 'Every team that could play is already on a court',
      timeout: 1800,
    })
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Could not fill the courts' })
  } finally {
    busy.value = false
  }
}
function openCourt(court) {
  courtsDialog.value = false
  router.push({ name: 'tournament-court', params: { id, court } })
}
async function copyCourtLink(court) {
  const link = `${publicAppUrl()}/tournaments/${id}/court/${encodeURIComponent(court)}`
  try {
    await navigator.clipboard.writeText(link)
    $q.notify({ type: 'positive', message: `${court} referee link copied`, timeout: 1200 })
  } catch {
    $q.notify({ type: 'info', message: link, timeout: 6000 })
  }
}

// ——— sample teams (testing) ———
const sampleDialog = ref(false)
const sampleCount = ref(16)
const SAMPLE_DEFAULT = { pool_playoff: 16, round_robin: 6, single_elim: 8, double_elim: 6 }
const sampleHint = computed(() => {
  const s = division.value?.settings || {}
  return division.value?.format === 'pool_playoff' ? `${s.pool_count} pools → ${Math.floor((Number(sampleCount.value) || 0) / (s.pool_count || 1))}–${Math.ceil((Number(sampleCount.value) || 0) / (s.pool_count || 1))} teams per pool` : ''
})
function openSample() {
  sampleCount.value = SAMPLE_DEFAULT[division.value?.format] || 8
  sampleDialog.value = true
}
async function addSample() {
  const count = Math.min(64, Math.max(2, Number(sampleCount.value) || 0))
  const res = await run(() => T.addSampleEntries(id, divisionId.value, count), `${count} sample teams added`)
  if (res) sampleDialog.value = false
}

// ——— redo playoff ———
const canRedoPlayoff = computed(
  () =>
    canManage.value &&
    division.value?.format === 'pool_playoff' &&
    division.value?.has_playoff &&
    !division.value.matches.some((m) => m.stage !== 'pool' && ['live', 'completed'].includes(m.status)),
)
async function redoPlayoff() {
  if (!(await confirm('Redo the playoff?', 'The playoff bracket is rebuilt from the final pool standings using the current settings. Pool results stay.', 'Redo playoff', 'primary'))) return
  await run(() => T.generatePlayoff(id, divisionId.value), 'Playoff rebuilt')
}

const shareDialog = ref(false)
const boardLink = computed(() => (t.value ? boardUrl(t.value.code) : ''))
const monitorLink = computed(() => (t.value ? monitorUrl(t.value.code) : ''))
async function copyBoard() {
  try {
    await navigator.clipboard.writeText(boardLink.value)
    $q.notify({ type: 'positive', message: 'Link copied', timeout: 1200 })
  } catch {
    $q.notify({ type: 'warning', message: 'Copy failed — select the link instead' })
  }
}

onMounted(async () => {
  await load()
  if (division.value) tab.value = division.value.matches.length ? 'matches' : 'teams'
})
</script>

<style scoped lang="scss">
.t-divisions {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  align-items: center;
}
.t-division-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  max-width: 220px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-muted);
  cursor: pointer;
  &.is-active {
    background: var(--brand-deep);
    border-color: var(--brand-deep);
    color: #fff;
  }
}
.t-fill {
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(199, 240, 0, 0.16);
  border: 1px solid rgba(124, 148, 0, 0.35);
}
.t-add-division {
  flex: none;
  white-space: nowrap;
}
.t-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #dc2626;
  flex: none;
}
.t-podium__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  & + & { border-top: 1px solid var(--line); }
}
.t-medal {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  flex: none;
  &--1 { background: #facc15; color: #713f12; }
  &--2 { background: #e2e8f0; color: #334155; }
  &--3 { background: #fdba74; color: #7c2d12; }
}
.t-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 8px 10px 14px;
  & + & { border-top: 1px solid var(--line); }
  &.is-withdrawn { opacity: 0.5; }
}
.t-entry__seed {
  width: 24px;
  font-weight: 800;
  color: var(--ink-faint);
  flex: none;
}
.t-match-list {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
.t-format-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  vertical-align: 1px;
  background: var(--lime);
  color: var(--brand-deep);
  &--muted {
    background: rgba(148, 163, 184, 0.2);
    color: var(--ink-muted);
  }
}
.t-formats {
  display: grid;
  gap: 8px;
}
.t-format {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  text-align: left;
  font: inherit;
  color: inherit;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  cursor: pointer;
  &.is-active {
    border-color: var(--brand-deep);
    box-shadow: 0 0 0 1px var(--brand-deep) inset;
    background: var(--surface-sunken);
  }
  &:disabled { cursor: not-allowed; opacity: 0.6; }
}
.t-toggle {
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}
.t-result-grid {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  gap: 8px;
  align-items: center;
}
.t-code {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-align: center;
}
</style>
