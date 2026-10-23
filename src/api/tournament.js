import { api } from 'src/boot/axios'

/**
 * Tournaments (routes/tournament.php on the Laravel side, /api/tournaments).
 * BETA: only super admins can create them; hosts/referees they add can open
 * that tournament. Mutations on the setup side return the full tournament
 * state; scoring calls return just the match.
 */

export const TOURNAMENT_CHANNEL = (code) => `tournament.${code}` // public
export const TOURNAMENT_EVENT = '.tournament.updated'

const unwrap = (response) => response.data.data

// ——— tournaments ———
// → { data: [summary…], can_create }
export const listTournaments = () => api.get('/tournaments').then((r) => r.data)
export const createTournament = (payload) => api.post('/tournaments', payload).then(unwrap)
export const getTournament = (id) => api.get(`/tournaments/${id}`).then(unwrap)
export const updateTournament = (id, payload) => api.patch(`/tournaments/${id}`, payload).then(unwrap)
export const deleteTournament = (id) => api.delete(`/tournaments/${id}`).then(unwrap)
export const getBoard = (code) => api.get(`/tournaments/board/${code}`).then(unwrap)

// ——— staff ———
export const addStaff = (id, payload) => api.post(`/tournaments/${id}/staff`, payload).then(unwrap)
export const removeStaff = (id, staffId) => api.delete(`/tournaments/${id}/staff/${staffId}`).then(unwrap)

// ——— divisions + entries ———
const div = (id, divisionId) => `/tournaments/${id}/divisions/${divisionId}`
export const addDivision = (id, payload) => api.post(`/tournaments/${id}/divisions`, payload).then(unwrap)
export const updateDivision = (id, divisionId, payload) => api.patch(div(id, divisionId), payload).then(unwrap)
export const deleteDivision = (id, divisionId) => api.delete(div(id, divisionId)).then(unwrap)
// entries: [{ players: [{ name }], name?, rating? }]
export const addEntries = (id, divisionId, entries) =>
  api.post(`${div(id, divisionId)}/entries`, { entries }).then(unwrap)
export const updateEntry = (id, divisionId, entryId, payload) =>
  api.patch(`${div(id, divisionId)}/entries/${entryId}`, payload).then(unwrap)
export const removeEntry = (id, divisionId, entryId) =>
  api.delete(`${div(id, divisionId)}/entries/${entryId}`).then(unwrap)
// mode: 'order' (with order: [entryId…]) | 'random' | 'rating'
export const seedEntries = (id, divisionId, payload) =>
  api.post(`${div(id, divisionId)}/seed`, payload).then(unwrap)
export const generateBracket = (id, divisionId) => api.post(`${div(id, divisionId)}/generate`).then(unwrap)
export const generatePlayoff = (id, divisionId) => api.post(`${div(id, divisionId)}/playoff`).then(unwrap)
export const resetBracket = (id, divisionId) => api.post(`${div(id, divisionId)}/reset`).then(unwrap)

// ——— matches (hosts + referees). Scoring calls carry the match `seq`;
// a 409 response carries the fresh match in response.data.data. ———
const m = (matchId) => `/tournaments/matches/${matchId}`
export const assignMatch = (matchId, payload) => api.patch(m(matchId), payload).then(unwrap)
export const startMatch = (matchId, payload) => api.post(`${m(matchId)}/start`, payload).then(unwrap)
export const scoreRally = (matchId, winner, seq) => api.post(`${m(matchId)}/rally`, { winner, seq }).then(unwrap)
export const undoRally = (matchId, seq) => api.post(`${m(matchId)}/undo`, { seq }).then(unwrap)
export const setMatchScore = (matchId, payload) => api.post(`${m(matchId)}/set-score`, payload).then(unwrap)
export const recordResult = (matchId, games) => api.post(`${m(matchId)}/result`, { games }).then(unwrap)
export const recordWalkover = (matchId, winner) => api.post(`${m(matchId)}/walkover`, { winner }).then(unwrap)

// ——— testing aid + courts ———
// Fill a division with { count } made-up teams (host, before the bracket).
export const addSampleEntries = (id, divisionId, count) =>
  api.post(`${div(id, divisionId)}/sample-entries`, { count }).then(unwrap)
// Host: every free court gets the next playable match → { data: state, assigned }.
export const fillCourts = (id) => api.post(`/tournaments/${id}/courts/fill`).then((r) => r.data)
// Court referee: the match to play on this court now (null = nothing playable yet).
export const nextOnCourt = (id, court) => api.post(`/tournaments/${id}/courts/next`, { court }).then(unwrap)
