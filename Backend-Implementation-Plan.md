# GeekAI — Backend & Infrastructure Implementation Plan

**Odisha AI Symposium 2026** · SOA University · AIC for Innovation Center
**Status:** Execution plan · 21 November 2026 · branch `debdatta/development`
**Companion to:** [WorkFlow.md](WorkFlow.md), [WorkFlow-After-Frontend-Redesign.md](WorkFlow-After-Frontend-Redesign.md), [Backend-Planning.md](Backend-Planning.md), [Database-Planning.md](Database-Planning.md), [Infrastructure-Planning.md](Infrastructure-Planning.md), [Local-Hub-Planning.md](Local-Hub-Planning.md), [Security-Privacy-Planning.md](Security-Privacy-Planning.md), [React-Registration-Planning.md](React-Registration-Planning.md)

> **What this document is.** The single execution order for everything left after the frontend. It does not replace the six planning documents; it sequences them into ten stages (S0–S10), each with a goal, concrete work items, dependencies, exit evidence and an effort estimate. Where this document and `WorkFlow.md` disagree on behaviour, `WorkFlow.md` wins. Where this document and a stage document disagree on sequence, this document wins.

---

## 1. How to use this plan

### 1.1 Rules of the road

**Naming note:** `S0`–`S10` are this document's execution **stages**. They are unrelated to the AWS service **S3**. Where both appear in one sentence, the stage is written *stage S3*.

1. **One stage at a time on the critical path.** Parallel work is allowed only where §4.3 says it is safe.
2. **A stage is done when its exit evidence exists**, not when its code is written. Evidence means: tests green, a recorded manual check, updated documentation, and a pushed commit.
3. **No real participant PII enters any environment before S1 closes (G1).** Synthetic data only until then.
4. **Every stage ends with a commit and a push** using the `feat(backend):`, `feat(db):`, `feat(infra):`, `fix(security):` or `docs:` prefix, as the frontend stages did.
5. **Every schema or contract change updates its source document in the same commit.** If a Markdown file changes, its PDF in `C:\Users\Motilal Panda\Desktop\GeekAI-Planning-PDFs` is regenerated. PDFs are never committed.
6. **The frontend is frozen** for the duration of S1–S8 except for integration fixes explicitly listed in a stage. No design-system or route changes.
7. **No invented endpoints, fields, speakers, dates or sponsors.** Contracts come from `WorkFlow.md` Appendices A–C and the stage documents.
8. **Feature flags stay OFF in production** until their stage passes; they are enabled one at a time in staging first.

### 1.2 Stage definition of done

A stage closes only when all of the following are true:

- [ ] Code merged to `debdatta/development` and pushed.
- [ ] `pytest` green, `ruff`/type check green, migration check green.
- [ ] Contract tests cover every endpoint added in the stage.
- [ ] The stage's exit table (§8) has evidence links or recorded command output.
- [ ] Affected Markdown files updated; affected PDFs regenerated.
- [ ] Flags added or changed are documented in `frontend/src/content/flags.js` and `WorkFlow-After-Frontend-Redesign.md` §3.3.
- [ ] No new "Waiting for backend" path is left on the critical event-day flow.

### 1.3 Evidence format

Keep gate evidence in `docs/gates/G1.md` … `G6.md` (new folder) with:

```
Gate: G1
Date:
Commit:
Commands run (copy-paste):
Observed output:
Signed off by:
Open exceptions:
```

This avoids re-litigating "is it done?" at rehearsal time.

---

## 2. Verified starting point — 21 November 2026

### 2.1 Frontend (done, do not rebuild)

| Item | State |
|---|---|
| Tests | 143 / 143 pass, 13 files |
| Lint | 0 errors, 7 known warnings |
| Build | Successful; bundle budgets pass |
| Registration | First-party React form on `/register`, multipart `POST /api/register` |
| Flags | All integration flags default OFF in production |
| Visual QA | 320–2560 px plus landscape, including `/register` |

### 2.2 Backend that exists today

FastAPI application under `backend/app/` with six routers:

| Router | Routes | Notes |
|---|---|---|
| `auth` | `POST /api/auth/login`, `/register` (admin), `/seed` | `/seed` is public while the user table is empty |
| `participants` | list, detail, photo, qrcode, create | Reads are effectively public |
| `sessions` | CRUD | Writes are not role-checked |
| `attendance` | create, event list, session list, stats, `validate-qr`, `face-match` | Legacy unsigned QR path |
| `embeddings` | `GET /api/embeddings/sync` | Unauthenticated biometric export |
| `admin` | dashboard, volunteers, exports | Admin-only today |

Schema: `users`, `participants`, `face_embeddings`, `sessions`, `attendance`; one Alembic revision `001_initial`. Uploads are written to local disk and served by `app.mount("/uploads", StaticFiles(...))`.

### 2.3 Missing entirely

- `POST /api/register`, `GET /api/registrations/{id}`.
- Arrivals, QR issue, QR verify, attendance void.
- `qr_tokens`, `events`, `registration_jobs`, `audit_log`, `email_outbox`, `sync_batches`.
- Sync manifest, bundle and batch ingestion.
- Ticket/status signed token endpoint.
- Live ops, reconciliation, audit read, settings, analytics, imports.
- S3, RDS, SES, IAM, Secrets Manager, Cloudflare Pages/Access/WAF.
- Email outbox and worker.
- Local hub profile, offline outbox and sync worker.
- Backend tests, CI, lint/type checks, backups, retention/purge jobs.

### 2.4 P0 exposures confirmed in this review

These are additions to the list in `Security-Privacy-Planning.md` §2 and must be fixed in S1:

| # | Exposure | Evidence | Why it matters |
|---|---|---|---|
| A | **Photos and QR PNGs are served as public static files** | `backend/app/main.py` mounts `/uploads` with `StaticFiles` | Anyone who guesses a filename gets a face photo or a legacy QR |
| B | QR payload is unsigned JSON | `backend/app/services/qr_service.py` | A printed or hand-made code can be forged |
| C | Default staff credentials are seeded at startup | `backend/app/core/db_init.py`, `config.py`, `.env.example` | A fresh deployment is loginable with published passwords |
| D | Compose ships a placeholder JWT secret and DB password | `docker-compose.yml` | A copied deployment signs tokens with a known key |
| E | `POST /api/auth/seed` is public while the user table is empty | `backend/app/api/auth.py` | First-boot race can create an attacker-controlled admin |
| F | No backend tests or CI | repository | Every fix above is unverified on merge |

