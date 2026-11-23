#!/usr/bin/env python3
"""
GeekAI Face Check-In — Main Application
========================================
Local face-recognition check-in for the Odisha AI Symposium.
Captures webcam frames, detects faces, matches them against
participant embeddings synced from the cloud backend, and records
attendance after volunteer confirmation.

Controls:
    Y — Confirm check-in for matched participant
    N — Reject current match
    M — Manual participant lookup (terminal input)
    S — Re-sync embeddings from backend
    Q — Quit
"""

import logging
import sys
import time
from typing import Optional

import cv2
import numpy as np

from api_client import APIClient
from config import config
from face_detector import FaceDetector, DetectedFace
from matcher import EmbeddingMatcher, MatchResult
from sync import EmbeddingSync
from ui import CheckInUI, draw_no_match_overlay

# ------------------------------------------------------------------ #
#  Logging                                                            #
# ------------------------------------------------------------------ #
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")


# ------------------------------------------------------------------ #
#  Application state                                                  #
# ------------------------------------------------------------------ #
class AppState:
    """Mutable state for the main loop."""

    def __init__(self) -> None:
        self.current_match: Optional[MatchResult] = None
        self.pending_confirm = False
        self.last_sync_time = 0.0
        self.running = True


# ------------------------------------------------------------------ #
#  Manual lookup (terminal-based)                                     #
# ------------------------------------------------------------------ #
def manual_lookup(api: APIClient) -> None:
    """Prompt the volunteer in the terminal to search for a participant
    and optionally record attendance."""
    print("\n=== Manual Participant Lookup ===")
    query = input("Enter name or participant ID: ").strip()
    if not query:
        print("Cancelled.")
        return

    # Check if the query is a numeric ID
    if query.isdigit():
        participant = api.get_participant(int(query))
        if participant:
            results = [participant]
        else:
            print(f"No participant found with ID {query}")
            return
    else:
        results = api.search_participants(query)

    if not results:
        print("No participants found.")
        return

    # Handle both list and paginated dict responses
    if isinstance(results, dict):
        results = results.get("items", results.get("results", [results]))

    print(f"\nFound {len(results)} result(s):")
    for i, p in enumerate(results[:10], 1):
        pid = p.get("id", p.get("participant_id", "?"))
        name = p.get("name", "Unknown")
        inst = p.get("institution", "")
        cat = p.get("category", "")
        print(f"  {i}. [{pid}] {name} — {inst} ({cat})")

    choice = input("\nSelect number to check in (or Enter to cancel): ").strip()
    if not choice or not choice.isdigit():
        print("Cancelled.")
        return

    idx = int(choice) - 1
    if 0 <= idx < len(results):
        p = results[idx]
        pid = p.get("id", p.get("participant_id"))
        name = p.get("name", "Unknown")
        confirm = input(f"Record attendance for {name} (ID {pid})? [y/N]: ").strip().lower()
        if confirm == "y":
            result = api.record_attendance(pid, method="MANUAL")
            status = result.get("status", "")
            if status == "duplicate":
                print(f"⚠  Attendance already recorded for {name}")
            elif status == "error":
                print(f"✗  Error: {result.get('message')}")
            else:
                print(f"✓  Attendance recorded for {name}")
        else:
            print("Cancelled.")
    else:
        print("Invalid selection.")


