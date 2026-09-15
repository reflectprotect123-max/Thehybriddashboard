# APK + Capgo OTA setup (Thehybriddashboard)

## 1. Push this tree to GitHub

From the Adaptive Brain monorepo (or any machine with `GH_SIBLING_PUSH_TOKEN`):

```bash
export GH_SIBLING_PUSH_TOKEN=ghp_...
./scripts/push-coach-side-repo.sh
```

Target: **https://github.com/reflectprotect123-max/Thehybriddashboard** (`main`).

## 2. GitHub Actions secrets

In **Thehybriddashboard → Settings → Secrets → Actions**:

| Secret | Purpose |
| --- | --- |
| `CAPGO_TOKEN` | Capgo API key for OTA uploads |

Without `CAPGO_TOKEN`, the **Capgo OTA** workflow skips upload (APK workflow still runs).

## 3. Capgo dashboard

1. Sign in at [web.capgo.app](https://web.capgo.app/)
2. Create app with id **`com.hybrid.coach`** (must match `capacitor.config.json`)
3. Create channel **`live`**
4. Copy API key → GitHub secret `CAPGO_TOKEN`

## 4. First APK (native shell)

After push to `main`, open **Actions → Coach dogfood APK**. When green:

**Releases → `coach-apk-latest` → `the-hybrid-coach-dogfood-debug.apk`**

Install on Android.

## 5. OTA (web bundle)

Every push to `main` that changes `coach.html` / JS triggers **Capgo OTA** (if `CAPGO_TOKEN` is set).

Manual ship:

```bash
cd apps/coach-side   # or repo root on Thehybriddashboard
CAPGO_BUNDLE_VERSION=1.0.0 CAPGO_TOKEN=... npm run ship:capgo
```

Open the installed APK → it pulls channel `live` on next launch.

## 6. Local APK build

```bash
npm run sync:apk
bash capacitor/scripts/build-dogfood-apk.sh   # ANDROID_HOME required
```