**Consequence:** S1 is not a "nice to have". It is the first code stage, and no staging or production environment receives real registrations until it passes.

---

## 3. Non-negotiable guardrails

1. The client never builds or trusts a QR payload; verification is server or hub only.
2. `client_event_id` is generated once and reused on retry; every write is idempotent.
3. All PII/biometric reads require a principal; every state transition writes an audit row.
4. Photos are private: authenticated read or presigned URL, never a public bucket or static mount.
5. Signed QR only; the legacy `validate-qr` path is disabled, not merely unused.
6. No endpoint outside the agreed contract; no field renamed without updating the frontend contract test.
7. The hub is the single writer during the event; the cloud rejects unknown participants rather than creating placeholders.
8. Migrations are additive and reversible; destructive changes need a snapshot and written approval.
9. No production PII in dev/staging; synthetic fixtures only.
10. A blocked decision is recorded, given a default recommendation, and escalated — it does not silently stop the stage.

---

## 4. Stage map and critical path

### 4.1 Summary

| Stage | Name | Gate | Depends on | Estimate | Frontend effect |
|---|---|---|---|---|---|
| **S0** | Contract freeze, decisions, engineering baseline | — | frontend delivered | 3–5 d | none |
| **S1** | Security foundation | **G1** | S0 | 4–6 d | PII routes now require auth; `/uploads` removed |
| **S2** | Database foundation (M1–M9) | G3 prereq | S1 (audit table) | 4–6 d | response shapes preserved |
| **S3** | AWS + Cloudflare foundation | **G2** | S0 decisions | 5–8 d + SES lead | staging URL, HTTPS camera |
| **S4** | Registration intake | **G3** | S2; stage S3 (bucket + SES config) | 7–10 d | `/register` submits for real |
| **S5** | Signed QR, arrivals, verify, void | **G4** | S2, S4 | 5–7 d | `ARRIVAL_V2`, `SCAN_V2`, `VOID_ATTENDANCE` |
| **S6** | Email outbox + SES worker | G4 | S3, S4 | 3–4 d | welcome email after pass issue |
| **S7** | Local hub + offline | **G4/G5** | S5, S6 | 8–12 d | desk works with internet cut |
| **S8** | Sync ingestion + admin ops + flags | **G5** | S5, S7 | 5–7 d | imports, live ops, reconciliation, audit, settings, analytics |
| **S9** | Rehearsal and hardening | **G6** | all | 5–8 d | flags ON, no waiting panels |
| **S10** | Event day and post-event | GO | S9 | event window | final build |

Estimates assume **two backend-capable engineers plus part-time infrastructure help**. A single engineer should roughly double the calendar, not the effort.

### 4.2 Dependency graph

```
S0  contracts + decisions + test/CI baseline
 │
 ├──────────────► S3  AWS + Cloudflare + SES  (start day 1: SES approval is long-lead)
 │                  │
 ▼                  │
S1  G1 security     │
 │                  │
 ▼                  │
S2  database M1–M9  │
 │                  │
 └──────┬───────────┘
        ▼
       S4  registration intake (G3)
        │
        ├──────────► S6  email outbox + SES worker
        ▼
       S5  signed QR + arrivals + verify + void (G4)
        │
        ▼
       S7  local hub + offline (G4/G5)
        │
        ▼
       S8  sync + admin ops + flag enablement (G5)
        │
        ▼
       S9  rehearsal + hardening (G6)
        │
        ▼
       S10 event day + post-event
```

**Do not reorder S1 before S4.** Adding the public registration endpoint while participant and photo routes are still open multiplies the exposure the moment real data arrives.

### 4.3 Safe parallelism

| Track | Can run beside | Starting point |
|---|---|---|
| Infrastructure (stage S3) | S0, S1, S2 | Day 1 — SES verification and production access take days |
| Database (S2) | late S1 | Once the audit table from S1 exists |
| Email worker (S6) | S5 | Once S4 writes participants and S3 has SES |
| Admin endpoints (S8 part 1) | S7 | Read-only endpoints can be built against staging data |
| Frontend integration checks | S4 onward | Contract tests only; no redesign |

Never parallelise two schema-changing stages, and never let two branches touch the same migration chain.

---

## 5. Stage details

### Stage 0 — Contract freeze, decisions, engineering baseline

**Goal:** remove ambiguity and make the backend testable before changing behaviour.

**Work items**

1. **Decision log.** Resolve the blocking items in §10 and record them in `docs/decisions.md` with owner and date. Recommended defaults are listed so the stage never stalls.
2. **Freeze three contracts** in `docs/contracts/`:
   - `registration-v1.md` — multipart field names, types, consent JSON shape, the 19 error codes, HTTP status mapping.
   - `qr-v1.md` — payload `{v, jti, sub, evt, scp, iat, exp, iss}`, encoding, signing algorithm, key id, revocation rule.
   - `sync-v1.md` — manifest fields, bundle file names and hashes, batch envelope and per-item result codes.
3. **Engineering baseline.**
   - Pin dependencies (`backend/requirements.txt` or `pyproject.toml`) and add `pytest`, `pytest-asyncio`, `httpx`, `ruff`.
   - Create `backend/tests/` with `conftest.py` using a disposable Postgres+pgvector database (docker service in CI).
   - Add `backend/Makefile` or scripts: `test`, `lint`, `migrate-check`, `openapi`.
   - Add `.github/workflows/backend.yml`: Postgres service, migrate, pytest, ruff, dependency audit.
   - Refresh `backend/.env.example`; remove any usable default password.
4. **Synthetic fixtures.** A generator for 1,000 registrations (valid, duplicate email, duplicate submission id, missing consent, missing photo, oversized upload, blurry/dark/multi-face images) writing a deterministic manifest.
5. **Route inventory.** Produce `docs/route-matrix.md`: every route, current principal, target principal, rate limit, audit event. This becomes the S1 checklist and the review artefact.
6. **Naming decision.** Keep `POST /api/register` as the public intake (already frozen by the frontend) and document that `POST /api/auth/register` is staff-account creation. Optionally alias the latter to `/api/auth/users` later; do not break it now.

