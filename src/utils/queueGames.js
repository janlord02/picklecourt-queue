// Smart sessions plan the next games in each queue lane: queue entries carry
// `next_game` (1 = next game, 2 = the one after, …; null = further back).
// These helpers turn that into the "Next game / Game 2 / Later" headings.

export function gameLabel(game) {
  if (game === 1) return 'Next game'
  if (game) return `Game ${game}`
  return 'Later'
}

/**
 * Heading to show above row i (or null). `getEntry` maps a row to its queue
 * entry, for lists whose rows wrap the entry ({ entry, player, … }).
 */
export function gameHeadingAt(rows, i, getEntry = (r) => r) {
  const planned = rows.some((r) => getEntry(r)?.next_game != null)
  if (!planned) return null
  const game = getEntry(rows[i])?.next_game ?? null
  const prev = i > 0 ? (getEntry(rows[i - 1])?.next_game ?? null) : undefined
  return game === prev ? null : gameLabel(game)
}
