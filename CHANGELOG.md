# Changelog

All notable changes to the PickleCourt Play (queuing) app. This project isn't
formally versioned yet (pre-1.0), so entries are grouped by month. Newest
first.

## 2026-08

- **Deployment tooling** — `docs/DEPLOY.md` documents the full CloudPanel
  (DigitalOcean) process: DNS, static site + SPA fallback vhost, SSL,
  backend one-time steps (QUEUE_APP_URL, CORS origin, migrations), GitHub
  deploy key, and verification/rollback. `deploy/deploy-queue.sh` is the
  one-command deploy (copy once to /root): clone-or-pull → npm ci →
  quasar build → rsync into the site docroot; first run writes a
  production `.env` template and stops until it's filled in.
- **Plan card is now data-driven** — it checks the business memberships
  carried in the login/handoff payload (`auth.businesses`): members of a
  platform business (i.e., PickleCourt booking subscribers) see a lime
  **100% Free** tag with "Included with {business}'s PickleCourt booking
  subscription — unlimited sessions, forever"; organizer accounts with no
  business (e.g., club admins) keep the teal "Early access · Free" tag.
- **Header pill truncation, live-row icon, Plan card** — the header
  session pill now caps at ~34vw on phones so long names ellipsize
  ("Seeded Op…") instead of crowding the logo. The Profile page's
  current-session row gets a real icon (flash bolt with a pulsing red
  live dot — the bare `.live-dot` had no styles outside `.live-tag`, so
  it rendered invisible). Organizer profiles gain a **Plan** card:
  "Early access · Free — unlimited sessions; businesses subscribed to
  PickleCourt booking keep the queue app 100% free" (client-side
  placeholder until subscriptions ship).
- **"Me" is now "Profile" (everywhere) + richer profile page** — the tab,
  header link and page title all say Profile. The page itself grew up:
  the identity card gains an Organizer/Player role tag and, once you've
  played, an all-time strip (games · record · win rate · sessions from
  `/play/me/stats`); the menu gains a pulsing current-session row (back
  to your queue), a Stats & session history shortcut, and a small brand
  footer line. Sign in / My sessions / Organizer console unchanged.
- **Responsive navigation** — on desktop widths (≥1024px) the player nav
  moves into the header as pill links beside the logo (Home · Play ·
  Stats · Profile, active in lime) and the bottom thumb bar disappears
  (with its reserved page padding); mobile and tablet keep the bottom
  tabs, where the short "Me" label stays.
- **Ended sessions are read-only + recap layout fixes** — once a session
  is ended/cancelled, the console hides every operational control: Fill
  courts, Start next (free courts say "Session over"), Add court, Add
  player, court ⋮ menus and player action menus — only the board, results
  and sharing remain (the backend already refused these; now the UI
  doesn't offer them). The recap image no longer collides with itself:
  the champion's medal/name stack has real headroom (fixed podium band)
  and the canvas height is computed from the content, so long standings
  push the footer down instead of being overprinted by it.
- **Podium layout (2nd · 1st · 3rd) everywhere standings show** — the
  shared `SessionLeaderboard` (organizer Board tab + player Stats) now
  tops the list with a podium: first place tallest in the middle on a
  lime step, silver/bronze beside, then ranks 4+ as the usual rows. The
  share/recap image draws the same podium above its standings list. And
  the TV board turns into a results screen when the session ends: QR and
  courts/queue are replaced by a big FINAL STANDINGS podium + list (the
  header meta switches to "session ended · N games played").
- **End blocked while courts are busy** — pressing End with games still on
  court now shows "Courts still busy: N games are still on court — score
  or cancel each game first" instead of the end-confirm (the backend
  refuses too). Prevents accidentally wiping unscored results; cancelling
  a whole session remains the emergency abort that releases everyone.
- **Shareable end-of-session recap image** — when a session ends, the
  organizer console shows a "Session ended" banner with **Share results**
  (Web Share API — the native sheet on mobile, straight into
  Messenger/Viber/WhatsApp) and **Download** (PNG). The card is rendered
  client-side on a canvas (`src/utils/recapImage.js`): brand header with
  the QUEUE badge, session name/date/games/players, and the final
  standings (medals for the top 3, win % + W–L per player, top 12 with a
  "+N more" line), 1080×1350 so chat apps show it uncropped. No backend
  involved — built from the state already on the page.
