import logoUrl from 'src/assets/logo.png'

/**
 * Renders a shareable end-of-session recap card (PNG via canvas): brand
 * header, session name/date, a 2nd·1st·3rd podium, standings list.
 * 1080 wide; the height is computed from the content so long standings
 * never collide with the footer.
 */

const W = 1080
const PAD = 72
const ROW_H = 74
const INK = '#f6fbf9'
const MUTED = '#8fb5a9'
const BG = '#0c2b23'
const CARD = '#113329'
const LIME = '#c7f000'
const FONT = "'Figtree', -apple-system, 'Segoe UI', Roboto, sans-serif"

// Podium geometry: the champion column stacks (from the step upward)
// gap 24 + rate 26 + record 40+48 + name 50 + medal ~110 ≈ 300px above
// the tallest (175px) step — so the podium band needs the full 480px.
const PODIUM_BAND = 480

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let out = text
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1)
  }
  return `${out}…`
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export async function buildRecapCanvas(state) {
  const session = state.session || {}
  const leaderboard = state.leaderboard || []
  const stats = state.stats || {}

  const hasPodium = leaderboard.length >= 3
  const listRows = leaderboard.slice(hasPodium ? 3 : 0, 12)
  const rankOffset = hasPodium ? 3 : 0
  const shown = rankOffset + listRows.length
  const moreCount = leaderboard.length - shown

  // ——— layout math (content-driven height) ———
  const headerH = 130 + 52 + 64 // logo band + title + meta
  const podiumH = hasPodium ? PODIUM_BAND : 0
  const cardH = listRows.length ? 70 + listRows.length * ROW_H + 20 : 0
  const moreH = moreCount > 0 ? 56 : 0
  const footerH = 110
  const H = Math.max(760, PAD + headerH + podiumH + cardH + moreH + footerH)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)

  // ——— brand header ———
  let y = PAD
  try {
    const logo = await loadImage(logoUrl)
    const logoH = 52
    const logoW = (logo.width / logo.height) * logoH
    ctx.drawImage(logo, PAD, y, logoW, logoH)

    ctx.font = `800 24px ${FONT}`
    const badgeText = 'QUEUE'
    const bw = ctx.measureText(badgeText).width + 28
    roundRect(ctx, PAD + logoW + 20, y + 10, bw, 36, 10)
    ctx.fillStyle = LIME
    ctx.fill()
    ctx.fillStyle = BG
    ctx.fillText(badgeText, PAD + logoW + 34, y + 36)
  } catch {
    ctx.fillStyle = INK
    ctx.font = `800 44px ${FONT}`
    ctx.fillText('PickleCourt QUEUE', PAD, y + 40)
  }
  y += 130

  // ——— session title + meta ———
  ctx.fillStyle = INK
  ctx.font = `800 64px ${FONT}`
  ctx.fillText(truncate(ctx, session.name || 'Open Play', W - PAD * 2), PAD, y)
  y += 52
  ctx.fillStyle = MUTED
  ctx.font = `500 30px ${FONT}`
  const meta = [
    session.date,
    `${stats.games_completed ?? 0} games`,
    `${session.player_count ?? leaderboard.length} players`,
  ]
    .filter(Boolean)
    .join('  ·  ')
  ctx.fillText(meta, PAD, y)
  y += 64

  // ——— podium: 2nd · 1st · 3rd, champion tallest ———
  if (hasPodium) {
    const [first, second, third] = leaderboard
    const podium = [
      { row: second, place: 2, medal: '🥈', step: 120, big: false },
      { row: first, place: 1, medal: '🏆', step: 175, big: true },
      { row: third, place: 3, medal: '🥉', step: 90, big: false },
    ]
    const colW = 280
    const gap = 24
    const baseY = y + PODIUM_BAND - 32 // steps sit at the bottom of the band
    const startX = (W - colW * 3 - gap * 2) / 2

    podium.forEach((entry, index) => {
      const x = startX + index * (colW + gap)
      const cx = x + colW / 2

      roundRect(ctx, x, baseY - entry.step, colW, entry.step, 18)
      ctx.fillStyle = entry.big ? 'rgba(199, 240, 0, 0.24)' : CARD
      ctx.fill()
      ctx.fillStyle = entry.big ? LIME : 'rgba(255, 255, 255, 0.28)'
      ctx.font = `800 ${entry.big ? 64 : 48}px ${FONT}`
      const placeText = String(entry.place)
      ctx.fillText(
        placeText,
        cx - ctx.measureText(placeText).width / 2,
        baseY - entry.step / 2 + (entry.big ? 22 : 17),
      )

      // stacked upward from the step: win% → record → name → medal
      let ty = baseY - entry.step - 24
      ctx.fillStyle = MUTED
      ctx.font = `600 26px ${FONT}`
      const rate = entry.row.games_played
        ? `${Math.round((entry.row.wins / entry.row.games_played) * 100)}%`
        : '—'
      ctx.fillText(rate, cx - ctx.measureText(rate).width / 2, ty)
      ty -= 40
      ctx.fillStyle = INK
      ctx.font = `800 ${entry.big ? 40 : 32}px ${FONT}`
      const record = `${entry.row.wins}–${entry.row.losses}`
      ctx.fillText(record, cx - ctx.measureText(record).width / 2, ty)
      ty -= entry.big ? 48 : 42
      ctx.fillStyle = entry.big ? LIME : INK
      ctx.font = `${entry.big ? 800 : 700} ${entry.big ? 36 : 30}px ${FONT}`
      const name = truncate(ctx, entry.row.display_name || 'Player', colW - 12)
      ctx.fillText(name, cx - ctx.measureText(name).width / 2, ty)
      ty -= entry.big ? 24 : 20
      ctx.font = `${entry.big ? 64 : 48}px ${FONT}`
      ctx.textBaseline = 'bottom'
      ctx.fillText(entry.medal, cx - (entry.big ? 36 : 28), ty)
      ctx.textBaseline = 'alphabetic'
    })

    y += PODIUM_BAND
  }

  // ——— standings list (rank 4+ when the podium is shown) ———
  const cardX = PAD - 16
  const cardW = W - (PAD - 16) * 2
  if (listRows.length) {
    roundRect(ctx, cardX, y, cardW, cardH, 24)
    ctx.fillStyle = CARD
    ctx.fill()

    ctx.fillStyle = MUTED
    ctx.font = `700 24px ${FONT}`
    ctx.fillText(hasPodium ? 'S T A N D I N G S' : 'F I N A L   S T A N D I N G S', PAD, y + 52)
  }

  let rowY = y + 70
  const medals = ['🥇', '🥈', '🥉']
  listRows.forEach((entry, index) => {
    const midY = rowY + ROW_H / 2 + 10
    const rank = index + rankOffset
    if (!hasPodium && rank < 3) {
      ctx.font = `40px ${FONT}`
      ctx.fillText(medals[rank], PAD, midY + 2)
    } else {
      ctx.fillStyle = MUTED
      ctx.font = `700 32px ${FONT}`
      ctx.fillText(String(rank + 1), PAD + 8, midY)
    }

    ctx.fillStyle = INK
    ctx.font = `800 34px ${FONT}`
    const record = `${entry.wins}–${entry.losses}`
    const recordW = ctx.measureText(record).width
    ctx.fillText(record, cardX + cardW - 32 - recordW, midY)

    const rate = entry.games_played
      ? `${Math.round((entry.wins / entry.games_played) * 100)}%`
      : '—'
    ctx.fillStyle = MUTED
    ctx.font = `600 28px ${FONT}`
    const rateW = ctx.measureText(rate).width
    ctx.fillText(rate, cardX + cardW - 32 - recordW - 28 - rateW, midY)

    const topThree = !hasPodium && rank < 3
    ctx.fillStyle = topThree ? LIME : INK
    ctx.font = `${topThree ? 800 : 600} 34px ${FONT}`
    ctx.fillText(truncate(ctx, entry.display_name || 'Player', cardW - 320), PAD + 76, midY)

    if (index < listRows.length - 1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.beginPath()
      ctx.moveTo(PAD, rowY + ROW_H)
      ctx.lineTo(cardX + cardW - 32, rowY + ROW_H)
      ctx.stroke()
    }
    rowY += ROW_H
  })
  y += cardH

  if (moreCount > 0) {
    ctx.fillStyle = MUTED
    ctx.font = `500 26px ${FONT}`
    ctx.fillText(`+ ${moreCount} more players`, PAD, y + 40)
  }

  // ——— footer ———
  ctx.fillStyle = MUTED
  ctx.font = `600 26px ${FONT}`
  ctx.fillText('PickleCourt · open play queues & smart matchmaking', PAD, H - 48)

  return canvas
}

/** PNG blob of the recap card. */
export async function recapBlob(state) {
  const canvas = await buildRecapCanvas(state)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not render image'))), 'image/png')
  })
}
