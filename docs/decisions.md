# GeekAI — decision log

**Status:** Approved · 2026-11-22
**Source:** `Backend-Implementation-Plan.md` §10
**Owner:** Geek AI Developers Team (student team building the Odisha AI Symposium 2026 registration portal)
**Approver:** project owner, on behalf of the Geek AI Developers Team
**Scope:** the twelve decisions that gate Stages S3–S10. All twelve are now approved by the project owner.

> **Scope note.** This portal is built and operated by the Geek AI Developers Team as an independent student project for registration handling. It is not an official university system, so no university legal or privacy office is claimed as approver and no university policy is quoted. The team is the data controller for everything the portal collects. Decisions recorded here are the team's own operating rules; they are binding on the implementation, not a legal opinion.

## Decision records

### D1 — Data controller

| Field | Value |
|---|---|
| ID | D1 |
| Decision | Who is the data controller for registration, photos, embeddings, attendance and audit records. |
| Status | **APPROVED** — 2026-11-22 |
| Approved value | **The Geek AI Developers Team** is the data controller for all data collected by this portal (project "Geek AI", Odisha AI Symposium 2026 registration). "Geek AI" is the project name; the team is the responsible body. Published privacy contact: the team registration mailbox (address TBA, to be supplied by the project owner before S4 copy is published). |
| Owner | Geek AI Developers Team — project owner is the named responsible person. |
| Impact | Consent wording, privacy notice, retention, deletion requests, vendor accounts and the published contact route. |
| Blocks | S4 consent and privacy copy; S2/S4 retention and purge jobs. |
| Date recorded | 2026-11-21 (provisional) · 2026-11-22 (approved) |
| Evidence of approval | Project owner approval in project chat, 2026-11-22. Not a university legal opinion; no university affiliation is claimed. |

### D2 — Consent version and wording

| Field | Value |
|---|---|
| ID | D2 |
| Decision | Freeze the biometric consent text and version used by the in-site form. |
| Status | **APPROVED** — 2026-11-22 |
| Approved value | The delivered text and `CONSENT_VERSION = '2026-11'` in `frontend/src/lib/registration.js` are approved **verbatim**. The text states the photo is used only for event check-in and deleted after the retention period. Any wording change requires a new version identifier and an approved frontend change; no in-place edit. |
| Owner | Geek AI Developers Team — project owner. |
| Impact | `consent.version` validation in `POST /api/register`, the privacy page, the consent record stored per participant and any re-consent flow. |
| Blocks | S4. |
| Date recorded | 2026-11-21 (provisional) · 2026-11-22 (approved) |
| Evidence of approval | Project owner approval in project chat, 2026-11-22. Frontend stays frozen; no file changed. |

### D3 — Retention period N

| Field | Value |
|---|---|
| ID | D3 |
| Decision | Number of days after the event before photos and embeddings are deleted, and the retention rule for attendance/audit records. |
| Status | **APPROVED** — 2026-11-22 |
| Approved value | **Photos and face embeddings: deleted 90 days after the event ends.** **Attendance and audit records: kept 12 months after the event ends, then deleted.** Purge jobs must support a dry run and produce a deletion report signed by the project owner. Deletion reports are retained as evidence after the underlying data is gone. |
| Owner | Geek AI Developers Team — project owner signs deletion reports. |
| Impact | S3 lifecycle rules, S2 purge jobs, S4 privacy copy, post-event operations and deletion evidence. |
| Blocks | S2 purge jobs and S4 collection. |
| Date recorded | 2026-11-21 (provisional) · 2026-11-22 (approved) |
| Evidence of approval | Project owner approval in project chat, 2026-11-22. |

### D4 — AWS region

| Field | Value |
|---|---|
| ID | D4 |
| Decision | Primary AWS region for S3, RDS, SES, ECS and Secrets Manager. |
| Status | **APPROVED** — 2026-11-22 |
| Approved value | **`ap-south-1` (Mumbai).** Single primary region for all services; data stays in India. |
| Owner | Geek AI Developers Team — project lead (infrastructure). |
| Impact | Data residency, latency, SES availability, RDS/pgvector support and Cloudflare origin configuration. |
| Blocks | Stage S3. |
| Date recorded | 2026-11-21 (provisional) · 2026-11-22 (approved) |
| Evidence of approval | Project owner approval in project chat, 2026-11-22. No infrastructure provisioned yet. |

### D5 — SES sending identity

