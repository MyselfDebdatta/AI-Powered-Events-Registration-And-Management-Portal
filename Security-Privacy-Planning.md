# GeekAI — Security & Privacy Planning

**Odisha AI Symposium 2026** · Companion to [WorkFlow.md](WorkFlow.md), [Backend-Planning.md](Backend-Planning.md) and [Infrastructure-Planning.md](Infrastructure-Planning.md)
**Status:** Plan only · 20 November 2026 · Execution order: [Backend-Implementation-Plan.md](Backend-Implementation-Plan.md)
**Gate:** G1 — must pass before any real participant photo, email or biometric data is collected.

---

## 1. Objective and threat model

Close the critical security and data-integrity gaps in the current backend before the registration pipeline puts real PII into S3 and RDS, and keep the event-day flow safe under adversarial input.

**Threats in scope:** forged or replayed QR codes, unauthenticated biometric export, leaked participant lists, stolen volunteer device, S3 object enumeration, malicious registration payloads and photo uploads, email spoofing, insider data export, and DoS on public forms and ticket lookup.

---

## 2. Current gaps (verified in the codebase)

| # | Gap | Evidence | Severity |
|---|---|---|---|
| 1 | Biometric embeddings exposed without auth | `backend/app/api/embeddings.py` → `GET /api/embeddings/sync` | Critical |
| 2 | Participant and attendance reads effectively public | `backend/app/api/participants.py`, `attendance.py` | Critical |
| 3 | QR payload is unsigned JSON | `backend/app/services/qr_service.py`: `{"participant_id", "name"}` | Critical |
| 4 | Default admin/volunteer credentials seeded | `backend/app/core/db_init.py`, `config.py` (`admin123`, `volunteer123`) | High |
| 5 | Attendance cannot be corrected; volunteer delete may fail on FK | `models.py` `Attendance`, `admin.py` delete route | High |
| 6 | Registration can succeed with zero embeddings | `api/participants.py` | High |
| 7 | No tests, CI, lint or type checks in backend | repo root | High |
| 8 | Frontend served over HTTP in Compose | `docker-compose.yml` | High (camera access) |
| 9 | No S3 policy, secrets management, consent text or retention policy | repo-wide | High |
| 10 | No rate limits or audit log | repo-wide | Medium |
| 11 | Photos and legacy QR PNGs served as public static files | `backend/app/main.py` → `/uploads` `StaticFiles` mount | Critical |

The delivered frontend already refuses unsigned QR JSON, never constructs a payload, and keeps flag-gated writes safe — but the server must still enforce these controls; UI checks are not security controls.

---

## 3. P0 fixes and order

| Priority | Fix | Owner doc | Exit evidence |
|---|---|---|---|
| P0-1 | Authenticate every PII/biometric route; remove/gate `embeddings/sync` | Backend-Planning.md §4 | Unauthenticated request → 401; volunteer hitting admin → 403 |
| P0-2 | Introduce signed QR with `jti`, scope, expiry, revocation | Backend-Planning.md §3.1 | Forged token → `INVALID`, no DB write |
| P0-3 | Remove seeded default credentials; one-time admin setup | Database-Planning.md M9 | Fresh DB has no default login |
| P0-4 | Private S3, Block Public Access, KMS, presigned TTL, bucket policy | Infrastructure-Planning.md §3.1 | No public object; no unencrypted upload |
| P0-5 | Consent + retention policy in writing and in the in-site form/database | React-Registration-Planning.md | Versioned consent on every participant |
| P0-6 | Audit log for PII reads/writes, QR issue/verify, void, imports | Database-Planning.md §2.1 | Every state transition has an audit row |
| P0-7 | Cloudflare Access/WAF, HTTPS everywhere, rate limits | Infrastructure-Planning.md §4 | Camera page works over HTTPS; limits verified |
| P0-8 | Attendance undo with reason + soft-delete guards | Backend-Planning.md §2.1 | Void requires reason; delete preserves history |
| P0-9 | CI with pytest, lint, migration check, dependency audit | Backend-Planning.md §5 | Green build required to merge |
| P0-10 | PII redaction in logs and error tracking | Infrastructure-Planning.md §5 | Log scan finds no email/phone/token |
| P0-11 | Remove the public `/uploads` static mount; serve photos through an authenticated route or presigned URL | Backend-Planning.md §4 | Anonymous `/uploads/*` request → 404; photo requires a principal |

