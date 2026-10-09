// Shared checks for creating / editing a session. Returns an error message
// or null. playerCount: current players (edit only) — the limit can't go
// below it. isNew: new sessions can't be dated in the past.
export function validateSessionForm(f, { playerCount = 0, isNew = false } = {}) {
  if (!String(f.name || '').trim()) return 'Give the session a name.'
  if (!f.date) return 'Pick a date.'
  if (isNew) {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    if (f.date < today) return 'The date is in the past.'
  }
  if (f.start_time && f.end_time && f.end_time <= f.start_time) return 'End time must be after the start time.'
  if (f.max_players !== null && f.max_players !== '' && f.max_players !== undefined) {
    const max = Number(f.max_players)
    if (!Number.isInteger(max) || max < 2 || max > 200) return 'Max players must be a whole number from 2 to 200.'
    if (playerCount && max < playerCount) return `Max players can't be below the ${playerCount} players already in.`
  }
  return null
}
