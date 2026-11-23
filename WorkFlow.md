# GeekAI — Target Workflow & Implementation Blueprint

**Event:** Odisha AI Symposium · 500–1,000 participants  
**Document status:** Planning baseline for review  
**Last updated:** 20 November 2026  
**Scope:** Architecture, workflow, phased delivery plan, and feature backlog for the new AWS + Cloudflare + in-site React registration event model.

> This document consolidates the research and planning output produced for the GeekAI repo. It is a **planning artifact only** — it does not describe code that has already been written. No application code was modified.

---

## 1. Executive summary

Proceed with a **hybrid, local-first event architecture**:

- **The in-site React registration form** is the pre-registration source of truth for submissions.
- **AWS S3** stores photos, JSON snapshots, exports, and certificates.
- **PostgreSQL/pgvector on AWS RDS/Aurora** remains the operational database for participants, embeddings, QR state, attendance, imports, and audit.
- **Cloudflare Pages + Access/WAF** hosts and protects the frontend.
- **AWS** hosts the FastAPI backend, S3, SES, and the operational database.
- **A local on-site hub + volunteer stations** perform face matching, QR issuance, and offline check-in.
- **Signed QR codes are issued at arrival**, not at registration.
- **SES + an outbox queue** sends the welcome email within minutes of entry.
- **An outbox/version-cursor sync** moves local attendance and QR issuance to the cloud idempotently.

This keeps the strongest parts of the existing repo — the data model, FastAPI APIs, React UI, and local InsightFace app — while changing the boundaries the meeting decided.

**Bottom line:** Use the in-site React form + a registration validation pipeline, S3 + RDS for data, Cloudflare for the frontend/edge/security, AWS for backend/storage/email, and a local hub for face matching and QR issuance. Do **not** try to run the current FastAPI/pgvector/InsightFace stack on Cloudflare Workers. The first two weeks should deliver the registration pipeline, S3 integration, local hub/QR/welcome-email prototype, and a rehearsal — those are the pieces that de-risk the event.

---

## 2. Fixed decisions from the planning meeting

These are treated as constraints, not options:

| # | Decision | Consequence |
|---|----------|-------------|
| D1 | AWS is the data storage platform | S3 for blobs/archives; RDS Postgres/pgvector for operational data |
| D2 | Cloudflare hosts the registration platform | Pages for the UI; Access/WAF in front; AWS serves the API |
| D3 | Pre-registration happens through the in-site React form | Make `/register` the single primary intake; no external form |
| D4 | Submissions are sent as JSON to our API | Validation, dedupe, photo upload and reporting in the registration pipeline |
| D5 | Face scan happens on arrival, then a unique QR is generated | QR is an arrival artifact, not a registration artifact |
| D6 | QR is used for fast event-day check-in | Signature verification, duplicate prevention, session reuse rules |
| D7 | Welcome email with QR instructions goes out within minutes of entry | SES + outbox + retry + delivery logs |
| D8 | All uploaded pictures and registration data live in S3 | Private bucket, presigned access, lifecycle, KMS |
| D9 | Images are downloaded locally for volunteers | Versioned pre-event sync bundle for the local hub |
| D10 | Locally connected volunteers sync to the cloud | Hub-and-spoke sync with idempotency keys and reconciliation |
| D11 | All computation is local for low latency | Face matching and QR signing run on the local hub/stations |

---

## 3. Where the current codebase stands

### 3.1 Existing implementation

| Component | What exists today |
|-----------|-------------------|
| Frontend | React 19 + Vite 6 + Tailwind v4; public registration, admin dashboard, volunteer QR scanner, browser face check-in |
| Backend | FastAPI + async SQLAlchemy + Alembic |
| Database | PostgreSQL with pgvector; six tables: `users`, `participants`, `face_embeddings`, `sessions`, `attendance` (+ Alembic version) |
| Face AI | InsightFace/ArcFace 512-d embeddings, computed by the backend and by a local OpenCV app |
| Local check-in | `face-checkin/` — webcam loop, local embedding cache, incremental sync |
| Delivery | Docker Compose: Postgres, backend, frontend via nginx |

### 3.2 Gaps found during review

**Security / data integrity (must fix before collecting real PII):**

1. `GET /api/embeddings/sync` exposes biometric embeddings **without authentication**.
2. Participant and attendance read endpoints are effectively public.
3. QR payloads are plain JSON — unsigned and forgeable.
4. Default admin/volunteer credentials are seeded in `backend/app/core/db_init.py`.
5. Attendance has no undo/delete path; a mis-scan cannot be corrected by staff.
6. Deleting a volunteer who marked attendance will likely fail on the FK.
7. Registration can silently succeed with **zero** usable face embeddings.
8. No tests, CI, `.dockerignore`, or lint/type configuration.
9. Compose serves the frontend over **HTTP**, so browser camera access (face/QR scanning) is blocked outside `localhost` unless HTTPS is added.
10. Missing nginx upload limits / request-size validation on photo upload.

**Architecture gaps:**