---

## 4. Authorization matrix to enforce

| Route family | Anonymous | Volunteer | Admin | Hub/station token |
|---|:--:|:--:|:--:|:--:|
| Public pages, `/api/health` | ✅ | ✅ | ✅ | ✅ |
| `/api/tickets/{token}` (signed token) | ✅ | ✅ | ✅ | ✅ |
| Face match, arrival, QR issue/verify | ❌ | ✅ | ✅ | ✅ (scoped) |
| Participant list/detail, attendance reads | ❌ | ✅ | ✅ | ✅ (scoped) |
| Imports, sync, live ops, reconciliation | ❌ | ❌ | ✅ | ✅ (sync only) |
| Audit, settings, exports, void | ❌ | ❌ | ✅ | ❌ |
| Embedding sync/bundle | ❌ | ❌ | ✅ | ✅ (manifest only) |

Enforce `event_id` scope on every authenticated route; a token for the wrong event returns 403.

---

## 5. Data handling rules

- **Collection:** explicit, versioned biometric consent; refusal path uses manual ID verification; no photo stored without consent.
- **Storage:** S3 private + SSE-KMS + versioning; RDS private, TLS-only; local hub cache encrypted at rest.
- **Access:** presigned URLs TTL 5–15 minutes, audit-logged; no PII in CDN cache; no public API listing participants.
- **Transport:** HTTPS at Cloudflare and AWS; HSTS; camera pages never on plain HTTP.
- **Logs:** redact email, phone, embeddings, photo keys, QR tokens and JWTs; `request_id` only.
- **Retention:** delete photos/embeddings N days after the event; keep attendance/audit per university policy; document N before collection; purge jobs have dry-run + signed report.
- **Deletion:** participants are soft-deleted/cancelled; QR and audit rows are retained; hard delete requires documented approval.

---

## 6. QR security checklist

- [ ] Signed with Ed25519 (or HMAC with trusted verifiers); private key in Secrets Manager, never in the repo or frontend.
- [ ] Payload includes `v`, `jti`, `sub`, `evt`, `scp`, `iat`, `exp`, `iss`.
- [ ] Verify signature → version/event → expiry → revocation → scope → duplicate → write, in that order.
- [ ] Entry is one-time; session scans once per participant per session.
- [ ] Legacy unsigned QR PNGs excluded from the active flow and from migration.
- [ ] Frontend renders server token only; no logo overlay; quiet zone and error correction H preserved for print.
- [ ] Manual override requires a reason and writes an audit event.

---

## 7. Secure development and operations

- Pin dependencies, commit lockfiles, run `pip-audit` and `npm audit` in CI.
- No production secrets in images, `.env` files, frontend bundle or git history; rotate after the event.
- Add `.dockerignore`, least-privilege container users, read-only root filesystem where practical.
- Add backend tests for authn/authz, QR forgery, replay, idempotency, import validation and email failures.
- Review access logs before the event and after; investigate any unauthenticated PII access.
- Security sign-off is part of gate G1 and again at G6.

---

## 8. Pre-collection sign-off checklist

- [ ] G1 criteria met and recorded.
- [ ] Consent text, version and retention period published on `/register` and `/privacy`.
- [ ] S3 bucket private, encrypted, versioned, logged; no public objects.
- [ ] Signed QR service live; legacy QR path disabled.
- [ ] Default credentials removed; real admin/volunteer accounts issued.
- [ ] Cloudflare Access/WAF and HTTPS active; rate limits tested.
- [ ] Audit log captures PII reads/writes and all state transitions.
- [ ] Backup and restore drill passed; purge job dry-run reviewed.
- [ ] Event owner signs the data-protection note.

---

## 9. Open questions

1. Who is the data controller for participant PII — SOA University, AIC for Innovation Center, or the symposium organising committee?
2. What is the exact consent wording required by the university?
3. Retention period in days for photos/embeddings and for attendance/audit.
4. Are police/insurance or sponsor data-sharing requirements in scope?
5. Who may authorise a manual override or a post-event data purge?
6. What bot-protection, rate limits and upload scanning apply to the public registration endpoint?
