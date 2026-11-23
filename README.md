# GeekAI — Smart Registration & Attendance Management

> **Odisha AI Symposium** · Designed for 500–1,000 participants

GeekAI is a full-stack platform that handles participant registration, face-recognition-based event check-in, QR-code session attendance, and a comprehensive admin dashboard — all in one system.

---

## Architecture

```
GeekAI/
├── frontend/          React + Vite (registration portal, admin dashboard, volunteer interface)
├── backend/           Python FastAPI (REST API, QR/email services, face embeddings)
├── face-checkin/      Local Python app (OpenCV + InsightFace webcam check-in)
└── README.md
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, Tailwind CSS v4, React Router, TanStack Query |
| Backend | Python 3.10+, FastAPI, SQLAlchemy (async), Alembic |
| Database | PostgreSQL with pgvector extension |
| Face AI | InsightFace / ArcFace (512-d embeddings) |
| Local Check-in | OpenCV, InsightFace (runs on registration desk computer) |

### System Flow

```
┌─────────────┐    ┌─────────────┐    ┌───────────────┐
│  Registration│───▶│   FastAPI    │───▶│  PostgreSQL   │
│   Portal     │    │   Backend   │    │  + pgvector   │
└─────────────┘    └──────┬──────┘    └───────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────────┐
        │  Admin   │ │Volunteer │ │ Face Check-in│
        │Dashboard │ │QR Scanner│ │  (Local App) │
        └──────────┘ └──────────┘ └──────────────┘
```

---

## Quick Start

### 🚀 Option A: 1-Command Startup with Docker (Recommended)

The easiest way to run the complete GeekAI platform (PostgreSQL with pgvector, FastAPI Backend, React Frontend, with automated migrations and default account seeding):

```bash
# 1. Clone the repository
git clone https://github.com/msVivekRanjan/GeekAI.git
cd GeekAI

# 2. Start all services
docker compose up --build
```

Once started, all services are ready:
- **Web Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL with pgvector**: `localhost:5432`

#### Default Login Credentials
| Portal | URL | Email | Password |
|---|---|---|---|
| **Admin Dashboard** | `http://localhost:5173/admin` | `admin@geekai.in` | `admin123` |
| **Volunteer Dashboard** | `http://localhost:5173/volunteer` | `volunteer@geekai.in` | `volunteer123` |
| **Public Registration** | `http://localhost:5173/register` | *(Publicly accessible)* | — |

---

### 💻 Option B: Manual Local Development Setup

#### Prerequisites

