# GeekAI — Local Hub & Offline Planning

**Odisha AI Symposium 2026** · Companion to [WorkFlow.md](WorkFlow.md), [Backend-Planning.md](Backend-Planning.md) and [React Registration Planning](React-Registration-Planning.md)
**Status:** Plan only · 20 November 2026 · Execution order: [Backend-Implementation-Plan.md](Backend-Implementation-Plan.md)

---

## 1. Objective

Make the arrival desk fast and independent of internet connectivity: face matching and QR signing run locally, attendance is written to a durable local store, and a sync worker reconciles with AWS when connectivity returns. This implements WorkFlow.md decisions D5, D10 and D11 and activates the delivered volunteer screens (`ARRIVAL_V2`, `SCAN_V2`).

**Topology:** hub-and-spoke. The **hub is the single writer** for the event. Stations talk to the hub over the venue LAN; they never write to the cloud directly.

```
Local hub (FastAPI, local profile, InsightFace, signing key, outbox, durable DB)
   ├── Station 1..N: camera capture, candidate review, QR display/print
   ├── QR scanners: entry + session verification via hub
   └── Sync worker ──► AWS API ──► RDS / S3 / SES
```

---

## 2. Hub components

| Component | Responsibility |
|---|---|
| Local datastore | SQLite (or local Postgres) copy of participants, embeddings, QR state, attendance, outbox |
| Manifest loader | Verifies versioned bundle hash before event day |
| Face matcher | InsightFace, same model version as the importer; candidate list + similarity + threshold |
| QR signer | Ed25519 (or HMAC) private key held only on the hub; issues event-scoped tokens |
| Verifier | Signature, event, expiry, revocation, scope, duplicate checks |
| Outbox | Durable queue of arrivals, QR issues, scans and email requests with `client_event_id` |
| Sync worker | Batches outbox to AWS with per-item results and checkpoint cursor |
| Local API | Same contract as Backend-Planning.md §2 hosted on the LAN |

Reuse the existing FastAPI image with a local profile rather than creating a second codebase. `face-checkin/main.py` and `face-checkin/sync.py` are the seed for the station-side loop and cache.

---

## 3. Pre-event sync bundle

Generate at T-3 from the cloud after registration and embedding build (WorkFlow Appendix C):

```
manifest.json          -- manifest id, event id, schema version, counts, cursor, file hashes
participants.ndjson    -- id, submission_id, name, email, status, photo hash
embeddings.f32         -- 512-d vectors in participant order
photos.index.json      -- s3 keys → local cache file names
deletions.json         -- tombstones with reason
```

**Rules:** the hub refuses a bundle whose hashes do not verify; it reports its manifest ID on every status screen; stations must show the same manifest ID before check-in begins; deletions are tombstones, never silent removals. Download photos locally for the face stations and badge printing as required by decision D9.

---

## 4. Station flows (mapping to the delivered UI)

### 4.1 Arrival — `/volunteer/arrival`

1. Capture a face with the camera or upload a photo.
2. Hub matches against the local embedding cache; return `candidates`, `similarity`, `threshold`, `matched`, `low_confidence`, plus `already_arrived` / `already_checked_in` flags.
3. Volunteer confirms identity from the photo plus a secondary identifier.
4. Low confidence or manual fallback requires an ID check and a recorded reason.
5. Hub marks `ARRIVED` (`POST /api/arrivals`) and issues the signed pass (`POST /api/qr/issue`).
6. Display and print the pass (CR80 badge / A4 sheet); write a welcome-email outbox record.
7. Outbox stores identity and decisions only — never face images.

### 4.2 Entry and session scan — `/volunteer/scan`

- Entry mode: one-time per participant; session mode: once per `(participant, session)`.
- `POST /api/qr/verify` checks signature → event → expiry → revocation → scope → duplicate → write.
- Canonical decisions drive the ten result panels the frontend already implements; "View record" on duplicate opens the participant record.
- Hand-made unsigned JSON is rejected before any network write; there is no fallback to the legacy `validate-qr` endpoint.