**Exit evidence**

- `docs/decisions.md` signed off (at least the defaults accepted).
- Three contract files merged.
- `pytest` runs in CI on the empty suite; Postgres service is healthy.
- Fixture generator produces 1,000 records with the expected reject mix.
- `docs/route-matrix.md` lists every existing route.

**Estimate:** 3–5 days.

---

### Stage 1 — Security foundation (G1)

**Goal:** make it safe to store real participant data. This is the highest-value stage in the project.

**Work items**

1. **Principal model.**
   - Extend JWT claims with `role`, `event_ids`, and optional `station_id`/`hub_id`.
   - Implement `get_current_admin`, `get_current_staff`, `get_hub_or_station`, `require_event_scope` in `core/deps.py`.
   - Reject event mismatch with 403, never silently fall back.
2. **Protect every PII/biometric route.**
   - `participants` list/detail/photo/qrcode, `attendance` reads, `sessions` writes, `embeddings/sync`.
   - `GET /api/embeddings/sync` becomes admin-only or returns 410 in favour of the future `/api/sync/bundle`.
   - Keep the *frontend* safe states; the screens already handle 401/403.
3. **Remove public file serving.**
   - Delete `app.mount("/uploads", StaticFiles(...))`.
   - Serve a participant photo through an authenticated `FileResponse` (or presigned S3 URL once S3 exists), with audit.
   - Legacy QR PNGs are not served at all.
4. **Remove default credentials.**
   - Delete seeding from `db_init.py`; delete `SEED_ADMIN_PASSWORD` from config and `.env.example`.
   - Replace `POST /api/auth/seed` with `POST /api/auth/bootstrap`: allowed only when zero users exist, requires a one-time bootstrap token from an environment secret, forces a password change on first login.
   - Replace `docker-compose.yml` secrets with `.env`-driven values and a generated JWT secret.
5. **Audit foundation.**
   - Add the `audit_log` model and migration now (pull forward from M4).
   - Middleware assigns `request_id`; a helper writes actor, role, action, entity, before/after, IP, user agent.
   - Audit PII reads, all mutations, login success/failure, and every future state transition.
   - Structured JSON logging with redaction of email, phone, tokens, photo keys.
6. **Disable the legacy QR path.**
   - `POST /api/attendance/validate-qr` returns 410 with a clear code; remove it from any frontend path (the delivered scanner already refuses it).
   - Generate and load the QR signing key placeholder now, so S5 has no key-setup surprise: `QR_SIGNING_KEY`, `QR_KEY_ID`, `QR_ISSUER`.
7. **Rate limiting baseline.** Apply to login and every public write route; use in-process limits locally and Cloudflare rules in stage S3.
8. **Security tests.** Unauthenticated PII read → 401; volunteer on admin route → 403; wrong event → 403; public `/uploads/*` → 404; no default login on a fresh database; bootstrap only once.
9. **Dependency and container hygiene.** `pip-audit` in CI, non-root container user, `.dockerignore`, no secret in image layers.

**Exit evidence (G1)**

- Route matrix shows no anonymous route returning participant, photo, embedding, attendance or audit data.
- `curl` matrix recorded in `docs/gates/G1.md`.
- Fresh-database bootstrap test passes; no seeded credential exists anywhere in the repo.
- `/uploads` is gone; a photo request without a token fails.
- Audit rows are written for login and for a sample participant read/write.
- Legacy unsigned QR route disabled and documented.

**Estimate:** 4–6 days. **Unblocks:** all real-data work.

---

### Stage 2 — Database foundation (M1–M9)

**Goal:** land the complete schema and prove it upgrades an existing database without loss.

**Work items**

1. **Models.** Add `events`, `registration_jobs`, `qr_tokens`, `email_outbox`, `audit_log` (already in S1), `sync_batches`; extend `participants`, `face_embeddings`, `attendance`, `sessions` exactly as `Database-Planning.md` §2.
2. **Migrations, one revision each.**
   - M1 events + nullable `event_id`, backfill `oas-2026`.
   - M2 participant provenance/status/consent/photo/embedding fields.
   - M3 embedding model/version/quality fields (backfill from the installed InsightFace model).
   - M4 `registration_jobs` (audit already delivered in S1).
   - M5 `qr_tokens` (legacy unsigned codes are not migrated).
   - M6 attendance idempotency/void fields, deterministic backfill of `client_event_id`.
   - M7 `email_outbox`, `sync_batches`.
   - M8 constraints and indexes after backfill: non-null `event_id`, unique `(event_id, lower(email))`, unique `(event_id, submission_id)`, one active ENTRY token, HNSW when used.
   - M9 removal of the seeding path (paired with S1 code).
3. **Constraint details.** `UNIQUE (client_event_id)`; keep `uq_participant_session` and the partial event-level unique index; FKs `ON DELETE RESTRICT` for QR/audit; soft delete for participants.
4. **Validation queries as tests.** Count by status/source; exactly one active embedding per `EMBEDDING_READY`; no duplicate `client_event_id`; no stuck outbox rows; audit coverage.
5. **Migration CI.** Fresh DB upgrade, existing `001_initial` upgrade, and `downgrade` to base, all green.
6. **Snapshots.** Take an RDS snapshot before M1 and M8 in staging.

**Exit evidence**

- Fresh and upgraded databases both reach head; downgrade works.
- Validation queries return the expected counts on fixtures.
- Existing frontend contracts unchanged (contract test suite green).
- Snapshot and restore drill recorded in `docs/gates/G3.md` (prerequisite section).

**Estimate:** 4–6 days.

---

### Stage 3 — AWS + Cloudflare foundation (G2)

**Goal:** a real staging path with private storage, a database, email and edge protection.

**Work items**

