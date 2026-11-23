# GeekAI — WorkFlow After Frontend Redesign

**Odisha AI Symposium 2026** · SOA University · AIC for Innovation Center
**Status:** Frontend complete, integration pending · Branch `debdatta/development` · 20 November 2026
**Supersedes for planning purposes:** the frontend portion of [WorkFlow.md](WorkFlow.md); the rest of `WorkFlow.md` remains the authoritative target architecture.

> **Plan change (20 November 2026):** pre-registration is now the **in-site React form** on `/register` instead of Google Forms. The handoff was removed in commit `7ded722`; the in-site form is the single intake path, with the same component serving staff-assisted walk-ins. All other decisions are unchanged.

---

## 1. Purpose

This document records the verified state of the project after the frontend redesign, then defines the remaining work, its order, gates, and acceptance criteria. It is a **planning document only** — no application code is changed here.

### 1.1 Governing documents

| Document | Role |
|---|---|
| [WorkFlow.md](WorkFlow.md) | Authoritative target architecture, data model, QR/sync contracts, event-day flow |
| [FrontendPlanning.md](FrontendPlanning.md) | Design system, page specs, responsive/accessibility/performance rules |
| [Frontend-Redesign-Completion.md](Frontend-Redesign-Completion.md) | Five-stage delivery record and review handbook |
| [frontend/STAGE5-QA.md](frontend/STAGE5-QA.md) | Section 12 acceptance mapping; PASS / BY DESIGN / HARDWARE status |
| [Backend-Planning.md](Backend-Planning.md) | Remaining API and service work |
| [Database-Planning.md](Database-Planning.md) | Remaining schema, migration and data work |
| [Infrastructure-Planning.md](Infrastructure-Planning.md) | AWS, S3, RDS, SES, Cloudflare and deployment work |
| [React-Registration-Planning.md](React-Registration-Planning.md) | In-site React form submission → validation → S3 → embeddings pipeline |
| [Local-Hub-Planning.md](Local-Hub-Planning.md) | On-site hub, stations, offline outbox, cloud sync |
| [Security-Privacy-Planning.md](Security-Privacy-Planning.md) | P0 hardening before any real PII is collected |
| [Backend-Implementation-Plan.md](Backend-Implementation-Plan.md) | **Execution order:** stages S0–S10, dependencies, exit evidence and the first five working days |

### 1.2 Source threads (reference material)

