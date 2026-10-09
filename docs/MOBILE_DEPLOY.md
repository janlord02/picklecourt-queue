# Publishing PickleCourt Queue to the App Store and Google Play

A step-by-step guide for a first-time publisher. You don't need to know
Swift, Kotlin or anything "native": the app is the same Quasar code as
openplay.picklecourt.ph, wrapped by **Capacitor** into real iOS and Android
apps. Everything native lives in `src-capacitor/`.

| | |
|---|---|
| App name | **PickleCourt Queue** |
| App ID (bundle id / package) | `ph.picklecourt.queue` — never change this after the first upload |
| Price | **Free** — no in-app purchases, no ads, free forever for everyone |
| Category | Sports |
| Sign-up | Email + password inside the app (plus "Join as guest" with no account) |
| Account deletion | Profile → **Delete account** (required by both stores — already built) |

---

## 1. What it costs

| Item | Cost | How often | Needed for |
|---|---|---|---|
| Google Play developer account | **US$25** (≈ ₱1,450) | once, forever | Android |
| Apple Developer Program | **US$99** (≈ ₱5,750) | every year | iOS |
| A Mac that can run the **latest Xcode** | ₱0 if you upgrade your Mac; otherwise see below | — | iOS only |
| Store commission | **₱0** — the app is free, nothing is sold | — | — |
| Hosting / API | ₱0 extra — the app uses your existing servers | — | both |

**Total to launch on both stores: about US$124 (≈ ₱7,200) in year one, then
US$99 (≈ ₱5,750) per year** to keep the iPhone app listed. (Peso amounts
use ≈ ₱58 per US$ — your card may add a small foreign-transaction fee.)

**About the Mac (iOS only).** Apple only accepts uploads built with a
current Xcode, and current Xcode needs a recent macOS. This Mac runs
**macOS 13 (Ventura)**, which can't install it. Options:

1. **Upgrade macOS** (Apple menu → System Settings → General → Software
   Update) if your Mac supports a current version — free.
2. **Use a cloud Mac / build service** if it doesn't:
   - **Codemagic** (codemagic.io) — builds and uploads iOS apps for you;
     the free tier (≈ 500 build-minutes/month) is usually enough for an
     app like this. ₱0 to start.
   - Or rent a remote Mac (e.g. MacinCloud) for the day you upload —
     roughly US$1/hour or ~US$25–30/month.
3. Borrow a newer Mac for an afternoon — the upload itself takes ~1 hour.

Android can be built on this Mac as-is.

**Optional, not required:** a D-U-N-S number (free, takes 1–2 weeks) only
if you enroll Apple/Google as a **company** instead of as an individual.
Enrolling as an individual is faster; the store then shows your personal
name as the seller. You can switch to a company account later.

---

## 2. Before you start (one hour of prep)

Tick these off first — they're the usual reasons a first app gets stuck.

- [ ] **Production settings are filled in** — open
      `pickleball-booking-queuing/.env.production`:
  - `VITE_API_URL=https://api.picklecourt.ph` (already set)
  - `VITE_PUBLIC_APP_URL=https://openplay.picklecourt.ph` (already set — used
    for share links / QR codes inside the app)
  - **`VITE_REVERB_APP_KEY` is still blank** → live updates fall back to
    refreshing every 20 seconds. Copy `REVERB_APP_KEY` from the
    **production backend's** `.env` into it (and confirm `VITE_REVERB_HOST`)
    so courts and "you're up" update instantly.
- [ ] **Backend is deployed** with this release (it adds account deletion,
      guest sign-up and lets the app's `capacitor://localhost` /
      `https://localhost` origins call the API). Run
      `php artisan migrate`, and make sure the scheduler (`schedule:run`
      every minute in cron) is running.
- [ ] **Privacy policy URL** — both stores require one. You have
      `https://picklecourt.ph/privacy-policy`. Add a short paragraph about
      the queue app: name, email, optional mobile number and skill level,
      game results, guest sign-ups, and that users can delete their account
      in Profile → Delete account (or by emailing support@picklecourt.ph).
