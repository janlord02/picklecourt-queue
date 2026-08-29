/**
 * Humanize a wait-time clock reading for the open-play match page.
 *
 * Pass an ISO 8601 timestamp (the player's `queued_at`) and get back a
 * compact string like "3m", "47m", "1h 12m". Returns an empty string if
 * the input is null/undefined/garbage so render templates can use it
 * with no extra guarding.
 *
 *   <span v-if="player.queued_at">⏱ {{ formatWaitTime(player.queued_at) }}</span>
 *
 * Single-place rounding rule: anything under a minute reads "<1m" so a
 * fresh entry doesn't render as "0m"; otherwise minutes, then hours +
 * minutes after the 60-minute mark.
 */
export function formatWaitTime(iso, now = Date.now()) {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const secs = Math.max(0, Math.floor((now - t) / 1000))
  if (secs < 60) return '<1m'
  const totalMin = Math.floor(secs / 60)
  if (totalMin < 60) return `${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