- S3 and Cloudflare appear nowhere in the codebase — both require new configuration, deployment, and storage abstractions.
- QR is generated and emailed at registration; the meeting requires issuance after on-arrival face verification.
- Sync is a simple timestamp cursor (`since`); it cannot express deletions, versions, or idempotent replays.
- Event identity is hardcoded; there is no `events` table.
- All face inference lives in the cloud API, while the meeting requires local computation.

---

## 4. Architecture delta

| Area | Today | Meeting decision | Change needed |
|---|---|---|---|
| Public registration | Legacy React form with misleading copy | In-site React form on `/register` | Rebuild as the primary intake with validation, photo upload, consent and status; assisted walk-ins use the same form |
| Photo storage | Local `backend/uploads/` | AWS S3 | S3 service, presigned uploads/downloads, lifecycle, KMS, migration script |
| Face computation | Backend `/face-match` + local app | Local only | Local hub/stations primary; backend inference removed or downgraded |
| QR | Generated at registration, unsigned | Generated at arrival, unique | Signed QR service, QR token table, arrival endpoint, print/email delivery |
| Check-in | Online API per scan | Local + cloud sync | Local hub, outbox, idempotency keys, offline queue |
| Email | Optional SMTP | Welcome within minutes | SES + outbox + templates + delivery logs + retries |
| Hosting | Docker nginx | Cloudflare | Cloudflare Pages/Access/WAF; AWS backend; optional Tunnel |
| Database | Local Postgres | AWS storage | RDS/Aurora Postgres + pgvector; S3 archive |
| Sync | Timestamp `since` | Local copies in cloud | Version cursor + manifest + deletions + checksums |
| Event model | Hardcoded event name/date | One event now, likely reuse | Minimal `Event` table now; full multi-event later |

---

## 5. Decisions still to confirm

### 5.1 Three decisions that block design

**1. Cloudflare cannot host the current FastAPI backend as-is.**
Cloudflare Pages/Workers is not a drop-in runtime for Python FastAPI + SQLAlchemy + PostgreSQL/pgvector + InsightFace. The low-risk split is **Cloudflare Pages/Access/WAF in front of an AWS-hosted FastAPI backend**. A Cloudflare-only rewrite (Workers + D1/Vectorize/R2) would be a multi-month rewrite and conflicts with the AWS S3 decision.

**2. S3 is not a database.**
S3 is right for photos and JSON archives, but attendance, duplicate prevention, joins, analytics, and QR state need a transactional store. Recommend **S3 for blobs/archives + RDS Postgres/pgvector for operational data**. If the team insists on S3-only, we need DynamoDB or another operational store plus Athena for analytics — more work, not less.

**3. A face scan needs a reference face.**
Does the in-site React form collect a clear participant photo? If yes, precompute embeddings and use the arrival scan to **verify** identity. If no, the arrival scan is just **enrollment**; it does not verify against pre-registered data, so manual ID verification is still needed. Recommend collecting a photo + consent in the React form.

### 5.2 Open decisions and recommendations

| Decision | Recommendation | Why |
|---|---|---|
| Does the in-site React form collect a face photo? | Yes, with consent; validate quality; precompute embeddings | Otherwise the arrival scan is enrollment, not verification |
| Cloudflare scope | Pages/Access/WAF frontend; AWS backend | Current FastAPI/pgvector/InsightFace stack cannot run on Workers as-is |
| S3 scope | Blobs + JSON archive; Postgres operational | S3 cannot enforce attendance uniqueness/joins/analytics |
| QR scope | One signed participant QR; event entry once; sessions reusable with photo check | Balances speed and fraud control |
| Local sync model | Hub-and-spoke; hub is single writer; stations use LAN | Better consistency and latency than each station writing to cloud |
| Pre-registration cutoff | T-3 days for photos/embeddings; walk-ins on-site | Allows quality checks and sync before event |
| Email provider | SES with verified domain; request production access now | "Within minutes" requires deliverability and throughput |
| Badge printing | At least one print station + email/SMS fallback | Not everyone has a smartphone/email at the venue |
| Data retention | Delete photos/embeddings N days after event; keep attendance per policy | Biometric data is sensitive; define before collection |
| Event model | Add minimal `Event` table now | Avoid hardcoding and painful migration later |
| Native `/register` page | Make it the single primary intake; staff-assisted walk-ins use the same form | One source of truth; no external handoff |

---

## 6. Target architecture

```
In-site React registration form (/register)
    │  HTTPS POST /api/register (JSON + photo)
    ▼
Registration pipeline ──► validation + dedupe + photo quality gate
    │
    ├──► S3: photos, registration snapshots, exports, certificates
    └──► Postgres: participants, embeddings, QR state, attendance, audit

Cloudflare Pages (landing, status/ticket, admin, volunteer UI)
    │  Cloudflare Access + WAF + rate limiting
    ▼
FastAPI backend on AWS (ECS/App Runner/EC2)
    ├── RDS Postgres + pgvector
    ├── S3 (presigned URLs)
    └── SES (welcome email)

On-site:
Local hub (FastAPI + Postgres/SQLite, InsightFace, QR signer, outbox)
    ├── Volunteer face stations (LAN)
    ├── QR scanners / manual lookup
    └── Cloud sync worker ──► AWS API → RDS/S3/SES
```

