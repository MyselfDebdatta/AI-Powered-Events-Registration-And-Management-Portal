"""Generate deterministic synthetic registration fixtures for stage S0/S4.

The output is intentionally synthetic. It contains no real person, no real
photo and no biometric data. The images are geometric placeholders: they are
useful for exercising upload, storage, validation and reporting paths, but
they do **not** validate real face-detection, blur, brightness or multi-face
thresholds. Tuning those thresholds requires a separately approved,
consented face set; do not use a downloaded face dataset without approval.

Usage (from backend/):

    python scripts/generate_fixtures.py --count 1000
    python scripts/generate_fixtures.py --count 25 --output fixtures/generated

Outputs:
    manifest.json          machine-readable counts and file hashes
    submissions.ndjson     one synthetic record per line
    REPORT.md              human-readable report and caveat
    photos/*.png           deterministic placeholder images
    oversized/*.bin        one deterministic oversized upload
"""

from __future__ import annotations

import argparse
import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

FIXED_TIMESTAMP = "2026-11-01T00:00:00Z"
FIXED_EPOCH = datetime(2026, 11, 1, tzinfo=timezone.utc)
PHOTO_SIZE = (640, 640)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
NAMESPACE = uuid.UUID("6f1c2b7e-4a6d-4c2f-9b1a-2f6a8e0d3c11")

CATEGORIES = ["STUDENT", "RESEARCHER", "PROFESSIONAL", "SPEAKER", "OTHER"]
INSTITUTIONS = [
    "Synthetic Institute of Technology",
    "Example State University",
    "Demo Research Centre",
    "Placeholder Polytechnic",
]
DIETARY = ["", "VEGETARIAN", "VEGAN", "NON_VEGETARIAN", "OTHER"]
SESSION_INTERESTS = ["nlp", "cv", "rl", "ethics", "healthcare", "education", "startups", "research"]

EDGE_CASES = [
    ("duplicate_email", "DUPLICATE_EMAIL"),
    ("duplicate_submission", "DUPLICATE_SUBMISSION"),
    ("missing_consent", "NO_CONSENT"),
    ("missing_photo", "MISSING_PHOTO"),
    ("oversized_upload", "UPLOAD_TOO_LARGE"),
    ("malformed_phone", "BAD_PHONE"),
    ("malformed_payload", "BAD_PAYLOAD"),
    ("blurry", "BLURRY"),
    ("dark", "DARK"),
    ("multi_face", "MULTIPLE_FACES"),
    ("low_resolution", "LOW_RESOLUTION"),
]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def deterministic_uuid(case: str, index: int) -> str:
    return str(uuid.uuid5(NAMESPACE, f"geekai/s0/{case}/{index}"))


def deterministic_email(index: int) -> str:
    return f"synthetic.{index:04d}@example.test"


def deterministic_phone(index: int) -> str:
    # Valid Indian mobile shape, synthetic and non-routable in practice.
    return f"+9198{index:08d}"[:13]


