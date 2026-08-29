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