### 6.1 Component responsibilities

| Component | Owns | Does not own |
|---|---|---|
| In-site React form | Intake UX, client validation, photo capture | Server-side validation, dedupe, embeddings |
| Registration pipeline | Server validation, dedupe, photo quality, S3 upload, embedding build | Live arrival flow |
| FastAPI backend (AWS) | Admin APIs, status/ticket API, sync ingestion, reporting | Face inference during the event |
| Cloudflare | Static UI, Access auth for staff, WAF, rate limits, caching of public assets | PII storage, biometrics |
| Local hub | Participant cache, face matching, QR signing, attendance, outbox, reconciliation | Long-term storage |
| Volunteer stations | Camera capture, candidate review, QR display/print | Direct cloud writes |
| SES | Welcome email delivery, bounce/complaint handling | QR generation |

---

## 7. End-to-end workflow

### 7.1 Phase A — Pre-event (T-14 to T-3 days)

1. **Participant submits the in-site React form:** name, email, phone, institution, category, photo, consent, accessibility needs.
2. **Registration pipeline** validates the submission, deduplicates by email/submission ID, checks photo quality, uploads the photo to S3, and creates the participant with status `IMPORTED` or `PHOTO_REJECTED`.
3. **Embedding build** runs locally (office workstation or import machine) with the same InsightFace model/version; embeddings go to Postgres and into the sync bundle.
4. **Pre-event sync** builds a versioned manifest of participants, embeddings, photo hashes, and deletions; the local hub and stations download and verify it before event day.

### 7.2 Phase B — Arrival desk (event day)

1. Volunteer scans the participant's face on a local station.
2. Station matches against the local embedding cache and shows the top candidates with similarity.
3. Volunteer confirms identity using the photo and a secondary identifier (name/institution/ID).
4. Hub marks arrival (`ARRIVED`), records the verification method and station.
5. Hub issues a **signed, event-scoped QR token** (Ed25519 or HMAC), stores the issuance audit record, and displays/prints the QR.
6. Hub writes a welcome-email outbox record; the sync worker sends it through SES within minutes.
7. If email fails or the participant has no mailbox, the desk prints or shows the QR.

### 7.3 Phase C — Event entry and sessions

1. QR scans at entry/sessions verify the signature, check expiry/scope, and detect duplicates.
2. Event entry is one-time; session scans are allowed per session and may require volunteer photo verification.
3. Every scan writes attendance locally with `client_event_id`, `client_marked_at`, and `station_id`.
4. Manual fallback (search by name/email/ID) exists for lost QR, damaged print, or camera failure.

### 7.4 Phase D — Sync and cloud visibility

1. Hub batches attendance, QR issuance, and email status to AWS using idempotency keys.
2. Cloud API applies changes transactionally and returns per-item accept/reject results.
3. Cloud dashboard shows near-real-time or last-synced data with a clear freshness indicator.
4. Reconciliation report compares forms received → imported → embedding-ready → arrived → QR issued → checked in → emails sent.

### 7.5 Phase E — Post-event

1. Freeze writes, export attendance, reconcile counts.
2. Generate participation/speaker/volunteer certificates with public verification codes.
3. Publish analytics summary.
4. Purge photos/embeddings per retention policy; retain attendance/audit per policy.
5. Write a short postmortem and keep the manifest for audit.

---

## 8. Data model changes

### 8.1 Participant status machine

```
IMPORTED → PHOTO_VALIDATED → EMBEDDING_READY → SYNCED → ARRIVED → QR_ISSUED → CHECKED_IN
```

Exception states:

```
PHOTO_REJECTED · DUPLICATE · CANCELLED · NO_SHOW · BLOCKED
```

Rules:

- Only `EMBEDDING_READY` participants are included in the pre-event sync manifest.
- Only `SYNCED` participants can be matched at an arrival station.
- `QR_ISSUED` is reachable only from `ARRIVED`.
- `CHECKED_IN` requires a verified QR scan at event entry (or manual override with reason).
- Transitions are append-only audit events; the status column is a materialized current value.

### 8.2 New / changed tables

