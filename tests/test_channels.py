"""Tests for channel adapters."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from alphaclaw.channels.web import app


def test_web_health():
    """Health endpoint returns ok."""
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_web_index():
    """Index returns the chat HTML."""
    client = TestClient(app)
    resp = client.get("/")
    assert resp.status_code == 200
    assert "AlphaClaw" in resp.text