- [ ] **Support URL / email** — `support@picklecourt.ph` (or a contact page).
- [ ] **A demo account for Apple's reviewer** — create a normal player
      account (e.g. `appreview@picklecourt.ph` / a strong password) **and** a
      test session they can join (keep its join code handy). Reviewers reject
      apps they can't log into.
- [ ] **Screenshots** — see section 6.

---

## 3. Build the app files

Every store build starts the same way, from the `pickleball-booking-queuing` folder:

```bash
cd pickleball-booking-queuing
npm install                      # first time / after pulling
npx quasar build -m capacitor -T android   # for Google Play
npx quasar build -m capacitor -T ios       # for the App Store
```

This builds the web app with your production settings and copies it into
the native projects. Never build a store version while `.env.production`
points at `localhost` — on a phone, "localhost" is the phone itself.

---

## 4. ANDROID — Google Play

### 4a. Create your Google Play account (once)
1. Go to https://play.google.com/console/signup, sign in with the Google
   account you want to own the app, choose **Individual** (or
   Organization), pay **US$25**.
2. Verify your identity (ID photo) — usually approved within a day or two.

> ⚠️ **New personal accounts must run a "closed test" first:** at least
> **12 testers** opted in for **14 days in a row** before you can publish to
> everyone. Start this early — invite players from your clubs (they just
> need a Google account and to tap your test link).

### 4b. Create your signing key (once — KEEP IT FOREVER)
Android apps are signed with a key file you create. **If you lose it or its
password, you can never update the app again.** Store it in a password
manager and a second offline copy. Never commit it to git.

```bash
keytool -genkey -v -keystore ~/keystores/picklecourt-play.keystore \
  -alias picklecourt-play -keyalg RSA -keysize 2048 -validity 10000
```

Create `src-capacitor/android/keystore.properties` (already gitignored):

```properties
storeFile=/Users/YOU/keystores/picklecourt-play.keystore
storePassword=YOUR_PASSWORD
keyAlias=picklecourt-play
keyPassword=YOUR_PASSWORD
```

Then in `src-capacitor/android/app/build.gradle`, inside `android { … }`:

```gradle
def keystoreProps = new Properties()
def keystoreFile = rootProject.file("keystore.properties")
if (keystoreFile.exists()) keystoreProps.load(new FileInputStream(keystoreFile))

signingConfigs {
    release {
        if (keystoreFile.exists()) {
            storeFile file(keystoreProps['storeFile'])
            storePassword keystoreProps['storePassword']
            keyAlias keystoreProps['keyAlias']
            keyPassword keystoreProps['keyPassword']
        }
    }
}
```
and in `buildTypes { release { … } }` add `signingConfig signingConfigs.release`.

(When you upload the first time, accept **Play App Signing** — Google keeps
a backup of the final signing key; your key above becomes the "upload key".)

### 4c. Build the upload file (.aab)
```bash
npx quasar build -m capacitor -T android
cd src-capacitor/android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew bundleRelease
```
Your file: `src-capacitor/android/app/build/outputs/bundle/release/app-release.aab`.

To try it on your own phone first: `./gradlew assembleDebug` and install
`app/build/outputs/apk/debug/app-debug.apk`, or open the `android` folder in
Android Studio with the phone plugged in and press ▶.

### 4d. Create the listing (once)
In Play Console → **Create app**: name **PickleCourt Queue**, App, **Free**.
Then work through the **Dashboard** checklist:
- **Store listing** — text from section 7, screenshots, 512×512 icon
  (`src-capacitor/assets/icon.png` resized), 1024×500 feature graphic
  (a crop of `public/og-image.png` works).
- **Privacy policy** — your URL.
- **App access** — "All functionality is available without special access"
  is **not** true (login): choose "restricted" and give the demo login.