| Table | Purpose | Key fields |
|---|---|---|
| `events` | Event scoping | `id`, `code`, `name`, `starts_at`, `ends_at`, `timezone`, `venue`, `status` |
| `participants` (extend) | Identity + provenance | `event_id`, `source` (`SITE_FORM`/`WALK_IN`/`ADMIN`), `submission_id`, `consent_version`, `consented_at`, `photo_s3_key`, `photo_hash`, `status`, `embedding_status` |
| `face_embeddings` (extend) | Biometric quality + versioning | `model_name`, `model_version`, `dimension`, `quality_score`, `is_active`, `source_photo_hash` |
| `registration_jobs` | Submission/batch traceability | `id`, `source`, `submission_id`, `rows_total`, `rows_accepted`, `rows_rejected`, `report_s3_key`, `started_at`, `finished_at`, `actor` |
| `qr_tokens` | Signed QR issuance | `jti`, `participant_id`, `event_id`, `scope` (`ENTRY`/`SESSION`/`GENERAL`), `issued_at`, `expires_at`, `issued_by`, `station_id`, `signature_alg`, `revoked_at` |
| `attendance` (extend) | Offline/idempotent writes | `client_event_id` (unique), `client_marked_at`, `station_id`, `method`, `verified_by`, `note`, `is_void`, `void_reason` |
| `email_outbox` | Reliable welcome mail | `id`, `participant_id`, `template`, `payload_json`, `status`, `attempts`, `next_attempt_at`, `provider_message_id`, `sent_at`, `last_error` |
| `audit_log` | Accountability | `id`, `actor_id`, `actor_role`, `action`, `entity`, `entity_id`, `before_json`, `after_json`, `ip`, `user_agent`, `created_at` |
| `sync_batches` | Hub → cloud reconciliation | `batch_id`, `hub_id`, `cursor_from`, `cursor_to`, `item_count`, `accepted_count`, `rejected_count`, `checksum`, `received_at` |

### 8.3 Indexes and constraints

- `participants`: unique `(event_id, lower(email))`; unique `(event_id, submission_id)` where `submission_id` is not null.
- `attendance`: keep the existing one-entry-per-participant guard; add `UNIQUE (client_event_id)`.
- `qr_tokens`: unique `jti`; index `(participant_id, event_id, scope)`; expiry check in application layer.
- `face_embeddings`: index `(participant_id, is_active)`; add pgvector HNSW index when moving matching to the database.
- All PII tables carry `event_id` from day one to avoid a painful migration later.

---

## 9. API surface changes

### 9.1 New endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/register` | Public in-site form submission with photo upload, validation and dedupe |
| `GET` | `/api/registrations/{id}` | Submission status + validation report |
| `POST` | `/api/imports/batch` | Optional admin CSV/JSON bulk import (dry-run supported) |
| `POST` | `/api/participants/{id}/embedding` | Build/rebuild embedding (admin) |
| `GET` | `/api/sync/manifest` | Versioned manifest for hub pre-sync |
| `GET` | `/api/sync/bundle/{manifest_id}` | Download bundle (participants + embeddings + photo hashes) |
| `POST` | `/api/arrivals` | Mark arrival from hub, idempotent by `client_event_id` |
| `POST` | `/api/qr/issue` | Issue signed QR for an arrived participant |
| `POST` | `/api/qr/verify` | Verify signature/scope/duplicate, return participant + check-in decision |
| `POST` | `/api/attendance` | Idempotent check-in write (entry or session) |
| `POST` | `/api/attendance/{id}/void` | Undo with reason + audit (admin) |
| `POST` | `/api/sync/batches` | Bulk hub upload with per-item results |
| `GET` | `/api/tickets/{token}` | Participant status/ticket page data (signed token) |
| `POST` | `/api/emails/{id}/resend` | Resend welcome email (admin/volunteer) |

### 9.2 Changed endpoints

- `GET /api/embeddings/sync` → requires station/hub authentication **or is removed** in favor of `/api/sync/bundle`.
- All participant/attendance reads → require staff auth or a signed ticket token.
- `POST /api/participants` (native registration) → demoted to a staff-only walk-in endpoint; same validation path as the importer.
- QR endpoints → reject legacy unsigned payloads after the cutover.

### 9.3 Contract rules

- Every mutating request accepts `Idempotency-Key` or `client_event_id`.
- Every list endpoint supports cursor pagination and `event_id`.
- Errors use a consistent shape: `{code, message, details, request_id}`.
- Timestamps are UTC ISO-8601 with `Z`; the UI renders in `Asia/Kolkata`.
- Public endpoints are rate-limited at Cloudflare and at the API.

---

## 10. Security, privacy, and compliance

This is now more important because photos, embeddings, and registration data move to S3.

| Control | Requirement |
|---|---|
| AuthN | Cloudflare Access for staff paths; short-lived API tokens for hub/stations; no shared volunteer accounts |
| AuthZ | Role checks on every PII/biometric route; station tokens scoped to event + endpoint |
| S3 | Block Public Access, SSE-KMS, versioning, access logging, lifecycle, deny-by-default bucket policy |
| Presigned URLs | Short TTL (5–15 min), content-type constrained, audit-logged issuance |
| QR | Signed payload (Ed25519 or HMAC-SHA256), `jti`, scope, expiry, revocation list |
| PII in logs | Redact emails, phone numbers, embeddings, photo keys; never log tokens |
| Secrets | AWS Secrets Manager/SSM; no `.env` with production values in the image |
| Default creds | Remove seeded admin/volunteer; force first-run setup or one-time invite |
| Consent | Explicit biometric consent text + version + timestamp; refusal path uses manual ID |
| Retention | Photos/embeddings deleted N days post-event; attendance kept per policy; documented |
| Transport | HTTPS everywhere (Cloudflare edge + AWS ALB); HSTS; camera pages never on plain HTTP |
| Auditing | Every PII read/write, QR issue/verify, attendance void, and import recorded |
| Backups | RDS automated backups + PITR; S3 versioning; quarterly restore drill |
| Rate limits | Login, QR verify, ticket lookup, import upload |
| Dependency hygiene | Lockfiles, `pip-audit`/`npm audit` in CI, pinned base images |

