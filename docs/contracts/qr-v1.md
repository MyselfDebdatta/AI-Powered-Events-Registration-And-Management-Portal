# QR contract v1

**Endpoints:** `POST /api/qr/issue`, `POST /api/qr/verify` (stage S5)
**Status:** Frozen for implementation in stage S5 · 2026-11-21
**Authoritative sources:** `WorkFlow.md` Appendix B, `Backend-Planning.md` §2.1–§2.2, `Security-Privacy-Planning.md` §6, `Local-Hub-Planning.md` §5.
**Delivered client:** `frontend/src/lib/arrivalApi.js` normalisers and the scanner/arrival screens.
**Contract test:** `frontend/src/App.stage3.test.jsx` and `frontend/src/App.stage3.phase3.test.jsx` (arrival/issue/verify normalisers).

> The client never builds, parses or trusts a QR payload. It renders the server token and checks its shape only. Verification is server or hub only. A hand-made `{"participant_id": 1}` payload is not a valid v1 token and must be rejected before any database write.

## 1. Payload

The v1 payload is exactly the eight fields in `WorkFlow.md` Appendix B:

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

| Field | Type | Rules |
|---|---|---|
| `v` | integer | Must be `1`. Unknown versions are `INVALID`. |
| `jti` | string | UUID, unique per issued token. Primary key of `qr_tokens`. |
| `sub` | string | `participant:<participant_id>`. The id is the server's participant id, not an email or submission id. |
| `evt` | string | Event code, e.g. `oas-2026`. Must match the active event. |
| `scp` | string | `ENTRY`, `SESSION` or `GENERAL`. `ENTRY` is one-time per participant per event; `SESSION` is one-time per `(participant, session)`; `GENERAL` is non-consuming and must not be used for entry. |
| `iat` | integer | Issued-at, Unix seconds UTC. |
| `exp` | integer | Expiry, Unix seconds UTC. Must be greater than `iat`. |
| `iss` | string | Issuer id, e.g. the hub id. In v1 this also selects the verification key from the key registry. |

No other payload member is part of v1. In particular, v1 does **not** add a `kid` field to the payload: that would change the frozen Appendix B shape. Key-id handling is defined in §3.

## 2. Encoding

```
token = base64url(payload_json) + "." + base64url(signature)
```

- `payload_json` is UTF-8 JSON with the eight fields above. Key order is not semantically significant; verifiers must decode JSON, not compare bytes.
- `base64url` is RFC 4648 §5 without padding (`-` and `_`, no `=`).
- `signature` is the raw signature bytes over the **ASCII bytes of `base64url(payload_json)`** (the first segment), not over the decoded JSON. This makes the signed bytes unambiguous and matches common compact-token practice.
- The token is a single string with exactly one `.` separator. More or fewer segments is `INVALID` (format failure).
- The QR image is rendered from this server token only. The frontend must not overlay a logo, must preserve a quiet zone and error-correction level H for print, and must not construct a token from client data.

## 3. Signing, key id and key custody

- **Algorithm:** Ed25519 is the default and the recommended production algorithm (decision D7, `PROPOSED DEFAULT`). HMAC-SHA256 is acceptable only if every verifier is trusted and holds the shared secret; it is not the default.
- **Key id:** v1 selects the key by `iss`. The verifier's key registry maps `iss` to one or more public keys and records a server-side `kid` on `qr_tokens`. During rotation, the registry may hold an old and a new public key for the same `iss`; the verifier tries the registered keys for that issuer. If a future design needs multiple simultaneous key ids in the token itself, it must add `kid` and bump `v` to 2; v1 verifiers must reject `v: 2` rather than guessing.
- **Private key custody:** the private key lives in AWS Secrets Manager for the cloud and in a local secure store on the hub. It is never in the repository, the frontend bundle, logs or a container image. The hub is the only signer during the event; scanners hold the public key or ask the hub to verify.
- **Configuration:** `QR_SIGNING_KEY`, `QR_KEY_ID`, `QR_ISSUER` are loaded in S1 as placeholders so S5 has no key-setup surprise. The S1 placeholder must not be a usable production key.
- **Rotation:** publish the new public key to verifiers first, then start signing with it, then retire the old key after all outstanding tokens expire. A suspected compromise triggers revoke-all, a key rotation and reissue at the desk; existing tokens become `INVALID`.

## 4. Issue contract

`POST /api/qr/issue` requires an authenticated staff/station/hub principal and an `ARRIVED` participant.

Request:

```json
{
  "participant_id": 1234,
  "client_event_id": "a7b3...",
  "station_id": "desk-3",
  "desk_id": "desk-3",
  "scope": "ENTRY"
}
```

Response (flat shape, as required by the delivered client):

```json
{
  "token": "<base64url(payload)>.<base64url(signature)>",
  "pass_id": "AIS26-0001234",
  "jti": "9f1c2b7e-4a6d-4c2f-9b1a-2f6a8e0d3c11",
  "scope": "ENTRY",
  "expires_at": "2026-11-21T18:00:00Z",
  "issued_at": "2026-11-21T09:00:00Z"
}
```

Rules:

