#!/usr/bin/env bash
#
# PickleCourt Queue — one-command deploy (CloudPanel / DigitalOcean).
#
#   bash /root/deploy-queue.sh
#
# First run: clones the repo, creates a production .env template and stops
# so you can fill it in. Every run after that: pull → build → publish.
# One-time server prerequisites (CloudPanel site, backend env, migrations)
# are in docs/DEPLOY.md.

set -euo pipefail

### ——— CONFIG (edit once to match your server) ———————————————————————
REPO="git@github.com:janlord02/picklecourt-queue.git"
BRANCH="main"
APP_DIR="/root/apps/picklecourt-queue"                  # build workspace
SITE_USER="openplay"                                    # CloudPanel site user
SITE_DOMAIN="openplay.picklecourt.ph"
DOCROOT="/home/${SITE_USER}/htdocs/${SITE_DOMAIN}"      # CloudPanel docroot
### ————————————————————————————————————————————————————————————————————

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

command -v git >/dev/null || die "git is not installed"
command -v rsync >/dev/null || die "rsync is not installed"

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  die "Node 18+ is required. Install with:
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs"
fi

# ——— clone or update ————————————————————————————————————————————————
if [ ! -d "${APP_DIR}/.git" ]; then
  say "Cloning ${REPO} (${BRANCH})"
  mkdir -p "$(dirname "${APP_DIR}")"
  git clone --branch "${BRANCH}" "${REPO}" "${APP_DIR}"
else
  say "Pulling latest ${BRANCH}"
  git -C "${APP_DIR}" fetch origin "${BRANCH}"
  git -C "${APP_DIR}" reset --hard "origin/${BRANCH}"
fi

cd "${APP_DIR}"

# ——— first-run production env ———————————————————————————————————————
if [ ! -f .env ]; then
  say "No .env yet — writing a production template"
  cat > .env <<'ENV'
# ——— PickleCourt Queue: PRODUCTION build values ———
# Absolute URL of the shared Laravel backend's API:
VITE_API_URL=https://CHANGE-ME-api-domain/api

# Laravel Reverb — MUST match the backend's REVERB_APP_KEY and the values
# your booking frontend uses in production (same Reverb server):
VITE_REVERB_APP_KEY=CHANGE_ME
VITE_REVERB_HOST=CHANGE-ME-reverb-host
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
ENV
  die "Created ${APP_DIR}/.env — edit the CHANGE_ME values, then run this script again."
fi

grep -q 'CHANGE' .env && die "${APP_DIR}/.env still has CHANGE_ME placeholders — edit it first."

# ——— build ———————————————————————————————————————————————————————————
say "Installing dependencies"
npm ci --no-audit --no-fund

say "Building production bundle"
npx quasar build

[ -f dist/spa/index.html ] || die "Build produced no dist/spa/index.html"

# ——— publish —————————————————————————————————————————————————————————
[ -d "${DOCROOT}" ] || die "Docroot ${DOCROOT} not found.
Create the CloudPanel Static Site for ${SITE_DOMAIN} first (docs/DEPLOY.md, step 2)."

say "Publishing to ${DOCROOT}"
rsync -a --delete dist/spa/ "${DOCROOT}/"
chown -R "${SITE_USER}:${SITE_USER}" "${DOCROOT}"

say "Deployed $(git rev-parse --short HEAD) → https://${SITE_DOMAIN}"
