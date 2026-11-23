# Registration contract v1

**Endpoint:** `POST /api/register`
**Status:** Frozen for implementation in stage S4 · 2026-11-21
**Authoritative sources:** `WorkFlow.md` Appendix A, `React-Registration-Planning.md` §2.3 and §5, `Backend-Implementation-Plan.md` §7.1.
**Delivered client:** `frontend/src/lib/registration.js` (`buildSubmissionPayload`) and `frontend/src/hooks/useRegistrationForm.js`.
**Contract test:** `frontend/src/components/registration/RegistrationForm.test.jsx` (plus any future test that imports `buildSubmissionPayload`).

> The server is authoritative. Client-side validation exists for UX only. The field names, casing and encoding below match the delivered `FormData` exactly; changing them breaks the frozen frontend.

## 1. Transport

- Method and path: `POST /api/register`.
- Authentication: **none**. This is public participant intake.
- Content type: `multipart/form-data` with a browser-generated boundary. The client must not send a hand-written boundary; if the explicit `Content-Type: multipart/form-data` header in `useRegistrationForm.js` strips the boundary under Axios 1.x, the header must be removed and the browser allowed to set it. Record the result in `React-Registration-Planning.md` §2.3 during S4.
- Event scope: the server resolves the active event (`event_id`) from server configuration. The client does **not** send an event code. A registration is always attached to the active event.
- Maximum request size: 10 MB for the photo part plus a small allowance for text parts. The exact server limit is configured in S4; 10 MB is the frozen client limit.
- No presigned-upload endpoint is defined. The server receives the photo and writes it to private storage.

## 2. Multipart parts

All parts are text parts except `photo`, which is a file part. Optional parts are omitted entirely by the delivered client when empty.

| Part | Type | Required | Accepted values / rules |
|---|---|---|---|
| `source` | text | yes | `SITE_FORM` or `WALK_IN`. `WALK_IN` is used by `/register/assisted` with staff present, but still goes through this public endpoint and the same table. |
| `submission_id` | text | yes | UUID generated once by the client. Used for idempotency. |
| `client_event_id` | text | yes | Must equal `submission_id` in the delivered client. Used for idempotency and replay. |
| `submitted_at` | text | yes | ISO-8601 UTC timestamp from the client, e.g. `2026-11-20T09:14:22.000Z`. Informational; the server records its own `received_at` and never trusts the client clock for ordering. |
| `full_name` | text | yes | Trimmed, 2–120 characters. |
| `email` | text | yes | Syntactically valid email; the client lowercases it. The server normalises to lowercase and dedupes on the normalised value per event. |
| `phone` | text | yes | Indian 10-digit mobile (`[6-9]\d{9}`) or `+91` followed by 10 digits, or international `+\d{1,3}\d{4,14}`. The client removes spaces and hyphens. The server stores a normalised value. |
| `institution` | text | yes | Trimmed, 1–200 characters. |
| `category` | text | yes | `STUDENT`, `RESEARCHER`, `PROFESSIONAL`, `SPEAKER`, `OTHER`. |
| `photo` | file | yes | `image/jpeg`, `image/png` or `image/webp`; at most 10 MB. One detectable face, minimum 640×640 after decode, acceptable blur/brightness. EXIF/GPS is stripped during processing. |
| `consent` | text (JSON) | yes | JSON object, see §3. |
| `accessibility_needs` | text | no | Free text, trimmed; omitted when empty. |
| `dietary_preference` | text | no | `VEGETARIAN`, `VEGAN`, `NON_VEGETARIAN`, `OTHER`; omitted when empty. |
| `session_interest` | text (JSON) | no | JSON array of string ids from the delivered session-interest list, e.g. `["nlp","cv"]`; omitted when empty. The server validates that ids are known for the active event. |

Unknown parts are ignored. A missing required part, a wrong type or an unparseable optional JSON part is a `BAD_PAYLOAD`/`MISSING_FIELD` failure as defined in §5.

## 3. Consent JSON

The delivered client sends exactly:

