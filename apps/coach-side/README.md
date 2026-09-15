# Adaptive Brain mount — coach-side overlay

This GitHub repo is the **@hybrid/coach-side** overlay (athlete `index.html` + coach `coach.html`).

In the Adaptive Brain monorepo this folder lived at `apps/coach-side/` with `supabase/migrations/` at the repo root. That layout is restored here:

- App files: repository root (same as this overlay) **and** this directory for Brain-relative smoke paths.
- Migrations: `../../supabase/migrations/`

Do not treat this as a recovered copy of the original Brain `packages/` git history. Strength/Engine math in `packages/` was reconstructed from remaining call sites plus the live Supabase catalog.
