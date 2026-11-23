# Sync contract v1

**Endpoints:** `GET /api/sync/manifest`, `GET /api/sync/bundle/{manifest_id}`, `POST /api/sync/batches` (stage S8; bundle generation starts in S7)
**Status:** Frozen for implementation in stage S8 · 2026-11-21
**Authoritative sources:** `WorkFlow.md` Appendix C, `Local-Hub-Planning.md` §3 and §6, `Backend-Planning.md` §3.5, `Database-Planning.md` §2–§3.
**Delivered client:** the hub/station sync worker and the admin live-ops/sync surfaces. No public frontend contract reads these payloads directly.
**Contract test:** `frontend/src/App.stage4.test.jsx` (sync/reconciliation surfaces) and the S8 backend contract tests; the hub worker tests are added in S7/S8.

> The hub is the single writer during the event. The cloud rejects unknown participants rather than creating placeholders. Deletes are tombstones, never silent removals. `client_event_id` is generated once and reused on retry.

## 1. Manifest

`GET /api/sync/manifest` returns the current pre-event bundle manifest. It is admin/hub-authenticated (manifest-only scope for a hub principal).

```json
{
  "manifest_id": "2026-11-18T18:00:00Z-7f3a",
  "event_id": "oas-2026",
  "generated_at": "2026-11-18T18:00:00Z",
  "schema_version": 2,
  "counts": {"participants": 1042, "embeddings": 1039, "deletions": 3},
  "cursor": {"from": 0, "to": 4711},
  "files": [
    {"name": "participants.ndjson", "sha256": "...", "bytes": 812345},
    {"name": "embeddings.f32", "sha256": "...", "bytes": 2134016},
    {"name": "photos.index.json", "sha256": "...", "bytes": 91234}
  ],
  "deletions": [{"participant_id": 88, "reason": "WITHDRAWN"}]
}
```

| Field | Type | Rules |
|---|---|---|
| `manifest_id` | string | Stable id for this bundle. The example format is `<generated_at>-<short hash>`; the hub displays it on every status screen and all stations must show the same id before check-in begins. |
| `event_id` | string | Active event code. The hub refuses a bundle for a different event. |
| `generated_at` | string | UTC ISO-8601 with `Z`. |
| `schema_version` | integer | `2` for this contract. Unknown versions are refused, not guessed. |
| `counts.participants` | integer | Number of records in `participants.ndjson`. |
| `counts.embeddings` | integer | Number of 512-d vectors in `embeddings.f32`. Must equal the number of participants with an active embedding in the bundle. |
| `counts.deletions` | integer | Number of tombstones in `deletions.json` and the manifest `deletions` array. |
| `cursor.from` / `cursor.to` | integer | Half-open range `[from, to)` of the source outbox/sequence covered by this bundle. `to - from` is the number of source rows considered, not necessarily the participant count. |
| `files` | array | The three hashed content files from `WorkFlow.md` Appendix C: `participants.ndjson`, `embeddings.f32` and `photos.index.json`, each with `name`, lowercase hex `sha256` and `bytes`. The manifest itself is not listed; `deletions.json` is derived from the inline `deletions` array. |
| `deletions` | array | Tombstones with `participant_id` and `reason`. The same tombstones are also in `deletions.json`; the manifest copy is for quick inspection. |

A bundle must exclude any participant without an active embedding. A participant with zero usable embeddings never enters the manifest.

## 2. Bundle files

`GET /api/sync/bundle/{manifest_id}` returns a downloadable bundle (archive or directory; the transport is an implementation detail, the file names and bytes are the contract).

| File | Format | Contents |
|---|---|---|
| `manifest.json` | JSON | The manifest from §1, byte-identical to the served manifest for this `manifest_id`. |
| `participants.ndjson` | NDJSON, one object per line, UTF-8, `\n` line endings | Participant records in the same order as the embedding vectors. |
| `embeddings.f32` | raw little-endian float32, 512 floats per participant | Vectors in `participants.ndjson` order. No header. Length must be `512 × 4 × count(participants)` bytes. |
| `photos.index.json` | JSON object | Maps the private photo key (or a stable photo id) to the local cache file name the hub will use. It must not contain a public URL. |
| `deletions.json` | JSON array | Tombstones `{participant_id, reason}`. Deletions are applied as tombstones; the hub must not silently drop local rows without recording the reason. |

### 2.1 `participants.ndjson` record

Minimum fields (additional fields are allowed only if the hub ignores them):

```json
{
  "id": 1234,
  "submission_id": "c1f0e6d2-7a8b-4c3d-9e4f-5a6b7c8d9e0f",
  "name": "Synthetic Participant",
  "email": "synthetic.1234@example.test",
  "status": "EMBEDDING_READY",
  "photo_hash": "..."
}
```

- `id` is the server participant id and is the join key for `sub` in QR tokens.
- `submission_id` is the public intake id; it is the join key for hub batch items.
- `email` is synthetic in fixtures. It is present because the desk may need a secondary identifier; it is not printed on the pass.
- `status` is the participant status at bundle generation. Only `EMBEDDING_READY` and later states are eligible.
- `photo_hash` is the SHA-256 of the processed photo. The hub verifies it against the local cache file.

### 2.2 Integrity rules

- The hub verifies every `sha256` and `bytes` value before loading. A mismatch refuses the whole bundle; it does not partially load.
- The hub verifies `counts.participants` against the NDJSON line count, `counts.embeddings` against the `embeddings.f32` length, and `counts.deletions` against `deletions.json`.
- The hub verifies that the installed InsightFace model name/version matches the manifest's embedding provenance (recorded by the importer). A mismatch refuses the bundle rather than producing bad matches.
- The hub records and displays the `manifest_id`. A station that cannot see the current id must not check anyone in.

