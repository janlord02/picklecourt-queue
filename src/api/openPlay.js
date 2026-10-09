import { api } from 'src/boot/axios'

/**
 * Every backend touchpoint of the Open Play module in one place
 * (routes/openplay.php + routes/channels.php on the Laravel side).
 * Responses are the house envelope: { data: … } — callers get `data` back.
 */

// ——— realtime channel names ———
export const CHANNELS = {
  session: (sessionId) => `play-session.${sessionId}`, // private
  display: (joinCode) => `play-display.${joinCode}`, // public
  user: (userId) => `App.Models.User.${userId}`, // private (you're-called pings)
}
export const EVENTS = {
  updated: '.play.updated',
  called: '.play.called',
}

const unwrap = (response) => response.data.data

// ——— sessions ———
export const listSessions = (params) => api.get('/play/sessions', { params }).then(unwrap)
export const getSession = (id) => api.get(`/play/sessions/${id}`).then(unwrap)
export const getState = (id) => api.get(`/play/sessions/${id}/state`).then(unwrap)
export const createSession = (payload) => api.post('/play/sessions', payload).then(unwrap)
export const updateSession = (id, payload) => api.patch(`/play/sessions/${id}`, payload).then(unwrap)

// ——— public (QR landing + TV board, keyed by join code) ———
export const resolveCode = (code) => api.get(`/play/code/${code}`).then(unwrap)
export const getDisplayState = (code) => api.get(`/play/display/${code}`).then(unwrap)

// ——— players ———
export const joinSession = (id, payload = {}) =>
  api.post(`/play/sessions/${id}/join`, payload).then(unwrap)
export const checkIn = (id) => api.post(`/play/sessions/${id}/check-in`).then(unwrap)
export const addPlayer = (id, payload) =>
  api.post(`/play/sessions/${id}/players`, payload).then(unwrap)
export const playerAction = (id, playerId, action, extra = {}) =>
  api.patch(`/play/sessions/${id}/players/${playerId}`, { action, ...extra }).then(unwrap)
export const getMyStats = () => api.get('/play/me/stats').then(unwrap)
export const getOrganizerContext = () => api.get('/play/organizer/context').then(unwrap)
export const getPlayerSummary = (id, playerId) =>
  api.get(`/play/sessions/${id}/players/${playerId}`).then(unwrap)

// ——— courts ———
export const addCourt = (id, payload) => api.post(`/play/sessions/${id}/courts`, payload).then(unwrap)
export const updateCourt = (id, courtId, payload) =>
  api.patch(`/play/sessions/${id}/courts/${courtId}`, payload).then(unwrap)

// ——— matchmaking + match lifecycle ———
export const suggestMatches = (id, params = {}) =>
  api.post(`/play/sessions/${id}/suggest`, params).then(unwrap)
export const stageMatch = (id, payload) =>
  api.post(`/play/sessions/${id}/matches`, payload).then(unwrap)
export const callMatch = (matchId) => api.post(`/play/matches/${matchId}/call`).then(unwrap)
export const readyMatch = (matchId) => api.post(`/play/matches/${matchId}/ready`).then(unwrap)
export const startMatch = (matchId) => api.post(`/play/matches/${matchId}/start`).then(unwrap)
export const scoreMatch = (matchId, teamAScore, teamBScore) =>
  api
    .post(`/play/matches/${matchId}/score`, { team_a_score: teamAScore, team_b_score: teamBScore })
    .then(unwrap)
export const amendMatch = (matchId, teamAScore, teamBScore) =>
  api
    .post(`/play/matches/${matchId}/amend`, { team_a_score: teamAScore, team_b_score: teamBScore })
    .then(unwrap)
export const cancelMatch = (matchId) => api.post(`/play/matches/${matchId}/cancel`).then(unwrap)
// `fairness` (optional): { ack: true, reasons: [...] } — acknowledged
// override warnings, logged server-side to the activity log.
export const replaceInMatch = (matchId, outPlayerId, inPlayerId, fairness = null) =>
  api
    .post(`/play/matches/${matchId}/replace`, {
      out_player_id: outPlayerId,
      in_player_id: inPlayerId,
      ...(fairness ? { fairness_ack: true, fairness_reasons: fairness.reasons } : {}),
    })
    .then(unwrap)
export const updateTeams = (matchId, teamA, teamB, fairness = null) =>
  api
    .post(`/play/matches/${matchId}/teams`, {
      team_a: teamA,
      team_b: teamB,
      ...(fairness ? { fairness_ack: true, fairness_reasons: fairness.reasons } : {}),
    })
    .then(unwrap)

