# GeekAI MVP — Implementation Plan

## Overview
Smart registration & attendance management for Odisha AI Symposium (500–1000 participants).

**Stack**: React+Vite (frontend), FastAPI (backend), PostgreSQL+pgvector (DB), OpenCV+InsightFace (local face check-in)

---

## Database Initialization & Migration Reliability (`relation "users" does not exist`)

### Root Cause
1. Previously, running `docker compose up` or starting FastAPI directly invoked `uvicorn app.main:app` without applying database schema migrations (`alembic upgrade head`).
2. When requests arrived at unmigrated PostgreSQL databases, queries targeting the `users` table failed with `relation "users" does not exist`.
3. `backend/app/models/__init__.py` was empty and did not export the model classes and metadata.
4. FastAPI `lifespan` in `app/main.py` did not execute migrations on startup.
5. `backend/Dockerfile` had no entrypoint script to migrate the schema prior to starting the web server.

### Resolved
- [x] 1. Imported and exported all models (`Base`, `User`, `Participant`, `FaceEmbedding`, `Session`, `Attendance`, and enums) in `backend/app/models/__init__.py`.
- [x] 2. Updated `backend/migrations/env.py` to allow online migrations to run safely across both sync/CLI contexts and async loop contexts (via thread pool worker).
- [x] 3. Implemented `backend/app/core/db_init.py` with retry logic and invoked `await run_migrations_async()` inside `backend/app/main.py` lifespan to migrate the schema on application startup before accepting traffic.
- [x] 4. Created `backend/docker-entrypoint.sh` with a native socket-based PostgreSQL connectivity check and `alembic upgrade head` before handing off to `uvicorn`.
- [x] 5. Updated `backend/Dockerfile` with `PYTHONUNBUFFERED=1` and `ENTRYPOINT ["/app/docker-entrypoint.sh"]`.
- [x] 6. Configured `docker-compose.yml` backend service with healthcheck dependency and unbuffered logs.
- [x] 7. Preserved all existing PostgreSQL data and volumes; verified zero destructive operations.
- [x] 8. Verified all 6 tables exist in PostgreSQL (`users`, `participants`, `face_embeddings`, `sessions`, `attendance`, `alembic_version`).
- [x] 9. Verified login, volunteer registration, participant creation, session creation, and attendance recording work end-to-end.
- [x] 10. Rebuilt Docker container and validated cold-boot migration execution and container health.

---

## Integration of Face Check-In into Volunteer Dashboard

### Overview
Integrate the face recognition check-in workflow into the Volunteer Dashboard of GeekAI so volunteers can perform both (1) Event Face Check-In (one-time event-level attendance, mark Present/Absent, duplicate prevention) and (2) Session Attendance (independent per-session QR and manual attendance) from the same authenticated volunteer interface.