- **Ads** — No.
- **Content rating** — fill the questionnaire (category: Utility/Productivity;
  answers are all "No") → usually rated Everyone.
- **Target audience** — 18+ (simplest; avoids the children's-app rules).
- **Data safety** — see section 8.
- **Account deletion** — "Yes, users can delete their account in the app"
  + web link: your privacy policy section or support email.

### 4e. Test, then publish
1. **Testing → Closed testing** → create a track → upload the `.aab` → add
   testers (email list or Google Group) → share the opt-in link. Check login,
   joining with a code, guest join, and live updates on mobile data.
2. After the 14-day / 12-tester requirement (if it applies to you):
   **Production → Create release** → upload the same `.aab` → **Send for
   review**. First review: a few days. Updates: usually hours.

---

## 5. iOS — Apple App Store

### 5a. Join the Apple Developer Program (once)
https://developer.apple.com/programs/enroll/ → sign in with your Apple ID
(turn on two-factor authentication) → Individual (or Organization with a
D-U-N-S) → pay **US$99/year**. Approval: usually 1–2 days.

### 5b. Sign the app in Xcode (once — Xcode does the hard part)
On a Mac with the latest Xcode (see section 1):
1. Xcode → Settings → **Accounts** → add your Apple ID.
2. `npx quasar build -m capacitor -T ios --ide` (opens Xcode), or open
   `src-capacitor/ios/App/App.xcworkspace` — always the **.xcworkspace**.
3. Click **App** (left) → target **App** → **Signing & Capabilities** →
   ✔ *Automatically manage signing* → choose your **Team**. Done.

Try it on your iPhone: plug it in, pick it as the run target, press ▶.
(First time: on the phone, Settings → General → VPN & Device Management →
trust your developer profile.)

### 5c. Create the App Store record (once)
https://appstoreconnect.apple.com → **Apps → ＋ New App**: iOS, name
**PickleCourt Queue**, language English, bundle ID `ph.picklecourt.queue`,
SKU `picklecourt-play`. Then fill in:
- **App Information** — category Sports, privacy policy URL, age rating
  questionnaire (all "None" → 4+).
- **Pricing** — Free.
- **App Privacy** — see section 8.
- **Version page** — text from section 7, screenshots, support URL.

### 5d. Upload a build
1. In Xcode, run target **Any iOS Device (arm64)** → **Product → Archive**.
2. Organizer window → **Distribute App → App Store Connect → Upload**
   (defaults are fine). Encryption: already declared as "standard HTTPS
   only", so there's no compliance question.
3. After ~15 minutes the build shows in **TestFlight**. Install it with the
   TestFlight app and test on a real phone (no review needed for yourself
   and up to 100 internal testers).

### 5e. Submit for review
On the version page: pick the build, and in **App Review Information** add:
- the **demo account** email + password,
- **Notes**: *"Free open-play queue app for pickleball. To test: log in with
  the demo account, tap 'Have a code?', enter <JOIN CODE>, check in. Guests
  can also join without an account from the same screen. Account deletion:
  Profile → Delete account."*

Then **Add for Review → Submit**. First review: 1–3 days.

---

## 6. Screenshots

You need phone screenshots of the real app (not mockups):
- **iPhone 6.9"** (e.g. iPhone 16/17 Pro Max simulator): 1320×2868 —
  Apple scales these down for smaller iPhones.
- **Android**: at least 2 phone screenshots (1080×1920 or larger).

Good set (4–6): Welcome screen · Join with a code · "You're #3 in the queue"
· "You're up! Court 2" · Organizer courts view · Leaderboard.

How: run the app in the iOS Simulator (Xcode → Open Developer Tool →
Simulator) or Android emulator, sign in with the demo account, and press
⌘S (Simulator) / the camera button (emulator).

---

## 7. Store listing text (copy & paste)

**Name:** PickleCourt Queue
**Subtitle (iOS, 30 chars):** Open play queue for pickleball
**Short description (Android, 80 chars):** Fair queue, smart matchmaking and live courts for pickleball open play.

**Description:**
> Run pickleball open play without the chaos — free, forever, for everyone.
>
> PickleCourt Queue keeps a fair queue, builds balanced games with smart
> matchmaking, and shows live courts on every phone and the venue TV.
>
> FOR PLAYERS
> • Join a session by scanning its QR or entering the code
> • See your place in the queue and when you're up next
> • Get a "You're up on Court 2!" alert
> • Take a break or check out with one tap
> • Track your wins, losses and leaderboard rank
> • No account? Join as a guest — the organizer approves you
>
> FOR ORGANIZERS
> • Create a session in seconds and share the join QR
> • Smart, first-in-first-out or Winners & Losers formats
> • Call players, start games and enter scores from your phone
> • Approve guests, lock partners, handle breaks and no-shows
> • Live TV board, results export and a shareable recap
>
> 100% free. No ads. No subscriptions.

**Keywords (iOS, 100 chars):** pickleball,open play,queue,paddle,matchmaking,court,rotation,club,leaderboard,scoreboard

---

## 8. Privacy answers (Data safety / App Privacy)

What the app collects, all **linked to the user**, **not used for tracking**,
**not shared with third parties**, **not sold**:

| Data | Why | Required? |
|---|---|---|
| Name | Shown in the queue and on the board | Yes |
| Email | Sign-in, password reset | Yes (accounts) |
| Phone number | Lets organizers reach you | Optional |
| Game results / skill level | Queue, matchmaking, leaderboard | Yes |

- Data is **encrypted in transit** (HTTPS).
- Users can **delete their account** in the app (Profile → Delete account);
  personal data is erased.
- No location, contacts, photos, camera, microphone, health or payment data.
- No ads, no analytics SDKs, no tracking (answer **No** to "used to track").

---

## 9. Releasing an update later

1. Bump the version:
   - Android: `src-capacitor/android/app/build.gradle` → `versionCode` **+1**
     (always) and `versionName` (e.g. 1.0.1).
   - iOS: Xcode → App target → General → Version (1.0.1) and Build (**+1**).
2. Build (section 3), then Android: `./gradlew bundleRelease` → Play Console →
   Production → Create release → upload. iOS: Archive → Upload → pick the
   build on the version page → Submit.

The website and the apps are separate: deploying the web app updates
openplay.picklecourt.ph instantly, but phones only change when you publish a
store update. Backend changes reach both immediately.

---

## 10. Common rejections — already handled

| Reason | Status |
|---|---|
| No way to delete an account | ✅ Profile → Delete account |
| App can't be tested (login) | Give the demo account in review notes |
| Missing privacy policy | Add the URL (section 2) |
| Icon with transparency | ✅ Opaque 1024×1024 icon generated |
| Broken links / localhost | ✅ Share links & QR use openplay.picklecourt.ph |
| "Just a website in a wrapper" | ✅ Native status bar, haptics, Android back button, splash, keyboard handling, offline banner, alerts |
| Asks for permissions it doesn't need | ✅ None requested |

---

## 11. Handy notes

- **Replace the icon/splash:** put a new 1024×1024 `icon.png` (opaque) and
  2732×2732 `splash.png` in `src-capacitor/assets/`, then
  `cd src-capacitor && npx @capacitor/assets generate --iconBackgroundColor '#ffffff' --splashBackgroundColor '#0c2b23'`.
- **CocoaPods "Unicode Normalization" error:** run `export LANG=en_US.UTF-8` first.
- **Deep links** (tapping openplay.picklecourt.ph/join/CODE opens the app)
  aren't set up yet — links open in the browser, which works fine. They can
  be added later (needs two small files on the website).
- **Lost Android key?** With Play App Signing you can request an upload-key
  reset from Google support — another reason to accept it.
