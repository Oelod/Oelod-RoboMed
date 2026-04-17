"""Phase 0 — AI service health tests"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import pytest
from app import app as flask_app

@pytest.fixture
def client():
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c

def test_health_returns_200(client):
    res = client.get("/health")
    assert res.status_code == 200

def test_health_returns_ok_status(client):
    data = res = client.get("/health")
    data = res.get_json()
    assert data["status"] == "ok"

def test_app_starts_without_import_error():
    """If we got here, the import succeeded — no crash on startup."""
    assert flask_app is not None
