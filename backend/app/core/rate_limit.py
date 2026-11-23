"""In-process rate limiting for S1 public writes.

Chosen mechanism: a small in-process sliding-window counter implemented
here, with no external dependency (no Redis, no Cloudflare, no slowapi).
Rationale recorded for the PR: S1 only needs per-process limits on login and
bootstrap. Cloudflare edge rules arrive in stage S3; a Redis-backed shared
store is only needed when more than one backend replica exists. This module
is intentionally simple and is the single place to replace with a shared
store later.

Limits (from docs/route-matrix.md):
  - login:     5/min/IP  + 20/hour/account
  - bootstrap: 3/min/IP

A blocked request returns 429 with the `RATE_LIMITED` code in the standard
error envelope and a Retry-After header.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple

from fastapi import HTTPException, Request, status

# key -> deque of request timestamps (monotonic seconds)
_store: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)
_lock = threading.Lock()


class RateLimitExceeded(HTTPException):
    """Raised when a rate limit is hit. Carries the canonical error code."""

    def __init__(self, retry_after: int, code: str = "RATE_LIMITED") -> None:
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": code,
                "message": "Too many requests. Please retry later.",
                "details": {"retry_after_seconds": retry_after},
            },
            headers={"Retry-After": str(retry_after)},
        )
        self.code = code
        self.retry_after = retry_after


def _check(key: Tuple[str, str], limit: int, window_seconds: int) -> None:
    """Record a request for `key` and raise 429 if over `limit` in window."""
    now = time.monotonic()
    cutoff = now - window_seconds
    with _lock:
        bucket = _store[key]
        # Drop timestamps outside the window.
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()
        if len(bucket) >= limit:
            retry_after = max(1, int(bucket[0] + window_seconds - now) + 1)
            raise RateLimitExceeded(retry_after=retry_after)
        bucket.append(now)


def client_ip(request: Request) -> str:
    """Return the direct connection peer IP.

    S1 deliberately ignores `X-Forwarded-For`: a direct caller can supply any
    value there and bypass the per-IP limit. Trusting forwarded headers is
    deferred to stage S3, where the edge proxy set is known and the header can
    be validated against it. Until then the connection peer is the only
    trustworthy IP available to the application.
    """
    return request.client.host if request.client else "unknown"


async def enforce_login_limits(request: Request, account: str | None = None) -> None:
    """Enforce login limits: 5/min/IP and 20/hour/account."""
    ip = client_ip(request)
    _check(("login", f"ip:{ip}"), limit=5, window_seconds=60)
    if account:
        _check(("login", f"account:{account.lower()}"), limit=20, window_seconds=3600)


async def enforce_bootstrap_limit(request: Request) -> None:
    """Enforce bootstrap limit: 3/min/IP."""
    _check(("bootstrap", f"ip:{client_ip(request)}"), limit=3, window_seconds=60)


def reset_rate_limits() -> None:
    """Clear all in-process counters. Intended for tests and restarts."""
    with _lock:
        _store.clear()
