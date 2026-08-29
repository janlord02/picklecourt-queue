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
