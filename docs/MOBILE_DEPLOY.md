# Mobile deployment (Android + iOS)

The queue app ships to phones via **Capacitor**: the same Quasar build
you deploy to the web gets wrapped in a native shell. Everything lives in
`src-capacitor/` (app id `ph.picklecourt.queue`, display name
"PickleCourt Queue"; the `android/` and `ios/` native projects and all
generated icons/splash screens are committed).

This guide assumes zero prior mobile-deployment experience. Read the
"One-time" sections once; after that, releasing an update is the short
loop at the end.

---

## 0. How the pieces fit

```
quasar build -m capacitor -T android|ios
   └─ builds the web app → src-capacitor/www
      └─ Capacitor copies it into the native project (android/ or ios/)
         └─ Android Studio / Xcode packages + signs it
            └─ you upload to Play Console / App Store Connect
```

The app talks to your **production** backend — the build reads `.env`,
so before any store build make sure it contains the production values:

```bash
VITE_API_URL=https://<your-api-domain>/api
VITE_REVERB_APP_KEY=<production reverb key>
VITE_REVERB_HOST=<production reverb host>
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
# Mobile builds have no tenant domain — tell the backend who we are:
VITE_MOBILE_TENANT_DOMAIN=openplay.picklecourt.ph
```

> ⚠️ Never ship a build pointing at localhost — the phone's "localhost"
> is the phone itself.

---

## 1. Accounts you need (one-time, both cost money)

| Store | Account | Cost | Sign-up |
|---|---|---|---|
| Google Play | Play Console developer account | $25 once | https://play.google.com/console/signup |
| Apple App Store | Apple Developer Program | $99/year | https://developer.apple.com/programs/enroll/ |

Google approval is usually hours; Apple can take a day or two (have
DTI/business documents ready if enrolling as an organization — enrolling
as an individual is fine too and faster).

---

## 2. ANDROID

### 2a. One-time machine setup

- Install **Android Studio** (this dev Mac already has it + the SDK).
- Gradle needs Java 17. Android Studio bundles it; for command-line
  builds export it first:

  ```bash
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  ```

### 2b. One-time: create your signing key (KEEP THIS FOREVER)

Android apps are signed with a keystore **you** create. Losing it — or
its passwords — means you can never update the app again under the same
listing, so treat it like the deed to a house.

```bash
keytool -genkey -v -keystore ~/keystores/picklecourt-queue.keystore \
  -alias picklecourt-queue -keyalg RSA -keysize 2048 -validity 10000
```

It asks for a password and your name/org — remember the password.
**Back the file + password up somewhere safe (password manager +
offline copy). Do NOT commit it to git.**

Then tell Gradle about it. Create
`src-capacitor/android/keystore.properties` (this path is gitignored):

```properties
storeFile=/Users/YOU/keystores/picklecourt-queue.keystore
storePassword=YOUR_PASSWORD
keyAlias=picklecourt-queue
keyPassword=YOUR_PASSWORD
```

And wire it into `src-capacitor/android/app/build.gradle` — inside the
`android { ... }` block add:

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

and in `buildTypes { release { ... } }` add:
`signingConfig signingConfigs.release`.

### 2c. Build the store bundle (.aab)

```bash
cd pickleball-booking-queuing
npx quasar build -m capacitor -T android        # builds web + syncs native
cd src-capacitor/android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew bundleRelease
```

Output: `app/build/outputs/bundle/release/app-release.aab` — that's the
file the Play Store wants. (For quick device testing use
`./gradlew assembleDebug` and install
`app/build/outputs/apk/debug/app-debug.apk` on any Android phone with
"install unknown apps" allowed, or run from Android Studio with your
phone plugged in.)

### 2d. One-time: create the Play Store listing

1. https://play.google.com/console → **Create app** — name
   "PickleCourt Queue", type App, Free.
2. Fill the **Dashboard checklist** (Google walks you through it):
   - Privacy policy URL (host one at e.g.
     `https://picklecourt.ph/privacy` — required).
   - App content: data-safety form (you collect: email, name — for
     accounts; say data is encrypted in transit, users can request
     deletion), content rating questionnaire (Utility), target audience
     (18+ is simplest), ads: none.
   - Store listing: short + full description, screenshots (phone
     screenshots of Home/Play/board — grab from a real phone or
     emulator), 512×512 icon (`src-capacitor/assets/icon.png` scaled),
     1024×500 feature graphic.
3. **Release → Testing → Internal testing** first: upload the `.aab`,
   add your own email as a tester, install via the opt-in link, make
   sure login/queue/websockets work on real mobile data (not just wifi).
4. Then **Release → Production → Create release** → upload the same
   `.aab` → submit for review. First review typically takes a few days;
   updates are usually hours. Note: brand-new personal accounts may be
   required to run a closed test with ~12 testers for 14 days before
   production — Google shows this in the dashboard if it applies.

