# Backend tests — S0 baseline + S1 security coverage

From `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check .
```

`requirements-dev.txt` is the test/lint set. It includes the runtime packages needed to import `app.main` but intentionally excludes InsightFace, ONNX Runtime and OpenCV, which are lazy-imported. The full production set remains in `requirements.txt`.

## Database-dependent tests

S1 adds security, bootstrap and audit tests that need a real Postgres+pgvector database. They are **opt-in** so a plain local `pytest` never touches an unrelated Postgres that happens to be listening on the default port:

- Set `GEEKAI_TEST_DB=1` to enable DB-dependent tests. Without it they all skip cleanly, regardless of what is listening on any port.
- `_database_reachable()` in `conftest.py` is a secondary guard: with the flag set, it checks the `DATABASE_URL` host/port via a plain socket at collection time. If the URL is absent, a placeholder or unreachable, the DB fixtures still skip.
- A plain local run therefore reports non-DB tests passing and DB tests skipped.
- CI sets `GEEKAI_TEST_DB: "1"`, provides `pgvector/pgvector:pg16`, runs `alembic upgrade head`, then `pytest` — so all DB tests run there.

Run the DB-backed suite against a disposable container:

```powershell
docker run -d --name geekai-s1-pg -e POSTGRES_USER=geekai -e POSTGRES_PASSWORD=geekai -e POSTGRES_DB=geekai -p 55432:5432 pgvector/pgvector:pg16
$env:DATABASE_URL = "postgresql+asyncpg://geekai:geekai@localhost:55432/geekai"
$env:GEEKAI_TEST_DB = "1"
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m pytest -q
```

The `clean_tables` fixture truncates all data before each DB test. Never point these commands at a database that holds real participant data.

Async tests share a session-scoped event loop (`pytest.ini`) because the SQLAlchemy engine is created once at import time and its pooled connections are bound to that loop. Do not import the production lifespan in tests.

## Coverage

- `test_health.py`: `/`, `/health`, `/api/health` via ASGITransport (no lifespan).
- `test_openapi.py`: schema loads; contains the route families the frontend uses; `/api/auth/seed` is gone and `/uploads` is not published.
- `test_fixtures.py`: synthetic fixture generator determinism.
- `test_security.py`: 401 matrix for every PII route; `/uploads/*` → 404; volunteer-on-admin → 403; wrong event → 403; legacy QR → 410; bootstrap flow; audit rows; audit redaction.
- `test_database_schema.py` (S2): the `Database-Planning.md` §7 validation queries — counts by event/status/source, active-embedding uniqueness, active ENTRY token uniqueness, idempotency/void reasons, outbox/batch checks, audit coverage, and the M8 constraints. DB-backed and opt-in via `GEEKAI_TEST_DB=1`.

Manual curl matrix and full gate evidence live in `docs/gates/G1.md`.

## CI

`.github/workflows/backend.yml` starts `pgvector/pgvector:pg16`, installs `requirements-dev.txt`, runs `alembic upgrade head`, `pytest`, `ruff` and a non-blocking `pip-audit -r requirements.txt`.