**Threat model focus:** forged QR, replay of check-in requests, leaked embeddings, stolen volunteer device, malicious import file, S3 object enumeration, email spoofing, insider data export, and DoS on public ticket lookup.

---

## 11. Implementation phases

Estimates assume 2–3 engineers with part-time design/ops support.

### Phase 0 — Lock decisions and contracts (3–5 days)

- Confirm the three blocking decisions in §5.1.
- Define React form field names and the submission JSON schema (Appendix A).
- Freeze the participant status machine (§8.1).
- Define QR scope and token format (Appendix B).
- Define the sync protocol, manifest, and idempotency keys (Appendix C).
- Write a one-page threat model and a data-retention policy.

**Deliverable:** frozen schema, API contract, migration plan, QR format, manifest format.
**Exit criteria:** sign-off from the event owner and the engineering lead.

### Phase 1 — AWS/Cloudflare foundation (1 week)

- Create S3 bucket: private, Block Public Access, SSE-KMS, versioning, access logging, lifecycle rules.
- Create RDS/Aurora Postgres with pgvector in `ap-south-1` (Mumbai).
- Configure SES: verify domain, DKIM/SPF/DMARC, request production access early.
- Configure IAM roles: backend, registration worker, hub sync; no AWS keys on volunteer laptops.
- Create Cloudflare Pages project, custom domain, Access policies for `/admin/*` and `/volunteer/*`, WAF/rate limits, cache rules.
- Add secrets management, `.dockerignore`, and deployment configs.
- Add health checks, structured logging, and error tracking.

**Deliverable:** staging environment where Cloudflare Pages calls an AWS FastAPI backend and writes to S3/RDS.
**Exit criteria:** end-to-end smoke test from a browser through Cloudflare to S3/RDS.

### Phase 2 — React registration pipeline and S3 (1–1.5 weeks)

- Build the public `POST /api/register` endpoint plus the React form; validate, deduplicate and return a submission ID with a clear status.
- Accept photo upload directly from the browser as multipart form data; validate one face, resolution, brightness/blur; resize; strip EXIF; upload to S3.
- Add rate limiting, bot protection and upload-size limits to the public endpoint.
- Generate embeddings locally; store `model_version`, `quality_score`, `is_active`.
- Add `RegistrationJob`, `source`, `submission_id`, `consent_version`, `consented_at`, `photo_s3_key`, `embedding_status`, `audit_log`.
- Migrate existing local uploads to S3 with checksum verification.
- Retain an optional admin batch CSV/JSON import for legacy data and assisted walk-ins.

**Deliverable:** 1,000 test submissions with a clear report of valid/duplicate/missing-photo/invalid-photo records.
**Exit criteria:** re-submitting the same data is a no-op; spot-check photos match participants.

### Phase 3 — Local hub, arrival, QR, welcome email (1 week)

- Build the local hub: reuse FastAPI models, run Postgres/SQLite locally, load the sync manifest, run local InsightFace matching, sign QR tokens, write attendance and outbox records.
- Build the station flow: face scan → candidate list/similarity → volunteer confirm → issue QR → print/show/email.
- Add `QrToken`/`QrIssuance` tables with `jti`, scope, issued_at, expires_at, used_at, station_id, similarity, verified_by.
- Add `POST /api/arrivals` and `POST /api/qr/verify`; enforce idempotency and duplicate rules.
- Build the SES welcome-email template + outbox worker with retry/backoff and delivery log.
- Add print fallback and resend-email action.

**Deliverable:** a complete local arrival → QR → welcome-email flow that works with the internet disconnected, then syncs.
**Exit criteria:** 20 staff-run walkthroughs with no manual database fixes.

### Phase 4 — Offline resilience, admin operations, live dashboard (1 week)

- Add `client_event_id` UUID, `client_marked_at`, `station_id` to attendance; make retries idempotent.
- Add local `checked_in_ids` and pending queue; status bar shows "Offline — N pending"; drain on reconnect.
- Add admin edit/re-upload/reprocess/void/undo, soft-delete guards, and audit log.
- Add import dashboard and reconciliation report.
- Add live ops dashboard: arrival throughput, queue depth, no-shows, session attendance, volunteer station performance.

**Deliverable:** event-day operations console and a passing offline drill.
**Exit criteria:** simulated 2-hour internet outage with zero data loss and zero duplicates.

### Phase 5 — Rehearsal and hardening (3–5 days)