1. **Accounts and identity.** AWS account (or OU) and Cloudflare account owned by named people; region `ap-south-1` unless policy says otherwise; MFA on root; no long-lived access keys.
2. **S3.** Private bucket, Block Public Access, SSE-KMS, versioning, access logging; prefixes `raw-json/`, `photos/`, `embeddings/`, `exports/`, `certificates/`, `manifests/`, `audit/`; lifecycle for staging bundles; TLS-only and encryption-required bucket policy.
3. **RDS.** PostgreSQL with `vector` in private subnets, TLS required, PITR and automated backups, deletion protection in production, Secrets Manager `DATABASE_URL`, parameter group and pooler decision.
4. **SES.** Verify the sending domain/subdomain; publish DKIM, SPF, DMARC; **request production access immediately**; create the welcome template; wire bounce/complaint notifications to SNS.
5. **IAM.** Backend task role, registration worker role, hub sync principal, CI deploy role — least privilege, described in `Infrastructure-Planning.md` §3.4.
6. **Runtime.** ECS Fargate behind ALB (or App Runner if the team prefers); same image for the hub with a local profile; `/health` and `/api/health` readiness including DB connectivity; CORS restricted to the Pages domain.
7. **Cloudflare.** Pages project from `frontend/`, custom domain, Access policies for `/admin/*` and `/volunteer/*`, WAF managed rules, rate limits on login/ticket/verify/register, `/api/*` proxy, no caching of PII.
8. **Observability.** Structured logs, metrics (arrivals/min, QR decisions, outbox depth, sync lag, 5xx), alarms for SES bounce, outbox dead-letter, DB errors; PII scrubbing verified.
9. **End-to-end staging check.** Browser → Cloudflare → API → RDS/S3, camera over HTTPS on laptop and phone.

**Exit evidence (G2)**

- Staging URL reachable over HTTPS; `/api/health` reports DB and dependency status.
- S3 object written and read back via presigned URL only; public URL fails.
- SES test email delivered to Gmail, Outlook and one Indian provider.
- Access blocks an unauthenticated `/admin/*` request; WAF rate limit demonstrated.
- Restore drill from snapshot succeeds.

**Estimate:** 5–8 days, plus external SES approval time.

---

### Stage 4 — Registration intake (G3)

**Goal:** make the delivered `/register` form create real, validated, embedding-ready participants.

**Work items**

1. **`POST /api/register`** accepting multipart exactly as frozen in S0:
   `source`, `submission_id`, `client_event_id`, `submitted_at`, `full_name`, `email`, `phone`, `institution`, `category`, `photo`, `consent` (JSON), optional `accessibility_needs`, `dietary_preference`, `session_interest`.
2. **Validation.** Required fields, email normalisation, Indian phone format, category enum, consent `biometric: true`, consent version match, upload size/type limits, malformed multipart handling.
3. **Idempotency and dedupe.** `submission_id` first; then `(event_id, lower(email))`; replay returns the original record, never a second participant or a second S3 object.
4. **Photo quality gate.** One detectable face, minimum 640×640, blur/brightness thresholds, reject screenshots/group photos where feasible; strip EXIF/GPS; re-encode; SHA-256; upload to `photos/{event}/{submission_id}/`.
5. **Status pipeline.** `IMPORTED → PHOTO_VALIDATED → EMBEDDING_READY`, with `PHOTO_REJECTED`, `DUPLICATE`, `BLOCKED` exceptions; zero-embedding participants cannot reach `EMBEDDING_READY`.
6. **Embedding build.** Same InsightFace model/version as the desk; store `model_name`, `model_version`, `dimension`, `quality_score`, `is_active`, `source_photo_hash`.
7. **Traceability.** `registration_jobs` row per submission/batch; report key in S3; counts and timestamps.
8. **Read endpoint.** `GET /api/registrations/{id}` returns status, `photo_status`, `embedding_status`, validation report; issue a signed status-link token for the participant status page.
9. **Error taxonomy.** All 19 codes from `React-Registration-Planning.md` §5 with stable HTTP mapping; field-level errors where the form can act on them.
10. **Abuse controls.** Rate limit per IP/email, upload limits, bot protection decision (recommend Cloudflare Turnstile), generic responses that do not leak whether an email exists.
11. **Tests.** Valid, duplicate email, duplicate submission, no consent, missing photo, oversized, blurry, dark, multiple faces, malformed phone, replay, concurrent replay, 1,000-row throughput report.
12. **Frontend integration.** Submit from a real browser; verify the multipart boundary. Axios 1.x normally sets the boundary itself — if the explicit `Content-Type: multipart/form-data` header in `useRegistrationForm.js` strips it, remove the header and let the browser set it. Record the result in `React-Registration-Planning.md` §2.3.

**Exit evidence (G3)**

- Form on staging returns `submission_id`, `status`, `photo_status`, `embedding_status`, `status_token`.
- 1,000 synthetic submissions produce a clean report and an idempotent re-run.
- Photos exist only in the private bucket; presigned read works; no static path.
- Every participant has a consent version and timestamp; no participant is `EMBEDDING_READY` with zero embeddings.
- Duplicate and replay tests produce exactly one row and one object.

**Estimate:** 7–10 days.

---

### Stage 5 — Signed QR, arrivals, verify and void (G4 core)

**Goal:** the event-day critical path, cloud side, matching the delivered volunteer screens.

**Work items**

1. **`services/qr_signing.py`.** Ed25519 preferred (HMAC only if every verifier is trusted); `issue`, `verify`, `revoke`; key id in the payload; private key from Secrets Manager (hub: local secure store).
2. **Token lifecycle.** `qr_tokens` row per issue with `jti`, scope, expiry, issuer, station, similarity; one active `ENTRY` per participant per event; `ENTRY` requires `ARRIVED`.
3. **`POST /api/arrivals`.** Idempotent on `client_event_id`; returns `ARRIVED`, `arrived_at`, `already_arrived`; distinct `already_checked_in`; audit.
4. **`POST /api/qr/issue`.** Flat response `{token, pass_id, jti, scope, expires_at, issued_at}`; audit `QR_ISSUED`.
5. **`POST /api/qr/verify`.** Strict order: format → signature → version/event → expiry → revocation → scope → duplicate → write. Emit exactly one canonical decision: `VALID`, `DUPLICATE`, `EXPIRED`, `WRONG_SCOPE`, `INVALID` (plus the documented aliases). Never write on rejection.
6. **`POST /api/attendance/{id}/void`.** Admin only, mandatory reason, before/after audit, soft void; `VOID_ATTENDANCE` flag.
7. **Face-match compatibility.** Extend the existing response with `candidates`, `threshold`, `matched`, `low_confidence`, `already_arrived`, `already_checked_in`, timestamps, message; authenticate it.
8. **Contract tests.** Mirror `frontend/src/lib/arrivalApi.js` normalizers; forged, expired, revoked, wrong-scope, duplicate, replay, concurrent replay.
9. **Staging enablement.** Turn on `ARRIVAL_V2`, `SCAN_V2`, `VOID_ATTENDANCE`; run the delivered volunteer flow end to end.

