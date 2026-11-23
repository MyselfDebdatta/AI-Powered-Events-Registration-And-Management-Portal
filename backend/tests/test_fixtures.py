"""Fixture generator smoke test.

Runs the real CLI twice with a small count and asserts determinism, the
expected reject mix and the honest caveat. It does not claim that the
geometric images pass a real face-quality gate.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = BACKEND_ROOT / "scripts" / "generate_fixtures.py"

EXPECTED_CASES = {
    "valid",
    "duplicate_email",
    "duplicate_submission",
    "missing_consent",
    "missing_photo",
    "oversized_upload",
    "malformed_phone",
    "malformed_payload",
    "blurry",
    "dark",
    "multi_face",
    "low_resolution",
}


def run_generator(output: Path, count: int) -> dict:
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--count", str(count), "--output", str(output)],
        cwd=str(BACKEND_ROOT),
        check=True,
        capture_output=True,
        text=True,
    )
    assert "wrote" in result.stdout
    manifest_path = output / "manifest.json"
    assert manifest_path.is_file()
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def test_generator_is_deterministic_and_covers_the_expected_reject_mix(tmp_path):
    first = tmp_path / "first"
    second = tmp_path / "second"

    manifest_a = run_generator(first, count=3)
    manifest_b = run_generator(second, count=3)

    assert manifest_a["count"] == 3
    assert manifest_a["total_records"] == 3 + len(EXPECTED_CASES) - 1
    assert set(manifest_a["counts"]) == EXPECTED_CASES
    assert manifest_a["counts"]["valid"] == 3
    assert manifest_a["counts"]["duplicate_email"] == 1
    assert manifest_a["counts"]["duplicate_submission"] == 1

    assert manifest_a["files"]["submissions.ndjson"] == manifest_b["files"]["submissions.ndjson"]
    assert manifest_a["photos"] == manifest_b["photos"]
    assert manifest_a["files"]["oversized/oversized_upload.bin"] == manifest_b["files"][
        "oversized/oversized_upload.bin"
    ]

    oversized = first / "oversized" / "oversized_upload.bin"
    assert oversized.stat().st_size > 10 * 1024 * 1024

    report = (first / "REPORT.md").read_text(encoding="utf-8")
    assert "do **not** validate real face-detection" in report
    assert "separately approved" in report

    records = [
        json.loads(line)
        for line in (first / "submissions.ndjson").read_text(encoding="utf-8").splitlines()
    ]
    assert len(records) == manifest_a["total_records"]
    assert all(record["submission_id"] for record in records)
    assert any(record["case"] == "multi_face" for record in records)
    assert any(record["case"] == "blurry" for record in records)
    assert any(record["case"] == "dark" for record in records)