| Field | Value |
|---|---|
| ID | D5 |
| Decision | Which address or domain sends registration and pass-issuance email, and who manages its DNS. |
| Status | **APPROVED (mechanism)** — 2026-11-22; exact address **TBA** |
| Approved value | Outbound registration, confirmation and QR/pass email is sent from **the team's own registration mailbox, supplied by the project owner**. The same address is the public contact for participants and the reply-to for all mail. DNS for any verified sending domain is managed by the team (project lead). No personal third-party domain is used for the app-facing identity. Exact address is TBA until the project owner supplies it. |
| Delivery note | SES cannot verify a consumer mailbox such as `@gmail.com` (the provider owns that domain). Two supported paths: **(a)** send through that mailbox's SMTP with an app password held in AWS Secrets Manager — simple, but capped at roughly 500 messages/day and unsuitable for a bulk send; **(b)** verify a team-owned domain and send `no-reply@<team-domain>` with the team mailbox as `Reply-To` — preferred once the volume or the event date is known. The choice is recorded when the address is supplied. |
| Owner | Geek AI Developers Team — project owner (address) and project lead (DNS). |
| Impact | SES verification, DKIM/SPF/DMARC, sender reputation, bounce handling and S6 delivery rehearsal. |
| Blocks | Stage S3 SES setup and S6. |
| Date recorded | 2026-11-21 (provisional) · 2026-11-22 (approved mechanism) |
| Evidence of approval | Project owner approval in project chat, 2026-11-22. Address and SES production ticket number to be appended when supplied. |

### D6 — AWS and Cloudflare owners

| Field | Value |
|---|---|
| ID | D6 |
| Decision | Named individuals who own the AWS account and Cloudflare account, with MFA and credentials held safely. |
| Status | **APPROVED** — 2026-11-22 |
| Approved value | **Primary owner: project lead. Backup owner: project owner.** Applies to both AWS and Cloudflare. MFA required on both accounts and on the root credentials. No long-lived access keys on laptops or in chat; secrets live in the team password vault and in AWS Secrets Manager. Spending approver: project owner. Post-event key rotation owner: project lead. Handover recorded at event close. |
| Owner | Geek AI Developers Team — project lead (primary), project owner (backup). |
| Impact | Account recovery, Access/WAF policy, billing, incident response and post-event key rotation. |
| Blocks | Stage S3. |
| Date recorded | 2026-11-21 (provisional) · 2026-11-22 (approved) |
| Evidence of approval | Project owner approval in project chat, 2026-11-22. Vault name to be appended when created. |

### D7 — QR signing algorithm and key id

| Field | Value |
|---|---|
| ID | D7 |
| Decision | Signing algorithm, key distribution and key-id handling for QR v1. |
| Status | **APPROVED** — 2026-11-22 |
| Approved value | **Ed25519 signatures.** The v1 payload stays the eight-field payload in `WorkFlow.md` Appendix B. The key is selected by `iss` in the verifier's key registry; `kid` is stored server-side on `qr_tokens` and is never added to the v1 payload. Private key lives in AWS Secrets Manager, owned by the project owner. Rotation: one key per event; the previous key stays in the registry read-only until every pass issued under it has expired. |
| Owner | Geek AI Developers Team — project lead (key custody), project owner (issuer identity). |
| Impact | `services/qr_signing.py`, scanner key distribution, key rotation, revocation and the frozen `qr-v1.md` contract. |
| Blocks | S5. |
| Date recorded | 2026-11-21 (provisional) · 2026-11-22 (approved) |
| Evidence of approval | Project owner approval in project chat, 2026-11-22. No key generated yet. |

### D8 — Hub runtime form

| Field | Value |
|---|---|
| ID | D8 |
| Decision | Whether the local hub is a separate service or the same FastAPI image in a local profile. |
| Status | **APPROVED** — 2026-11-22 |
| Approved value | **Same FastAPI image with `HUB_MODE=local` and a local SQLite database.** Separate configuration and local-only secrets; no cloud credentials on the hub host. Local backups and restore drills are owned by the project owner. Local Postgres is adopted only if the S7 drill shows SQLite cannot keep up. |
| Owner | Geek AI Developers Team — project lead (runtime), project owner (backups). |
| Impact | Deployment, backup/restore, local matching, signing key custody and S7 offline drills. |
| Blocks | S7. |
| Date recorded | 2026-11-21 (provisional) · 2026-11-22 (approved) |
| Evidence of approval | Project owner approval in project chat, 2026-11-22. |

### D9 — Bot protection on `/register`

| Field | Value |
|---|---|
| ID | D9 |
| Decision | Which bot-protection mechanism guards the public registration form. |
| Status | **APPROVED** — 2026-11-22 |
| Approved value | **Cloudflare edge protection only:** a managed challenge on the registration path plus API-side rate limits and a server-side check. **No Turnstile widget while the frontend is frozen**, because the widget needs markup and a script change in the form. Turnstile is revisited only with an approved frontend change and a new consent line. |
| Owner | Geek AI Developers Team — project lead (edge config), project owner (frontend change authority). |
| Impact | Cloudflare configuration, form submission path, accessibility and privacy copy. |
| Blocks | S4 abuse controls. |
| Date recorded | 2026-11-21 (provisional) · 2026-11-22 (approved) |
| Evidence of approval | Project owner approval in project chat, 2026-11-22. Chosen specifically so no frontend file changes. |