**Exit evidence (G4 cloud path)**

- Arrival → issue → print/show → verify works against staging.
- Forged `{"participant_id": 1}` is rejected before any write.
- Replayed arrival/issue/verify create no duplicates.
- Legacy unsigned QR is rejected with `INVALID`.

**Estimate:** 5–7 days.

---

### Stage 6 — Email outbox and SES worker (G4)

**Goal:** reliable welcome email after pass issuance, with no false claims.

**Work items**

1. `email_outbox` write inside the QR-issue transaction (or immediately after, idempotently).
2. Worker with exponential backoff, attempt cap, dead-letter state, `provider_message_id`, `last_error`, `sent_at`.
3. SES templating that matches the frozen frontend copy; the body must **not** say a QR was emailed at registration.
4. Bounce/complaint handling from SNS into the outbox/audit; suppress hard bounces.
5. `POST /api/emails/{id}/resend` for admin/volunteer; audited.
6. Metrics: queue depth, age of oldest pending, delivery latency, bounce rate.
7. Tests with a mocked provider: retry, backoff, dead-letter, resend, bounce, no duplicate send on replay.
8. Delivery rehearsal to Gmail, Outlook and an Indian provider; sandbox → production.

**Exit evidence**

- Outbox row exists within one second of issuance; delivery under five minutes in rehearsal.
- Retry and dead-letter demonstrated.
- No email body claims a QR was sent at registration.
- No PII in logs.

**Estimate:** 3–4 days.

---

### Stage 7 — Local hub and offline operation (G4/G5)

**Goal:** the desk works at full speed with the internet cut, and reconciles cleanly afterwards.

**Work items**

1. **Local profile.** Same FastAPI image, `HUB_MODE=local`, durable SQLite (or local Postgres), separate config and secrets.
2. **Manifest loader.** Verify `manifest.json`, `participants.ndjson`, `embeddings.f32`, `photos.index.json`, `deletions.json` hashes; refuse a bad bundle; display the manifest id everywhere.
3. **Local matcher.** InsightFace with the same model version as the importer; refuse to run on version mismatch; return the candidate contract the UI already reads.
4. **Local signer/verifier.** Private key only on the hub; scanners ask the hub or hold the public key; revocation deny list refreshed on sync.
5. **Local API.** Same contracts as the cloud for arrivals, issue, verify, face-match, lookup.
6. **Outbox and sync worker.** Durable queue with `client_event_id`, `client_marked_at`, `station_id`; batch upload with `batch_id`, cursor, checksum; per-item `accepted|duplicate|rejected`; clear only accepted/duplicate; visible pending count; restart-safe.
7. **Station operations.** Camera capture, candidate review, badge print, A4 fallback, printer-failure state, pending-sync banner, runbook from `/volunteer/help`.
8. **Hardware rehearsal.** 4–6 stations, LAN switch, 4G failover, backup power, hub restart with pending outbox.

**Exit evidence**

- 2-hour internet cut: 10+ arrivals, zero loss, zero duplicates after reconnect.
- All stations show the same manifest id before check-in.
- Hub restart with pending outbox loses nothing.
- Printed QR scans on the real scanners; printer failure falls back to screen.

**Estimate:** 8–12 days.

---

### Stage 8 — Sync ingestion, admin operations and flag enablement (G5)

**Goal:** cloud visibility, reconciliation and every flag-backed screen showing live data.

**Work items**

1. **Sync endpoints.** `GET /api/sync/manifest`, `GET /api/sync/bundle/{manifest_id}`, `POST /api/sync/batches`; checksum verification, transactional apply, per-item results, unknown participants rejected.
2. **Admin endpoints.** Live ops, reconciliation, audit read (cursor pagination and filters), settings, analytics, imports batch with `dry_run`, ticket/status lookup.
3. **Ticket payload.** `GET /api/tickets/{token}` with a signed status token; status and ticket pages render only server data.
4. **Imports screen reality.** The flag-gated imports UI reads `registration_jobs` and shows submission reports, rejects and retry actions; the label reads "Registrations".
5. **Flag enablement, one at a time in staging:** `TICKET_PAGE` → `IMPORTS_V2` → `LIVE_OPS` → `RECONCILIATION` → `AUDIT_V2` → `SETTINGS_V2` → `ANALYTICS_V2`.
6. **Remove waiting states.** For each flag, confirm no "Waiting for backend" panel remains on the event-day path.
7. **Reconciliation.** forms → registered → photo-validated → embedding-ready → synced → arrived → QR issued → checked in → emails sent, with zero unexplained variance.

**Exit evidence (G5)**

- Hub batch replay is idempotent; per-item reasons visible.
- Admin screens show live staging data.
- Reconciliation report matches database and S3 counts.
- All event-day flags ON in staging with no waiting panel.

**Estimate:** 5–7 days.

---

### Stage 9 — Rehearsal and hardening (G6)

**Goal:** prove the system under event conditions and obtain go/no-go.

**Work items**

1. **Load and volume.** 1,000-row import; 4–6 stations; arrival throughput 95% under 30 s; scan 99% under 2 s.
2. **Offline.** Two-hour cut, reconnect, zero variance; repeat twice.
3. **Failure matrix.** Duplicate scan, wrong participant, expired token, forged token, wrong scope, camera denied, printer offline, hub restart, SES bounce, DB failover.
4. **Deliverability.** >95% within five minutes across Gmail/Outlook/Indian providers; bounce and complaint handling.
5. **Security review.** Re-run the authorization matrix, log scan for PII, dependency audit, secret scan, key rotation rehearsal, Access/WAF check.
6. **Accessibility and hardware.** axe zero critical/serious, NVDA/VoiceOver spot check, printer/scanner sign-off, on-device Lighthouse.
7. **Backup and purge.** Restore drill; retention purge dry-run with a signed report.
8. **Runbook and go/no-go.** Printed desk runbook, escalation contacts, on-call rota, event-owner signature.

