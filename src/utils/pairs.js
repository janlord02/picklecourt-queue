// Locked doubles partners — shared display rules for the organizer console
// and the TV board.

// True when a match team is exactly a locked pair (each slot carries the
// player's `locked_partner_id`).
export function isLockedPair(team) {
  if (!Array.isArray(team) || team.length !== 2) return false
  const [a, b] = team
  return a.locked_partner_id === b.player_id && b.locked_partner_id === a.player_id
}

// Winners & Losers pool for a queued player. Mirrors the engine
// (WinnersLosersStrategy): a player is in the winners pool when they won their
// last game AND their locked partner — if the partner is also queued — won
// too, so a pair always shows in the same pool (e.g. a winner locked to a
// fresh walk-in plays from the challengers pool, together).
export function isInWinnersPool(player, playersById, queuedIds) {
  if (!player || player.last_game_result !== 'win') return false
  const partnerId = player.locked_partner_id
  if (!partnerId || !queuedIds.has(partnerId)) return true
  return playersById.get(partnerId)?.last_game_result === 'win'
}
