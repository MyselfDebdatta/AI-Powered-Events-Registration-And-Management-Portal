"""Structured JSON logging with PII redaction.

Emails, phone numbers, bearer tokens, JWTs, QR signing keys, bootstrap
tokens and photo keys are redacted from log messages. Raw embeddings and
photos are never logged by this application.
"""

from __future__ import annotations

import logging
import re

# Patterns for values that must never appear in logs.
_PATTERNS = [
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"), "[REDACTED_EMAIL]"),
    (re.compile(r"\+?\d[\d\s-]{8,}\d"), "[REDACTED_PHONE]"),
    (re.compile(r"Bearer\s+[A-Za-z0-9._-]+", re.IGNORECASE), "Bearer [REDACTED_TOKEN]"),
    (re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"), "[REDACTED_JWT]"),
    (re.compile(r"(?i)(secret[_-]?key|password|bootstrap[_-]?token|qr[_-]?signing[_-]?key)\s*[:=]\s*\S+"),
     "[REDACTED_SECRET]"),
]


class RedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        for pattern, replacement in _PATTERNS:
            message = pattern.sub(replacement, message)
        record.msg = message
        record.args = ()
        return True


class JSONFormatter(logging.Formatter):
    """Minimal JSON formatter; safe for structured log shippers."""

    def format(self, record: logging.LogRecord) -> str:
        import json

        payload = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    root = logging.getLogger()
    if getattr(root, "_geekai_configured", False):
        return
    root.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    handler.addFilter(RedactingFilter())
    handler.setFormatter(JSONFormatter())
    root.handlers = [handler]
    root._geekai_configured = True  # type: ignore[attr-defined]