**Exit evidence (G6)**

- `docs/gates/G6.md` complete with measured numbers.
- Two consecutive full rehearsals pass, including an internet cut.
- No open P0 security item.
- Signed go/no-go.

**Estimate:** 5–8 days.

---

### Stage 10 — Event day and post-event

**Work items**

- **T-3:** freeze imports and embeddings; publish the final manifest hash; no further photo changes.
- **T-1:** snapshot RDS, verify backups, print runbook, charge devices, test failover.
- **Event day:** monitor arrivals/min, QR decisions, outbox depth, sync lag, 5xx; reconcile hourly; keep paper fallback.
- **Post-event:** exports, certificates with public verification, analytics summary, reconciliation report, retention purge, postmortem.

**Exit evidence**

- Event-day reconciliation with zero unexplained variance.
- Exports and certificates delivered.
- Retention purge executed with a signed report.
- Postmortem filed.

---

## 6. Calendar shape and effort

### 6.1 Two-engineer shape

| Week | Engineer A | Engineer B | Ops |
|---|---|---|---|
| 1 | S0 contracts, test baseline | S0 route matrix + fixtures | AWS/Cloudflare accounts; SES request |
| 2 | S1 auth + PII routes | stage S3: bucket/IAM/RDS | DNS, SES domain |
| 3 | S1 audit + bootstrap | S3 runtime + Cloudflare | Access/WAF |
| 4 | S2 migrations | S4 validation/photo gate | staging path |
| 5 | S2 constraints + CI | S4 embedding + register endpoint | SES prod access |
| 6 | S4 registration tests | S5 QR signing + verify | staging email |
| 7 | S5 arrivals + void | S6 outbox + worker | hub hardware |
| 8 | S7 hub local API | S8 sync ingestion | station setup |
| 9 | S7 outbox + drills | S8 admin + flags | network/power |
| 10 | S9 rehearsal | S9 rehearsal | go/no-go |
| 11 | buffer | buffer | event |

This is a **shape, not a promise**. The event date is TBA; anchor the plan to `T-10 weeks` for this shape, `T-6 weeks` for the compressed path below.

### 6.2 If the calendar compresses

Keep, in order, until time runs out:

1. S1 security, S2 schema, stage S3: S3/RDS/SES/Cloudflare, S4 registration, S5 QR/arrivals, S6 email, S7 hub, S9 rehearsal.
2. Defer: `ANALYTICS_V2`, `SETTINGS_V2`, bulk imports beyond the assisted form, certificates with public verification, multi-event UI, pgvector HNSW (the Python loop is adequate at 1,000).
3. **Never defer:** G1, signed QR, private photos, idempotency, audit for void, offline drill, backup/restore.

### 6.3 Minimum event-day path

If only the event matters and post-event features can wait, the irreducible set is:

`S0 → S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8 (ticket + live ops only) → S9`.

Everything else is value-add.

---

## 7. Contracts to freeze in Stage 0

### 7.1 Registration multipart (already implemented by the frontend)

| Part | Type | Required |
|---|---|---|
| `source` | `SITE_FORM` or `WALK_IN` | yes |
| `submission_id` | UUID | yes |
| `client_event_id` | UUID (same value) | yes |
| `submitted_at` | ISO-8601 UTC | yes |
| `full_name`, `email`, `phone`, `institution`, `category` | text | yes |
| `photo` | file | yes |
| `consent` | JSON `{biometric, version, accepted_at}` | yes |
| `accessibility_needs`, `dietary_preference` | text | no |
| `session_interest` | JSON array | no |

Response: `submission_id`, `status`, `photo_status`, `embedding_status`, `status_token`.

### 7.2 QR v1

`base64url(payload).base64url(signature)` over `{v, jti, sub, evt, scp, iat, exp, iss}`; `kid` in the header or payload; one active `ENTRY`; session scope per session; revocation by `jti`; verify order fixed by `WorkFlow.md` Appendix B.

### 7.3 Sync v1

Manifest id, schema version, counts, cursor, file hashes; `participants.ndjson`, `embeddings.f32`, `photos.index.json`, `deletions.json`; batch envelope with `batch_id`, `hub_id`, cursor range, item count, checksum, per-item results.

### 7.4 Canonical codes

Registration: the 19 codes in `React-Registration-Planning.md` §5.
QR: `VALID`, `DUPLICATE`, `EXPIRED`, `WRONG_SCOPE`, `INVALID` (plus documented aliases).
Sync: `accepted`, `duplicate`, `rejected` with reason codes.

---

## 8. Gate evidence checklist

| Gate | Evidence to file |
|---|---|
| **G1** | Route matrix with principals; curl 401/403/404 matrix; fresh-DB bootstrap proof; `/uploads` removal; audit sample rows; legacy QR disabled |
| **G2** | Staging URL; `/api/health` output; S3 private-object proof; SES delivery headers; Access denial screenshot; WAF rate-limit test; restore drill |
| **G3** | 1,000-row report; re-run diff empty; S3 object count; consent coverage query; embedding coverage query; form submission screenshot |
| **G4** | Arrival/issue/verify run log; forged/expired/revoked/wrong-scope results; duplicate replay; welcome email timestamps; offline drill log |
| **G5** | Batch replay result; reconciliation report; admin screen screenshots; flag matrix all ON |
| **G6** | Throughput numbers; two rehearsal reports; security re-check; accessibility results; hardware sign-off; signed go/no-go |

---

## 9. Risk register

| # | Risk | Stage | Mitigation |
|---|---|---|---|
| 1 | Real PII collected before G1 | S1 | Hard rule; synthetic fixtures only; staging uses fake data |
| 2 | SES production access delayed | stage S3 | Request on day 1; keep an SMTP fallback for rehearsal only |
| 3 | Photo gate rejects genuine participants | S4 | Tune on synthetic set; staff review queue; manual override with reason |
| 4 | Model version mismatch between importer and hub | S4/S7 | Store and verify `model_name`/`model_version`; refuse mismatch at manifest load |
| 5 | QR key compromise | S5 | Key id, rotation runbook, revoke-all, reissue at desk |
| 6 | Frontend/backend contract drift | S0/S4/S5 | Frozen contracts + contract tests mirroring `arrivalApi.js` |
| 7 | Offline duplicates after reconnect | S7 | `client_event_id` unique + idempotency tests + batch replay drill |
| 8 | Hub hardware failure | S7 | Durable store, snapshots, spare laptop, printed runbook |
| 9 | AWS/Cloudflare account ownership unclear | S0 / stage S3 | Named owners, MFA, secrets handover recorded |
| 10 | Retention/consent not signed | S0 | Default recommendation accepted in writing before S4 |
| 11 | Single-engineer bus factor | all | Contract docs, runbooks, pair on S1/S5/S7 |
| 12 | Scope creep from P1/P2 features | S8/S9 | Cut list in §6.2; event-day path frozen at S9 start |

