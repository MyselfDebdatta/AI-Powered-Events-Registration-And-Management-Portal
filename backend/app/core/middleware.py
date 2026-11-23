"""Request-ID middleware.

Assigns a UUID `request_id` to every request, stores it on `request.state`,
and returns it in the `X-Request-Id` response header. The error envelope and
audit helper read the same value so a request can be traced end to end.
"""

from __future__ import annotations

import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        incoming = request.headers.get("x-request-id", "").strip()
        request_id = incoming if incoming and len(incoming) <= 64 else uuid.uuid4().hex
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response
