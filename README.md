# Beam Beam

**Send big files straight to anyone.** No upload, no sign-up, no size limit. End-to-end encrypted, with links that expire on a timer you choose.
Designed and built by **H24 Creationz** · made with ❤ by Harsha Varthan E P.

- 🌐 Website + web app: `https://harshavarthanep.github.io/BeamBeam/`
- 📲 Installable app (PWA) on every device, plus Windows, Mac, Linux and Android apps
- ⬇️ App downloads: the **Apps** section of the website (`download.html` redirects there)

---

## What's in this repository

| Path | What it is |
|---|---|
| `index.html` | The product page **and** the app. People can send and receive right from the hero card. Opening `?app` (or the installed app) shows only the app. |
| `lib/` | The three libraries the app needs (MQTT, QR code maker, QR scanner), stored here so no CDN can break the app. |
| `fonts/` | Bricolage Grotesque and Figtree, self-hosted. |
| `media/` | Screenshots, the three demo videos and their posters, the social share image. |
| `manifest.webmanifest`, `sw.js`, `beambeam-*.png`, `favicon.svg` | Install as an app, offline start, Android share-sheet target, icons. |
| `download.html` | Old-style download link — redirects to the Apps section. |
| `native/desktop/` | Windows / Mac / Linux app (Electron). |
| `native/mobile/` | Android app (Capacitor). iPhone uses the web app. |
| `native/shared/` | The build step that turns `index.html` into the apps. |
| `.github/workflows/build-apps.yml` | One button that builds every app and publishes them. |

---

## First-time setup (about 10 minutes, once)

1. **Create the repository** on GitHub named `BeamBeam` (Public).
2. **Upload everything** in this folder: *Add file → Upload files*, drag in all files **and folders** (including the hidden `.github` folder — see the tip below), then *Commit changes*.
3. **Turn on the website:** *Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save.*
   A minute later it is live at `https://harshavarthanep.github.io/BeamBeam/`.
4. **Android signing key (optional but recommended):** *Settings → Secrets and variables → Actions*, and add
   `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
   You can reuse the same four values you use for ZenPDF Pro — one keystore can sign many apps.
5. **Build the apps:** *Actions → "Build Beam Beam apps" → Run workflow →* version `1.0.0` *→ Run workflow.*
   After about 15–20 minutes a **Release** appears and every download button on the website starts working.
   (Until then those buttons show "Coming soon" — the web app works from day one.)

> **Tip — the `.github` folder:** Mac and Windows hide folders that start with a dot. If it didn't upload,
> create it on GitHub: *Add file → Create new file*, type `.github/workflows/build-apps.yml`, paste the file's contents, commit.

## Releasing an update

1. Replace `index.html` (and anything else you changed) and commit — the website updates in about a minute.
2. *Actions → Build Beam Beam apps → Run workflow* with a **higher** version, e.g. `1.0.1`.
   Installed apps show "Beam Beam 1.0.1 is ready" the next time they open.
3. If you changed `sw.js`'s file list, bump `CACHE` at the top of `sw.js` (e.g. `beambeam-v2`).

---

## How a transfer works

1. The sender adds files and gets a link like `…/BeamBeam/#get=K7Q29MXA2PAT&t=…`.
   The part after `#` never reaches any server. It holds the secret 12-character code (shown on screen for typing).
2. Both devices derive an **AES-256 key** and a private room from that code, then meet on several public MQTT relays at once
   (whichever answers first wins). Every message is encrypted, so the relays only ever see scrambled bytes.
3. They open a **direct WebRTC connection** (DTLS-encrypted) — fast, and nothing passes through anyone else.
4. If a firewall blocks direct connections, Beam Beam **switches to the encrypted relay** automatically
   (one relay runs on port 443, the normal HTTPS port, for strict office networks).
5. The receiver writes straight to disk as data arrives, tells the sender what has been **saved** (the sender never runs
   more than 32 MB ahead), and **resumes from the last saved byte** after any drop.
6. The link **expires** at the time the sender chose. New visitors see "expired"; downloads already running may finish.

**Important for users:** the sender's page must stay open until the receiver finishes — that is what makes it free,
private and unlimited. The app keeps the screen awake and warns before closing.

## Settings you can change (top of the app script in `index.html`, inside `CFG`)

| Setting | Default | What it does |
|---|---|---|
| `brokers` | EMQX, HiveMQ, Eclipse (443) | Public relays used to connect, and to carry data if a direct link is blocked. |
| `turn` | empty | **Recommended for corporate networks.** Add a TURN server for a faster relay. Free options: Metered.ca (free tier) or Cloudflare TURN. Example: `turn: [{ urls: ['turns:YOUR-HOST:443?transport=tcp'], username: 'USER', credential: 'PASS' }]` |
| `p2pTimeout` | 12000 | Milliseconds to try a direct link before relaying. |
| `maxPeers` | 8 | How many people can download from one link at the same time. |
| `maxFiles` | 1000 | Files per transfer. |

Expiry choices (10 min / 1 hour / 6 hours / 24 hours) are the chips in the card — edit their `data-m` (minutes) to change them.

---

## Notes for each platform

- **Windows:** first run shows *"Windows protected your PC"* → *More info → Run anyway* (normal for apps without a paid
  code-signing certificate). Received files go to *Downloads › Beam Beam*.
- **Mac:** first open → *System Settings → Privacy & Security → Open Anyway*. Removing that needs an Apple Developer account (US$99/year).
- **Linux:** `.deb` for Ubuntu/Debian/Mint, `.AppImage` for everything else.
- **Android:** received files go to *Documents › Beam Beam*, with a Share button. Camera permission is used only to scan QR codes.
  The website (PWA) version also appears in Android's **Share** menu, so people can share files from Gallery straight into Beam Beam.
- **iPhone/iPad:** Safari → Share → *Add to Home Screen*. An App Store version needs an Apple Developer account and a Mac;
  `native/mobile` already contains the Capacitor setup (`npx cap add ios`, then open in Xcode).

## What was tested

Real transfers between separate Chromium browsers through a local relay, every received file checked byte-for-byte (SHA-256):
direct transfer · forced relay · connection cut at 35% then resumed · wrong then right password · two people downloading at once ·
typing the code on a phone · stop sharing · expired link · Android save path (Documents › Beam Beam) with a simulated filesystem.

## Building on your own computer (optional)

```bash
cd native/desktop && npm install
npm start                    # run the desktop app
npm run build:win            # or build:mac / build:linux → native/desktop/dist/
```

---

Beam Beam · © H24 Creationz