---

## 10. Decisions needed before Stage 0 closes

Recommended defaults are given so implementation can start; each still needs an owner's confirmation.

| # | Decision | Recommendation | Blocks |
|---|---|---|---|
| 1 | Data controller | SOA University / AIC as recorded by the event owner | consent + privacy copy |
| 2 | Consent version + wording | Keep frontend `CONSENT_VERSION` (`2026-11`); legal review of the published text | S4 |
| 3 | Retention N | 90 days after the event for photos/embeddings; attendance/audit per university policy — confirm before collection | S2 purge jobs, S4 |
| 4 | AWS region | `ap-south-1` (Mumbai) | stage S3 |
| 5 | SES identity | University-owned domain or subdomain; DNS owner named | stage S3 / S6 |
| 6 | AWS/Cloudflare owners | Named individuals with MFA; credentials in the team vault | stage S3 |
| 7 | QR algorithm | Ed25519 with `kid` | S5 |
| 8 | Hub form | Same image, `HUB_MODE=local`, SQLite | S7 |
| 9 | Bot protection | Cloudflare Turnstile on `/register` | S4 |
| 10 | Closing date / capacity | TBA; form stays open until the owner sets it | S4 |
| 11 | Go/no-go signatory | Event owner | S9 |
| 12 | Manual override authority | One named desk lead per shift | S5/S7 |

---

## 11. First five working days — start here

**Day 1 — decisions and long leads**

- Create `docs/decisions.md`; record decisions 1–12 with owners.
- Open the AWS/Cloudflare access requests and the SES domain verification request.
- Start `docs/contracts/registration-v1.md`, `qr-v1.md`, `sync-v1.md` from the appendices.
- Confirm the event date (TBA) and set the `T-n` anchor.

**Day 2 — testable baseline**

- Add `pytest`, `pytest-asyncio`, `httpx`, `ruff`; create `backend/tests/conftest.py`.
- Add the GitHub Actions workflow with a Postgres+pgvector service.
- Run `pytest` (empty suite) and `ruff` in CI; make the checks required.
- Build the synthetic fixture generator.

**Day 3 — route inventory and the worst exposure**

- Produce `docs/route-matrix.md` for all existing routes.
- Remove `app.mount("/uploads", StaticFiles(...))`; serve photos through an authenticated route.
- Add `get_current_staff` and protect participant/attendance/embedding reads.
- Write the 401/403/404 security tests.

**Day 4 — credentials and audit**

- Delete seeding and `SEED_*` configuration; add bootstrap-token setup with forced password change.
- Fix `docker-compose.yml` and `.env.example` placeholder secrets.
- Add `audit_log` model + migration + `request_id` middleware + audit helper.
- Disable `/api/attendance/validate-qr` with 410.

**Day 5 — G1 evidence and hand-off to S2**

- Run the full route matrix, record output in `docs/gates/G1.md`.
- Tag the commit; update the affected docs and PDFs.
- Start M1/M2 models and migrations; verify a fresh and upgraded database in CI.
- Kick off stage S3 provisioning in parallel.

**Definition of a good first week:** G1 is either closed or one day from closing, CI runs on every push, and no real participant data exists anywhere.

---

## 12. Definition of project complete

- Gates G1–G6 passed and recorded with evidence.
- Every flag used by the delivered frontend is ON in production with a live, rehearsed endpoint.
- No event-day screen shows "Waiting for backend".
- Two consecutive full rehearsals pass, including an internet cut.
- Hardware sign-off (printer, scanner, assistive technology, on-device Lighthouse) recorded.
- Backups, restore drill and retention purge completed.
- Post-event exports, certificates, reconciliation and postmortem completed.