- **Stats tab: all-time career + session history** — the tab was
  session-scoped only (every session started you at 0–0, which read as a
  bug once you'd played many nights). Now: an **All-time** card (games,
  W–L, win rate, sessions played, average wait per game) aggregated
  across every session via new `GET /play/me/stats`; the current-session
  block is labeled with the session's name; and a tappable **Session
  history** list (your record per session, newest first) — tapping one
  points the state mirror at it so the leaderboard/recent-games sections
  replay that night. Account holders only by nature — guest rows have no
  user link to follow.
- **Header live-session pill + Home "Your sessions"** — the confusing
  radio-icon + raw join code in the player header became a lime
  pulsing-dot pill showing the session's NAME (tap → Play tab; the radio
  icon read as Bluetooth/nearby broadcast). Home now lists **Your
  sessions** (via `?joined=1`) above the tenant-scoped public browse, so
  the session you're in always appears with a Resume/Open button — even
  when the public browse is empty (localhost, or another business's
  domain) — and joined sessions are no longer duplicated in the browse
  list below.
- **Add courts mid-session** — the Courts tab gains an "Add court" button
  (bottom sheet, name prefilled "Court N+1"): a court that frees up at the
  venue joins the session immediately, shows on every board, and the
  engine proposes matches onto it right away. Backend endpoint existed;
  regression test asserts the new court is open and usable.
