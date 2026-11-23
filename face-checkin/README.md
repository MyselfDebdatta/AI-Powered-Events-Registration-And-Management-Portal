# GeekAI Face Check-In

A standalone local Python application for face-recognition-based participant check-in at the Odisha AI Symposium. Runs on the registration desk computer, performing all face processing locally — no webcam data is ever streamed to the cloud.

## How It Works

1. **Syncs** participant face embeddings from the GeekAI backend on startup
2. **Captures** live webcam feed and detects faces using InsightFace (ArcFace)
3. **Matches** detected faces against the stored embeddings via cosine similarity
4. **Displays** the matched participant's photo, name, institution, and category
5. **Waits** for volunteer confirmation before recording attendance
6. **Records** event-level attendance via the backend API

## Prerequisites

- **Python 3.10+**
- **Webcam** connected to the computer
- **GeekAI backend** running and accessible (default: `http://localhost:8000`)
- A volunteer account registered on the backend

## Installation

```bash
cd face-checkin

# Create a virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate   # macOS / Linux
# .venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt
```

> **Note:** The first run will automatically download the InsightFace model (~300 MB). Make sure you have internet access for the initial setup.

## Configuration

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

| Variable             | Default                    | Description                                  |
|----------------------|----------------------------|----------------------------------------------|
| `API_URL`            | `http://localhost:8000`    | GeekAI backend URL                           |
| `VOLUNTEER_EMAIL`    | `volunteer@geekai.com`    | Login email for the volunteer account        |
| `VOLUNTEER_PASSWORD` | `volunteer123`             | Login password                               |
| `CAMERA_INDEX`       | `0`                        | OpenCV camera index (0 = default webcam)     |
| `MATCH_THRESHOLD`    | `0.4`                      | Cosine similarity threshold for matching     |
| `SYNC_INTERVAL`      | `300`                      | Auto re-sync interval in seconds             |
| `CACHE_DIR`          | `cache`                    | Local cache directory for embeddings/photos  |
| `MODEL_NAME`         | `buffalo_l`                | InsightFace model (`buffalo_l` or `buffalo_s`) |

## Usage

```bash
python main.py
```

The application opens a window showing the live webcam feed. When a face is detected and matched:

- The **right panel** shows the participant's photo, name, institution, category, and similarity score.
- The volunteer is prompted to **confirm or reject** the match.

### Keyboard Controls

| Key | Action                                          |
|-----|-------------------------------------------------|
| `Y` | Confirm check-in for the matched participant    |
| `N` | Reject the current match                        |
| `M` | Switch to manual lookup mode (terminal input)   |
| `S` | Re-sync embeddings from the backend             |
| `Q` | Quit the application                            |

### Manual Lookup Mode

Press `M` to search for a participant by name or ID in the terminal. Useful when face matching fails (e.g., participant not in the database, poor lighting).

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                   main.py (loop)                       │
│                                                        │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐            │
│  │ Webcam   │→ │ Detector │→ │  Matcher  │            │
│  │ (OpenCV) │  │(Insight) │  │ (cosine)  │            │
│  └──────────┘  └──────────┘  └─────┬─────┘            │
│                                    │                   │
│       ┌──────────┐          ┌──────▼──────┐            │
│       │   UI     │←─────────│  API Client │            │
│       │ (OpenCV) │          │  (requests) │            │
│       └──────────┘          └──────┬──────┘            │
│                                    │                   │
│                             ┌──────▼──────┐            │
│                             │    Sync     │            │
│                             │  (cache)    │            │
│                             └─────────────┘            │
└────────────────────────────────────────────────────────┘
                              │
                     Cloud Backend API
                   (http://localhost:8000)
```

## File Structure

| File               | Purpose                                     |
|--------------------|---------------------------------------------|
| `main.py`          | Entry point and main application loop       |
| `face_detector.py` | InsightFace face detection & embedding       |
| `matcher.py`       | Cosine similarity matching engine            |
| `api_client.py`    | HTTP client for backend communication        |
| `ui.py`            | OpenCV-based display and overlays            |
| `config.py`        | Configuration from env vars / .env file      |
| `sync.py`          | Embedding download and local caching         |

## Troubleshooting

### Camera not found
- Check that a webcam is connected
- Try different `CAMERA_INDEX` values (0, 1, 2…)
- On macOS, grant camera permission to Terminal / your IDE

### Model download fails
- Ensure internet access for the first run
- The model is cached in `~/.insightface/models/`
- Try `buffalo_s` (smaller, ~100 MB) if `buffalo_l` download is too slow

### Backend connection fails
- Verify the backend is running: `curl http://localhost:8000/docs`
- Check `API_URL` in your `.env` file
- Ensure the volunteer account exists and credentials are correct

### Low match accuracy
- Ensure good lighting at the registration desk
- Lower `MATCH_THRESHOLD` (e.g., 0.35) for more lenient matching
- Raise it (e.g., 0.5) to reduce false positives
- Use manual lookup (`M` key) as a fallback

### Performance
- Use `buffalo_s` model for faster CPU inference
- Reduce camera resolution if the frame rate is low
- Set `CAMERA_INDEX` to a lower-resolution camera if available