## 3. Upload batch

`POST /api/sync/batches` accepts a hub batch. It is hub-authenticated and event-scoped.

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

| Field | Type | Rules |
|---|---|---|
| `batch_id` | string | Unique per hub batch. Replaying the same `batch_id` returns the original per-item results and applies nothing twice. |
| `hub_id` | string | Provisioned hub identity. Must match the authenticated principal. |
| `schema_version` | integer | `2`. Unknown versions are rejected. |
| `items` | array | Ordered items. The response preserves order. |
| `items[].type` | string | `ATTENDANCE` or `QR_ISSUANCE` in v1. Unknown types are per-item `rejected` with `UNSUPPORTED_TYPE`; they do not fail the whole batch. |
| `items[].client_event_id` | string | Unique idempotency key generated once by the hub and reused on retry. |
| `items[].participant_submission_id` | string | Must resolve to an existing participant. Unknown participants are rejected; the cloud never creates placeholders. |
| `items[].station_id` | string | Station that produced the item. |
| `items[].client_marked_at` / `issued_at` | string | UTC ISO-8601 with `Z`; informational event time, not the server receive time. |
| `items[].session_external_id` | string or null | Required for session attendance; null for event-level attendance. |
| `items[].method` | string | `QR`, `FACE` or `MANUAL` for attendance. |
| `items[].jti` / `scope` | string | Required for `QR_ISSUANCE`; the token must already have been issued locally with the hub key. |

### 3.1 Checksum and canonicalisation

- The batch `checksum` is the lowercase hex SHA-256 of the UTF-8 canonical JSON of the `items` array: keys sorted lexicographically, no insignificant whitespace, arrays in their given order, `null` preserved. The checksum is computed by the hub and verified by the cloud before applying any item.
- If the checksum is missing or does not match, the whole batch is rejected with HTTP 400 and code `CHECKSUM_MISMATCH`; no item is applied.
- `batch_id` is stored in `sync_batches` with `hub_id`, `cursor_from`, `cursor_to`, `item_count`, `accepted_count`, `rejected_count`, `checksum` and `received_at`.

### 3.2 Cursor

- A batch covers a half-open cursor range `[cursor_from, cursor_to)`. The hub advances its cursor only after the cloud confirms the batch.
- The cloud records the range and rejects a batch whose range overlaps an already accepted batch for the same hub unless the `batch_id` is an exact replay.
- `cursor_from`/`cursor_to` are integers from the hub outbox sequence.

## 4. Batch response and per-item results

HTTP 200:

```json
{
  "batch_id": "hub01-2026-11-20T10-15-00Z-0007",
  "hub_id": "hub01",
  "received_at": "2026-11-20T10:15:03Z",
  "results": [
    {"index": 0, "client_event_id": "c1f0e6d2-...", "status": "accepted", "reason": null},
    {"index": 1, "client_event_id": "a7b3...", "status": "duplicate", "reason": "DUPLICATE_CLIENT_EVENT"}
  ]
}
```

| Status | Meaning | Hub action |
|---|---|---|
| `accepted` | Applied exactly once. | Clear the item from the outbox. |
| `duplicate` | Already applied earlier, or an exact replay. | Clear the item; do not retry. |
| `rejected` | Permanently invalid for this batch. | Keep visible for review; do not retry unchanged. |

Reason codes (v1):

| Reason | Applies to | Meaning |
|---|---|---|
| `UNKNOWN_PARTICIPANT` | attendance, QR issuance | No participant for `participant_submission_id` in this event. |
| `DUPLICATE_CLIENT_EVENT` | all | `client_event_id` already applied. |
| `VALIDATION_ERROR` | all | Missing/invalid fields for the item type. |
| `UNSUPPORTED_TYPE` | all | Unknown `type`. |
| `WRONG_EVENT` | all | Item belongs to a different event. |
| `EXPIRED` | QR issuance | The local token is already expired at receipt. |
| `WRONG_SCOPE` | QR issuance/attendance | Scope/session mismatch. |
| `CHECKSUM_MISMATCH` | batch | Whole-batch rejection (HTTP 400). |

Rules:

- The cloud applies the batch transactionally per item or in one transaction with per-item savepoints; a rejected item must not roll back accepted items unless the whole batch is structurally invalid.
- Replaying an accepted batch returns the same per-item results and creates no duplicate attendance, QR or audit rows.
- Unknown participants are rejected, never created. The hub is the single writer during the event.
- Every accepted state transition writes an audit row. Rejections are recorded with the reason but without the raw token or photo.
- The hub clears only `accepted` and `duplicate` items. It keeps `rejected` items visible and never silently drops them.

## 5. Reconciliation

The cloud must be able to reconcile:

```
forms → registered → photo-validated → embedding-ready → synced → arrived → QR issued → checked in → emails sent
```

`sync_batches` provides batch-level counts and `received_at`; the live-ops/reconciliation endpoints read these counts plus participant/attendance/QR/outbox tables. Any variance must be explainable by a per-item result, a tombstone or an audited manual override. A batch replay must not change the reconciliation totals.

## 6. Change control

Any change to a manifest field, bundle file name/format, batch field, checksum rule, cursor semantics, per-item status or reason code is a breaking change. It must update this file, the hub sync worker, the S8 backend contract tests and `frontend/src/App.stage4.test.jsx` in the same change. Additive fields are allowed only when the hub ignores unknown keys; changing or removing a field the hub reads requires `schema_version` 3 and a hub that refuses version 2 explicitly.
