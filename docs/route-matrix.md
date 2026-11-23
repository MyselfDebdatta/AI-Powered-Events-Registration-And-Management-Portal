# Route matrix — S1 current state and forward targets

**Snapshot:** 2026-11-21, after stage S1 commit (G1).
**Source of truth for routes:** `backend/app/api/*.py` and `backend/app/main.py`.
**Target principals:** `Security-Privacy-Planning.md` §4 and `Backend-Planning.md` §4.2.
**Purpose:** this is the S1 checklist and the review artefact. It records the principal now enforced on every route, the remaining gaps, and which stage closes them. `docs/gates/G1.md` holds the command matrix.

## 1. Principal vocabulary

| Principal | Credential | Scope |
|---|---|---|
| Public | none | Health, bootstrap/login endpoints, signed ticket token only (S4). |
| Staff | JWT from `/api/auth/login` with `role` in (`ADMIN`,`VOLUNTEER`) and `event_ids` | Participant/attendance reads, manual lookup, desk screens. |
| Admin | JWT with `role=ADMIN` and `event_ids` | Staff management, exports, audit, settings, void, sync. |
| Hub/station | JWT with `station_id` or `hub_id` claim | `/api/sync/*`, arrivals, QR issue/verify, face match; bound to `event_id`. |

JWT claim set issued by S1: `sub`, `role`, `event_ids`, optional `station_id`/`hub_id`, `password_changed_at`. Event mismatch returns **403**, never a silent fallback. Missing/invalid token returns **401**.

## 2. Current routes

`Auth` is now the code-enforced principal. `Rate limit` is the in-process S1 policy where implemented; Cloudflare edge rules arrive in stage S3. All authenticated routes write audit rows.

### 2.1 Health and framework routes

| Method | Path | Auth | Event scope | Rate limit | Audit event | Remaining stage |
|---|---|---|---|---|---|---|
| GET | `/` | Public | n/a | 60/min/IP (S3) | none | — |
| GET | `/health` | Public | n/a | 60/min/IP (S3) | none | — |
| GET | `/api/health` | Public | n/a | 60/min/IP (S3) | none | — |
| GET | `/openapi.json` | Public | n/a | 30/min/IP (S3) | none | S3 restrict |
| GET | `/docs`, `/redoc` | Public | n/a | 30/min/IP (S3) | none | S3 restrict |
| GET/HEAD | `/uploads/*` | **Removed** | n/a | n/a | none | **S1 closed** |

### 2.2 Auth

| Method | Path | Auth | Event scope | Rate limit | Audit event | Remaining stage |
|---|---|---|---|---|---|---|
| POST | `/api/auth/login` | Public (credentials) | n/a | **5/min/IP + 20/hour/account (in-process)** | `LOGIN_SUCCEEDED`, `LOGIN_FAILED` | S3 edge rules |
| POST | `/api/auth/register` | Admin | required | 10/min/admin (S3) | `STAFF_CREATED` | S3 |
| POST | `/api/auth/bootstrap` | One-time token | n/a | **3/min/IP (in-process)** | `BOOTSTRAP_ADMIN_CREATED`, `BOOTSTRAP_FAILED` | **S1 closed** |
| POST | `/api/auth/change-password` | Staff (self) | required | 10/min (S3) | `PASSWORD_CHANGED` | S3 |

`POST /api/auth/seed` is gone. `POST /api/register` (public participant intake) is a different endpoint from `POST /api/auth/register` (staff creation); see `docs/naming.md`.

### 2.3 Participants

| Method | Path | Auth | Event scope | Rate limit | Audit event | Remaining stage |
|---|---|---|---|---|---|---|
| POST | `/api/participants/` | Staff | required | 20/min/staff (S3) | `PARTICIPANT_CREATED` | S4 demote/validate |
| GET | `/api/participants/` | Staff | required | 60/min/staff (S3) | `PARTICIPANT_LIST_READ` | S2 pagination |
| GET | `/api/participants/{participant_id}` | Staff | required | 120/min/staff (S3) | `PARTICIPANT_READ` | — |
| GET | `/api/participants/{participant_id}/photo` | Staff | required | 120/min/staff (S3) | `PARTICIPANT_PHOTO_READ` | S3 presigned URL |
| GET | `/api/participants/{participant_id}/qrcode` | **410 `LEGACY_QR_DISABLED`** | required | n/a | `LEGACY_QR_READ_REJECTED` | **S1 disabled**, S5 replace |

### 2.4 Sessions

| Method | Path | Auth | Event scope | Rate limit | Audit event | Remaining stage |
|---|---|---|---|---|---|---|
| POST | `/api/sessions/` | Admin | required | 30/min/admin (S3) | `SESSION_CREATED` | S2 event_id |
| GET | `/api/sessions/` | Staff | required | 120/min/staff (S3) | `SESSION_LIST_READ` | — |
| GET | `/api/sessions/{session_id}` | Staff | required | 120/min/staff (S3) | `SESSION_READ` | — |
| PUT | `/api/sessions/{session_id}` | Admin | required | 30/min/admin (S3) | `SESSION_UPDATED` | S2 event_id |
| DELETE | `/api/sessions/{session_id}` | Admin | required | 30/min/admin (S3) | `SESSION_DELETED` | S2 event_id |

