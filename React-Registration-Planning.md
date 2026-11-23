# GeekAI — React Registration Planning

**Odisha AI Symposium 2026** · Companion to [WorkFlow.md](WorkFlow.md), [Backend-Planning.md](Backend-Planning.md) and [Database-Planning.md](Database-Planning.md)
**Status:** Plan only · 20 November 2026

> **Decision change:** Pre-registration is now handled by the **in-site React form** on `/register`, not by Google Forms. All Google Forms, Apps Script and Drive references in the intake process are retired. All other architecture decisions are unchanged.

---

## 1. Objective

Replace the external form handoff with a first-party React form that submits directly to our API. The form is the single primary intake: it captures details, photo and biometric consent, validates them visibly, and creates a participant record through the same pipeline previously fed by file imports. **Implemented:** the in-site form on `/register` was delivered in commit `7ded722`, verified in `75cc9f9`, and `Frontend-Redesign-Completion.md` together with `frontend/STAGE5-QA.md` were updated to record it.

---

## 2. In-site form design

### 2.1 Fields (freeze before collecting submissions)

| Field | Type | Required | Notes |
|---|---|---|---|
| `full_name` | Text | Yes | As on ID |
| `email` | Email | Yes | Unique per event |
| `phone` | Tel | Yes | E.164 or 10-digit Indian format |
| `institution` | Text | Yes | School/company/org |
| `category` | Select | Yes | Student / Researcher / Professional / Speaker / Other |
| `photo` | File / camera | Yes | One face, plain background, min 640 px |
| `consent_biometric` | Checkbox | Yes | Explicit, versioned consent text |
| `accessibility_needs` | Textarea | No | Free text |
| `dietary_preference` | Select | No | Optional |
| `session_interest` | Checkbox group | No | Optional |

### 2.2 Client behaviour

- All fields use the delivered design-system primitives; validation runs on blur and on submit, with field-level messages and an error summary.
- Photo input supports file picker, drag-and-drop and device camera; preview, remove and re-upload are visible; quality guidance is shown before submission.
- Consent text is versioned and links to `/privacy`; submission is blocked without it.
- Drafts survive a refresh; an offline banner explains that the form needs a connection to submit.
- The form never claims a QR or pass was emailed. Its success state gives a submission ID, a status link and the three-step explainer: submit → review → pass issued at arrival.

### 2.3 Submission contract

`POST /api/register` accepts multipart form data: the registration fields below plus a `photo` file part. The server writes the photo to S3; no presigned-upload endpoint is defined. Normalized payload:

```json
{
  "source": "SITE_FORM",
  "submission_id": "c1f0e6d2-...-uuid",
  "client_event_id": "c1f0e6d2-...-uuid",
  "submitted_at": "2026-11-20T09:14:22Z",
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
    "accepted_at": "2026-11-20T09:14:20Z"
  },
  "accessibility_needs": null
}
```

The API returns `submission_id`, `status`, `photo_status`, `embedding_status` and a signed status-link token. `GET /api/registrations/{id}` returns the validation report and current status.

---

## 3. Submission pipeline

```
React form → POST /api/register → validate → dedupe → photo quality → S3
           → embedding build → status assignment → submission report → manifest inclusion
```

### 3.1 Validate and dedupe

- Email syntax valid and normalized to lowercase; consent must be true (`NO_CONSENT` → `BLOCKED`).
- Dedupe by `submission_id` first, then by normalized email within the event. A repeat links to the original record and is reported, not silently overwritten.
- Apply rate limiting, bot protection and upload-size limits at the edge and at the API.

### 3.2 Photo quality gate

- Exactly one detectable face; minimum 640×640; brightness/blur thresholds; reject group photos and screenshots where feasible.
- Resize/compress, strip EXIF (especially GPS), upload to S3 `photos/{event}/{submission_id}/`, set `photo_s3_key` and `photo_hash`.
- Outcomes: `PHOTO_VALIDATED` or `PHOTO_REJECTED` with a reason the participant/admin can act on.

### 3.3 Embedding build

- Run locally with the same InsightFace model/version used by the desk stations; store `model_name`, `model_version`, `dimension`, `quality_score`, `is_active`.
- A participant with zero usable embeddings cannot reach `EMBEDDING_READY` — this closes the current silent-zero-embedding bug.
- Build a versioned sync bundle of participants + embeddings + photo hashes for the hub (Local-Hub-Planning.md).

### 3.4 Status assignment

- `IMPORTED → PHOTO_VALIDATED → EMBEDDING_READY → SYNCED`.
- `SYNCED` is set only after the manifest is generated and verified by the hub.
- `BLOCKED` for no consent; `DUPLICATE` for repeats; `PHOTO_REJECTED` for unusable photos.

---

## 4. Admin review and batch import

- Every submission writes a `registration_jobs` row with actor/source, counts, timestamps and a report key in S3.
- The admin `imports` screens show submission reports, rejects and retry actions; the label should read "Registrations" once the frontend is updated.
- `POST /api/imports/batch` remains as an **optional** admin CSV/JSON bulk path for legacy data and assisted walk-ins, with `dry_run` default and the same validation/dedupe rules. It is not the primary intake.
- `/register/assisted` uses the same form component with staff sign-in and `source=WALK_IN`; it never writes to a second table.

---

## 5. Error codes

`BAD_PAYLOAD`, `MISSING_FIELD`, `BAD_EMAIL`, `BAD_PHONE`, `DUPLICATE_EMAIL`, `DUPLICATE_SUBMISSION`, `NO_CONSENT`, `MISSING_PHOTO`, `UPLOAD_TOO_LARGE`, `UPLOAD_FAILED`, `NO_FACE`, `MULTIPLE_FACES`, `LOW_RESOLUTION`, `BLURRY`, `DARK`, `EMBEDDING_FAILED`, `MODEL_MISMATCH`, `RATE_LIMITED`, `SPAM_REJECTED`.

Each code maps to an action: re-upload photo, re-run embedding, merge duplicate, waive with documented approval, or exclude.

---

## 6. Schedule and ownership

- **T-14 to T-7:** build and test the form + API with synthetic data; freeze fields, consent text and JSON schema.
- **T-3:** final validation and embedding build; publish manifest hash; no further photo changes.
- Late registrations after T-3 continue through the same in-site form; they are included only if the hub manifest is rebuilt before the event.
- Ownership: one engineer owns the form/API pipeline; one staff member owns copy and consent wording; the event owner signs the final report.

---

## 7. Tests and acceptance

- Fixture set with: valid submissions, duplicate emails, duplicate submission IDs, missing photos, no consent, malformed payloads, blurry photo, multiple faces, malformed phone, oversized upload.
- Validation failures produce zero database/S3 writes; accepted submissions write exactly the expected counts.
- Re-submitting the same payload creates no duplicates and no new S3 objects with new keys.
- Every participant has a traceable `submission_id` and a consent version/timestamp.
- 1,000 synthetic submissions process with a clean, reviewable report.
- Photos are private in S3 and served only through presigned URLs.
- The manifest excludes any participant without an active embedding.
- Rate limiting and bot protection reject abusive traffic without blocking genuine participants.

---

## 8. Open questions

1. Does the in-site form collect a compliant face photo and explicit biometric consent? If not, arrival scanning is enrollment, not verification, and manual ID checks remain mandatory.
2. What closing date and capacity/waitlist policy applies to the form?
3. What bot-protection service and rate limits will be used in production?
4. Is a signed status link the only lookup path, or is email + reference also allowed?
5. What consent text and retention period must appear on `/register` and `/privacy`?
6. Is the assisted form available to the public with staff present, or only behind staff sign-in?
