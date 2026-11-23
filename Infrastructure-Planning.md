# GeekAI — Infrastructure Planning (AWS + Cloudflare)

**Odisha AI Symposium 2026** · Companion to [WorkFlow.md](WorkFlow.md) and [WorkFlow-After-Frontend-Redesign.md](WorkFlow-After-Frontend-Redesign.md)
**Status:** Plan only · 20 November 2026 · Execution order: [Backend-Implementation-Plan.md](Backend-Implementation-Plan.md)

---

## 1. Objective and non-negotiable boundary

Provision the hosting, storage, email and edge-security foundation, then deploy the existing FastAPI backend and the completed React frontend into it.

**Boundary:** Cloudflare hosts and protects the **frontend** (Pages + Access + WAF). Cloudflare Workers/Pages is **not** a runtime for FastAPI + SQLAlchemy + PostgreSQL/pgvector + InsightFace. The backend runs on AWS. S3 stores blobs and archives; RDS Postgres/pgvector is the operational store. This is WorkFlow.md §5.1 decision 1 and 2.

**Current state:** no S3, RDS, SES, IAM, Cloudflare or secrets configuration exists in the repo. `docker-compose.yml` serves the frontend over HTTP, which blocks browser camera access outside localhost.

---

## 2. Target topology

```
Browser / phone
    │ HTTPS
    ▼
Cloudflare Pages  ── Access (/admin/*, /volunteer/*) ── WAF + rate limits
    │  static assets + API proxy (/api/*)
    ▼
AWS ALB / App Runner / ECS Fargate — FastAPI
    ├── RDS PostgreSQL + pgvector (private subnet)
    ├── S3 (private bucket, KMS, versioning)
    ├── SES (welcome email)
    └── Secrets Manager / SSM Parameter Store

Venue LAN:
Local hub (same FastAPI image, local profile)
    ├── volunteer stations (camera, QR scan, print)
    └── sync worker ──► AWS API ──► RDS / S3 / SES
```

---

## 3. AWS foundation

### 3.1 S3

- One private bucket, e.g. `geekai-oas2026-<account>-<region>`; Block Public Access fully enabled; SSE-KMS; versioning; access logging to a separate log bucket.
- Key prefixes: `raw-json/{event}/`, `photos/{event}/{participant_id}/`, `embeddings/{event}/`, `exports/{event}/`, `certificates/{event}/`, `manifests/{event}/`, `audit/{event}/`.
- Lifecycle: raw JSON and staging bundles expire after N days; exports/certificates retained per policy. No public objects — all reads via presigned URLs with 5–15 minute TTL.
- Bucket policy denies non-TLS, denies unencrypted uploads, and restricts access to the backend/import/hub roles.
- Migration: copy `backend/uploads/photos` and `qrcodes` with SHA-256 verification; do not migrate legacy unsigned QR PNGs into the active flow.

### 3.2 Database

- RDS/Aurora PostgreSQL in `ap-south-1` with the `vector` extension available; private subnets, no public endpoint, TLS required.
- Automated backups, PITR, snapshot before each major migration and at T-1; deletion protection on in production.
- Parameter group sized for pgvector and connection pooling; use a pooler for serverless deployments.
- Secrets: `DATABASE_URL` in Secrets Manager, never in Compose or the frontend bundle.

### 3.3 Email (SES)

- Verify the sending domain; publish DKIM, SPF and DMARC; request production sending access **early** — approval can take days.
- Create the welcome-email template matching the frozen frontend copy; it must not say a QR was emailed at registration.
- Configure bounce/complaint notifications to SNS and log them into `email_outbox` / audit.
- Warm up the domain if sending volume is significant; aim for >95% delivery within five minutes of issuance.

### 3.4 IAM and secrets

| Role | Permissions |
|---|---|
| Backend task role | read/write S3 prefixes, SES `SendEmail`, Secrets Manager read, RDS connect |
| Registration worker | write registration snapshots/photos/embeddings; no external credentials |
| Hub sync principal | sync endpoints only; scoped token, revocable; no direct RDS or SES access |
| CI deploy role | Cloudflare Pages deploy + ECR push only |

