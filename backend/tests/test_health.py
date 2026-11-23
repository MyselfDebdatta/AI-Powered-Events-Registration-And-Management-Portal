"""Health and root endpoint tests.

These run against the real FastAPI app through ASGITransport. They do not run
the lifespan, so no migration, seed or database connection is triggered.
"""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_root_reports_application_identity(client):
    response = await client.get("/")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["app"] == "GeekAI"
    assert body["version"] == "1.0.0"


@pytest.mark.asyncio
@pytest.mark.parametrize("path", ["/health", "/api/health"])
async def test_health_endpoints_are_live(client, path):
    response = await client.get(path)

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
