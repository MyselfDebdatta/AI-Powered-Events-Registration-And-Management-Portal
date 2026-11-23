# GeekAI — Database Planning

**Odisha AI Symposium 2026** · Companion to [WorkFlow.md](WorkFlow.md) and [Backend-Planning.md](Backend-Planning.md)
**Status:** Plan only · 20 November 2026 · Execution order: [Backend-Implementation-Plan.md](Backend-Implementation-Plan.md)

---

## 1. Objective and current state

Extend the existing PostgreSQL/pgvector schema so it can support in-site registration provenance, arrival-first QR issuance, signed token state, offline/idempotent writes, reliable email and auditable operations — without breaking the six tables the delivered frontend already reads.

**Current schema** (`backend/app/models/models.py`): `users`, `participants`, `face_embeddings`, `sessions`, `attendance` (plus Alembic history). Migrations live under `backend/migrations/`.

**Constraints:** additive migrations with safe defaults; no destructive change to columns used by the public/admin frontend; every new PII table carries `event_id`; `WorkFlow.md` §8 is the source of truth for field names.

---

## 2. Target schema

### 2.1 New tables

| Table | Purpose | Key fields |
|---|---|---|
| `events` | Event scoping | `id`, `code`, `name`, `starts_at`, `ends_at`, `timezone`, `venue`, `status` |
| `registration_jobs` | Submission/batch traceability | `id`, `source`, `submission_id`, `rows_total`, `rows_accepted`, `rows_rejected`, `report_s3_key`, `started_at`, `finished_at`, `actor_id` |
| `qr_tokens` | Signed QR state | `jti` (PK), `participant_id`, `event_id`, `scope`, `issued_at`, `expires_at`, `issued_by`, `station_id`, `similarity`, `signature_alg`, `revoked_at`, `used_at` |
| `email_outbox` | Reliable welcome mail | `id`, `participant_id`, `template`, `payload_json`, `status`, `attempts`, `next_attempt_at`, `provider_message_id`, `sent_at`, `last_error` |
| `audit_log` | Accountability | `id`, `actor_id`, `actor_role`, `action`, `entity`, `entity_id`, `before_json`, `after_json`, `ip`, `user_agent`, `request_id`, `created_at` |
| `sync_batches` | Hub → cloud reconciliation | `batch_id` (PK), `hub_id`, `cursor_from`, `cursor_to`, `item_count`, `accepted_count`, `rejected_count`, `checksum`, `received_at` |

### 2.2 Extended tables

**`participants`** — add:

- `event_id` (FK → events, required after backfill)
- `source` enum `SITE_FORM | WALK_IN | ADMIN`
- `submission_id` (UUID from the React form)
- `consent_version`, `consented_at`
- `photo_s3_key`, `photo_hash`, `photo_quality_score`
- `status` (current materialized state)
- `embedding_status` + `import_job_id`
- Keep `email`, `name`, `phone`, `institution`, `category`, `photo_url`, `qr_code_url`, `registered_at` unchanged in shape.

**`face_embeddings`** — add `model_name`, `model_version`, `dimension`, `quality_score`, `is_active`, `source_photo_hash`. Keep `Vector(512)` and `participant_id`.

**`attendance`** — add `client_event_id` (unique), `client_marked_at`, `station_id`, `verified_by`, `note`, `is_void`, `void_reason`, `voided_at`. Keep the existing event-level uniqueness index and `(participant_id, session_id)` constraint.

**`sessions`** — add `event_id`, `external_id`, `capacity` (nullable), `is_active`.

**`users`** — no new columns; remove seed defaults instead. Consider `is_service_account` if hub/station principals are stored as users rather than external tokens.

### 2.3 Participant status machine

```
IMPORTED → PHOTO_VALIDATED → EMBEDDING_READY → SYNCED → ARRIVED → QR_ISSUED → CHECKED_IN
```

Exceptions: `PHOTO_REJECTED`, `DUPLICATE`, `CANCELLED`, `NO_SHOW`, `BLOCKED`.

- Only `EMBEDDING_READY` participants enter the sync manifest.
- Only `SYNCED` participants can be matched at a station.
- `QR_ISSUED` requires `ARRIVED`; `CHECKED_IN` requires a verified QR entry scan or an audited manual override.
- Append every transition to `audit_log`; the status column is the materialized current value.

---

## 3. Indexes and constraints

- `participants`: `UNIQUE (event_id, lower(email))`; `UNIQUE (event_id, submission_id)` where not null; index `(event_id, status)`.
- `face_embeddings`: index `(participant_id, is_active)`; add pgvector HNSW index on `embedding` when matching moves into the database (`vector_cosine_ops`).
- `qr_tokens`: PK `jti`; index `(participant_id, event_id, scope)`; partial unique index on one active `ENTRY` token per participant per event.
- `attendance`: `UNIQUE (client_event_id)`; keep `uq_participant_session` and the partial unique index for event-level attendance; index `(event_id, marked_at)` for live ops.
- `email_outbox`: index `(status, next_attempt_at)` for the worker; index `(participant_id)`.
- `audit_log`: index `(entity, entity_id, created_at)`; index `(actor_id, created_at)`.
- `sync_batches`: unique on `batch_id`; index `received_at`.
- All new FKs use `ON DELETE RESTRICT` for audit/QR records; participant deletion becomes a soft delete (`status = CANCELLED`) to preserve history.

