export function formatSeconds(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0))
  if (s < 60) return '<1m'
  const minutes = Math.floor(s / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

export function formatWaitRange(minSeconds, maxSeconds) {
  const lo = Math.max(1, Math.round(minSeconds / 60))
  const hi = Math.max(lo + 1, Math.round(maxSeconds / 60))
  return `~${lo}–${hi} min`
}

export function statusLabel(status) {
  const labels = {
    pending_approval: 'Needs approval',
    registered: 'Registered',
    waiting: 'Waiting',
    up_next: 'Up Next',
    called: 'Called',
    playing: 'Playing',
    cooling_down: 'Cooling Down',
    on_break: 'On Break',
    checked_out: 'Checked Out',
    no_show: 'No Show',
    injured: 'Injured',
  }
  return labels[status] || status
}

export function courtStatusLabel(status) {
  const labels = {
    available: 'Available',
    reserved: 'Up Next Ready',
    players_called: 'Players Called',
    playing: 'Playing',
    result_pending: 'Result Pending',
    maintenance: 'Maintenance',
    closed: 'Closed',
  }
  return labels[status] || status
}

// Score sessions show "11–7"; win/loss sessions (no scores) show which side
// won in the same left/right order as "Team A vs Team B": "W–L" or "L–W".
export function resultText(match) {
  if (!match) return ''
  if (match.team_a_score != null && match.team_b_score != null) {
    return `${match.team_a_score}–${match.team_b_score}`
  }
  if (match.winning_team === 'A') return 'W–L'
  if (match.winning_team === 'B') return 'L–W'
  return ''
}

// Minutes on court: "45m", "1h 05m".
export function formatMinutes(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0))
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

export const RESULT_MODE_OPTIONS = [
  { label: 'Win / Loss', value: 'win_loss' },
  { label: 'Score', value: 'score' },
]