- **Cross-app sign-in + responsive TV board** — opening any queue-app URL
  with `?handoff=CODE` (from the booking admin's "Queue app" button)
  redeems the one-time code for a token and lands the admin signed in;
  the code is stripped from the URL. The TV board header now wraps on
  phones — the QR card drops below the title instead of clipping off the
  right edge — with tighter page padding under 600px.
- **Fix: QUEUE badge misaligned on the TV board** — `.display-logo`
  carried a 10px bottom margin inside the centered brand row, so flexbox
  centered its margin-box and the wordmark sat ~5px above the badge. The
  margin moved to the wrapping `.display-brand` row and the badge's 1px
  baseline nudge was removed — the badge now sits dead-center against the
  wordmark everywhere.
- **Winners & Losers pools format** — the format picker (create wizard +
  edit sheet, now shared `src/utils/formats.js`) gains "Winners & Losers
  pools (winners play winners)": winners feed the winners' court, losers
  and new players rotate in on the challenger court, with FIFO fairness
  inside each pool and automatic mixing when a pool can't fill a court.
  Organizer queue rows show a Winners/Challenger pool tag, and "Why this
  match?" explains the pool that formed each game.
- **Frontend audit fixes** — opening an organizer link you can't manage now
  redirects with a message instead of a blank page, and the console no
  longer permanently steals the player-side active-session pointer
  (restored on leave); navigating between two live sessions remounts the
  page (keyed router-view) so actions can't hit the previous session's id;
  "I'm ready" refetches once and reports honestly instead of silently
  no-oping when tapped before the first state load; stale state responses
  can no longer overwrite fresher ones (fetch sequencing); the TV board
  shows a proper "no session found" card for a bad code instead of an
  infinite spinner (and styles the result-pending dot); no-show and
  injured players see an explanation and next step instead of a bare
  status chip; the join-session card no longer flashes during cold start;
  `?redirect=` is sanitized to in-app paths on login/register; expired
  sessions return you to the page you were on after re-login; the voice
  picker re-queries device voices when opened (iOS Safari).
- **Format-change confirm + splash icon handoff** — switching a session's
  match format now shows a confirm first ("Games in progress and called
  matches finish as they are. Up Next matches go back to the queue (wait
  time kept) and will be re-suggested by <new format>."), and on save the
  backend releases staged Up Next matches so the new engine rebuilds them.
  On the splash screen the icon now disappears the moment the wordmark
  finishes loading (it was only a placeholder — showing both was
  redundant).
- **Auth pages redesigned + forgot password + QUEUE badge** — login and
  register were rebuilt as a proper mobile-app shell: dark brand gradient
  page, centered wordmark with a new lime `QUEUE` suffix badge
  (`.brand-badge` — also added to the player header and TV board so the
  app reads "PickleCourt QUEUE" everywhere), tagline, floating white card
  ("Welcome back" / "Create your account") with even `form-stack` rhythm
  (the old `q-gutter-md` spacing was uneven), lime footer links between
  the two pages that preserve `?redirect=`, and the standalone icon
  removed (wordmark only). New "Forgot password?" link opens a reset
  dialog wired to the existing `POST /password/forgot` (neutral
  "if an account exists…" confirmation).
- **Account registration** — the app is fully standalone now: a Create
  account page (`/register`, name/email/mobile/password) signs the player
  in immediately via the existing `POST /register`, linked from the login
  page and the signed-out Me tab. One account works across the queuing and
  booking apps; venue owners who subscribe to PickleCourt see their
  organizer tools appear automatically (roles come from the login payload).
- **"My sessions" chooser replaces "Leave current session view"** — the
  old Me-tab item only cleared the local view pointer and looked like it
  dumped you out of everything. It's now a My sessions sheet
  (`GET /play/sessions?joined=1`): every open/live session you're a player
  in, with your status per session — tap one to open it in the Play tab
  ("Viewing" tag marks the current one), or **Leave** exactly that session
  (a real check-out with a confirm; your games/wait history survive if you
  return). A quiet "Just stop viewing (stay in the queue)" option keeps the
  old view-only behavior.
- **Edit session (inside the live page)** — sessions are no longer
  frozen after creation: a pencil button beside the TV/voice icons opens
  an Edit session sheet (name, date, start/end time, match format,
  max players). Switching format warns that it applies to new matches
  only — games in progress are unaffected. Backend PATCH now also
  accepts `date`/`start_time`/`end_time`.
- **Named skill levels in Add player** — the skill picker no longer shows
  bare numbers: each level has a name and one-line description ("3.5 ·
  Intermediate — consistent rallies, starting to dink and vary pace"),
  rendered as two-line options; the selected value shows "3.5 ·
  Intermediate". Levels live in `src/utils/ratings.js` for reuse in the
  upcoming player self-rating flow.
- **Responsive "Call again"** — on called matches the re-call action is a
  round outlined bell (tooltip) on phones, and a full outlined
  "🔔 Call again" button from tablet width up (`$q.screen.gt.xs`); the fixed
  icon+label version wrapped into a tall uneven block on mobile widths.
- **Organizer header: session name + real Player-view button** — the header
  title now shows the live session's name (and "Your sessions" on the list)
  instead of the static "Organizer" label; the duplicate name inside the
  page was removed. "Player view" became an outlined button with a person
  icon (it was flat text with no tap affordance) and uses a router link.
- **Player session cards + fairness override dialog** — tapping a player in
  the organizer Queue or Players tab opens a session card
  (`PlayerDetailSheet`): W–L, win %, current streak (W3/L2, computed from
  history), average wait per game (new `total_wait_seconds` accumulator,
  banked when a match starts), average point differential, current wait,
  game-by-game history (partner, opponents, score, W/L), and
  played-with/against counts — via new
  `GET /play/sessions/{id}/players/{playerId}`. Manual overrides now warn
  first: Edit teams flags non-locked pairs repeating a partnership (from
  `pair_history` now included in organizer state), Replace flags queue jumps
  ("N players have been waiting longer than X") and repeat partnerships —
  the "Please review before continuing" dialog lists the reasons, and
  proceeding sends `fairness_ack` which the backend records in the activity
  log (`fairness_override`, causer + reasons). Locked pairs are exempt from
  repeat-partner warnings (repeating is the point).
- **Fix: announcer spoke on page refresh** — `useCallAnnouncer` primed itself
  on the transient empty state before the first fetch, so when the real
  state loaded, already-called matches looked new and were re-announced.
  Priming now waits for the first actually-loaded state (`isLoaded` guard on
  both the organizer page and the TV board); announcements fire only on a
  Call / Call again press.
- **Rename courts** — court ⋮ menu gains "Rename court…" (bottom sheet,
  prefilled with the current name). New names default to "Court 1/2/3…" from
  the wizard and flow through immediately to the organizer board, the TV
  display, and voice announcements ("Center Court. Jen and Sam, versus…") —
  the announcer reads the court label live from state. Backend already
  supported `label` on the court PATCH; regression test asserts a rename
  reaches active matches' `court_label`.
- **"Call again" button (manual re-call, no auto-repeat)** — automatic
  repetition was replaced with an explicit outline "Call again" button on
  called matches: each press bumps `called_at` server-side (same
  `POST /matches/{id}/call` endpoint, now re-callable while status is
  `called`), re-fires the personal "you're up" pings, and every
  voice-enabled device (organizer phone, venue TV) announces once per press
  (`useCallAnnouncer` keys announcements on `id:called_at`). The repeat
  interval setting was removed from the voice sheet.
- **Voice announcements (device text-to-speech)** — when a match is called,
  the device announces it out loud: "Court 2. Jen and Sam, versus Mark and
  Kevin. Please proceed to Court 2." Built on the Web Speech API
  (`src/composables/useAnnouncer.js`) — no server audio. Settings are
  per-device (localStorage): enable toggle, voice/accent picker from the
  device's installed voices, speech speed, and a test button
  (`VoiceSettingsSheet`). Organizer live page gets a speaker button beside
  the TV icon; the TV board gets a floating speaker button (the venue TV is
  the natural announcer). Announcements fire whenever a match transitions to
  "called" — regardless of which device pressed Call — with dedupe and no
  announcements for matches already called at page load.
- **Visible partner-lock tags** — locked pairs now show as a teal `🔗 Name`
  pill (`.pair-tag`) on organizer queue/player rows instead of faint caption
  text, and the player's own Play tab shows "Locked with X" under their queue
  position.
- **Realtime resilience** — all live views (player, organizer, TV board) now
  poll every 20s whenever the websocket is disconnected or Reverb is
  unconfigured, so bad venue wifi degrades to slightly-delayed instead of
  silently stale. The format picker shows only the two available formats
  (roadmap "coming soon" entries were removed at the user's request).
- **Edit teams, replace player, partner lock (organizer)** — real-life
  overrides, all reachable from the UI now. Court ⋮ menu gains **Edit teams**
  (bottom sheet with the 3 possible splits of the same four players, current
  one marked) and **Replace a player…** (pick who's out, then who's in — the
  queue in fairness order plus cooling-down players). Player ⋮ menus gain
  **Lock partner… / Unlock partner**: locked pairs always land on the same
  team in generated matches (the engine already honored this) and show a 🔗 +
  partner name on queue/player rows; locks break anytime. Backend: new
  `POST /play/matches/{id}/teams` (same-four-players validation), player
  PATCH accepts a lock change without a state-transition action, and the
  smart seeder now locks Jen + Sam as a demo pair.
- **Court overflow menu: state-aware, never empty** — the court card's ⋮ menu
  used to open blank on playing courts (its items only covered
  available/maintenance/closed). It now adapts per state — available: Set
  maintenance / Close court; maintenance/closed: Reopen; playing: **Cancel
  match (no result)** with a confirm (abandon for injury/rain — players
  return to the queue with wait priority intact) — and the button hides when
  there are no actions.
- **TV board redesign + QR fix** — `/display/:code` court cards rebuilt in
  the app's design language: hairline-bordered dark surfaces (the colored
  top-border strips are gone), a head row with court name, status dot and a
  live mm:ss timer for playing courts, hairline `vs` divider in lineups, and
  a lime "Free" state. Fixed the join QR never rendering: the canvas
  existence check ran before the DOM had rendered it — now it draws once
  after `nextTick`. Queue rows get tabular numerals and name truncation.
- **Design system pass (whole app)** — replaced the ad-hoc styling with a
  small design system in `src/css/app.scss`: CSS tokens (ink/muted/faint
  text, hairline `--line`, sage `--page`, brand colors), ONE surface style
  (white card, 1px hairline border, 16px radius — the colored left-border
  court cards are gone), status communicated by small colored dots
  (`StatusChip` rewritten; the pastel pill chips are gone), a strict button
  hierarchy (one filled primary per view, quiet outlines, plain-text
  destructive; global sentence-case + 12px radius on all `q-btn`), tabular
  numerals for scores/timers/waits, section labels that sit above cards,
  grouped list rows with hairline separators instead of card-per-row, bottom
  sheets with grabber handles, structured court cards (head / body / sunken
  action bar), a hairline `vs` divider in match lineups, a quieter
  "Why this match?" disclosure, unified empty states, and a gradient
  "You're up" takeover. Session/court status badges (LIVE etc.) became quiet
  pulsing-dot tags. Applied across every page: organizer Live/Sessions,
  player Home/Play/Stats/Profile/Join, login, and dialogs.
- **Organizer "Board" tab (leaderboard + game log)** — the live session page
  gains a fourth tab beside Courts/Queue/Players: session leaderboard (rank
  medals, win %, W–L) and a full game log with the winning team bolded and an
  edit-result shortcut per game. The leaderboard is now a shared
  `SessionLeaderboard` component, also used by the player Stats tab.
- **Organizer console lists all your sessions** — `SessionsPage` now calls
  `GET /play/sessions?mine=1`, so every session you organize appears
  regardless of tenant/domain (previously the list was tenant-scoped, which
  on localhost resolved to the main-app business and hid sessions belonging
  to your own business).
- **Deep teal promoted to primary + balanced dialog forms** — `$primary` is
  now the header/footer deep teal `#0c2b23` (all buttons, links, spinners
  and the queue hero match the app chrome); the wordmark teal `#2c8670`
  moved to `$secondary`, lime stays `$accent`. Dialog forms (create session,
  add player) now use a `.form-stack` class — uniform 14px vertical rhythm,
  `hide-bottom-space` on validated fields, `q-col-gutter` for the time row —
  replacing the uneven `q-gutter-sm` spacing; courts stepper buttons are
  primary-outlined.
- **Brand-colored header + bottom nav** — the player header and bottom tab
  bar both use the deep brand teal `#0c2b23` (matching the TV board and the
  `theme-color` meta), with the full-color wordmark in the header and lime
  `#c7f000` for the active tab. Dev CORS: the backend's
  `CORS_ALLOWED_ORIGINS` now includes `http://localhost:9100` (this app's
  dev port).
- **Branding: logo, icon, splash, palette** — wired `src/assets/logo.png`
  (wordmark) and `src/assets/picklecourt-icon.png` into the app: white player
  header with the wordmark, organizer header + login page with the icon,
  favicons generated at 16/32/96/128 into `public/icons/` (sips, from the
  icon PNG). Theme now uses the colors sampled from the logo — teal `#2c8670`
  as `$primary`, lime `#c7f000` as `$accent`, deep teal `#0c2b23` as `$dark`
  (`src/css/quasar.variables.scss`); the TV board (`/display/:code`) was
  re-skinned to the dark-teal + lime palette and shows the wordmark. New
  splash flow: a static pre-JS loader in `index.html` (icon + spinner, visible
  from first paint) hands off seamlessly to `src/components/AppSplash.vue`
  (icon + wordmark, min 900ms / max 2500ms, waits for the auth fetch in
  between), removed by `App.vue` on mount.
- **Toolchain pinned to the booking app's matrix** — `quasar@2.18.6`, npm
  `overrides` for `vite@7.3.1`, `sass`/`sass-embedded@1.97.3`,
  `esbuild@0.27.3`. Fresh resolutions pulled vite 8 / sass-embedded 1.103
  (native binaries need macOS 14+; this dev machine is on 13) and esbuild
  0.27.7 (breaks the es2022/safari14 transpile of Quasar chunks).
- **Initial app: open play queuing MVP** — Quasar 2 / Vue 3 / Pinia scaffold
  mirroring the booking frontend's conventions (`src/utils/quasarEnv.js` env
  layer, axios boot with tenant headers, lazy `src/utils/echoClient.js`
  Reverb client, setup-style stores; dev server on port 9100). Player app
  with bottom nav (Home · Play · Stats · Me): session browse/join, QR
  join-code landing (`/join/:code`), check-in, live queue position hero with
  estimated wait range, full-screen "YOU'RE UP" takeover driven by the
  personal `.play.called` broadcast (vibration included), I'M READY acks,
  timed breaks ("break time doesn't count as waiting"), check-out, session
  stats and leaderboard. Organizer console: create-session wizard (smart or
  FIFO format, court count), live court board with the staged
  Up Next → Call → Start → Score flow, engine suggestions with
  "Why this match?" explanations and match-balance percentage, fill-all-open-
  courts, court maintenance/close, queue actions (break / no-show / injured /
  check-out / reinstate / skip cooldown), walk-in & guest registration, and
  result corrections. Public chrome-free TV board (`/display/:code`) with
  courts, queue and a scannable session QR. All state comes from
  `GET /api/play/sessions/{id}/state`; `.play.updated` broadcasts on
  `play-session.{id}` / `play-display.{code}` trigger debounced refetches.