```json
{
  "biometric": true,
  "version": "2026-11",
  "accepted_at": "2026-11-20T09:14:20.000Z"
}
```

Rules:

- `biometric` must be the JSON boolean `true`. `false`, `"true"`, `1`, `null` or a missing key is `NO_CONSENT`.
- `version` must equal the consent version the server has accepted for the active event. The delivered value is `2026-11`; D2 in `docs/decisions.md` is still pending legal review. A mismatch is `NO_CONSENT` with a message asking the participant to reload the form.
- `accepted_at` must be a parseable ISO-8601 UTC timestamp and must not be in the future by more than a small clock-skew allowance (proposed: 5 minutes). An invalid value is `BAD_PAYLOAD`.
- The server stores `consent_version` and `consented_at`. No photo or embedding is stored without consent.

## 4. Success and duplicate responses

### 4.1 First accepted submission — HTTP 201

```json
{
  "submission_id": "c1f0e6d2-7a8b-4c3d-9e4f-5a6b7c8d9e0f",
  "status": "RECEIVED",
  "photo_status": "PENDING",
  "embedding_status": "PENDING",
  "status_token": "<opaque signed token>"
}
```

- `status` is the registration status shown to the participant. The initial value is `RECEIVED`; the S4 pipeline moves it through `IN_REVIEW`/`CONFIRMED`/`WAITLISTED`/`NEEDS_INFO`/`REJECTED`/`CANCELLED` as the participant-facing state machine requires. `IMPORTED`, `PHOTO_VALIDATED`, `EMBEDDING_READY` and `SYNCED` are internal pipeline states and may be exposed only through the status token, not invented as new public states.
- `photo_status` is `PENDING`, `PHOTO_VALIDATED` or `PHOTO_REJECTED`.
- `embedding_status` is `PENDING`, `EMBEDDING_READY` or `EMBEDDING_FAILED`.
- `status_token` is opaque to the client, contains no PII, and is consumed by `GET /api/tickets/{token}` (stage S8). Its default lifetime is proposed as 30 days; the exact TTL is configuration, and an expired token must render the frontend `EXPIRED` state rather than a server error.

The delivered frontend reads `submission_id`, `status`, `status_token` and `photo_status`. `embedding_status` is additive and must not replace any of them.

### 4.2 Idempotent replay — HTTP 200

An identical replay returns the original response with the same `submission_id`, `status_token` and statuses, plus:

```
Idempotent-Replay: true
```

No new participant, photo object or embedding is created. The delivered frontend treats any 2xx response as success.

### 4.3 Duplicate — HTTP 409

The delivered frontend treats `DUPLICATE_EMAIL` and `DUPLICATE_SUBMISSION` as a duplicate state, not a generic error, and reads `status_token` from the error body:

```json
{
  "code": "DUPLICATE_EMAIL",
  "message": "This email address is already registered.",
  "details": {"submission_id": "c1f0e6d2-7a8b-4c3d-9e4f-5a6b7c8d9e0f"},
  "status_token": "<token for the original record>",
  "request_id": "..."
}
```

The duplicate response must not reveal whether an unrelated email exists beyond the normal registration path; it is returned only for the same event. The original record is never overwritten.

## 5. Error codes and HTTP mapping

Every error uses the consistent envelope:

```json
{
  "code": "BAD_PHONE",
  "message": "The phone number is not valid.",
  "details": {"phone": "Enter a valid phone number."},
  "request_id": "..."
}
```

For field-level validation the response must also include a FastAPI-compatible `detail` array so the delivered `normalizeError` can populate `fields`:

```json
{
  "code": "MISSING_FIELD",
  "message": "One or more required fields are missing.",
  "detail": [
    {"loc": ["body", "email"], "msg": "Email address is required.", "type": "value_error.missing"}
  ],
  "request_id": "..."
}
```

The nineteen codes are fixed by `React-Registration-Planning.md` §5. The HTTP mapping below is the S0 proposal; it is part of this contract and must not drift silently.

