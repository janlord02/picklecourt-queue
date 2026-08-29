# PickleCourt Play (pickleball-booking-queuing)

Open play queuing app: live queues, smart matchmaking, court management, and
TV boards for pickleball open play. Quasar 2 / Vue 3 / Pinia SPA that talks
to the shared Laravel backend (`pickleball-booking-backend`, `App\OpenPlay`
module, `/api/play/…`) over HTTP + Reverb WebSockets.

Full product/technical design: [docs/OPEN_PLAY_QUEUING_APP.md](../docs/OPEN_PLAY_QUEUING_APP.md)

## What's inside

- **Player app** — bottom nav Home · Play · Stats · Me. Live queue position
  with ETA range, "YOU'RE UP" full-screen takeover (socket + vibration),
  breaks, check-in/out, session stats and leaderboard.
- **Organizer console** — session wizard, live court board (stage → call →
  start → score, with match-quality explanations), queue management
  (breaks, no-shows, injuries, reinstates), walk-in/guest registration,
  result corrections.
- **Public surfaces** — `/join/:code` QR landing and `/display/:code`
  chrome-free TV board with the session QR.

The server owns all queue state; this app renders
`GET /api/play/sessions/{id}/state` and refetches when a `.play.updated`
broadcast bumps the state version.

## Development

```bash
npm install
cp .env.example .env   # set VITE_API_URL + VITE_REVERB_* (matches backend .env)
npm run dev            # http://localhost:9100 (booking app stays on 9000)
```

Backend prerequisites: `php artisan serve`, `php artisan reverb:start`, and
the `play_*` migration (`php artisan migrate`).

Login uses the shared PickleCourt account (`POST /api/login`, Sanctum bearer
token stored under the same `auth_token` localStorage key as the booking
frontend).

## Scripts

- `npm run dev` / `npm run build`
- `npm run lint` / `npm run format`

## Toolchain pins (macOS 13)

`package.json` pins `quasar@2.18.6` and overrides `vite@7.3.1`,
`sass`/`sass-embedded@1.97.3`, `esbuild@0.27.3` — the same resolved matrix as
the booking frontend. Newer sass-embedded (≥1.103) and vite 8 ship native
binaries that require macOS 14+, and esbuild 0.27.7 breaks Quasar transpile
targets; loosen these only after upgrading the dev machine.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