### 4.3 Offline behaviour

- Every write carries `client_event_id`, `client_marked_at`, `station_id`.
- If the hub is unreachable from a station, the station queues locally and shows a visible pending count.
- `drainOutbox()` retries in order, stops on network failure, and marks endpoint-missing items as `waiting` rather than retrying forever.
- Replaying an arrival or scan never creates a second record; the hub deduplicates on `client_event_id`.

---

## 5. QR token protocol

Payload and encoding follow WorkFlow Appendix B: `{v, jti, sub, evt, scp, iat, exp, iss}` signed and encoded as `base64url(payload).base64url(signature)`. The hub holds the private key; scanners hold the public key or ask the hub to verify. The frontend only renders the server token and checks its **shape** — it never reads the payload to grant access.

Revocation: `qr_tokens.revoked_at` plus a hub deny list refreshed on sync. Expired, revoked and wrong-scope tokens produce distinct result panels.

---

## 6. Sync to AWS

- Batch arrivals, QR issuance, attendance and email status with `batch_id`, `hub_id`, cursor range, item count and checksum.
- Cloud returns per-item `accepted | duplicate | rejected` with reason codes; the hub clears only accepted/duplicate items.
- The hub is the single writer during the event; cloud rejects unknown participants instead of creating placeholders.
- Sync status is visible in the volunteer shell and admin live ops: last sync time, pending count, failures.
- A 2-hour outage must reconcile with zero data loss and zero duplicates.

---

## 7. Hardware and venue readiness

- 4–8 desks depending on arrival throughput; each with a laptop/tablet, camera, power and LAN/ Wi-Fi.
- At least one badge printer with CR80 cards plus A4 backup sheets; printer failure falls back to showing the pass on screen.
- QR scanners for entry and sessions; test printed QR legibility with the actual scanners.
- LAN switch, 4G failover, backup power for hub and network gear; label stations and keep a printed runbook.
- Hub restart must not lose accepted check-ins — use a durable local store and verify after reboot.

---

## 8. Drills and acceptance

1. **Pre-sync drill:** download manifest, verify hash, confirm all stations show the same manifest ID.
2. **Full-flow drill:** face match → confirm → issue → print → scan → email, with internet up.
3. **Offline drill:** 15–120 minutes with internet cut; 10+ arrivals; reconnect; zero variance report.
4. **Failure drill:** duplicate scan, expired token, wrong scope, forged QR, camera denied, printer offline, hub restart.
5. **Throughput:** 95% of arrivals under 30 seconds; 99% of scans under 2 seconds with 4–6 stations.
6. **Reconciliation:** forms → imported → embedding-ready → arrived → QR issued → checked in → emails sent, with zero unexplained variance.

---

## 9. Implementation order and estimates

| Step | Scope | Estimate |
|---|---|---|
| H1 | Hub local datastore + manifest loader + local API profile | 3 days |
| H2 | Local face matcher + station cache + model-version check | 3 days |
| H3 | QR signer + verifier + arrival/issue/verify endpoints | 4 days |
| H4 | Outbox + idempotent sync worker + per-item results | 3 days |
| H5 | Station runbook, print flow, failure states | 2 days |
| H6 | Drills, tuning, hardware sign-off | 3–5 days |

---

## 10. Open questions

1. Number of desks/stations and devices available — confirms hub sizing and rehearsal plan.
2. SQLite vs local Postgres on the hub (recommend SQLite for simplicity, with pre-event snapshot backups).
3. One QR per participant or per session? (Recommendation: one signed participant QR; entry once, sessions reusable with photo verification.)
4. Where does the signing key live on event day — TPM/secure enclave, encrypted file, or HSM?
5. Who operates the hub and who is the escalation contact if it fails?
6. How long are photos cached locally, and how is that cache wiped after the event?
7. Does the in-site registration form collect a compliant face photo + biometric consent? If not, arrival scanning is enrollment, not verification.
