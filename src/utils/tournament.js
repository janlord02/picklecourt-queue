// Tournament display helpers shared by the host console, referee screen and
// public board. The server sends labels ("Semifinal 2", "Losers R3") and
// sources ("Winner of M4"); this file only formats and groups.

// Order = how often clubs use them. Most tournaments are single elimination
// (on its own, or as the playoff after pools); double elimination is for
// mini tournaments with few teams since it plays about twice the matches.
export const FORMATS = [
  {
    value: 'pool_playoff',
    label: 'Pools → playoff',
    caption: 'Round robin in pools, then the top teams play a single-elimination playoff (crossover quarterfinals). The usual club tournament.',
    icon: 'eva-grid-outline',
    tag: 'Most common',
  },
  {
    value: 'single_elim',
    label: 'Single elimination',
    caption: 'Lose once and you are out. Fastest — top seeds get the byes.',
    icon: 'eva-funnel-outline',
  },
  {
    value: 'round_robin',
    label: 'Round robin',
    caption: 'Everyone plays everyone. Best record wins. Great for 4–8 teams.',
    icon: 'eva-sync-outline',
  },
  {
    value: 'double_elim',
    label: 'Double elimination',
    caption: 'Lose twice to go out: losers bracket, grand final and a reset if needed. For mini tournaments — about twice the matches.',
    icon: 'eva-repeat-outline',
    tag: 'Mini tournaments',
  },
]

export const formatLabel = (value) => FORMATS.find((f) => f.value === value)?.label || value

export const TOURNAMENT_STATUS = {
  draft: 'Draft',
  live: 'Live',
  completed: 'Finished',
  cancelled: 'Cancelled',
}

export const MATCH_STATUS = {
  pending: 'Waiting',
  ready: 'Ready',
  live: 'Live',
  completed: 'Final',
  bye: 'Bye',
  void: 'Not needed',
}

export const PLACE_LABEL = { 1: 'Champion', 2: 'Runner-up', 3: 'Third place' }

/** id → entry for a division. */
export function entryMap(division) {
  const map = {}
  for (const e of division?.entries || []) map[e.id] = e
  return map
}

/** Name for slot A/B of a match: the team, its feeder ("Winner of M3"), or "Bye". */
export function slotName(match, side, entries) {
  const id = side === 'A' ? match.entry_a_id : match.entry_b_id
  if (id && entries[id]) return entries[id].name
  const source = side === 'A' ? match.a_source : match.b_source
  if (source) return source
  return match.stage === 'pool' ? 'TBD' : 'Bye'
}

/** "11-7, 9-11, 11-5" */
export function gamesLine(match) {
  return (match.games || []).map((g) => `${g.a}-${g.b}`).join(', ')
}

/** Matches grouped into bracket sections → [{ key, title, rounds: [{ title, matches }] }]. */
export function bracketSections(division) {
  const matches = (division?.matches || []).filter((m) => m.stage !== 'pool')
  const sections = []
  const byStage = (stages) => matches.filter((m) => stages.includes(m.stage))

  const roundsOf = (list, titleFor) => {
    const rounds = {}
    for (const m of list) (rounds[m.round] ||= []).push(m)
    return Object.keys(rounds)
      .map(Number)
      .sort((a, b) => a - b)
      .map((r) => ({
        title: titleFor(r, rounds[r]),
        matches: rounds[r].sort((a, b) => a.position - b.position),
      }))
  }
  // "Semifinal 1" → "Semifinal": the column title is the label without the position.
  const stripPos = (label) => label.replace(/\s\d+$/, '')

  const winners = byStage(['winners'])
  if (winners.length) {
    sections.push({
      key: 'winners',
      title: division.format === 'double_elim' ? 'Winners bracket' : division.format === 'pool_playoff' ? 'Playoff' : 'Bracket',
      rounds: roundsOf(winners, (r, list) => stripPos(list[0].label)),
    })
  }
  const losers = byStage(['losers'])
  if (losers.length) {
    sections.push({ key: 'losers', title: 'Losers bracket', rounds: roundsOf(losers, (r, list) => stripPos(list[0].label)) })
  }
  const finals = byStage(['grand_final', 'grand_final_reset', 'third_place']).filter(
    (m) => !(m.stage === 'grand_final_reset' && m.status === 'void'),
  )
  if (finals.length) {
    sections.push({
      key: 'finals',
      title: division.format === 'double_elim' ? 'Grand final' : 'Bronze',
      rounds: [{ title: '', matches: finals }],
    })
  }
  return sections
}

/** Pool letter: 1 → A. */
export const poolName = (n) => String.fromCharCode(64 + Number(n))

/** Playable now, in order, with "busy" when a team is already on court. */
export function upNext(division) {
  const live = (division?.matches || []).filter((m) => m.status === 'live')
  const busy = new Set(live.flatMap((m) => [m.entry_a_id, m.entry_b_id]))
  return (division?.matches || [])
    .filter((m) => m.status === 'ready')
    .map((m) => ({ ...m, busy: busy.has(m.entry_a_id) || busy.has(m.entry_b_id) }))
}