- Load test 1,000 synthetic participants: import, embedding build, sync to 4–6 stations.
- Test 1,000 simulated arrivals; measure per-person time; tune desk count.
- Cut internet mid-flow; verify local check-in, queue, reconnect, and reconciliation.
- Test SES deliverability to Gmail/Outlook/Indian providers; check spam/bounce handling.
- Test QR scan, duplicate scan, wrong participant, expired token, and manual fallback.
- Test browser camera over HTTPS and the native local app.
- Security review: S3 access, presigned URL TTL, Cloudflare Access, secrets, PII logging, retention.

**Deliverable:** signed rehearsal report and a go/no-go checklist.

### Phase 6 — Event day and post-event

- Runbook, station checklist, backup power/network, escalation contacts.
- Local dashboard for ops; cloud dashboard for remote stakeholders.
- Post-event: exports, certificates, analytics, retention purge, postmortem.

---

## 12. Feature backlog

### P0 — must-have for this event

1. **Security and privacy hardening** — authenticate all PII/biometric reads, private S3, signed QR, Cloudflare Access/WAF, default-credential removal, consent/retention, audit log.
2. **React registration pipeline** — form schema, server validation, dedupe, photo quality gate, S3 upload, embedding build, submission report.
3. **Local-first arrival and QR issuance** — local hub, local face match, signed QR, QR verification, print/email fallback.
4. **Welcome email pipeline** — SES, outbox, template, retry, delivery log, resend.
5. **Offline check-in and idempotent sync** — local operation plus reliable cloud reconciliation.
6. **Data correction and audit** — edit/re-embed, undo attendance, soft-delete guards, import reconciliation.
7. **Operational readiness** — health checks, backups, monitoring, tests/CI, HTTPS for camera access, nginx upload limits, `.dockerignore`, migrations run once.

### P1 — high value, can follow the core flow

1. **Participant status/ticket page** — signed link to view/download QR, event details, schedule, and "resend email."
2. **Live arrival/check-in analytics** — registered → imported → arrived → QR issued → checked in → sessions; throughput, no-shows, category/institution breakdown, volunteer performance.
3. **Admin import and reconciliation console** — upload JSON, review errors, fix photos, re-run import, compare hub/cloud counts.
4. **Certificates with public verification** — participation/speaker/volunteer certificates, PDF generation, verification page.
5. **Accessibility and inclusion** — accessible landing/form/status/email instructions, assisted registration, QR print fallback, English/Odia/Hindi where controllable. The in-site form is fully under our control, so it must meet the same accessibility standard as the rest of the site.
6. **Minimal Event model** — add `events` and `event_id` now, even for one event.

### P2 — strategic / after this event

1. **Full multi-event support** — event-scoped registrations, branding, admin switcher, public event pages.
2. **Notifications platform** — campaigns, reminders, SMS/WhatsApp, delivery webhooks, opt-out.
3. **Kiosk/self-service check-in and badge printing** — tablet kiosk, QR/face capture, staff override, badge printer.
4. **Face pipeline scale and anti-spoofing** — at 1,000 participants the current Python cosine loop is fine; for larger/multi-event scale add pgvector HNSW + `<=>` queries, async inference, configurable threshold, match-attempt audit, liveness/anti-spoof.
5. **Registration workflow extensions** — capacity/waitlist, ticket types/approval, email verification. These can now be enforced in the React form and its API; add them after the core flow.

---

## 13. How this reprioritizes the previous research

| Item | Previous priority | New priority | Reason |
|---|---|---|---|
| Offline check-in | P1 | **P0** | Meeting requires local operation with cloud storage |
| Participant self-service | P1 (second portal) | P1 (status/ticket page) | The React form is the intake; portal becomes a status/ticket view |
| Email | Later notification feature | **P0** | Welcome email is a meeting requirement |
| Multi-event | P2 | Minimal `Event` model now, full later | Avoid hardcoding; cheap now, costly later |
| Certificates | P1/post-event | P1/post-event | Unchanged |
| Accessibility | Broad app-wide | Form, landing page, email, assisted flow | The in-site form must meet the same standard as the rest of the site |
| Native `/register` | Primary intake | Primary in-site intake | One source of truth; no external handoff |

---

## 14. Non-functional targets and acceptance criteria

| Area | Target |
|---|---|
| Arrival throughput | 95% of arrivals completed in under 30 seconds |
| QR verification | 99% of scans under 2 seconds |
| Welcome email | >95% delivered within 5 minutes of QR issuance |
| Duplicate check-ins | Zero |
| Offline tolerance | 2-hour internet outage with zero data loss |
| Sync reconciliation | Zero unexplained variance between hub and cloud |
| Face match | False-accept rate acceptable to event owner; volunteer confirmation mandatory |
| Availability | Local flow independent of internet; cloud dashboard best-effort during event |
| Recovery | Hub restart loses no accepted check-ins (durable local store) |
| Privacy | Photos/embeddings removed per retention policy; access fully audited |

---