- One active `ENTRY` token per participant per event. Reissuing an `ENTRY` token must revoke or supersede the previous active one, not leave two valid entry passes.
- `pass_id` and `jti` must always be populated; the frontend normaliser accepts nested shapes but the server emits the flat shape.
- `client_event_id` makes issue idempotent. A replay returns the same `token`, `jti` and `pass_id`; it does not create a second token row.
- Issue writes an audit event `QR_ISSUED` with actor, participant, scope, jti, station and event.
- Default expiry is configuration, not an invented event fact. Proposed defaults: `ENTRY` 24 hours from issue or the end of the event day, whichever is earlier; `SESSION` at the session end plus a short grace period. The chosen values must be recorded in the S5 configuration and the hub runbook.

## 5. Verify contract

`POST /api/qr/verify` requires an authenticated staff/station/hub principal.

Request:

```json
{
  "token": "<scanned string>",
  "scope": "ENTRY",
  "session_id": null,
  "station_id": "desk-3",
  "desk_id": "desk-3",
  "client_event_id": "c1f0e6d2-..."
}
```

Response:

```json
{
  "decision": "VALID",
  "participant": {"id": 1234, "name": "Synthetic Participant", "...": "..."},
  "reason": null,
  "scope": "ENTRY",
  "session": null
}
```

`decision` is exactly one canonical uppercase value. The frontend maps aliases, but the server must emit the canonical value, never free text:

| Canonical decision | Meaning | Aliases the frontend also accepts |
|---|---|---|
| `VALID` | Signature, version, event, expiry, revocation, scope and duplicate checks passed; attendance was written. | `ACCEPTED`, `ALLOWED`, `OK` |
| `DUPLICATE` | The token is valid but the allowed attendance already exists. No write. | `ALREADY_CHECKED_IN`, `ALREADY_MARKED` |
| `EXPIRED` | `exp` has passed. No write. | — |
| `WRONG_SCOPE` | Token is valid but not allowed at this checkpoint/session, or `evt` does not match the active event. No write. | `WRONG_EVENT`, `WRONG_CHECKPOINT` |
| `INVALID` | Any format, decode, signature, version, revocation or payload failure. No write. | `INVALID_SIGNATURE`, `REJECTED`, `REVOKED` |

### 5.1 Fixed verification order

The verifier must run these steps in this order and stop at the first failure:

1. **Format and base64 decode.** Exactly two segments, valid base64url, parseable JSON, required fields present and correctly typed.
2. **Signature.** Verify with the registered public key(s) for `iss`. A bad or missing signature is `INVALID`.
3. **Version and event.** `v == 1`; `evt` equals the active event. A wrong version/event is `INVALID` for version and `WRONG_SCOPE` for event.
4. **Expiry.** `exp` has not passed; `iat` is not implausibly in the future. Expired is `EXPIRED`.
5. **Revocation.** `jti` is not in `qr_tokens.revoked_at` and not on the hub deny list. Revoked is `INVALID`.
6. **Scope.** The token's `scp` is allowed at this checkpoint; `SESSION` requires a matching `session_id`. A mismatch is `WRONG_SCOPE`.
7. **Duplicate rule.** `ENTRY` is once per participant per event; `SESSION` is once per `(participant, session)`. A duplicate is `DUPLICATE`.
8. **Write.** Only after all checks pass, record attendance and return the participant display record.

No database write, attendance row, status transition or outbox row may occur before step 8. A rejection may write an audit row, but the audit row must not contain the raw token, a photo or unnecessary PII.

### 5.2 Duplicate and concurrency rules

- Duplicate detection is enforced by the existing event-level unique attendance index and the `(participant_id, session_id)` constraint, not only by a read.
- Two concurrent scans of the same `ENTRY` token must produce one `VALID` and one `DUPLICATE`, or two `DUPLICATE` after the first write, never two attendance rows.
- A replayed verify request with the same `client_event_id` must be idempotent: it returns the same decision and does not create a second row.
- `GENERAL` tokens never consume entry attendance and must not be used where `ENTRY` is required.

## 6. Revocation

- Revocation is recorded as `qr_tokens.revoked_at` plus a reason and actor. The hub maintains a deny list of `jti` values refreshed on sync; the cloud checks the database.
- Revoking a token does not delete the row. Audit and QR rows are retained under the retention policy.
- Revoke-all is an emergency operation for key compromise or a bad issue batch; it must be audited and followed by reissue at the desk.
- The legacy unsigned QR PNGs (payload `{"participant_id", "name"}`) are not migrated and are not accepted. `POST /api/attendance/validate-qr` is disabled with `410` in S1; the scanner never falls back to it.

## 7. Error and response rules

- A malformed request (missing `token`, bad `scope`) returns HTTP 422 with the standard error envelope and does not attempt verification.
- A verification rejection returns HTTP 200 with the canonical `decision` (the scanner needs a decision, not a transport error) unless the request itself is malformed or the principal is unauthorised (401/403).
- The response must include `participant` only for `VALID` and `DUPLICATE`; do not leak participant data on `INVALID`, `EXPIRED` or `WRONG_SCOPE`.
- Timestamps are UTC ISO-8601 with `Z`. The UI renders `Asia/Kolkata`.

## 8. Change control

Any change to the payload, encoding, signature algorithm, key-id rule, verify order, canonical decision values or response fields is a breaking change. It must update this file, `frontend/src/lib/arrivalApi.js`, `frontend/src/App.stage3.test.jsx` and `frontend/src/App.stage3.phase3.test.jsx` in the same change. A new payload version requires a new contract file and a verifier that rejects the old version explicitly.