**Current position:** frontend complete and verified (143/143 tests, PR #3 merged). Backend, database, infrastructure, hub and integration are untouched. **Start at S0; S1 is the first code.**

---

## 13. Progress log

| Stage | Status | Commit | Date | Evidence |
|---|---|---|---|---|
| **S0** | Complete — owner approved | `de941e5`, CI fix `6cb6ee1`, remediation `0d9c5a5` | 2026-11-21 | `docs/decisions.md`, `docs/contracts/{registration,qr,sync}-v1.md`, `docs/route-matrix.md`, `docs/naming.md`, `backend/tests/`, `backend/scripts/generate_fixtures.py`, `.github/workflows/backend.yml` |
| **S1** | Complete — owner approved (G1 closed) | `f55bc91` | 2026-11-21 | `docs/gates/G1.md`, `docs/route-matrix.md` (updated), `backend/app/core/{deps,security,middleware,rate_limit}.py`, `backend/app/services/audit.py`, `backend/app/models/audit.py`, `backend/migrations/versions/002_security_foundation.py`, `backend/tests/test_security.py` |
| **S2** | Complete — awaiting owner review | see PR #4 head | 2026-11-22 | `docs/gates/G3.md`, `backend/migrations/versions/003..010_*.py`, `backend/app/models/{entities,enums}.py`, `backend/tests/test_database_schema.py` |
| **S3–S10** | Not started | — | — | — |

### S0 delivery detail

**Delivered**

- `docs/decisions.md` — D1–D12 with status, owner, impact and date. Proposed defaults are marked where the owner has not yet signed off.
- `docs/contracts/registration-v1.md` — multipart parts, consent JSON, success/duplicate responses, all 19 codes, HTTP mapping and idempotency.
- `docs/contracts/qr-v1.md` — payload, encoding, Ed25519 signing, key-id rule, issue/verify, fixed verification order, canonical decisions and revocation.
- `docs/contracts/sync-v1.md` — manifest, bundle files, batch envelope, checksum/cursor and per-item results.
- `docs/route-matrix.md` — every current route with target principal, rate limit, audit event, fixing stage and the P0 exposures A–I.
- `docs/naming.md` — `POST /api/register` is the public site form; `POST /api/auth/register` is staff-account creation.
- Test/CI baseline — `backend/pytest.ini`, `backend/ruff.toml`, `backend/Makefile`, `backend/tests/` (health, OpenAPI, fixture generator), `backend/requirements-dev.txt`, `.github/workflows/backend.yml`.
- Synthetic fixtures — `backend/scripts/generate_fixtures.py` writes 1,000 valid plus the reject mix, an oversized upload, placeholder blurry/dark/multi-face/low-resolution images, a deterministic manifest and an honest caveat.

**Verification**

| Check | Command | Result |
|---|---|---|
| Tests | `python -m pytest -q` (from `backend/`) | 6 passed |
| Lint | `python -m ruff check .` | All checks passed |
| Migration | `alembic upgrade head` → `downgrade base` → `upgrade head` on disposable `pgvector/pgvector:pg16` | Clean, head `001_initial` |
| Fixtures | `python scripts/generate_fixtures.py --count 1000` | 1,011 records, deterministic, 7.5 s |
| Links | internal markdown link check | No missing targets |
| CI | GitHub Actions `backend` workflow | Migration, pytest and ruff green on `6cb6ee1`; `pip-audit` is non-blocking |

**Decisions taken in S0**

- QR key id is resolved from `iss`; no `kid` is added to the frozen Appendix B payload (recorded as proposed default D7).
- Registration replay: identical replay returns 200 with the original response; same `submission_id` with different content returns 409 `DUPLICATE_SUBMISSION`; a new `submission_id` with an existing email returns 409 `DUPLICATE_EMAIL`.
- Contract HTTP mappings are S0 proposals and must stay in sync with the frontend tests.
- `backend/requirements-dev.txt` is a curated test runtime, not the full production set; InsightFace, ONNX Runtime and OpenCV stay in `requirements.txt` and are lazy-imported.
- Placeholder fixture images exercise plumbing only; they do not validate real face-quality thresholds.

**Still open (by design, not S0 scope)**

- All P0 exposures in `docs/route-matrix.md` remain until S1: public `/uploads`, unsigned legacy QR, seeded staff credentials, public `/api/auth/seed`, unauthenticated biometric export.
- Owner sign-off on the proposed defaults in `docs/decisions.md`.
- AWS/Cloudflare/SES access requests are long-lead items for S3 and should start now.

### S1 delivery detail

**Delivered (all nine work items)**

- Principal model: JWT claims `role`, `event_ids`, optional `station_id`/`hub_id`, `password_changed_at`; `get_current_admin`, `get_current_staff`, `get_hub_or_station`, `require_event_scope` in `core/deps.py`. Event mismatch is 403.
- PII routes protected: participants, sessions, attendance reads, embeddings (admin + 410), admin. Anonymous access is 401, `/uploads/*` is 404.
- Public static mount removed; participant photos served through authenticated `FileResponse`; QR PNG route returns 410.
- Default credentials removed; `POST /api/auth/bootstrap` with one-time env token, Postgres advisory lock, forced password change via `/api/auth/change-password`; `docker-compose.yml` and all `.env.example` files cleaned.
- Audit foundation: `audit_log` model, additive reversible migration `002_security_foundation`, request-id middleware, redacting audit helper and structured JSON logging.
- Legacy `validate-qr` returns 410 `LEGACY_QR_DISABLED` with an audit row; QR key placeholders loaded from settings.
- In-process rate limiting on login (5/min/IP + 20/hour/account) and bootstrap (3/min/IP) with 429 `RATE_LIMITED`.
- Security tests and the full HTTP/curl matrix in `docs/gates/G1.md`.
- Non-root container user, `.dockerignore`, no secrets in image layers.

**Verification:** 28 passed (DB-backed), 19 passed / 9 skipped (no DB), ruff clean, migration reversible, `git diff --check` clean.

**Still open by design:** S2 adds `events` and real `event_id` columns; S3 adds Cloudflare rules; S5 replaces legacy QR; S8 replaces gated embedding export. No PENDING decision was silently approved.

**Next stage (after S1):** S2 was authorised by the owner under the existing provisional defaults. D1 and D3 remain PENDING.

### S2 delivery detail

**Delivered**

- Models: `events`, `registration_jobs`, `qr_tokens`, `email_outbox`, `sync_batches`; extended `participants`, `face_embeddings`, `attendance`, `sessions`. `users` columns unchanged (hub/station remain token principals).
- Eight additive, reversible revisions `003_events_event_ids` … `010_constraints_indexes` (M1–M8). M9 is evidence only; seeding was removed in S1.
- Backfills: default event `oas-2026` (code/name only; dates and venue NULL), participants `ADMIN`/`IMPORTED` or `SYNCED`, embedding metadata with an explicit `unknown-not-installed` placeholder version, deterministic attendance `client_event_id` without rewriting `marked_at`.
- M8 constraints: non-null `event_id`, unique `(event_id, lower(email))`, unique `(event_id, submission_id)` where not null, unique `client_event_id`, one active ENTRY token per participant/event, HNSW on embeddings; existing `uq_participant_session` and the partial event-level index preserved.
- Validation-query tests in `backend/tests/test_database_schema.py`; gate evidence in `docs/gates/G3.md` with the RDS snapshot/restore drill explicitly PENDING until staging exists (S3).

**Verification:** fresh upgrade, populated `002` upgrade with no data loss, full downgrade and re-upgrade all clean; 38 passed with the DB flag, 19 passed / 19 skipped without it; ruff clean; frontend 143/143.

**Deferred:** RDS snapshots and restore drill (S3), photo migration to S3 (S3/S4), registration intake and the 1,000-row report (S4), signed QR (S5), email worker (S6), sync (S7/S8), forced-password enforcement in the admin UI (S8). No PENDING decision was silently approved.

**Next stage:** S3 — AWS + Cloudflare foundation. Not started; must be run in parallel by the owner for RDS snapshots and SES.

---

*Stages S1 and S2 added application code. PDF for this document regenerated locally and not committed.*