## 15. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Public form abuse or fake registrations | Medium | High | Rate limit, bot protection, duplicate detection and upload-size limits; manual review of suspect submissions |
| Cloudflare/AWS boundary confusion | Medium | Medium | Write one ADR; deploy a thin staging spike before feature work |
| Welcome emails go to spam or fail | Medium | High | SES production access, DKIM/SPF/DMARC, warm-up, delivery logs, print fallback |
| Venue network fails | High | High | Local hub + offline queue + airplane-mode rehearsal; 4G backup |
| Browser camera blocked on LAN HTTP | High | Medium | Native local app for face stations; local TLS/Cloudflare Tunnel for browser QR scanners |
| Data divergence between Forms, hub, and cloud | Medium | High | Idempotency keys, version cursor, reconciliation report, audit log |
| S3 PII exposure | Low | Severe | Private bucket, presigned URLs, no Cloudflare caching of PII, Access/WAF, audit |
| Face match false accept/reject | Medium | High | Tune threshold, volunteer confirmation, manual fallback, photo quality gate, later liveness |
| Arrival queue too slow | Medium | High | 4–8 desks, pre-sync, print/email in parallel, measure in rehearsal |
| Scope creep into multi-event/notifications/kiosk | High | Medium | Freeze P0/P1; defer P2 until after the event |
| Single engineer dependency | Medium | High | Document runbooks; pair on hub and importer; rehearse with the actual operators |

---

## 16. Event-day runbook outline

**T-1 day**

- Freeze imports and embeddings; publish final manifest hash.
- Sync all hubs/stations; verify participant counts match.
- Charge devices, test printers, label stations, print fallback sheets.
- Verify SES sending quota and test email to 3 providers.

**Event morning**

- Power on hub, verify local DB integrity and manifest version.
- Network check: LAN, internet, 4G backup.
- Smoke test: face scan → QR → scan → email on one test participant.
- Assign desk leads and escalation contacts.

**During the event**

- Watch queue depth and per-person time; open desks if >2 minutes.
- Monitor sync lag and pending queue; do not restart the hub casually.
- Log every manual override with a reason.

**Close**

- Stop new arrivals; drain sync; export local attendance snapshot.
- Reconcile counts; sign off with the event owner.
- Back up hub DB to encrypted storage.

---

## 17. Immediate next 10 steps

1. Confirm the open decisions in §5 — especially face photo, Cloudflare scope, S3 vs DB, QR scope, and hub vs direct cloud sync.
2. Freeze the React form field names and submission JSON schema; collect 5 real sample submissions.
3. Provision S3 (private/KMS/lifecycle), RDS Postgres/pgvector, SES, IAM, and Cloudflare Pages/Access/WAF in staging.
4. Build the registration endpoint with dedupe, photo quality report, S3 upload, and embedding status.
5. Build the versioned sync manifest and pre-sync bundle for the local hub.
6. Build the local hub prototype: participant cache, local face match, QR signing, attendance, outbox.
7. Build the arrival endpoint + signed QR + SES welcome-email template/outbox.
8. Build the participant ticket/status page and admin import/reconciliation screens.
9. Add idempotency keys, offline queue, audit log, and Cloudflare Access protection.
10. Rehearse with 100–200 synthetic participants and 4–6 stations, including an internet cut; then repeat at 1,000.

---

## Appendix A — Registration form fields and submission JSON

### A.1 Required form fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `full_name` | Short answer | Yes | As on ID |
| `email` | Short answer | Yes | Unique per event |
| `phone` | Short answer | Yes | E.164 or 10-digit Indian format |
| `institution` | Short answer | Yes | School/company/org |
| `category` | Multiple choice | Yes | Student / Researcher / Professional / Speaker / Other |
| `photo` | File upload | Yes | One face, plain background, min 640px |
| `consent_biometric` | Checkbox | Yes | Explicit consent text |
| `accessibility_needs` | Paragraph | No | Free text |
| `dietary_preference` | Multiple choice | No | Optional |
| `session_interest` | Checkboxes | No | Optional |

### A.2 Normalized import record

```json
{
  "source": "SITE_FORM",
  "submission_id": "c1f0e6d2-...-uuid",
  "client_event_id": "c1f0e6d2-...-uuid",
  "submitted_at": "2026-11-10T09:14:22Z",
  "full_name": "Asha Mohanty",
  "email": "asha@example.com",
  "phone": "+919876543210",
  "institution": "IIT Bhubaneswar",
  "category": "STUDENT",
  "photo": {
    "filename": "capture.jpg",
    "content_type": "image/jpeg",
    "sha256": "..."
  },
  "consent": {
    "biometric": true,
    "version": "2026-11",
    "accepted_at": "2026-11-10T09:14:20Z"
  },
  "accessibility_needs": null
}
```

### A.3 Validation rules

- Email syntax valid; normalized lowercase; unique per event.
- Phone normalized; optional but recommended.
- Photo: exactly one detectable face; min 640×640; blur/brightness thresholds; no EXIF GPS after processing.
- Consent must be true; otherwise status `BLOCKED` with reason `NO_CONSENT`.
- Duplicate `submission_id` or email → `DUPLICATE`, linked to the original record.

---