No long-lived AWS keys on volunteer laptops. Store `JWT_SECRET`, `QR_SIGNING_KEY`, `HUB_ID/HUB_TOKEN`, `DATABASE_URL`, SES settings and any form bot-protection secret in Secrets Manager/SSM. No external form-provider credential is required. Rotate after the event.

### 3.5 Backend runtime

- Preferred: ECS Fargate behind an ALB, or App Runner for simpler ops. Keep the same container image for the local hub with a local profile.
- Health checks: `/health` and `/api/health`; readiness includes DB connectivity and S3/SES configuration status.
- Horizontal scaling is not critical for 1,000 participants; a single service plus a worker is enough. Prioritise reliability over scale.
- Set `CORS_ORIGINS` to the Cloudflare Pages domain only; enable HTTPS/HSTS at the edge and ALB.

---

## 4. Cloudflare

- Pages project built from `frontend/` with `npm run build`; publish `dist/`.
- Set production environment variables: `VITE_*` flags OFF by default; `VITE_FLAG_TICKET_PAGE=true` only when the ticket API is live; no external form URL is required.
- Cloudflare Access policies for `/admin/*` and `/volunteer/*` (email/OTP or SSO) as a second layer behind app auth.
- WAF managed rules + rate limits on login, ticket lookup, QR verify and imports. No caching of PII or API responses containing participant data; cache only static assets.
- Custom domain with HTTPS; frontend served over HTTP is not acceptable because camera APIs require a secure context.
- Optional Cloudflare Tunnel for venue LAN access if a public API endpoint is not desired.

---

## 5. Observability and operations

- Structured JSON logs from backend and workers with `request_id`; scrub emails, phone numbers, tokens and photo keys.
- Metrics: arrivals/min, QR issues, verify decisions by code, outbox queue depth, sync lag, S3/SES errors, 5xx rate.
- Alerts: SES bounces/complaints, sync failures, outbox dead-letter, DB connection errors, 5xx spike.
- Error tracking with PII scrubbing; dashboards for event day at the desk and remotely.
- Runbook links from `/volunteer/help`; on-call rotation and escalation contacts printed.

---

## 6. Environments

| Environment | Purpose | Data |
|---|---|---|
| Local | Development and the delivered preview flow | Docker Postgres + synthetic records |
| Staging | Contract/integration rehearsal | Synthetic participants, SES sandbox |
| Production | Event day | Real participants, SES production, private S3 |

Promotion is config-driven only — the same image is promoted from staging to production. Never copy production PII into staging.

---

## 7. Build order

1. Provision S3, KMS, versioning, lifecycle and bucket policy.
2. Provision RDS/pgvector in private subnets; run migrations M1–M9 from Database-Planning.md.
3. Verify SES domain + request production access; create template.
4. Create IAM roles and secrets; wire backend config.
5. Deploy backend to staging behind ALB; verify `/health`, OpenAPI, DB and S3 writes.
6. Create Cloudflare Pages project, domain, Access and WAF rules; point `/api/*` at the backend.
7. Run the delivered frontend against staging with flags off, then enable one flag at a time.
8. Add monitoring, alerts and backups; run a restore drill.
9. Repeat the whole path in production with synthetic data before the import goes live.

---

## 8. Acceptance criteria

- Browser → Cloudflare → AWS API → RDS/S3 path works end to end in staging and production.
- No public S3 object, no public RDS endpoint, no AWS credentials in the repo or frontend bundle.
- Camera pages served over HTTPS; browser camera permission works on a laptop and a phone.
- SES sends to Gmail, Outlook and an Indian provider within five minutes in staging.
- Access/WAF blocks unauthenticated admin/volunteer paths and rate-limits public write-looking routes.
- Backups, restore drill, health checks and alerts are demonstrated.
- All frontend flags can be enabled without changing frontend code.

---

## 9. Open questions

1. ECS Fargate vs App Runner vs a single hardened EC2 instance — confirm team preference and budget.
2. SES sending identity: university domain vs subdomain; who approves DNS changes?
3. Region: `ap-south-1` assumed — confirm with the university's data policy.
4. Is a Cloudflare Tunnel required for the venue, or will the hub call a public API endpoint?
5. Who owns the AWS and Cloudflare accounts and the production credentials?
6. What bot-protection service (for example Cloudflare Turnstile) protects the public registration endpoint?
