# GeekAI — Backend Planning

**Odisha AI Symposium 2026** · Companion to [WorkFlow.md](WorkFlow.md) and [WorkFlow-After-Frontend-Redesign.md](WorkFlow-After-Frontend-Redesign.md)
**Status:** Plan only · 20 November 2026 · Execution order: [Backend-Implementation-Plan.md](Backend-Implementation-Plan.md)

---

## 1. Objective and current state

Deliver the API and service layer that turns the completed, flag-gated frontend into a working event system, while closing the P0 security gaps before any real participant data is stored.

**Live today:** `auth`, `participants`, `sessions`, `attendance` (including legacy `face-match` and unsigned `validate-qr`), `embeddings/sync`, `admin` (dashboard, volunteers, exports). All are FastAPI routers under `backend/app/api/`.

**Missing:** signed QR issuance/verification, arrival writes, import ingestion, sync manifest/batch, ticket tokens, attendance void, live ops, reconciliation, audit, settings, analytics, and a reliable email pipeline. The frontend's exact expectations are encoded in `frontend/src/lib/arrivalApi.js` and `frontend/src/content/flags.js`.

**Rules:** no invented endpoints; WorkFlow.md §8–§9 is the contract source; every mutating route is idempotent; every PII/biometric route is authenticated and audited.

---

## 2. API contract to implement

### 2.1 Arrival and signed QR — the critical path

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| `POST` | `/api/arrivals` | `participant_id`, `client_event_id`, `station_id`, `desk_id`, `method`, `similarity`, `reason`, `client_marked_at` | `{status: "ARRIVED", arrived_at, already_arrived: bool}` | Idempotent on `client_event_id`; distinct `already_arrived` vs `already_checked_in` states |
| `POST` | `/api/qr/issue` | `participant_id`, `client_event_id`, `station_id`, `desk_id`, `scope="ENTRY"` | `{token, pass_id, jti, scope, expires_at, issued_at}` | Requires `ARRIVED`; signs with Ed25519/HMAC; audit `QR_ISSUED` |
| `POST` | `/api/qr/verify` | `token`, `scope`, `session_id`, `station_id`, `desk_id`, `client_event_id` | `{decision, participant, reason, scope, session}` | Decision is one canonical uppercase value from §2.2 |
| `POST` | `/api/attendance/{id}/void` | `{reason}` | `{id, is_void, void_reason, voided_at}` | Admin only; mandatory reason; audit before/after |

Frontend normalizers already accept both flat and nested `{qr: {token, ...}}` shapes; emit the flat shape and keep `pass_id` and `jti` populated.

### 2.2 Canonical verify decisions

The frontend maps: `VALID|ACCEPTED|ALLOWED|OK → valid`; `DUPLICATE|ALREADY_CHECKED_IN|ALREADY_MARKED → duplicate`; `EXPIRED → expired`; `WRONG_SCOPE|WRONG_EVENT|WRONG_CHECKPOINT → wrong-scope`; `INVALID|INVALID_SIGNATURE|REJECTED|REVOKED → invalid`. **Emit exactly one of those uppercase codes** and never rely on free-text to drive UI state.

Verification order (WorkFlow Appendix B): format/base64 → signature → `v`/`evt` → `exp` → `jti` revocation → scope → duplicate rule → attendance write. A hand-made `{"participant_id": 1}` payload must be rejected before any database write.

### 2.3 Face match (keep compatible)

`POST /api/attendance/face-match` currently exists and the arrival desk uses it. Extend its response with the fields the UI already reads:

```
candidates: [{ participant: {...}, similarity: number }],
threshold: number,
matched: bool,
low_confidence: bool,
already_arrived: bool, arrived_at: string|null,
already_checked_in: bool, checked_in_at: string|null,
message: string|null
```

Long-term, matching moves to the local hub (§4); the cloud endpoint remains for review/walk-in only and must be authenticated.

