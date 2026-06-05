# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**DJOLI** — school management SaaS. Two independent sub-projects in a monorepo:

| Path | What it is |
|---|---|
| `saas-hub/backend/` | Express + Sequelize REST API, deployed serverless on Vercel (PostgreSQL) |
| `saas-hub/frontend/` | React 19 + Vite landing page / admin portal |
| `school-management-system/` | Electron desktop app used by schools (React 18 + sql.js SQLite) |

---

## Commands

### saas-hub/backend
```bash
cd saas-hub/backend
npm run dev        # nodemon (ts-node)
npm start          # production (ts-node --transpile-only)
```

### saas-hub/frontend
```bash
cd saas-hub/frontend
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build
npm run lint       # eslint
```

### school-management-system (desktop)
```bash
cd school-management-system
npm run dev        # Vite dev server (renderer only, no Electron)
npm run electron   # run compiled Electron (needs a prior build)
npm run build      # tsc + vite build + electron-builder → dist-app/
npm test           # vitest run (single pass)
npm run test:watch # vitest watch
npm run test:coverage
```
Run a single test file: `npx vitest run src/test/components/Login.test.tsx --mode test`

---

## Architecture

### saas-hub/backend

Standard MVC layout under `src/`:
- `config/db.ts` — Sequelize connection (PostgreSQL); lazy-connects on each request for Vercel cold starts
- `models/` — Sequelize models: `UserModel` (one row = one school account), `SchoolRecord` (universal sync store)
- `controllers/` → `routes/` — thin Express wiring
- `services/licenseService.ts` — generates license keys based on school ID + expiry
- `middleware/licenseBearerAuth.ts` — verifies `Bearer <license_key>` used by desktop → cloud calls

`SchoolRecord` is the cloud sync table: one row per `(school_id, entity_type, entity_id)` storing the latest JSON snapshot of any entity. The desktop pushes deltas; the cloud applies upserts here.

### saas-hub/frontend

Single-page app. `src/components/LandingPage.tsx` is the main public page.  
`src/lib/githubRelease.ts` — fetches the latest `.exe` asset from a configured GitHub repo for the download button.

### school-management-system (desktop Electron)

**Two SQLite databases** managed by `electron/db.ts` via sql.js (in-memory, flushed to file on every write):

| Database | File | Purpose |
|---|---|---|
| Global DB | `userData/global.db` | `users`, `school_users`, `subscription`, `sync_queue`, `sync_meta`, `local_license`, `local_accounts`, `audit_log` |
| School DB | `userData/school_<id>.db` | All school data: students, classes, grades, payments, staff, etc. |

`DBWrapper.prepare()` auto-routes queries to global or school DB by detecting table names in the SQL string (see the `globalTables` list in `electron/db.ts:78`).

**IPC bridge** — the renderer never touches SQLite directly. It calls `window.ipcRenderer.invoke('<channel>', payload)` (declared in `electron/preload.ts`). Handlers live in `electron/services/*.ts` and are registered by `registerXxxHandlers()` called from `electron/main.ts`.

**App phases** (`useAppStore.ts`) — the renderer is a state machine:
`loading → account-selector | login → change-password | blocked | app`

**Sync** (`electron/services/syncService.ts`):
- Writes go to `sync_queue` via `syncTracker.ts` (called from each service after every write)
- A push is triggered automatically after `SYNC_THRESHOLD = 10` pending mutations, or at startup/shutdown
- Cloud pull is timestamp-based (`last_pull_at` in `sync_meta`)
- `grade` and `payment` entities are "critical" — they bypass the threshold and sync immediately

**Permissions** (`src/constants/permissions.ts`):
- `school_users.permissions` is a JSON array of permission key strings
- `null` means admin (all permissions granted) — checked with `hasPermission(perms, key)`
- `PERMISSION_MODULES` defines the UI grouping; `TAB_PERMISSIONS` maps sidebar tabs to required keys
- `PERMISSION_PRESETS` offers one-click role templates (Enseignant, Comptable, Secrétaire)

**School levels** — currently stored as a single string field `level` on `UserModel` (cloud) and `local_license`/`local_accounts` tables (desktop). The desktop `school_info` table also has no level column yet.

---

## Key conventions

- **Safe migrations** — new columns are added with `try { ALTER TABLE … ADD COLUMN … } catch {}` so existing databases are not broken on upgrade. Always use this pattern.
- **Soft deletes** — every entity table has a `deleted_at TEXT` column. Never hard-delete; set `deleted_at = NOW()` and filter with `WHERE deleted_at IS NULL`.
- **Sync-aware writes** — after any INSERT/UPDATE/DELETE on a syncable entity in the desktop, call `trackChange(entityType, entityId, operation, payload)` from `electron/syncTracker.ts` to enqueue the mutation.
- **`school_id` routing** — the active school context is held in `currentSchoolId` (`electron/db.ts`). Get it with `getCurrentSchoolId()`. Always scope queries by `school_id` in the global DB tables.