### D10 — Registration closing date and capacity

| Field | Value |
|---|---|
| ID | D10 |
| Decision | When registration closes and whether a capacity/waitlist limit applies. |
| Status | **APPROVED (rule)** — 2026-11-22; closing date **TBA** |
| Approved value | **Rule:** the public form auto-closes **48 hours before the event start time**, once the event date is fixed. **No capacity cap. No waitlist.** Late or missed registrations are handled at the assisted on-site desks. The concrete closing datetime is TBA and will be set by the project owner at the next planning meeting; only the rule is fixed now, and no date is invented. |
| Owner | Geek AI Developers Team — project owner. |
| Impact | Public copy, `event.registration.closed`, waitlist behaviour, manifest freeze at T-3 and late-registration handling. |
| Blocks | S4. |
| Date recorded | 2026-11-21 (provisional) · 2026-11-22 (approved rule) |
| Evidence of approval | Project owner approval in project chat, 2026-11-22. Datetime to be appended after the event date is announced. |

### D11 — Go/no-go signatory

| Field | Value |
|---|---|
| ID | D11 |
| Decision | Who signs the G6 go/no-go for event day. |
| Status | **APPROVED** — 2026-11-22 |
| Approved value | **Main signatory: project owner. Backup signatory: project lead.** They sign the G6 checklist after the S9 rehearsal and accept any residual risk. |
| Owner | Geek AI Developers Team. |
| Impact | S9 exit evidence, event-day escalation and the authority to accept residual risk. |
| Blocks | S9. |
| Date recorded | 2026-11-21 (provisional) · 2026-11-22 (approved) |
| Evidence of approval | Project owner approval in project chat, 2026-11-22. |

### D12 — Manual override authority

| Field | Value |
|---|---|
| ID | D12 |
| Decision | Who may override a failed face match, waive a photo rejection or manually admit a participant, and what must be recorded. |
| Status | **APPROVED** — 2026-11-22 |
| Approved value | **Five on-site registration desks, one desk lead per desk, named by the project owner** (names TBA; to be supplied before S5). Ordinary volunteers cannot override on their own. Allowed reasons: photo rejected at desk with identity verified; face match failed with an alternate ID verified; camera or scanner failure requiring manual entry. Every override writes an audit event with the reason, the desk, the approving desk lead and a timestamp. |
| Owner | Geek AI Developers Team — project owner (desk leads). |
| Impact | S5/S7 override UI, audit coverage, desk runbook and reconciliation exceptions. |
| Blocks | S5 and S7. |
| Date recorded | 2026-11-21 (provisional) · 2026-11-22 (approved) |
| Evidence of approval | Project owner approval in project chat, 2026-11-22. Desk lead names to be appended. |

## Summary

| ID | Decision | Status | Blocks |
|---|---|---|---|
| D1 | Data controller | APPROVED (Geek AI Developers Team) | S2, S4 |
| D2 | Consent version/wording | APPROVED (`2026-11` verbatim) | S4 |
| D3 | Retention N | APPROVED (90 d photos, 12 mo attendance/audit) | S2, S4 |
| D4 | AWS region | APPROVED (`ap-south-1`) | S3 |
| D5 | SES identity | APPROVED mechanism; address TBA | S3, S6 |
| D6 | AWS/Cloudflare owners | APPROVED (lead primary, owner backup) | S3 |
| D7 | QR algorithm/key id | APPROVED (Ed25519) | S5 |
| D8 | Hub runtime form | APPROVED (same image, SQLite) | S7 |
| D9 | Bot protection | APPROVED (Cloudflare edge only) | S4 |
| D10 | Closing date/capacity | APPROVED rule; datetime TBA | S4 |
| D11 | Go/no-go signatory | APPROVED (owner, backup lead) | S9 |
| D12 | Manual override authority | APPROVED (5 desks); names TBA | S5, S7 |

**Change control:** a decision moves to `APPROVED` only by recording the approver, date and evidence in this file. Any decision that changes a contract must also update the matching contract file and the frontend contract test named in that file. Values marked **TBA** are not approved data yet and must not be invented in code, copy or fixtures; the owning field stays `NULL` until the project owner supplies it.

**Outstanding to complete the record:** D1 privacy mailbox address, D5 sending address and SES ticket, D6 vault name, D10 closing datetime, D12 desk lead names.
