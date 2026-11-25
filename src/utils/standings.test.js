import { test } from 'node:test'
import assert from 'node:assert/strict'
import { unrankedPairs, standingsSections, teamRows, teamName, playerCount, podiumOf } from './standings.js'

// Locked pairs ranked as winners take one spot together (1st = Juan + Pedro,
// 2nd = the next team), not 1st Juan / 2nd Pedro.
const p = (id, name, partner, pname, w, l, g = null) => ({ player_id: id, display_name: name, locked_partner_id: partner, locked_partner_name: pname, wins: w, losses: l, games_played: w + l, play_group_id: g })

test('locked pairs fold into team rows', () => {
  // Screenshot case: 1 Jhoy, 2 Tatz (pair), 3 Joane, 4 Nancy (pair), 5 Guia, 6 Shem (pair), 7 Carz (solo)
  const lb = [p(1,'Jhoy',2,'Tatz',7,0), p(2,'Tatz',1,'Jhoy',7,0), p(3,'Joane',4,'Nancy',5,1), p(4,'Nancy',3,'Joane',5,1), p(5,'Guia',6,'Shem',4,2), p(6,'Shem',5,'Guia',4,2), p(7,'Carz',null,null,3,3)]
  const rows = standingsSections(lb)[0].rows
  assert.deepEqual(rows.map(teamName), ['Jhoy + Tatz','Joane + Nancy','Guia + Shem','Carz'])
  assert.deepEqual(rows[0].member_ids, [1,2])
  assert.equal(playerCount(rows), 7)
  const pod = podiumOf(rows)
  assert.deepEqual(pod.map(e => [e.place, teamName(e.row)]), [[2,'Joane + Nancy'],[1,'Jhoy + Tatz'],[3,'Guia + Shem']])
  // Partner not in the ranked list (left / unranked) stays a single row.
  assert.deepEqual(teamRows([p(1,'Ana',9,'Ben',3,0)]).map(teamName), ['Ana'])
  // Groups: teams fold inside each group.
  const g = standingsSections([p(1,'A',2,'B',2,0,10), p(3,'C',null,null,1,1,11), p(2,'B',1,'A',2,0,10)], [{id:10,sort_order:0},{id:11,sort_order:1}])
  assert.deepEqual(g.map(s => s.rows.map(teamName)), [['A + B'],['C']])
  // No locked pairs: unchanged order.
  assert.deepEqual(teamRows([p(1,'X',null,null,2,0), p(2,'Y',null,null,1,1)]).map(r=>r.player_id), [1,2])
})

test('by default locked pairs are not winners: listed once as "not ranked"', () => {
  // Option off: the API sends no locked pairs in `leaderboard`, only in
  // `leaderboard_unranked`, so the standings have no teams at all.
  const rows = standingsSections([p(7, 'Carz', null, null, 3, 3)])[0].rows
  assert.deepEqual(rows.map(teamName), ['Carz'])
  const unranked = unrankedPairs([p(1, 'Juan', 2, 'Pedro', 7, 0), p(2, 'Pedro', 1, 'Juan', 7, 0)])
  assert.deepEqual(unranked.map((u) => u.names), ['Juan + Pedro'])
})
