# APK + Capgo OTA setup (Thehybriddashboard)

## 1. Push this tree to GitHub

Do not paste GitHub tokens into chat, commits, or shell history.

**Cloud Agents:** add `GH_SIBLING_PUSH_TOKEN` on the Cursor environment Secrets tab. New agents receive it as an environment variable. Then:

```bash
bash scripts/setup-git-github-credentials.sh
```

That installs a git credential helper which reads the env var for `https://github.com` only.

**Laptop / Brain monorepo:** store the same token in your OS keychain (`gh auth login`) or export `GH_SIBLING_PUSH_TOKEN` in a local secret manager — never in the repo.

```bash
./scripts/push-coach-side-repo.sh
```

Target: **https://github.com/reflectprotect123-max/Thehybriddashboard** (`main`).

## 2. GitHub Actions secrets

In **Thehybriddashboard → Settings → Secrets and variables → Actions**:

| Secret | Purpose |
| --- | --- |
| `CAPGO_TOKEN` | Capgo API key for OTA uploads |

Without `CAPGO_TOKEN`, the **Capgo OTA** workflow skips upload (APK workflow still runs). GitHub Actions reads this from the repo secret store, not from Cursor chat.

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
CAPGO_BUNDLE_VERSION=1.0.0 npm run ship:capgo   # CAPGO_TOKEN from env or .capgo (gitignored)
```

Open the installed APK → it pulls channel `live` on next launch.

## 6. Local APK build

```bash
npm run sync:apk
bash capacitor/scripts/build-dogfood-apk.sh   # ANDROID_HOME required
```