### 2.4 Intake, sync and tickets

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/register` | Public in-site form submission (JSON + photo); returns `submission_id`, status |
| `GET` | `/api/registrations/{id}` | Submission status, validation report |
| `POST` | `/api/imports/batch` | Optional admin CSV/JSON bulk import; `dry_run` supported |
| `GET` | `/api/sync/manifest` | Versioned manifest (WorkFlow Appendix C) |
| `GET` | `/api/sync/bundle/{manifest_id}` | Versioned participant/embedding/photo-hash bundle |
| `POST` | `/api/sync/batches` | Hub batch with per-item `accepted|duplicate|rejected` + reason codes |
| `GET` | `/api/tickets/{token}` | Signed-link status/ticket payload for status and ticket pages |
| `POST` | `/api/emails/{id}/resend` | Resend welcome email; admin/volunteer only |

### 2.5 Admin operations (flag-gated screens)

| Flag | Endpoint needed | Data source |
|---|---|---|
| registrationForm (planned) | in-site form + submission list | `registration_jobs` |
| `LIVE_OPS` | `GET /api/admin/live-ops` | arrivals, queue depth, station status, sync lag |
| `RECONCILIATION` | `GET /api/admin/reconciliation` | forms → imported → embedding-ready → arrived → QR issued → checked in → emails sent |
| `AUDIT_V2` | `GET /api/admin/audit` | `audit_log` with cursor pagination and filters |
| `SETTINGS_V2` | `GET/PUT /api/admin/settings` | `events` + event-scoped settings |
| `ANALYTICS_V2` | `GET /api/admin/analytics` | post-event aggregates |
| `VOID_ATTENDANCE` | void endpoint in §2.1 | `attendance` + audit |

The existing `/api/admin/dashboard` and `/api/admin/export/*` stay as-is in shape; add `event_id` scoping without breaking the frontend.

---

## 3. Service-layer changes

### 3.1 QR signing service — `backend/app/services/qr_signing.py`

- Payload: `{v, jti, sub, evt, scp, iat, exp, iss}` exactly as WorkFlow Appendix B.
- Ed25519 preferred; HMAC-SHA256 acceptable only if all verifiers are trusted. Private key in Secrets Manager; public key distributable to scanners.
- Encode `base64url(payload).base64url(signature)`. QR image is rendered from the server token only — never from client-supplied JSON.
- Functions: `issue(participant, scope, station) -> token_record`, `verify(token, scope, session) -> decision`, `revoke(jti, reason)`.
- Enforce one-time `ENTRY` attendance and per-session `SESSION` attendance in the same transaction as verify.

### 3.2 Email outbox and SES — `backend/app/services/email_outbox.py`, `workers/email_worker.py`

- Replace `services/email_service.py` SMTP-only path with an outbox write plus a worker that sends via SES.
- Fields: template, payload, status, attempts, next_attempt_at, provider_message_id, sent_at, last_error.
- Retry with exponential backoff and dead-letter after N attempts; log bounces/complaints; expose resend endpoint.
- Welcome email must go out within minutes of QR issuance; if SES is down, the desk can print/show the pass.
- Email body must not claim a QR was emailed at registration (copy-freeze rule).

### 3.3 Storage adapter — `backend/app/services/s3.py`

- Interface: `put_object`, `presigned_get`, `presigned_post`, `delete`, `head`, `copy`.
- Bucket private, SSE-KMS, versioning; presigned TTL 5–15 minutes; no public URLs.
- Migrate `uploads/photos` and `uploads/qrcodes` to S3 with checksum verification; keep `photo_s3_key` on the participant.

### 3.4 Registration service — `services/registration_service.py`

- Backs the public form: normalize → validate → dedupe → photo quality → S3 → embedding status → submission report.
- Re-submitting the same `submission_id`/email is a no-op; optional bulk import supports dry-run.
- Detailed error codes (`DUPLICATE_EMAIL`, `MISSING_PHOTO`, `NO_FACE`, `LOW_QUALITY`, `NO_CONSENT`, `BAD_JSON`) so the admin import screen can show actionable rows.

### 3.5 Sync ingestion — `services/sync_service.py`

- Apply batches transactionally with `client_event_id` uniqueness; return per-item results.
- Reject unknown participants rather than creating placeholders.
- Update a `sync_batches` row with checksum, counts and received_at; feed freshness to `/api/admin/live-ops`.

### 3.6 Face matching evolution

At 1,000 participants the current Python cosine loop is adequate. Keep it for the cloud/walk-in path; move primary inference to the local hub (Local-Hub-Planning.md). Record `model_name`, `model_version`, `quality_score` and match attempts in the audit log. Add pgvector HNSW only if scale grows.

---

## 4. Authentication and authorization

### 4.1 Current problem

`get_current_user` exists in `backend/app/core/deps.py`, but participant/attendance reads and `GET /api/embeddings/sync` are not protected, and default admin/volunteer credentials are seeded in `core/db_init.py`.

### 4.2 Target model

| Principal | Credential | Scope |
|---|---|---|
| Admin user | JWT via `/api/auth/login` | all admin routes, void, exports, audit |
| Volunteer user | JWT via `/api/auth/login` | arrival, verify, manual lookup, queue, desk screens |
| Hub | short-lived scoped token | `/api/sync/*`, `/api/arrivals`, `/api/qr/issue`, `/api/qr/verify` |
| Station | short-lived scoped token | face-match, arrivals, verify; bound to `station_id` |
| Public | signed ticket token only | `/api/tickets/{token}` |

Implement `get_current_admin`, `get_current_staff`, `get_hub_or_station`, and `require_event_scope` dependencies. Add them to **every** route returning PII, biometrics, photos or aggregates. Remove or gate `GET /api/embeddings/sync` in favour of `/api/sync/bundle`.

### 4.3 Route protection matrix

Publish a table in code review showing, for each route: principal, event scope, rate limit, audit event. No route is "public because the frontend needs it" — public screens use signed tickets or flag-gated stubs.

---

## 5. Testing strategy

- `pytest` with async test client; one test module per router.
- **Contract tests** must mirror `frontend/src/lib/arrivalApi.js` normalizers: arrival, issue, verify decisions, face-match candidates, import report, sync batch results, ticket payload.
- Security tests: unauthenticated PII read → 401; volunteer hitting admin route → 403; forged QR → `INVALID` with no attendance write; replayed `client_event_id` → `duplicate` with no second row.
- Idempotency tests: same client_event_id twice, concurrent requests, outbox retry.
- Email tests: outbox write, retry/backoff, resend, bounce handling (provider mocked).
- Registration tests: validation, dedupe, malformed payload, bad photo, replay no-op, rate limit, oversized upload.

CI gate: `pytest`, lint/type check, migration check, and a build of the frontend — all green before merge.

---

## 6. Implementation stages

| Stage | Scope | Files (proposed) | Exit criteria |
|---|---|---|---|
| B1 | Auth refactor + remove default creds + audit foundation | `core/deps.py`, `core/db_init.py`, `api/auth.py`, `models/audit.py` | All PII routes protected; no seeded credentials; G1 passed |
| B2 | QR signing + arrivals + verify + void | `api/arrivals.py`, `api/qr.py`, `services/qr_signing.py`, `api/attendance.py` | Frontend stage-3 flow green against real endpoints |
| B3 | S3 adapter + email outbox + SES worker | `services/s3.py`, `services/email_outbox.py`, `workers/email_worker.py` | Welcome email <5 min; photos served by presigned URL |
| B4 | Registration + sync + tickets | `api/registration.py`, `api/sync.py`, `api/tickets.py`, services | G3 and G4 passed; manifest/batch contract verified |
| B5 | Admin ops endpoints + flag enablement | `api/admin_ops.py`, dashboard/queries | No "Waiting for backend" on event-day build; G5 passed |
| B6 | Hardening, tests, CI, rehearsal support | tests, CI config, monitoring | G6 passed |

Estimates: B1 3–4 days, B2 4–5 days, B3 3–4 days, B4 5–7 days, B5 3–4 days, B6 3–5 days (with two engineers).

---

## 7. Acceptance criteria

- Every endpoint in §2 exists, is documented in OpenAPI, and has a contract test.
- The delivered frontend can run with `ARRIVAL_V2`, `SCAN_V2`, `IMPORTS_V2`, `LIVE_OPS`, `RECONCILIATION`, `AUDIT_V2`, `SETTINGS_V2`, `VOID_ATTENDANCE` and `TICKET_PAGE` ON without a single "Waiting for backend" panel.
- No unauthenticated route returns participant, embedding, attendance, photo or audit data.
- Forged, expired, revoked and wrong-scope QR tokens are rejected with canonical decisions and no writes.
- Replayed events produce no duplicate attendance or QR issuance.
- Welcome email is written to outbox within one second of issuance and delivered within five minutes in rehearsal.
- All mutations write an audit event with actor, entity, before/after and request id.

---

## 8. Open questions

1. Is the hub a separate FastAPI service or the same image run locally? (Recommendation: same code, local profile.)
2. Does the cloud backend also verify QR as a fallback, or only the hub? (Recommendation: both, same signing key.)
3. Ed25519 vs HMAC — confirm based on verifier deployment.
4. Who owns SES production access and the verified domain?
5. Do admin analytics need real-time or end-of-day data? (Affects caching and query design.)
6. Is event-scoping enforced by the token or by a request header? (Recommendation: both, with mismatch → 403.)
7. What bot-protection and rate-limit policy applies to the public registration endpoint?