def draw_face(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], tone: str) -> None:
    draw.ellipse(box, fill=tone)
    left, top, right, bottom = box
    width = right - left
    height = bottom - top
    eye_y = top + int(height * 0.38)
    eye_r = max(3, width // 18)
    for offset in (0.32, 0.68):
        cx = left + int(width * offset)
        draw.ellipse((cx - eye_r, eye_y - eye_r, cx + eye_r, eye_y + eye_r), fill="#1f2937")
    mouth_y = top + int(height * 0.72)
    draw.arc(
        (left + int(width * 0.30), mouth_y - int(height * 0.08), right - int(width * 0.30), mouth_y + int(height * 0.12)),
        start=10,
        end=170,
        fill="#1f2937",
        width=max(2, width // 60),
    )


def make_photo(path: Path, kind: str) -> None:
    size = (320, 320) if kind == "low_resolution" else PHOTO_SIZE
    image = Image.new("RGB", size, "#e5e7eb")
    draw = ImageDraw.Draw(image)
    w, h = size
    if kind == "multi_face":
        draw_face(draw, (int(w * 0.08), int(h * 0.28), int(w * 0.42), int(h * 0.74)), "#c7a17a")
        draw_face(draw, (int(w * 0.58), int(h * 0.28), int(w * 0.92), int(h * 0.74)), "#b98f68")
    else:
        draw_face(draw, (int(w * 0.25), int(h * 0.18), int(w * 0.75), int(h * 0.82)), "#c7a17a")

    if kind == "blurry":
        image = image.filter(ImageFilter.GaussianBlur(radius=14))
    elif kind == "dark":
        image = ImageEnhance.Brightness(image).enhance(0.12)

    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=False)


def base_record(case: str, index: int) -> dict[str, Any]:
    submitted = FIXED_EPOCH + timedelta(seconds=index)
    submission_id = deterministic_uuid(case, index)
    return {
        "case": case,
        "submission_id": submission_id,
        "client_event_id": submission_id,
        "submitted_at": submitted.isoformat().replace("+00:00", "Z"),
        "fields": {
            "source": "SITE_FORM",
            "full_name": f"Synthetic Participant {index:04d}",
            "email": deterministic_email(index),
            "phone": deterministic_phone(index),
            "institution": INSTITUTIONS[index % len(INSTITUTIONS)],
            "category": CATEGORIES[index % len(CATEGORIES)],
            "accessibility_needs": None,
            "dietary_preference": DIETARY[index % len(DIETARY)] or None,
            "session_interest": [SESSION_INTERESTS[index % len(SESSION_INTERESTS)]],
        },
        "consent": {
            "biometric": True,
            "version": "2026-11",
            "accepted_at": submitted.isoformat().replace("+00:00", "Z"),
        },
        "photo": None,
        "expected": {"outcome": "accepted", "code": None},
    }


def build_records(output: Path, count: int) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    photos_dir = output / "photos"

    for index in range(count):
        record = base_record("valid", index)
        photo_path = photos_dir / f"{record['submission_id']}.png"
        make_photo(photo_path, "valid")
        record["photo"] = {
            "filename": photo_path.name,
            "content_type": "image/png",
            "bytes": photo_path.stat().st_size,
            "sha256": sha256_file(photo_path),
        }
        records.append(record)

    first_valid = records[0] if records else base_record("valid", 0)

    def add_edge(case: str, code: str) -> dict[str, Any]:
        record = base_record(case, 0)
        record["expected"] = {"outcome": "rejected", "code": code}
        return record

    duplicate_email = add_edge("duplicate_email", "DUPLICATE_EMAIL")
    duplicate_email["fields"]["email"] = first_valid["fields"]["email"]
    duplicate_email["photo"] = dict(first_valid["photo"]) if first_valid.get("photo") else None
    records.append(duplicate_email)

    duplicate_submission = add_edge("duplicate_submission", "DUPLICATE_SUBMISSION")
    duplicate_submission["submission_id"] = first_valid["submission_id"]
    duplicate_submission["client_event_id"] = first_valid["submission_id"]
    duplicate_submission["photo"] = dict(first_valid["photo"]) if first_valid.get("photo") else None
    records.append(duplicate_submission)

    missing_consent = add_edge("missing_consent", "NO_CONSENT")
    missing_consent["consent"] = None
    records.append(missing_consent)

    missing_photo = add_edge("missing_photo", "MISSING_PHOTO")
    missing_photo["photo"] = None
    records.append(missing_photo)

    oversized = add_edge("oversized_upload", "UPLOAD_TOO_LARGE")
    oversized_path = output / "oversized" / "oversized_upload.bin"
    oversized_path.parent.mkdir(parents=True, exist_ok=True)
    if not oversized_path.exists() or oversized_path.stat().st_size != MAX_UPLOAD_BYTES + 1:
        with oversized_path.open("wb") as handle:
            handle.write(b"\xff\xd8\xff\xe0")
            remaining = MAX_UPLOAD_BYTES + 1 - 4
            chunk = b"\0" * (1024 * 1024)
            while remaining > 0:
                write = min(len(chunk), remaining)
                handle.write(chunk[:write])
                remaining -= write
    oversized["photo"] = {
        "filename": oversized_path.name,
        "content_type": "image/jpeg",
        "bytes": oversized_path.stat().st_size,
        "sha256": sha256_file(oversized_path),
        "note": "Oversized by one byte; the server must reject before decoding.",
    }
    records.append(oversized)

    malformed_phone = add_edge("malformed_phone", "BAD_PHONE")
    malformed_phone["fields"]["phone"] = "12345"
    records.append(malformed_phone)

    malformed_payload = add_edge("malformed_payload", "BAD_PAYLOAD")
    malformed_payload["fields"]["email"] = None
    malformed_payload["fields"]["full_name"] = ""
    malformed_payload["consent"] = {"biometric": True, "version": "2026-11", "accepted_at": "not-a-date"}
    malformed_payload["raw_consent"] = "{not valid json"
    records.append(malformed_payload)

    for case, code in (
        ("blurry", "BLURRY"),
        ("dark", "DARK"),
        ("multi_face", "MULTIPLE_FACES"),
        ("low_resolution", "LOW_RESOLUTION"),
    ):
        record = add_edge(case, code)
        photo_path = photos_dir / f"{record['submission_id']}.png"
        make_photo(photo_path, case)
        record["photo"] = {
            "filename": photo_path.name,
            "content_type": "image/png",
            "bytes": photo_path.stat().st_size,
            "sha256": sha256_file(photo_path),
        }
        records.append(record)

    return records


def write_outputs(output: Path, records: list[dict[str, Any]], count: int) -> dict[str, Any]:
    output.mkdir(parents=True, exist_ok=True)
    submissions_path = output / "submissions.ndjson"
    with submissions_path.open("w", encoding="utf-8", newline="\n") as handle:
        for record in records:
            handle.write(json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n")

    counts: dict[str, int] = {}
    for record in records:
        counts[record["case"]] = counts.get(record["case"], 0) + 1

    photo_files = sorted((output / "photos").glob("*.png"))
    photo_bytes = sum(p.stat().st_size for p in photo_files)
    oversized_path = output / "oversized" / "oversized_upload.bin"

    manifest = {
        "schema_version": 1,
        "generator": "backend/scripts/generate_fixtures.py",
        "generated_at": FIXED_TIMESTAMP,
        "count": count,
        "total_records": len(records),
        "counts": counts,
        "files": {
            "submissions.ndjson": {
                "sha256": sha256_file(submissions_path),
                "bytes": submissions_path.stat().st_size,
            },
            "oversized/oversized_upload.bin": {
                "sha256": sha256_file(oversized_path),
                "bytes": oversized_path.stat().st_size,
            },
        },
        "photos": {
            "count": len(photo_files),
            "bytes": photo_bytes,
            "directory": "photos",
        },
        "caveat": (
            "Geometric placeholder images do not validate real face-detection, blur, "
            "brightness or multi-face thresholds. A separately approved, consented "
            "face set is required for tuning. No real PII or biometrics are present."
        ),
    }
    (output / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )

    report_lines = [
        "# Synthetic fixture report",
        "",
        f"- Generated at (fixed): `{FIXED_TIMESTAMP}`",
        f"- Valid submissions: **{count}**",
        f"- Total records including edge cases: **{len(records)}**",
        f"- Placeholder photos: **{len(photo_files)}** ({photo_bytes} bytes)",
        f"- Oversized upload: **{oversized_path.stat().st_size} bytes**",
        "",
        "## Cases",
        "",
        "| Case | Records | Expected outcome |",
        "|---|---:|---|",
    ]
    for case, number in sorted(counts.items()):
        outcome = "accepted" if case == "valid" else "rejected"
        report_lines.append(f"| `{case}` | {number} | {outcome} |")
    report_lines += [
        "",
        "## Caveat",
        "",
        "These are geometric placeholders. They exercise upload, storage, validation",
        "and reporting paths, but they do **not** validate real face-detection, blur,",
        "brightness or multi-face thresholds. Tuning those thresholds requires a",
        "separately approved, consented face set. Do not use a downloaded face dataset",
        "without explicit approval.",
        "",
        "## Determinism",
        "",
        "UUIDs, timestamps and image drawing are derived from fixed inputs. Re-running",
        "with the same `--count` produces the same `submissions.ndjson` and image bytes.",
        "",
    ]
    (output / "REPORT.md").write_text("\n".join(report_lines), encoding="utf-8")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, default=100, help="number of valid submissions (default: 100)")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "fixtures" / "generated",
        help="output directory (default: backend/fixtures/generated)",
    )
    args = parser.parse_args()
    if args.count < 1:
        parser.error("--count must be at least 1")

    output = args.output.resolve()
    records = build_records(output, args.count)
    manifest = write_outputs(output, records, args.count)
    print(f"wrote {manifest['total_records']} records to {output}")
    print(f"valid={args.count} cases={json.dumps(manifest['counts'], sort_keys=True)}")
    print("caveat: geometric placeholders do not validate real face thresholds")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