# ------------------------------------------------------------------ #
#  Main loop                                                          #
# ------------------------------------------------------------------ #
def main() -> None:
    logger.info("Starting GeekAI Face Check-In")

    # 1. Initialise components
    api = APIClient()
    detector = FaceDetector()
    matcher = EmbeddingMatcher()
    syncer = EmbeddingSync(api)
    ui = CheckInUI()
    state = AppState()

    # 2. Authenticate
    logger.info("Logging in to backend at %s …", config.API_URL)
    if not api.login():
        logger.error(
            "Authentication failed. Check VOLUNTEER_EMAIL / VOLUNTEER_PASSWORD "
            "and ensure the backend is running at %s",
            config.API_URL,
        )
        print(
            "\n✗  Could not log in to the backend.\n"
            f"   URL:   {config.API_URL}\n"
            f"   Email: {config.VOLUNTEER_EMAIL}\n"
            "   Check your .env file and make sure the backend is running.\n"
        )
        sys.exit(1)

    # 3. Sync embeddings
    logger.info("Syncing embeddings …")
    records = syncer.initial_sync()
    loaded = matcher.load_embeddings(records)
    state.last_sync_time = time.time()
    logger.info("Ready — %d participant embeddings loaded", loaded)

    # 4. Load InsightFace model (lazy, but trigger it now for feedback)
    logger.info("Loading face detection model '%s' …", config.MODEL_NAME)
    try:
        detector._ensure_loaded()  # noqa: SLF001 — intentional early load
    except RuntimeError as exc:
        logger.error(str(exc))
        print(f"\n✗  {exc}\n")
        sys.exit(1)

    # 5. Open webcam
    logger.info("Opening camera %d …", config.CAMERA_INDEX)
    cap = cv2.VideoCapture(config.CAMERA_INDEX)
    if not cap.isOpened():
        logger.error("Cannot open camera index %d", config.CAMERA_INDEX)
        print(
            f"\n✗  Cannot open camera (index {config.CAMERA_INDEX}).\n"
            "   Make sure a webcam is connected and the index is correct.\n"
        )
        sys.exit(1)

    # 6. Init UI
    ui.init_window()
    ui.set_connection_info(
        connected=True,
        embeddings=matcher.count,
        last_sync=time.strftime("%H:%M:%S", time.localtime(state.last_sync_time)),
    )
    ui.set_status("Ready — point camera at participant", (0, 200, 0))

    logger.info("Entering main loop. Press Q to quit.")

    try:
        while state.running:
            # Capture frame
            ret, frame = cap.read()
            if not ret:
                ui.set_status("Camera error — no frame", (0, 0, 220))
                blank = np.zeros((ui.height, ui.width, 3), dtype=np.uint8)
                key = ui.show(blank)
                if key == ord("q"):
                    break
                continue

            # Detect faces
            faces: list[DetectedFace] = []
            try:
                faces = detector.detect_faces(frame)
            except Exception as exc:
                logger.warning("Detection error: %s", exc)

            # Match the largest / most prominent face
            match: Optional[MatchResult] = None
            if faces and not state.pending_confirm:
                # Pick the face with the highest detection score
                best_face = max(faces, key=lambda f: f.score)
                match = matcher.find_match(best_face.embedding)
                if match:
                    state.current_match = match
                    state.pending_confirm = True
                    ui.set_status(f"Match: {match.name} ({match.similarity:.0%})", (0, 220, 220))
                    # Attempt to ensure photo is cached
                    api.download_photo(match.participant_id, match.photo_url)
                else:
                    state.current_match = None

            # Render
            canvas = ui.render_frame(
                frame,
                faces=faces,
                match=state.current_match,
                pending_confirm=state.pending_confirm,
            )

            if not faces:
                draw_no_match_overlay(canvas)
                ui.set_status("No face detected", (0, 0, 220))

            key = ui.show(canvas)

            # ---- Key handling ---- #
            if key == ord("q"):
                state.running = False

            elif key == ord("y") and state.pending_confirm and state.current_match:
                result = api.record_attendance(state.current_match.participant_id)
                status = result.get("status", "")
                if status == "duplicate":
                    ui.flash(f"Already checked in: {state.current_match.name}", (0, 220, 220))
                    logger.info("Duplicate attendance for %s", state.current_match.name)
                elif status == "error":
                    ui.flash(f"Error: {result.get('message', 'unknown')}", (0, 0, 220))
                    logger.error("Attendance error: %s", result)
                else:
                    ui.flash(f"Checked in: {state.current_match.name}", (0, 200, 0))
                    logger.info("Checked in: %s (ID %d)", state.current_match.name, state.current_match.participant_id)
                state.current_match = None
                state.pending_confirm = False
                ui.set_status("Ready — point camera at participant", (0, 200, 0))

            elif key == ord("n") and state.pending_confirm:
                ui.flash("Match rejected", (0, 0, 220), duration=1.5)
                state.current_match = None
                state.pending_confirm = False
                ui.set_status("Ready — point camera at participant", (0, 200, 0))

            elif key == ord("m"):
                # Pause UI loop for manual lookup in terminal
                state.pending_confirm = False
                state.current_match = None
                manual_lookup(api)
                ui.set_status("Ready — point camera at participant", (0, 200, 0))

            elif key == ord("s"):
                ui.set_status("Syncing embeddings …", (0, 220, 220))
                ui.flash("Syncing …", (0, 220, 220), duration=1.0)
                records = syncer.refresh()
                loaded = matcher.load_embeddings(records)
                state.last_sync_time = time.time()
                ui.set_connection_info(
                    connected=True,
                    embeddings=matcher.count,
                    last_sync=time.strftime("%H:%M:%S", time.localtime(state.last_sync_time)),
                )
                ui.set_status("Ready — point camera at participant", (0, 200, 0))
                ui.flash(f"Synced — {loaded} embeddings loaded", (0, 200, 0))

            # Auto re-sync
            if time.time() - state.last_sync_time > config.SYNC_INTERVAL:
                records = syncer.refresh()
                matcher.load_embeddings(records)
                state.last_sync_time = time.time()
                ui.set_connection_info(
                    connected=True,
                    embeddings=matcher.count,
                    last_sync=time.strftime("%H:%M:%S", time.localtime(state.last_sync_time)),
                )

    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    finally:
        cap.release()
        ui.destroy()
        logger.info("Shut down cleanly")


if __name__ == "__main__":
    main()