---

## 4. Migration sequence

All migrations are additive and reversible. Create them under `backend/migrations/versions/` in this order:

| # | Migration | Notes |
|---|---|---|
| M1 | `events` table + `event_id` columns (nullable initially) | Backfill one default event from existing event name/date |
| M2 | Participant provenance fields + status defaults | Set existing rows to `IMPORTED` / `SYNCED` as appropriate |
| M3 | Extend `face_embeddings` with version/quality fields | Default `model_name='insightface'`, `model_version` from current install |
| M4 | `registration_jobs`, `audit_log` | No data migration. `audit_log` is pulled forward into the G1 security stage (S1) so audit exists before any real PII; `registration_jobs` lands with the intake stage. |
| M5 | `qr_tokens` | Legacy unsigned QR codes are **not** migrated; they must be reissued |
| M6 | `attendance` offline/idempotency fields | `client_event_id` nullable for legacy rows; backfill with deterministic UUIDs |
| M7 | `email_outbox`, `sync_batches` | No data migration |
| M8 | Add constraints/indexes after backfill | Make `event_id` non-null; add unique constraints and HNSW index |
| M9 | Remove default-credential seeding path | Application change paired with migration; verify a fresh DB cannot log in with defaults |

**Rollback:** each migration has a `downgrade()` that drops only what it added. Take a verified RDS snapshot before M1 and before M8.

---

## 5. Data migration

1. **Event backfill** — create the single event `oas-2026` from the existing hardcoded name/date; set `event_id` on all existing rows.
2. **Participant source** — existing registrations become `source=ADMIN` or `WALK_IN`; none are marked `SITE_FORM` unless their submission ID is known.
3. **Embeddings** — record actual model name/version and dimension; recompute if the installed model differs from the one used to create existing vectors. A wrong model version makes face matching unreliable.
4. **Photos** — copy `backend/uploads/photos/*` to S3 under `photos/{event_code}/{participant_id}/`, verify SHA-256, set `photo_s3_key`, then keep local copies only for the hub bundle.
5. **QR codes** — delete legacy unsigned PNGs from the flow; they carry `{"participant_id", "name"}` and are forgeable. Issue new signed tokens at arrival.
6. **Attendance** — keep history; set `is_void=false`, backfill `client_event_id` deterministically, never rewrite `marked_at`.
7. **Users** — create real admin/volunteer accounts through the one-time setup flow; remove seeded default accounts after handover.

---

## 6. Backup, retention and privacy

- RDS automated backups + PITR; snapshot before each major migration and at T-1.
- S3 versioning, object lock optional for audit exports, lifecycle rules for raw JSON and temporary bundles.
- Retention policy to be signed before collection: delete photos/embeddings N days after the event; keep attendance/audit per university policy; document the exact N.
- Implement purge jobs as idempotent scripts with a dry-run and a signed deletion report.
- No production PII in local dev databases; use synthetic fixtures.

---

## 7. Validation queries (run after each gate)

- Count participants by `event_id, status, source` and compare with the registration report.
- Count embeddings by `model_version, is_active`; every `EMBEDDING_READY` participant has exactly one active embedding.
- Count `qr_tokens` by `scope, revoked_at`; no active `ENTRY` token for a participant who already has event-level attendance unless intentionally reissued.
- `attendance`: zero rows with duplicate `client_event_id`; zero duplicate event-level rows; void rows retain a reason.
- `email_outbox`: no row stuck in `PENDING` past the retry window; counts reconcile with `QR_ISSUED`.
- `audit_log`: every status transition and void has an entry.
- Cross-check frontend admin dashboard numbers against these queries during rehearsal.

---

## 8. Acceptance criteria

- All migrations apply cleanly on a fresh database and upgrade the existing database without data loss.
- `WorkFlow.md` §8 fields exist with the documented types and constraints.
- Existing endpoints continue to return the same response shapes the frontend consumes.
- Re-submitting the same payload produces no duplicate participants or embeddings.
- Replaying a sync batch produces no duplicate attendance or QR records.
- Legacy unsigned QR data is absent from the active flow.
- Backup/restore drill succeeds on a staging copy of the production schema.

---

## 9. Open questions

1. Region and instance class for RDS; confirm `ap-south-1` (Mumbai) and pgvector availability.
2. Retention window for photos/embeddings and attendance/audit.
3. Should `events` be a single row now with full multi-event UI deferred? (Recommendation: yes.)
4. Are hub databases SQLite or local Postgres? (Recommendation: SQLite for stations, Postgres or durable SQLite for the hub, both loaded from the same manifest.)
5. Who approves destructive migrations and purge runs?
6. What abuse-prevention data (IP hash, user agent) must be retained for registrations?