### 2e. Every Android update

```bash
# 1) bump versionCode (+1, always) and versionName in
#    src-capacitor/android/app/build.gradle
npx quasar build -m capacitor -T android
cd src-capacitor/android && ./gradlew bundleRelease
# 2) Play Console → Production → Create release → upload new .aab
```

---

## 3. iOS

> ⚠️ **Xcode version gate**: Apple requires store submissions to be
> built with a recent SDK (iOS 18 SDK / Xcode 16+ as of 2025). This dev
> Mac runs macOS 13 with Xcode 15.2 — fine for building to your OWN
> devices and the simulator, but **App Store upload will need macOS
> 14+ / current Xcode** (upgrade this Mac or use another).

### 3a. One-time: certificates & identifiers (Xcode does the hard part)

1. Xcode → Settings → **Accounts** → add your Apple ID (the one enrolled
   in the Developer Program).
2. Open the project:
   ```bash
   npx quasar build -m capacitor -T ios --ide   # or: open src-capacitor/ios/App/App.xcworkspace
   ```
   Always open the **`.xcworkspace`**, never the `.xcodeproj`.
3. Select the **App** target → **Signing & Capabilities** →
   ✔ *Automatically manage signing* → pick your **Team**. Xcode creates
   the certificate and provisioning profile for
   `ph.picklecourt.queue` automatically. That's all the signing setup.

### 3b. Test on your own iPhone (free part)

Plug in the iPhone, select it as the run target in Xcode, press ▶.
First run: on the phone, Settings → General → VPN & Device Management →
trust your developer certificate. Verify login, queue, and the
websocket work.

### 3c. One-time: App Store Connect listing

1. https://appstoreconnect.apple.com → **My Apps → ＋ → New App** —
   platform iOS, name "PickleCourt Queue", bundle ID
   `ph.picklecourt.queue` (appears after step 3a), SKU
   `picklecourt-queue`.
2. Fill the listing: description, keywords, support URL, **privacy
   policy URL**, App Privacy questionnaire (same answers as Google's
   data-safety form), screenshots for 6.7" and 6.5" iPhones (take them
   in the Simulator: `xcrun simctl io booted screenshot shot.png`).

### 3d. Upload a build

1. In Xcode: select target **Any iOS Device (arm64)** →
   **Product → Archive**.
2. When the Organizer window opens: **Distribute App →
   App Store Connect → Upload** (accept the defaults).
3. In App Store Connect the build appears under **TestFlight** after
   ~15 min of processing. Test it via the TestFlight app on your phone
   first (add yourself as an internal tester — no review needed).
4. Then in the app's **App Store** tab: select that build, answer the
   export-compliance question (uses standard HTTPS encryption only →
   exempt), and **Submit for Review**. First iOS review typically takes
   1–3 days; common first-app rejections are a missing privacy policy,
   a demo account not provided (give Apple a test login in the review
   notes!), or broken links.

### 3e. Every iOS update

```bash
# 1) bump version + build number: Xcode → App target → General
npx quasar build -m capacitor -T ios
# 2) Xcode: Product → Archive → Distribute → Upload
# 3) App Store Connect: pick the new build → Submit for Review
```

---

## 4. Gotchas worth knowing in advance

- **Version numbers only ever go up.** Android's `versionCode` and
  iOS's build number must increase on every store upload.
- **The web deploy and the app are independent.** Shipping the web app
  (deploy-queue.sh) does NOT update phones — store apps carry their own
  bundled copy, so mobile releases must go through the stores.
- **CORS**: mobile apps call the API from a `capacitor://` /
  `http://localhost` origin. Capacitor sends no Origin header for
  native requests in most cases, but if you see CORS errors in a device
  build, add `capacitor://localhost` and `http://localhost` to the
  backend's `CORS_ALLOWED_ORIGINS`.
- **Deep links** (`https://openplay.picklecourt.ph/join/CODE` opening
  the app) are NOT set up — QR scans open the web app in the browser,
  which is fine. App Links/Universal Links can be added later.
- **Voice announcements & TV board** are organizer/venue features that
  assume a browser — the phone apps are aimed at players; organizers
  can keep using the web console.
- **Replacing the icon**: put a new 1024×1024 `icon.png` (and
  2732×2732 `splash.png`) in `src-capacitor/assets/`, then re-run
  `npx @quasar/icongenie generate -m capacitor -i src-capacitor/assets/icon.png -b src-capacitor/assets/splash.png`.
- **CocoaPods locale error** (`Unicode Normalization not appropriate`):
  run `export LANG=en_US.UTF-8` first — already hit and fixed once on
  this machine.
