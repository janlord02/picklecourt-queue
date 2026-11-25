// Standings split by court segregation group. With groups, each group is
// ranked on its own (its own winners and podium); players without a group
// come last under "No group". Without groups there is one section with
// `group: null`, so callers render exactly as before.
//
// `leaderboard` arrives already sorted best-first from the API, so filtering
// keeps each group's order; ranks restart at 1 inside every group.
//
// Locked pairs are NOT winners by default (they're in `leaderboard_unranked`,
// shown as "not ranked"). Only when the organizer turns on "Rank locked
// pairs" do they appear here, and then as one team: both partners take a
// single spot (see `teamRows`), so 1st is Juan + Pedro and 2nd the next team.
export function standingsSections(leaderboard = [], groups = []) {
  const rows = teamRows(leaderboard)
  const list = [...(groups || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id)
  const known = new Set(list.map((g) => g.id))
  const grouped = list.length > 0 && rows.some((r) => r.play_group_id && known.has(r.play_group_id))
  if (!grouped) return [{ key: 'all', group: null, rows }]

  const sections = list
    .map((g) => ({ key: `g${g.id}`, group: g, rows: rows.filter((r) => r.play_group_id === g.id) }))
    .filter((s) => s.rows.length)
  const ungrouped = rows.filter((r) => !r.play_group_id || !known.has(r.play_group_id))
  if (ungrouped.length) sections.push({ key: 'none', group: null, rows: ungrouped, ungrouped: true })
  return sections
}

/**
 * Folds a ranked locked pair into one row at the better partner's spot.
 * Partners share every result, so that row's record is the team's. The row
 * keeps `display_name` + `locked_partner_name` (shown as "Juan 🔗 Pedro") and
 * gains `member_ids` (both players) and `team: true`. Everyone else passes
 * through with `member_ids: [player_id]`.
 */
export function teamRows(leaderboard = []) {
  const rows = leaderboard || []
  const ids = new Set(rows.map((r) => r.player_id))
  const taken = new Set()
  const out = []
  for (const r of rows) {
    if (taken.has(r.player_id)) continue
    const partnerId = r.locked_partner_id
    if (partnerId && partnerId !== r.player_id && ids.has(partnerId) && !taken.has(partnerId)) {
      taken.add(r.player_id)
      taken.add(partnerId)
      out.push({ ...r, team: true, member_ids: [r.player_id, partnerId] })
      continue
    }
    taken.add(r.player_id)
    out.push({ ...r, member_ids: [r.player_id] })
  }
  return out
}

/** "Juan + Pedro" for a team row, the player's name otherwise. */
export function teamName(row) {
  if (!row) return ''
  const name = row.display_name || 'Player'
  return row.team && row.locked_partner_name ? `${name} + ${row.locked_partner_name}` : name
}

/** Players behind the rows (a team counts as two). */
export function playerCount(rows = []) {
  return (rows || []).reduce((n, r) => n + (r.member_ids?.length || 1), 0)
}

/**
 * "5 games": shown next to every record, since with the same wins the player
 * who played more games ranks higher.
 */
export function gamesLabel(n) {
  const games = Number(n) || 0
  return `${games} ${games === 1 ? 'game' : 'games'}`
}

/** 2nd · 1st · 3rd podium for one section (needs a full top three). */
export function podiumOf(rows, steps = [56, 80, 42]) {
  const [first, second, third] = rows
  if (!third) return null
  return [
    { row: second, place: 2, medal: '🥈', step: steps[0] },
    { row: first, place: 1, medal: '🏆', step: steps[1] },
    { row: third, place: 3, medal: '🥉', step: steps[2] },
  ]
}

/**
 * Locked pairs left out of the winners, one entry per pair ("Ana + Ben").
 * Both partners share every result, so the first row's record is the pair's.
 */
export function unrankedPairs(rows = []) {
  const seen = new Set()
  const out = []
  for (const r of rows || []) {
    const key = [r.player_id, r.locked_partner_id || 0].sort((a, b) => a - b).join('-')
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      key,
      names: r.locked_partner_name ? `${r.display_name} + ${r.locked_partner_name}` : r.display_name,
      wins: r.wins,
      losses: r.losses,
      play_group_id: r.play_group_id,
    })
  }
  return out
}