// Partner lock: pass a partner id to link the pair (engine keeps them on the
// same team), or null to break the lock. No state transition involved.
export const setLockedPartner = (sessionId, playerId, partnerId) =>
  api
    .patch(`/play/sessions/${sessionId}/players/${playerId}`, { locked_partner_id: partnerId })
    .then(unwrap)

// Rename a GUEST player (organizer-only; the backend rejects renaming a
// registered user, whose name comes from their account). No state transition.
export const updatePlayerName = (sessionId, playerId, displayName) =>
  api
    .patch(`/play/sessions/${sessionId}/players/${playerId}`, { display_name: displayName })
    .then(unwrap)

// Organizer sets a player's skill level (rating_source becomes "organizer").
export const updatePlayerRating = (sessionId, playerId, rating) =>
  api.patch(`/play/sessions/${sessionId}/players/${playerId}`, { rating }).then(unwrap)

// ——— host/organizer invitations ———
// Organizer side: manage the hosts of a queue session.
export const listSessionHosts = (id) => api.get(`/play/sessions/${id}/hosts`).then(unwrap)
export const inviteSessionHost = (id, email) =>
  api.post(`/play/sessions/${id}/hosts`, { email }).then(unwrap)
export const removeSessionHost = (id, invitationId) =>
  api.delete(`/play/sessions/${id}/hosts/${invitationId}`).then(unwrap)
// Invitee side (note: /host-invitations lives under /api, not /play).
export const getInvitation = (token) => api.get(`/host-invitations/${token}`).then(unwrap)
export const listMyInvitations = () => api.get('/host-invitations').then(unwrap)
export const acceptInvitation = (token) =>
  api.post(`/host-invitations/${token}/accept`).then(unwrap)
export const declineInvitation = (token) =>
  api.post(`/host-invitations/${token}/decline`).then(unwrap)

// ——— session tools (organizer) ———
// Copy a session's setup (format, courts, settings) to a new date.
export const duplicateSession = (id, payload) =>
  api.post(`/play/sessions/${id}/duplicate`, payload).then(unwrap)
// CSV download (players | matches) — fetched as a blob because the request
// needs the auth header; the caller saves it.
export const exportSessionCsv = (id, type) =>
  api.get(`/play/sessions/${id}/export`, { params: { type }, responseType: 'blob' })

// ——— guest self-join (no account; organizer approves) ———
// The guest's phone keeps a private token per session in localStorage and
// sends it as X-Guest-Token.
const GUEST_KEY = 'play_guest_tokens'
export function guestTokens() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || '{}')
  } catch {
    return {}
  }
}
export function saveGuestToken(code, token) {
  const all = guestTokens()
  all[String(code).toUpperCase()] = token
  localStorage.setItem(GUEST_KEY, JSON.stringify(all))
}
export function forgetGuestToken(code) {
  const all = guestTokens()
  delete all[String(code).toUpperCase()]
  localStorage.setItem(GUEST_KEY, JSON.stringify(all))
}
// Remember a declined sign-up so a refresh still explains what happened.
const DECLINED_KEY = 'play_guest_declined'
export function markGuestDeclined(code) {
  try {
    const all = JSON.parse(localStorage.getItem(DECLINED_KEY) || '{}')
    all[String(code).toUpperCase()] = Date.now()
    localStorage.setItem(DECLINED_KEY, JSON.stringify(all))
  } catch {
    // storage unavailable
  }
}
export function wasGuestDeclined(code) {
  try {
    return !!JSON.parse(localStorage.getItem(DECLINED_KEY) || '{}')[String(code).toUpperCase()]
  } catch {
    return false
  }
}
const guestHeaders = (token) => ({ headers: { 'X-Guest-Token': token } })

export const guestJoin = (code, payload) =>
  api.post(`/play/code/${code}/guest-join`, payload).then(unwrap)
export const guestSession = (token) => api.get('/play/guest/session', guestHeaders(token)).then(unwrap)
export const guestAction = (token, action, extra = {}) =>
  api.post('/play/guest/action', { action, ...extra }, guestHeaders(token)).then(unwrap)
export const guestReady = (token) => api.post('/play/guest/ready', {}, guestHeaders(token)).then(unwrap)
// Signed-in user takes over their guest sign-up (moves games to the account).
export const claimGuest = (guestToken) =>
  api.post('/play/guest/claim', { guest_token: guestToken }).then(unwrap)