### Plan
- [x] 1. **Inspect & Verify Backend Architecture & Contracts**:
  - Review `backend/app/services/embedding_service.py` and `backend/app/models/models.py`.
  - Added `libgl1` to `backend/Dockerfile` so OpenCV/InsightFace loads and functions inside Docker.
  - Added `FaceMatchResponse` schema in `backend/app/schemas/schemas.py`.
  - Added `POST /api/attendance/face-match` endpoint in `backend/app/api/attendance.py`:
    - Accepts multipart image (captured from volunteer's browser camera or uploaded).
    - Generates 512-d embedding using `generate_embedding()`.
    - Matches against database face embeddings using cosine similarity (matching `matcher.py` threshold logic).
    - Checks whether the participant is already checked in for the event (`session_id IS NULL`).
    - Returns match status, participant info, similarity score, and `already_checked_in` flag.
  - Ensured `POST /api/attendance/` properly handles `session_id: None` with `method: "FACE"` and prevents duplicates with 409 Conflict.
- [x] 2. **Implement Volunteer Face Check-In UI in Frontend**:
  - Created `frontend/src/pages/volunteer/FaceCheckIn.jsx`:
    - Webcam stream with viewfinder and face framing guide.
    - Snapshot capture and instant face match call to `/api/attendance/face-match`.
    - Match confirmation view displaying matched participant photo, name, category, institution, email, and similarity score.
    - Status indicators: `Already Checked In` vs `Ready for Check-In`.
    - One-time Check-In action: "Mark Present" (calls `POST /api/attendance/` with `session_id: null, method: "FACE"`).
    - "Mark Absent / Reject" action to reject match and scan next person.
    - Manual search fallback tab for event check-in if face cannot be recognized.
  - Updated `frontend/src/pages/volunteer/VolunteerDashboard.jsx`:
    - Added prominent "Event Face Check-In" action card alongside Session Attendance cards.
  - Registered `/volunteer/face-checkin` in `frontend/src/App.jsx`.
- [x] 3. **Verify Volunteer Authentication & Separate `face-checkin/` Module**:
  - Verified volunteer authentication with `POST /api/auth/login`.
  - Updated `face-checkin/.env` and `face-checkin/.env.example` with valid volunteer credentials (`volunteer@geekai.in` / `volunteer123`).
  - Verified `face-checkin/api_client.py` logs in and syncs properly with backend.
- [x] 4. **Build, Test, and Verify**:
  - Ran frontend production build (`npm run build`) with zero errors.
  - Rebuilt and redeployed Docker containers (`geekai-backend` and `geekai-frontend`).
  - Performed end-to-end testing:
    1. Volunteer login via web and API (`volunteer@geekai.in`).
    2. Face recognition and event check-in (`session_id = NULL`, `method: "FACE"`).
    3. Duplicate event check-in prevention (`409 Conflict: Attendance already recorded for this participant at event level`).
    4. Session attendance (`session_id = 2`, `method: "QR"`) independence check.
    5. Database persistence verification in PostgreSQL `attendance` table.

### Requirements
1. Allow admins to create volunteer accounts with custom name, email, and password.
2. Store passwords securely with bcrypt.
3. Allow volunteers to log in using their credentials and access volunteer scanning & lookup workflows.
4. Allow admins to view all volunteers, their active status, and number of attendance records marked.
5. Allow admins to activate/deactivate volunteers (inactive accounts cannot log in).
6. Allow admins to delete volunteers.
7. Integrate UI in the Admin Panel (`/admin/volunteers`) with responsive table, search, modal dialogs, and navigation links.

### Resolved & Verified
- [x] 1. Added `VolunteerCreate` and `VolunteerOut` schemas in `backend/app/schemas/schemas.py`.
- [x] 2. Implemented `GET /api/admin/volunteers`, `POST /api/admin/volunteers`, `PATCH /api/admin/volunteers/{id}/toggle-status`, and `DELETE /api/admin/volunteers/{id}` in `backend/app/api/admin.py`.
- [x] 3. Created `frontend/src/pages/admin/Volunteers.jsx` with full UI:
  - Add Volunteer modal (custom Name, Email, Password, Confirm Password).
  - Search filter by name or email.
  - Active/Inactive status toggle with confirmation badge.
  - Attendance check-in count display.
  - Delete volunteer confirmation modal.
- [x] 4. Added navigation entry in `AdminLayout.jsx` and registered `/admin/volunteers` route in `App.jsx`.
- [x] 5. Verified frontend production build (`npm run build`) succeeded with 0 errors.
- [x] 6. Rebuilt and restarted Docker services (`geekai-backend`, `geekai-frontend`, `geekai-postgres`).
- [x] 7. Verified end-to-end functionality via API & tests:
  - Admin login (`admin@geekai.in`).
  - Listing volunteers (`GET /api/admin/volunteers`).
  - Creating new volunteer (`POST /api/admin/volunteers`).
  - New volunteer login (`POST /api/auth/login`) returning role `VOLUNTEER`.
  - RBAC verification: volunteer blocked from admin endpoints (403).
  - Deactivating volunteer (`PATCH .../toggle-status`) → login blocked (403 Account deactivated).
  - Deleting volunteer (`DELETE .../{id}`) → login fails (401 Invalid email or password).
  - Duplicate email protection (409 Conflict).