## Appendix B — QR token format

**Payload (before signing):**

```json
{
  "v": 1,
  "jti": "9f1c2b7e-4a6d-4c2f-9b1a-2f6a8e0d3c11",
  "sub": "participant:1234",
  "evt": "oas-2026",
  "scp": "ENTRY",
  "iat": 1763600000,
  "exp": 1763686400,
  "iss": "geekai-hub-01"
}
```

**Encoding:** `base64url(payload) + "." + base64url(signature)`.

**Signing:** Ed25519 preferred (public key embedded in scanners); HMAC-SHA256 acceptable if all verifiers hold the shared secret.

**Verification order:**

1. Format and base64 decode.
2. Signature valid for `iss`.
3. `v` supported; `evt` matches the active event.
4. `exp` not passed; `jti` not revoked.
5. Scope allowed at this checkpoint.
6. Duplicate rule: `ENTRY` once per participant; `SESSION` once per `(participant, session)`.
7. Record attendance and return the participant display record.

**Revocation:** `qr_tokens.revoked_at` plus a hub-side deny list refreshed on sync. Never rely on the QR image alone for identity.

---

## Appendix C — Sync manifest and batch format

### C.1 Manifest

```json
{
  "manifest_id": "2026-11-18T18:00:00Z-7f3a",
  "event_id": "oas-2026",
  "generated_at": "2026-11-18T18:00:00Z",
  "schema_version": 2,
  "counts": { "participants": 1042, "embeddings": 1039, "deletions": 3 },
  "cursor": { "from": 0, "to": 4711 },
  "files": [
    { "name": "participants.ndjson", "sha256": "...", "bytes": 812345 },
    { "name": "embeddings.f32", "sha256": "...", "bytes": 2134016 },
    { "name": "photos.index.json", "sha256": "...", "bytes": 91234 }
  ],
  "deletions": [ { "participant_id": 88, "reason": "WITHDRAWN" } ]
}
```

### C.2 Hub upload batch

```json
{
  "batch_id": "hub01-2026-11-20T10-15-00Z-0007",
  "hub_id": "hub01",
  "schema_version": 2,
  "items": [
    {
      "type": "ATTENDANCE",
      "client_event_id": "c1f0e6d2-...",
      "client_marked_at": "2026-11-20T10:14:51Z",
      "participant_submission_id": "c1f0e6d2-...-uuid",
      "session_external_id": null,
      "method": "QR",
      "station_id": "desk-3"
    },
    {
      "type": "QR_ISSUANCE",
      "client_event_id": "a7b3...",
      "jti": "9f1c2b7e-...",
      "participant_submission_id": "c1f0e6d2-...-uuid",
      "scope": "ENTRY",
      "issued_at": "2026-11-20T10:14:40Z",
      "station_id": "desk-3"
    }
  ]
}
```

**Response:** per-item `accepted` / `duplicate` / `rejected` with reason codes; the hub only clears items that were accepted or confirmed duplicate.

**Invariants:**

- The hub is the single writer during the event.
- `client_event_id` is generated once and reused on retry.
- Deletes are tombstones, never silent removals.
- Cloud rejects unknown participants rather than creating placeholders.

---

## Appendix D — Environment and secrets checklist

| Item | Where | Notes |
|---|---|---|
| `DATABASE_URL` | AWS Secrets Manager | RDS, TLS required, pooler for serverless |
| `S3_BUCKET`, `S3_REGION` | SSM Parameter Store | `ap-south-1` |
| `S3_KMS_KEY_ID` | SSM | SSE-KMS |
| `SES_REGION`, `SES_FROM` | SSM | Verified domain, DKIM enabled |
| `JWT_SECRET` / `QR_SIGNING_KEY` | Secrets Manager | Rotate pre-event; Ed25519 private key never leaves hub |
| `CLOUDFLARE_API_TOKEN` | CI secret | Pages deploy only |
| `HUB_ID`, `HUB_TOKEN` | Provisioned per device | Scoped, revocable |
| `SENTRY_DSN` (or equivalent) | SSM | Error tracking, PII scrubbing on |

**Rules:** no secrets in git, no secrets in the frontend bundle, no long-lived AWS keys on volunteer laptops, rotate everything after the event.

---

## Appendix E — Definition of done

**A feature is done when:**

- [ ] Happy path and at least one failure path tested.
- [ ] AuthZ enforced and covered by a test.
- [ ] Audit event written for state changes.
- [ ] Idempotency verified by replaying the request.
- [ ] Logs contain no PII/secrets.
- [ ] Runbook/README updated.
- [ ] Works offline on the hub where applicable.

**The event is ready when:**

- [ ] 1,000-row import rehearsed with a clean report.
- [ ] 4–6 stations synced and verified against the manifest hash.
- [ ] Full arrival → QR → email flow rehearsed end to end.
- [ ] Internet cut drill passed.
- [ ] Email deliverability verified across major providers.
- [ ] Rollback and manual fallback documented and practiced.
- [ ] Retention and deletion job scheduled and tested.

---

*End of document.*