- [Frontend research & redesign plan — Odisha AI Symposium 2026](t3-thread://v2/0734c201-b141-4994-90b8-51cc5d05bab9/mcp:c90a4d1f-60ad-44b5-bd52-f09ca899c45c)
- [GeekAI Frontend Redesign — 5-Stage Implementation](t3-thread://v2/0734c201-b141-4994-90b8-51cc5d05bab9/mcp:6620d549-e182-4884-911b-43eae1c65c13)

---

## 2. Independent verification of the frontend work

The completion report and QA report were reviewed, then the claims were re-checked against the working tree on 20 November 2026.

### 2.1 Checks actually run in this session

| Check | Command | Result |
|---|---|---|
| Unit / integration tests | `npm test` (in `frontend/`) | **143 / 143 pass**, 13 files |
| Lint | `npm run lint` | **0 errors**, 7 warnings (unused imports/vars and stale eslint-disable directives) |
| Production build | `npm run build` | **Successful**, 1886 modules |
| Bundle budgets | `node scripts/bundle-budget.mjs` | **All pass** — public 147.7 KB, admin 146.7 KB, scanner route 5.8 KB gzip; camera library 97.5 KB loaded on demand. Register 4.52 KB, RegistrationForm 30.33 KB (9.62 KB gzip) |
| Git state | `git status --short` | **Clean**; branch `debdatta/development` |
| Git history | `git log --oneline -12` | Five frontend stages plus fixes and documentation commits present |

Not re-run here because they need a running preview or physical devices: `scripts/visual-qa.mjs` (device matrix), axe route audit (covered by `App.a11y.test.jsx`), Lighthouse, printer/scanner sign-off, NVDA/VoiceOver. These are recorded as PASS or HARDWARE in `frontend/STAGE5-QA.md`.

### 2.2 Minor issues found during verification (non-blocking)

The test run emitted React DOM warnings that lint does not treat as errors:

- `stroke-width` used instead of `strokeWidth` in an inline SVG (admin dashboard/chart path).
- `asChild` passed through to a DOM element in the admin shell.
- Nested `<p>` / `<div>` inside `<p>` in the mobile `Table` card renderer.
- Seven lint warnings: unused `useLocation`, `err`, `stats`, `Icon`, and three stale `eslint-disable` comments.

These do not break the flows or the build, but they are real quality debt. Fix them in a small, frontend-only cleanup commit **after** the backend contract work is stable, not during the integration phases.

### 2.3 Verdict

**The required frontend part is complete.** All five stages in `FrontendPlanning.md` are implemented, tested and pushed. The post-Stage 5 registration redesign replaced the handoff with the first-party React form, including the shared assisted path, and is covered by the 143 passing tests. The screens that depend on not-yet-existing APIs are deliberately flag-gated and show "Waiting for backend" — this is the agreed safe state, not an incomplete UI. No frontend code constructs or trusts a QR payload.

What remains is **integration and backend/database/infrastructure delivery** — including `POST /api/register`, which the in-site form targets — plus hardware sign-off.

---

## 3. Current state snapshot

### 3.1 What is done

- Public site: landing, programme, venue, FAQ, privacy, accessibility, code of conduct, and the in-site React registration form on `/register`. The Speakers page was removed because this is a registration portal, not the event's official site. Content now identifies the GeekAI Developer Team as the platform owner, currently serving Odisha AI Symposium 2026.
- Participant: nine-state registration status, ticket page with signed-token-only QR rendering, print styles, signed-link lookup.
- Volunteer: arrival desk with face capture, candidate confirmation, manual fallback with reason, badge printing; QR scanner with entry/session modes and ten result states; manual lookup, pending-sync queue, desk runbook.
- Admin: shell, live dashboard from real stats, participants, sessions, attendance with void dialog, volunteers, exports, plus flag-gated imports, import detail, live ops, reconciliation, audit and settings.
- Cross-cutting: design tokens, accessible primitives, error/offline/empty states, responsive 320–2560 px, test/lint/build/budget gates.

### 3.2 What is not done

- AWS S3, RDS, SES, IAM, Cloudflare Pages/Access/WAF — none exist in the codebase.
- Backend registration pipeline, submission normalization, photo quality gate and embedding build (the frontend form on `/register` is delivered and posts multipart to `POST /api/register`; the endpoint itself does not exist yet).
- Signed QR service, token table, arrival/issue/verify endpoints.
- Local hub, station sync, versioned manifest, offline outbox drain to cloud.
- Email outbox and SES welcome email.
- Most P0 security hardening: biometric sync endpoint is unauthenticated, participant reads are public, QR payloads are unsigned JSON, default credentials are seeded, attendance cannot be voided server-side.
- No backend tests, CI, backups or documented retention policy.

### 3.3 Feature-flag → API dependency matrix

From `frontend/src/content/flags.js`. Production defaults are OFF unless set explicitly.

| Flag | Frontend screen | Required backend capability |
|---|---|---|
| `ARRIVAL_V2` | Arrival write, Issue QR pass | `POST /api/arrivals`, `POST /api/qr/issue` |
| `SCAN_V2` | Signed pass verification | `POST /api/qr/verify` |
| in-site form (delivered, no flag) | `/register` React form + submission status | `POST /api/register`, `GET /api/registrations/{id}` |
| `LIVE_OPS` | Live operations | live-ops feed endpoint |
| `RECONCILIATION` | Variance detail | reconciliation endpoint |
| `AUDIT_V2` | Audit log | audit log read endpoint |
| `SETTINGS_V2` | Settings | event/settings endpoint |
| `ANALYTICS_V2` | Analytics | analytics endpoint |
| `VOID_ATTENDANCE` | void with reason | `POST /api/attendance/{id}/void` |
| `TICKET_PAGE` | status/ticket pages | signed ticket token endpoint |

`REGISTRATION_HANDOFF` and `VITE_REGISTRATION_FORM_URL` were removed with the registration redesign. The in-site React form is the single source of truth; the legacy `NativeRegisterForm` was deleted and `/register/assisted` reuses the same component with `source=WALK_IN`.

### 3.4 Endpoint inventory

**Live today:** `/api/auth/*`, `/api/participants/*`, `/api/sessions/*`, `/api/attendance/*` (including legacy `face-match` and unsigned `validate-qr`), `/api/embeddings/sync`, `/api/admin/*` (dashboard, volunteers, exports).

**Required next:** arrivals, QR issue/verify, imports, sync manifest/bundle, sync batches, attendance void, ticket token, live ops, reconciliation, audit, analytics, settings, email resend. Exact contracts are in [Backend-Planning.md](Backend-Planning.md).

---

## 4. Remaining programme, mapped to WorkFlow.md

| WorkFlow phase | Remaining work | Owner document | Gate |
|---|---|---|---|
| P0 hardening (cross-cutting) | Auth on PII/biometrics, signed QR, default-credential removal, consent/retention, audit, CI | Security-Privacy-Planning.md | **G1** |
| Phase 1 — foundation | S3, RDS/pgvector, SES, IAM, secrets, Cloudflare Pages/Access/WAF, deployment | Infrastructure-Planning.md | **G2** |
| Phase 2 — intake | Backend for in-site React submission: validation, dedupe, photo quality, S3 upload, embeddings (frontend form delivered) | React-Registration-Planning.md, Database-Planning.md | **G3** |
| Phase 3 — arrival | DB migration for QR/arrival/outbox, backend endpoints, local hub, signing, SES email | Database-Planning.md, Backend-Planning.md, Local-Hub-Planning.md | **G4** |
| Phase 4 — operations | Sync ingestion, live ops, reconciliation, audit, admin endpoints, flag enablement | Backend-Planning.md, Local-Hub-Planning.md | **G5** |
| Phase 5 — rehearsal | 1,000-row import, 4–6 stations, offline drill, deliverability, QR failure cases | This document §7 | **G6** |
| Phase 6 — event/post | Runbook, event day, exports, certificates, retention purge | This document §8 | GO / post |

### 4.1 Stage gates

**G1 — Safe to store real PII**
- No unauthenticated route returns participants, embeddings, attendance or photos.
- QR signing key exists in Secrets Manager; legacy unsigned QR path disabled or explicitly marked non-production.
- Default seeded admin/volunteer credentials removed; first-run setup works.
- Consent text and retention periods frozen in writing.

**G2 — Environment ready**
- Staging browser → Cloudflare → AWS API → RDS/S3 path verified.
- SES domain verified, DKIM/SPF/DMARC set, production access requested.
- Access/WAF rules protect admin and volunteer paths; camera pages served over HTTPS.

**G3 — Data ready**
- 1,000 test rows imported with a validation report; re-run is a no-op.
- Photos in S3, embeddings generated with recorded model version, manifest hash published.

**G4 — Flow ready**
- Arrival → signed QR → welcome email works on the hub with the internet disconnected.
- Signed QR verified by the scanner; legacy unsigned QR rejected.
- Frontend flags can be turned on against real endpoints.

**G5 — Operations ready**
- Hub → cloud sync with idempotency, per-item results and reconciliation report.
- Admin imports/live ops/reconciliation/audit screens show live data, not "Waiting for backend".

**G6 — Rehearsal passed**
- Acceptance targets in §7 met; go/no-go signed by the event owner.

---

## 5. Recommended delivery order

> **Execution detail:** [Backend-Implementation-Plan.md](Backend-Implementation-Plan.md) turns the order below into stages S0–S10 with work items, dependencies, exit evidence and a week-by-week shape. Use this section for the rationale and that document for the day-to-day sequence.

1. **Security foundation (G1)** — do this before touching real data; it changes auth dependencies used by every later endpoint.
2. **Database migrations (G3 prerequisites)** — add `events`, provenance fields, QR/arrival/outbox/audit tables; keep legacy tables readable during transition.
3. **Infrastructure (G2)** — provision S3/RDS/SES/Cloudflare; wire configuration and secrets.
4. **Backend contracts (G4)** — implement arrival, issue, verify, sync and ticket endpoints with contract tests mirroring the frontend mocks.
5. **Import pipeline (G3)** — build CLI + admin endpoint, photo quality gate, embedding build and manifest export.
6. **Local hub (G4)** — station cache, local matching, signing, outbox, sync worker.
7. **Integration enablement (G5)** — enable flags one at a time in staging; remove "Waiting for backend" panels from the critical path.
8. **Rehearsal (G6)** — offline drill, load test, deliverability, QR failure cases.
9. **Event day and post-event** — runbook, exports, certificates, retention purge.

Do not start step 4 before step 1: adding endpoints to currently public PII routes multiplies the exposure.

---

## 6. Documentation suite and how to use it

| Need | Document |
|---|---|
| "What exactly must the API expose?" | Backend-Planning.md |
| "What columns, indexes and migrations?" | Database-Planning.md |
| "Where does it run and how is it secured at the edge?" | Infrastructure-Planning.md |
| "How does a React form submission become a participant?" | React-Registration-Planning.md |
| "How does the desk work without internet?" | Local-Hub-Planning.md |
| "What must be true before we collect photos?" | Security-Privacy-Planning.md |
| "Where are we now and what is the order?" | This document |

Each document ends with exit criteria. A document's work is done only when its exit criteria are met and verified, not when code is written.

---

## 7. Rehearsal and acceptance (Phase 5)

| Area | Acceptance target |
|---|---|
| Import | 1,000 rows, clean validation report, idempotent re-run |
| Sync | 4–6 stations load the same manifest hash; zero unexplained variance |
| Arrival | 95% of arrivals under 30 seconds |
| QR | 99% of scans under 2 seconds; forged/expired/wrong-scope rejected |
| Email | >95% delivered within 5 minutes of issuance to Gmail/Outlook/Indian providers |
| Offline | 2-hour internet cut; zero data loss; zero duplicates after reconnect |
| Face | Volunteer confirmation mandatory; low-confidence path requires ID + reason |
| Accessibility | Zero critical/serious axe violations; hardware assistive-tech check scheduled |
| Security | No PII in logs; signed QR only; private S3; Access/WAF active |

**Drills:** (1) full flow with internet up; (2) airplane-mode arrival + queue + reconnect; (3) duplicate scan, wrong participant, expired token, manual override; (4) printer failure fallback; (5) SES bounce/complaint handling; (6) hub restart with pending outbox.

---

## 8. Event day and post-event (Phase 6)

- Freeze imports and embeddings at T-3; publish final manifest hash.
- Print desk runbook from `/volunteer/help`; verify 90-second briefing.
- Backup power/network and 4G failover; escalation contacts on paper.
- Reconcile forms → imported → embedding-ready → arrived → QR issued → checked in → emails sent.
- Post-event: exports, certificates with public verification, analytics summary, retention purge, postmortem.

---

## 9. Cross-cutting rules (do not violate)

1. The client never builds or trusts a QR payload; verification is server/hub-side only.
2. `client_event_id` is generated once and reused on retry; every write is idempotent.
3. No endpoint names beyond the agreed contract; no invented speakers, dates, sponsors or claims.
4. All PII/biometric reads require auth; audit every read/write and state transition.
5. Feature flags default OFF in production; enable only after the endpoint passes rehearsal.
6. `WorkFlow.md` wins over any other document on workflow and state behaviour.
7. Commit and push per coherent slice with a descriptive message, as the frontend stages did.
8. No backend/database change may alter the delivered frontend contracts or design system.

---

## 10. Decisions to confirm before implementation

1. Does the in-site React form collect a compliant face photo + biometric consent? The frontend now captures both (photo picker/camera and versioned consent linked to `/privacy`); the backend photo quality gate and embedding build are still outstanding. Without them, arrival scanning is enrollment, not verification.
2. Cloudflare scope: Pages/Access/WAF in front of an AWS-hosted FastAPI backend (recommended) — not Workers.
3. S3 scope: blobs and JSON archive; RDS Postgres/pgvector remains the operational store.
4. QR scope: one signed participant QR; event entry once; session scans reusable with photo verification.
5. Hub model: hub-and-spoke, hub is the single writer, stations use LAN.
6. Email provider: SES with verified domain and production access.
7. Data retention window for photos/embeddings and for attendance/audit.
8. Resolved: the in-site `/register` form also serves staff-assisted walk-ins via `/register/assisted`, reusing the same component with `source=WALK_IN` behind staff auth.
9. Source of official brand assets, speaker list, dates, venue address and sponsor kit.
10. Who owns AWS/Cloudflare credentials and who signs the go/no-go.

---

## 11. Definition of project complete

- All gates G1–G6 passed and recorded.
- Every flag used by the delivered frontend is ON in production with its endpoint live and rehearsed.
- No screen shows "Waiting for backend" on the event-day build.
- Two consecutive full rehearsals passed, including an internet cut.
- Hardware sign-off (printer, scanner, assistive technology, Lighthouse) recorded.
- Post-event exports, certificates, reconciliation and retention purge completed.

**Current position:** frontend done and verified, including the in-site registration redesign (`7ded722`); gates G1–G6 open; next action is **Stage S0 (contract freeze, decisions and backend test/CI baseline)**, then **S1 — the G1 security foundation**, with **the infrastructure stage (S3) started in parallel on day one** because SES approval is long-lead. The exact sequence is in [Backend-Implementation-Plan.md](Backend-Implementation-Plan.md) §11.