| # | Code | HTTP | Retryable | Client action |
|---|---|---|---|---|
| 1 | `BAD_PAYLOAD` | 400 | yes | Fix the request; do not retry unchanged. |
| 2 | `MISSING_FIELD` | 422 | yes | Show field-level errors. |
| 3 | `BAD_EMAIL` | 422 | yes | Correct the email. |
| 4 | `BAD_PHONE` | 422 | yes | Correct the phone. |
| 5 | `DUPLICATE_EMAIL` | 409 | no | Show the duplicate state and the original status link. |
| 6 | `DUPLICATE_SUBMISSION` | 409 | no | Show the duplicate state; do not create a second row. |
| 7 | `NO_CONSENT` | 422 | yes | Re-consent with the current version. |
| 8 | `MISSING_PHOTO` | 422 | yes | Re-upload a photo. |
| 9 | `UPLOAD_TOO_LARGE` | 413 | yes | Re-upload under 10 MB. |
| 10 | `UPLOAD_FAILED` | 500 | yes | Retry the upload; if persistent, contact support. |
| 11 | `NO_FACE` | 422 | yes | Re-upload a clear, front-facing photo. |
| 12 | `MULTIPLE_FACES` | 422 | yes | Re-upload a photo with one face. |
| 13 | `LOW_RESOLUTION` | 422 | yes | Re-upload at least 640×640. |
| 14 | `BLURRY` | 422 | yes | Re-upload a sharper photo. |
| 15 | `DARK` | 422 | yes | Re-upload a well-lit photo. |
| 16 | `EMBEDDING_FAILED` | 500 | yes | The desk will review; the participant may retry later. |
| 17 | `MODEL_MISMATCH` | 500 | no | The desk will review; do not silently recompute with another model. |
| 18 | `RATE_LIMITED` | 429 | yes | Wait and retry; include `Retry-After`. |
| 19 | `SPAM_REJECTED` | 403 | no | Contact the host office. |

Rules:

- A validation or photo rejection performs **zero** participant, photo or embedding writes. It may write a redacted audit/log line with no email, phone, photo or token.
- `UPLOAD_TOO_LARGE` must be decided before reading the whole body into memory where the server supports it.
- `EMBEDDING_FAILED` and `MODEL_MISMATCH` must not leave a participant in `EMBEDDING_READY` with zero active embeddings. The S4 pipeline records the failure and routes the record to review.
- HTTP status is part of the contract; the client uses `code` for behaviour and the status for transport/retry decisions.

## 6. Idempotency and dedupe rules

1. `submission_id` is generated once per form submission and reused on retry. `client_event_id` must equal it.
2. The server checks `submission_id` first, then `(event_id, lower(email))`.
3. Same `submission_id` + same `client_event_id` + same photo SHA-256 + same normalised fields = **idempotent replay** (HTTP 200, original response, no new writes).
4. Same `submission_id` with different content = `DUPLICATE_SUBMISSION` (HTTP 409). The original record is not modified.
5. New `submission_id` but an email already registered for the event = `DUPLICATE_EMAIL` (HTTP 409), linked to the original record, with the original `status_token`.
6. Concurrent replays must be resolved by database uniqueness (`UNIQUE (event_id, submission_id)` and `UNIQUE (event_id, lower(email))`), not by a read-then-write race. Exactly one row and one photo object may be created.
7. The photo object key is deterministic: `photos/{event_code}/{submission_id}/original.{ext}` (or the S3 equivalent). A replay must not create a second object with a new key.
8. Rate limits and bot protection apply before any write; a rejected request creates no record.

## 7. Change control

Any change to a part name, type, required flag, consent shape, response field, error code or HTTP mapping is a breaking change. It must update this file, `frontend/src/lib/registration.js`, `frontend/src/hooks/useRegistrationForm.js` and `frontend/src/components/registration/RegistrationForm.test.jsx` in the same change. Additive response fields are allowed only when the delivered client ignores unknown keys; removing or renaming a field the client reads is not allowed without a new contract version.