### 2.5 Attendance

| Method | Path | Auth | Event scope | Rate limit | Audit event | Remaining stage |
|---|---|---|---|---|---|---|
| POST | `/api/attendance/` | Staff | required | 120/min/station (S3) | `ATTENDANCE_RECORDED` | S5 idempotency/void |
| GET | `/api/attendance/event` | Staff | required | 120/min/staff (S3) | `ATTENDANCE_LIST_READ` | — |
| GET | `/api/attendance/session/{session_id}` | Staff | required | 120/min/staff (S3) | `ATTENDANCE_SESSION_READ` | — |
| GET | `/api/attendance/stats` | Staff | required | 60/min/staff (S3) | `ATTENDANCE_STATS_READ` | — |
| POST | `/api/attendance/validate-qr` | **410 `LEGACY_QR_DISABLED`** | n/a | 30/min/IP (S3) | `LEGACY_QR_REJECTED` | **S1 closed**, S5 replace |
| POST | `/api/attendance/face-match` | Staff | required | 30/min/station (S3) | `FACE_MATCH_ATTEMPTED` | S5 extended response |

### 2.6 Embeddings

| Method | Path | Auth | Event scope | Rate limit | Audit event | Remaining stage |
|---|---|---|---|---|---|---|
| GET | `/api/embeddings/sync` | Admin → **410 `BIOMETRIC_EXPORT_DISABLED`** | required | 5/min/admin (S3) | `EMBEDDING_SYNC_READ_REJECTED` | **S1 gated**, S8 replace |

### 2.7 Admin

All admin routes require `get_current_admin` and now write audit rows. Event scope is enforced through JWT `event_ids`.

| Method | Path | Auth | Event scope | Rate limit | Audit event | Remaining stage |
|---|---|---|---|---|---|---|
| GET | `/api/admin/dashboard` | Admin | required | 60/min/admin (S3) | `ADMIN_DASHBOARD_READ` | S8 live data |
| GET | `/api/admin/volunteers` | Admin | required | 60/min/admin (S3) | `VOLUNTEER_LIST_READ` | S8 |
| POST | `/api/admin/volunteers` | Admin | required | 20/min/admin (S3) | `VOLUNTEER_CREATED` | S8 |
| PATCH | `/api/admin/volunteers/{volunteer_id}/toggle-status` | Admin | required | 20/min/admin (S3) | `VOLUNTEER_STATUS_CHANGED` | S8 |
| DELETE | `/api/admin/volunteers/{volunteer_id}` | Admin | required | 20/min/admin (S3) | `VOLUNTEER_DELETED` | S8 |
| GET | `/api/admin/export/participants` | Admin | required | 10/min/admin (S3) | `PARTICIPANTS_EXPORTED` | S8 |
| GET | `/api/admin/export/attendance` | Admin | required | 10/min/admin (S3) | `ATTENDANCE_EXPORTED` | S8 |

## 3. P0 exposures — S1 status

| # | Exposure | S1 outcome | Stage |
|---|---|---|---|
| A | Public `/uploads` static mount | **Closed** — mount removed, `/uploads/*` → 404, photo served through authenticated route | S1 |
| B | Unsigned QR JSON payload | **Legacy disabled** — `/qrcode` and `validate-qr` → 410; signing lands in S5 | S1 closed, S5 replace |
| C | Seeded default credentials | **Closed** — seeding removed from `db_init.py`; no `SEED_*` in config or `.env.example`; bootstrap is the only first-admin path | S1 |
| D | Compose placeholder secrets | **Closed** — all secrets are `${VAR:?}` environment substitutions; no usable default | S1 |
| E | Public `/api/auth/seed` | **Closed** — replaced by token-gated `POST /api/auth/bootstrap` with advisory lock and forced password change | S1 |
| F | No backend tests or CI | **Closed** — S0 baseline plus S1 security, audit and bootstrap tests | S0/S1 |
| G | Unauthenticated biometric export | **Gated** — `/api/embeddings/sync` requires admin and returns 410; replacement in S8 | S1/S8 |
| H | Unsigned `validate-qr` public | **Closed** — 410 with audit row | S1 |
| I | Participant and attendance reads public | **Closed** — staff + event scope + audit on every read | S1 |

## 4. What S1 proves

- Every route returning participant, photo, embedding, attendance or audit data has a principal; anonymous access is `401` (or `404` for the removed static path).
- A volunteer token on an admin route is `403`; a token for the wrong event is `403`.
- `/uploads/*` is gone; a photo request without a token fails.
- `POST /api/attendance/validate-qr` returns `410` and writes an audit row.
- `GET /api/embeddings/sync` is admin-only and returns `410`; no anonymous biometric export remains.
- A fresh database has no default login; bootstrap works once and only once.
- Login, participant read/write and other mutations write audit rows.

## 5. Change control

This file is updated in the same commit as any route addition, removal, auth change or stage re-scope. It is a review artefact, not a substitute for the authorization tests added in S1. The target principal column must match `Security-Privacy-Planning.md` §4; if the two disagree, that document wins and this matrix is corrected.
