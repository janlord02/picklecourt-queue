# Deploying PickleCourt Queue (CloudPanel / DigitalOcean)

The queue app is a **static Quasar SPA** served by nginx; all data comes
from the same Laravel backend the booking app already runs on this
server. Deployment = build the bundle, copy it into a CloudPanel site's
docroot. Steps 1–5 are **one-time**; after that every deploy is a single
command (step 6).

```
openplay.picklecourt.ph  →  CloudPanel static site (this app's dist/spa)
                        ↘  /api  +  Reverb websocket → existing backend
```

---

## 1. DNS (one-time)

Add an **A record** for `openplay.picklecourt.ph` pointing at the
droplet's IP (same IP as the booking app). Wait for it to resolve:
`dig +short openplay.picklecourt.ph`.

## 2. CloudPanel site (one-time)

In CloudPanel → **Sites → Add Site → Create a Static HTML Site**:

- Domain: `openplay.picklecourt.ph`
- Site user: `openplay` (if you pick another name, update `SITE_USER`
  in `/root/deploy-queue.sh`)

Then **SSL/TLS → New Let's Encrypt Certificate** for the domain.

**SPA fallback (required — the app uses history-mode URLs):**
CloudPanel → the site → **Vhost**, and inside the main
`location / { ... }` block make sure it reads:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

Save (CloudPanel reloads nginx). Without this, refreshing
`/organizer/sessions/9` or opening `/display/CODE` directly 404s.

## 3. Backend updates (one-time)

SSH in and, in the **backend** project directory (as its site user):

```bash
# 1) pull the branch with the App\OpenPlay module
git pull   # feature/general-changes merged, or the branch you deploy

composer install --no-dev --optimize-autoloader

# 2) .env additions
#    QUEUE_APP_URL=https://openplay.picklecourt.ph
#    and APPEND the new origin to CORS_ALLOWED_ORIGINS:
#    CORS_ALLOWED_ORIGINS=...,https://openplay.picklecourt.ph

# 3) new play_* tables
php artisan migrate --force

# 4) rebuild caches
php artisan config:cache && php artisan route:cache
```

**Reverb**: the queue app uses the same Reverb server as the booking
app — no changes needed, just confirm it's running
(`systemctl status` your reverb service / supervisor entry). Note the
production `REVERB_APP_KEY` + the host/port/scheme the *booking
frontend* uses to connect — the queue build needs the same values.

## 4. GitHub access from the server (one-time)

The deploy script pulls `git@github.com:janlord02/picklecourt-queue.git`
as root. If root has no key with repo access yet:

```bash
ssh-keygen -t ed25519 -C "deploy@picklecourt" -f /root/.ssh/id_ed25519 -N ""
cat /root/.ssh/id_ed25519.pub
```

Add that public key on GitHub → the repo → **Settings → Deploy keys**
(read-only). Test: `ssh -T git@github.com`.

Node 18+ is also required for the build:

```bash
node -v || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs)
```

## 5. Install the deploy script (one-time)

```bash
git clone git@github.com:janlord02/picklecourt-queue.git /root/apps/picklecourt-queue
cp /root/apps/picklecourt-queue/deploy/deploy-queue.sh /root/deploy-queue.sh
chmod +x /root/deploy-queue.sh
```

Open `/root/deploy-queue.sh` and check the CONFIG block (site user,
domain, docroot) matches what you created in step 2.

Now run it once:

```bash
bash /root/deploy-queue.sh
```

The **first run stops on purpose**: it writes
`/root/apps/picklecourt-queue/.env` with `CHANGE_ME` placeholders. Fill
in the production values —

```bash
VITE_API_URL=https://<your-api-domain>/api     # same base the booking frontend uses
VITE_REVERB_APP_KEY=<production reverb key>    # backend .env REVERB_APP_KEY
VITE_REVERB_HOST=<as in booking frontend prod>
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

— then run it again. It builds and publishes.

## 6. Every deploy after that

```bash
bash /root/deploy-queue.sh
```

That's the whole process: pull `main` → `npm ci` → `quasar build` →
rsync into the docroot. The build `.env` is kept between runs.

## 7. Verify

- `https://openplay.picklecourt.ph` loads, login works (same accounts as
  booking).
- Refresh a deep URL like `/organizer` — no 404 (SPA fallback OK).
- Open a session; DevTools shows a websocket to your Reverb host
  connecting (otherwise the app silently falls back to 20s polling).
- Booking admin → Open Play → **Queue app** → "Open queue console
  (signed in)" lands authenticated on the new domain
  (`QUEUE_APP_URL` + CORS both correct).

## Rollback

```bash
cd /root/apps/picklecourt-queue
git log --oneline -5                 # pick the good commit
git reset --hard <commit>
npm ci && npx quasar build
rsync -a --delete dist/spa/ /home/openplay/htdocs/openplay.picklecourt.ph/
chown -R openplay:openplay /home/openplay/htdocs/openplay.picklecourt.ph
```

(Next `deploy-queue.sh` run returns to `origin/main`.)

## Changing the domain later

It's one variable: update `QUEUE_APP_URL` in the backend `.env`
(+ `config:cache`), the `CORS_ALLOWED_ORIGINS` entry, the CloudPanel
site domain + certificate, and `SITE_DOMAIN`/`DOCROOT` in the script.
