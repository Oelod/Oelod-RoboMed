"""
Phase 3 — AI Triage Engine Tests
==================================
Tests the Flask /predict endpoint and model quality.

Usage:
  cd ai-service
  python -m pytest tests/ -v
"""

import os
import sys
import time
import json
import pytest

# Add parent dir to path so we can import app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import app as flask_app

VALID_SPECIALTIES = {
    "Infectious Disease", "Cardiology", "Neurology", "Orthopedics",
    "Dermatology", "General Medicine", "ENT", "Gastroenterology",
    "Pulmonology", "Urology",
}

VALID_PRIORITIES = {"LOW", "MEDIUM", "HIGH"}


@pytest.fixture
def client():
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c


# ── Test 1 ────────────────────────────────────────────────────────────────────
def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"


# ── Test 2 ────────────────────────────────────────────────────────────────────
def test_model_files_exist():
    model_dir = os.path.join(os.path.dirname(__file__), "..", "model")
    for fname in ["symptom_model.pkl", "priority_model.pkl", "label_encoder.pkl",
                  "specialty_encoder.pkl", "priority_encoder.pkl", "model_info.json"]:
        assert os.path.exists(os.path.join(model_dir, fname)), f"Missing: {fname}"


# ── Test 3 ────────────────────────────────────────────────────────────────────
def test_predict_valid_symptoms(client):
    res = client.post("/predict", json={"symptoms": ["fever", "chills", "joint pain", "sweating"]})
    assert res.status_code == 200


# ── Test 4 ────────────────────────────────────────────────────────────────────
def test_predict_response_has_all_fields(client):
    res = client.post("/predict", json={"symptoms": ["fever", "headache", "stiff neck"]})
    data = res.get_json()
    required = ["possible_conditions", "confidence_score", "priority_level",
                "recommended_specialty", "model_version"]
    for field in required:
        assert field in data, f"Missing field: {field}"


# ── Test 5 ────────────────────────────────────────────────────────────────────
def test_confidence_score_in_range(client):
    res = client.post("/predict", json={"symptoms": ["chest pain", "shortness of breath"]})
    data = res.get_json()
    assert 0.0 <= data["confidence_score"] <= 1.0


# ── Test 6 ────────────────────────────────────────────────────────────────────
def test_priority_level_valid_enum(client):
    res = client.post("/predict", json={"symptoms": ["fever", "muscle weakness", "fatigue"]})
    data = res.get_json()
    assert data["priority_level"] in VALID_PRIORITIES


# ── Test 7 ────────────────────────────────────────────────────────────────────
def test_recommended_specialty_valid(client):
    res = client.post("/predict", json={"symptoms": ["wheezing", "shortness of breath", "cough at night"]})
    data = res.get_json()
    assert data["recommended_specialty"] in VALID_SPECIALTIES


# ── Test 8 ────────────────────────────────────────────────────────────────────
def test_empty_symptoms_returns_422(client):
    res = client.post("/predict", json={"symptoms": []})
    assert res.status_code == 422
    assert "error" in res.get_json()


# ── Test 9 ────────────────────────────────────────────────────────────────────
def test_non_list_body_returns_422(client):
    res = client.post("/predict", json={"symptoms": "fever headache"})
    assert res.status_code == 422
    assert "error" in res.get_json()


# ── Test 10 ───────────────────────────────────────────────────────────────────
def test_missing_symptoms_key_returns_422(client):
    res = client.post("/predict", json={"data": ["fever"]})
    assert res.status_code == 422


# ── Test 11 ───────────────────────────────────────────────────────────────────
def test_completely_unknown_symptoms_graceful(client):
    """Unknown symptoms are silently ignored — should not crash the service."""
    res = client.post("/predict", json={"symptoms": ["zzz_unknown_symptom_abc", "qqqq_not_real"]})
    # Service should return 200 (graceful) or 422 (no valid symptoms after sanitisation)
    assert res.status_code in (200, 422)


# ── Test 12 ───────────────────────────────────────────────────────────────────
def test_prediction_latency_under_200ms(client):
    t0 = time.time()
    client.post("/predict", json={"symptoms": ["fever", "chills", "headache"]})
    elapsed_ms = (time.time() - t0) * 1000
    assert elapsed_ms < 200, f"Prediction took {elapsed_ms:.1f}ms — too slow"


# ── Test 13 ───────────────────────────────────────────────────────────────────
def test_model_version_string(client):
    res = client.post("/predict", json={"symptoms": ["fever", "fatigue"]})
    data = res.get_json()
    assert isinstance(data["model_version"], str)
    assert len(data["model_version"]) > 0


# ── Test 14 — Model accuracy (reads model_info.json written by train.py) ──────
def test_model_accuracy_above_threshold():
    model_dir = os.path.join(os.path.dirname(__file__), "..", "model")
    info_path = os.path.join(model_dir, "model_info.json")
    assert os.path.exists(info_path), "model_info.json not found — run train.py first"
    with open(info_path) as f:
        info = json.load(f)
    assert info["accuracy"] >= 0.85, (
        f"Model accuracy {info['accuracy']} < 0.85 — retrain with better data"
    )
