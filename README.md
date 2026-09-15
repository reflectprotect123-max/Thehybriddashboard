# Hybrid Dashboard

Self-coached hybrid athlete app — WHOOP recovery, TrainingPeaks endurance, TrainHeroic strength in one Today-first shell.

**GitHub:** [reflectprotect123-max/Thehybriddashboard](https://github.com/reflectprotect123-max/Thehybriddashboard)

**Android package:** `com.hybrid.coach` (Capacitor + Capgo OTA channel `live`)

## Mobile tabs

| Tab | What it shows |
| --- | --- |
| **Today** | Recovery snapshot + today’s endurance and strength cards |
| **Train** | TrainingPeaks + TrainHeroic detail for today |
| **Body** | WHOOP recovery metrics (deterministic — no LLM) |
| **Plan** | Your programming library (programs, sessions, exercises) |
| **More** | Connections, nutrition, activity log |

## Install the APK (native shell)

1. Open **GitHub → Releases → `coach-apk-latest`**
2. Download **`the-hybrid-coach-dogfood-debug.apk`**
3. Install on Android (allow unknown sources if prompted)

The APK is built by GitHub Actions (`Coach dogfood APK` workflow) on every push to `main` that touches Capacitor or `coach.html`.

## OTA updates (Capgo)

After the APK is installed, **HTML/JS updates ship over the air** — no reinstall.

| Piece | Detail |
| --- | --- |
| Plugin | `@capgo/capacitor-updater` |
| Channel | `live` (pinned in `coach-native-bridge.js`) |
| CI | `.github/workflows/capgo-ota.yml` on push to `main` |
| Secret | `CAPGO_TOKEN` in repo Settings → Secrets → Actions |
| Manual | `CAPGO_BUNDLE_VERSION=1.0.0 CAPGO_TOKEN=... npm run ship:capgo` |

Create the Capgo app with id **`com.hybrid.coach`** in the [Capgo dashboard](https://web.capgo.app/) before the first OTA upload.

## Health proxy (`health-proxy/`)

```bash
npm run proxy
# → http://localhost:8788/health/today
```

In the app: **More → Connections** → set proxy base URL.

### MCP sources (locked)

| Data | MCP / repo |
| --- | --- |
| WHOOP body | [thebriangao/totem](https://github.com/thebriangao/totem) |
| Endurance | [JamsusMaximus/trainingpeaks-mcp](https://github.com/JamsusMaximus/trainingpeaks-mcp) |
| Strength | [alandotcom/trainheroic-unofficial](https://github.com/alandotcom/trainheroic-unofficial) |

## Local dev

```bash
npm install
npm test
python3 -m http.server 8777
# → http://localhost:8777/coach.html → Demo coach (offline)
```

## Capacitor sync (before local APK build)

```bash
npm run sync:apk
cd capacitor && npm install && npx cap sync android
bash capacitor/scripts/build-dogfood-apk.sh   # needs ANDROID_HOME
```

## Push from Brain monorepo

Brain snapshot lives at `apps/coach-side/` in the Adaptive Brain repo. Overlay to this repo:

```bash
COACH_SIDE_REPO=Thehybriddashboard ./scripts/push-coach-side-repo.sh
```