- **Python 3.10+**
- **Node.js 18+** & npm
- **PostgreSQL 14+** with [pgvector](https://github.com/pgvector/pgvector) extension installed
- A webcam (for face check-in)

### 1. Database Setup

```bash
# Create the database
createdb geekai

# Enable pgvector extension
psql geekai -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database URL, secret key, and SMTP settings

# Run database migrations
alembic upgrade head

# Seed the initial admin user
# (This creates the first admin account — see .env for default credentials)
curl -X POST http://localhost:8000/api/auth/seed \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@geekai.in", "password": "admin123", "name": "System Admin"}'

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api/* to localhost:8000)
npm run dev
```

The frontend runs at **http://localhost:5173**

### 4. Face Check-in Setup (Local App)

```bash
cd face-checkin

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env with backend API URL and volunteer credentials

# Run the check-in app
python main.py
```

> **Note:** InsightFace will download model weights (~300 MB) on first run.

---

## Features

### 📝 Public Registration Portal (`/register`)
- Online registration form with photo capture/upload
- Captures: name, email, phone, institution, category
- Generates face embedding from photo (InsightFace ArcFace, 512-dim)
- Generates QR code with participant ID
- Emails QR code to participant
- Duplicate email detection

### 🎛️ Admin Dashboard (`/admin`)
- **Dashboard** — Live stats: total participants, check-ins, sessions, category breakdown
- **Participants** — Searchable, filterable list; click for full profile with attendance history
- **Sessions** — Create, edit, delete symposium sessions
- **Attendance** — Event-level and per-session monitoring with method breakdown
- **Volunteers** — Add/remove volunteers with custom email and password, toggle active status, track check-ins marked
- **Export** — Download participants (CSV) and attendance (CSV/Excel)

### 📱 Volunteer Interface (`/volunteer`)
- **Event Face Check-In (`/volunteer/face-checkin`)** — Integrated camera-based face recognition for one-time event entry
  - Captures webcam frame → matches against 512-d embeddings via InsightFace
  - Displays matched participant profile, photo, category, and similarity score
  - Options to confirm identity and **Mark Present** or **Mark Absent / Reject**
  - Enforces one-time check-in (prevents duplicate event check-ins)
  - Includes manual search fallback for event entry
- **QR Scanner (`/volunteer/scan`)** — Camera-based QR scanning for individual symposium sessions
  - Select session → scan QR → auto-validate → confirm attendance
  - Clear feedback: ✅ success, ⚠️ already marked, ❌ invalid
- **Manual Lookup (`/volunteer/manual`)** — Search participant by name, mark session attendance manually

### 🎥 Face Check-in (Local Desktop App)
- Webcam-based face detection using InsightFace
- Downloads participant embeddings from backend
- Real-time cosine similarity matching (all processing LOCAL)
- Displays matched participant photo + details
- Volunteer confirms with Y/N keys
- Records event-level attendance via API
- Manual lookup fallback (M key)
- Auto-sync embeddings periodically

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login → JWT token |
| POST | `/api/auth/register` | Create user (admin only) |
| POST | `/api/auth/seed` | Create initial admin |

### Participants
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/participants/` | Register participant (multipart form + photo) |
| GET | `/api/participants/` | List/search/filter participants |
| GET | `/api/participants/{id}` | Participant details + attendance |
| GET | `/api/participants/{id}/photo` | Serve photo |
| GET | `/api/participants/{id}/qrcode` | Serve QR code |

### Sessions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions/` | Create session (admin) |
| GET | `/api/sessions/` | List sessions |
| GET | `/api/sessions/{id}` | Session detail + attendance count |
| PUT | `/api/sessions/{id}` | Update session (admin) |
| DELETE | `/api/sessions/{id}` | Delete session (admin) |

### Attendance
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/attendance/` | Record attendance (prevents duplicates) |
| POST | `/api/attendance/face-match` | Identify participant from face snapshot & check event attendance |
| GET | `/api/attendance/event` | Event-level check-ins |
| GET | `/api/attendance/session/{id}` | Session attendance |
| GET | `/api/attendance/stats` | Aggregate statistics |
| POST | `/api/attendance/validate-qr` | Validate QR data |

### Embeddings & Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/embeddings/sync` | Download all embeddings (for face-checkin) |
| GET | `/api/admin/dashboard` | Dashboard stats |
| GET | `/api/admin/volunteers` | List all volunteers with attendance counts |
| POST | `/api/admin/volunteers` | Add a new volunteer (custom name, email, password) |
| PATCH | `/api/admin/volunteers/{id}/toggle-status` | Toggle volunteer active/inactive status |
| DELETE | `/api/admin/volunteers/{id}` | Remove a volunteer account |
| GET | `/api/admin/export/participants` | CSV export |
| GET | `/api/admin/export/attendance` | CSV/Excel export |

---

## Database Schema

```
users              participants         face_embeddings
├── id (PK)        ├── id (PK)          ├── id (PK)
├── email          ├── name             ├── participant_id (FK)
├── password_hash  ├── email            ├── embedding vector(512)
├── name           ├── phone            └── created_at
├── role           ├── institution
├── is_active      ├── category         sessions
└── created_at     ├── photo_url        ├── id (PK)
                   ├── qr_code_url      ├── name
                   └── registered_at    ├── description
                                        ├── start_time
attendance                              ├── end_time
├── id (PK)                             ├── location
├── participant_id (FK)                 └── created_at
├── session_id (FK, nullable)
├── method (FACE/QR/MANUAL)
├── marked_by (FK users)
└── marked_at
```

- `session_id = NULL` → event-level attendance (face check-in at entry)
- `session_id = <id>` → session-specific attendance (QR/manual)
- Unique constraint on `(participant_id, session_id)` prevents duplicates
- Partial unique index for event attendance where `session_id IS NULL`

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://postgres:password@localhost:5432/geekai` |
| `SECRET_KEY` | JWT signing key | (change in production!) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry | `480` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000,http://localhost:5173` |
| `SMTP_HOST` | SMTP server | (empty = skip emails) |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | |
| `SMTP_PASSWORD` | SMTP password | |
| `SMTP_FROM_EMAIL` | Sender email | `noreply@geekai.in` |
| `UPLOAD_DIR` | Photo/QR storage directory | `uploads` |
| `SEED_ADMIN_EMAIL` | Default admin email | `admin@geekai.in` |
| `SEED_ADMIN_PASSWORD` | Default admin password | `admin123` |

### Face Check-in (`face-checkin/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `API_URL` | Backend API URL | `http://localhost:8000` |
| `VOLUNTEER_EMAIL` | Login email | `volunteer@geekai.com` |
| `VOLUNTEER_PASSWORD` | Login password | `volunteer123` |
| `CAMERA_INDEX` | Webcam device index | `0` |
| `MATCH_THRESHOLD` | Face match threshold | `0.4` |
| `MODEL_NAME` | InsightFace model | `buffalo_l` |

---

## Deployment Notes

### Production Considerations
- Change `SECRET_KEY` to a strong random value
- Set up proper SMTP for email delivery
- Use a managed PostgreSQL with pgvector support
- Serve the frontend via nginx or a CDN
- Run backend with Gunicorn + Uvicorn workers
- Enable HTTPS
- Set `CORS_ORIGINS` to your production domain

### Building for Production

```bash
# Frontend
cd frontend && npm run build
# Output in frontend/dist/ — serve via nginx

# Backend
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker Compose (One-Click Setup)

To spin up PostgreSQL with pgvector, the FastAPI backend, and the React frontend with Nginx:

```bash
docker compose up -d --build
```

- Frontend: `http://localhost:5173`
- Backend API & Docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@geekai.in` | `admin123` |

> ⚠️ Change these immediately in production by updating `.env` and re-seeding.

---

## License

Built for the Odisha AI Symposium. Internal use.

