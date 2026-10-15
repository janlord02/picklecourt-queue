// Standings split by court segregation group. With groups, each group is
// ranked on its own (its own winners and podium); players without a group
// come last under "No group". Without groups there is one section with
// `group: null`, so callers render exactly as before.
//
// `leaderboard` arrives already sorted best-first from the API, so filtering
// keeps each group's order; ranks restart at 1 inside every group.
export function standingsSections(leaderboard = [], groups = []) {
  const rows = leaderboard || []
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
