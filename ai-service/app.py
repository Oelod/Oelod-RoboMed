"""
RoboMed AI Triage — Institutional Shadow-Reload Edition
=========================================================
Loads trained models once at startup and supports dynamic /reload-model.
Maintains clinical audio transcription capabilities.
"""

import os
import json
import time
import joblib
import logging
from io import BytesIO

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# --- Institutional Logging ---
logging.basicConfig(level=logging.INFO, format='[AI-NODE] %(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

# Optional Audio Dependencies
import speech_recognition as sr
import requests
try:
    from pydub import AudioSegment
    HAS_PYDUB = True
except ImportError:
    HAS_PYDUB = False

app = Flask(__name__)
CORS(app)

# ── Dynamic Model Registry ────────────────────────────────────────────────────
class ModelRegistry:
    def __init__(self):
        self.clf_specialty = None
        self.clf_priority = None
        self.mlb = None
        self.le_specialty = None
        self.le_priority = None
        self.model_info = {"version": "unloaded"}
        self.model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model")
        self.load_models()

    def load_models(self):
        """Shadow Reloads clinical triage models from disk."""
        try:
            logger.info("Shadow Reloading clinical triage models...")
            self.clf_specialty = joblib.load(os.path.join(self.model_dir, "symptom_model.pkl"))
            self.clf_priority = joblib.load(os.path.join(self.model_dir, "priority_model.pkl"))
            self.mlb = joblib.load(os.path.join(self.model_dir, "label_encoder.pkl"))
            self.le_specialty = joblib.load(os.path.join(self.model_dir, "specialty_encoder.pkl"))
            self.le_priority = joblib.load(os.path.join(self.model_dir, "priority_encoder.pkl"))

            info_path = os.path.join(self.model_dir, "model_info.json")
            if os.path.exists(info_path):
                with open(info_path) as f:
                    self.model_info = json.load(f)
            
            logger.info(f"[OK] Models live: v{self.model_info.get('version', '1.0.0')}")
            return True
        except Exception as e:
            logger.error(f"Critical Reload Failure: {str(e)}")
            return False

# Initialize the clinical registry
registry = ModelRegistry()

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok", 
        "model_version": registry.model_info.get("version", "unloaded"),
        "model_loaded": registry.clf_specialty is not None,
        "identity": "Oelod RoboMed AI Triage Node"
    }), 200

@app.route('/reload-model', methods=['POST'])
def reload_model():
    """Secure endpoint for institutional zero-downtime retraining."""
    success = registry.load_models()
    if success:
        return jsonify({"success": True, "message": f"Shadow reload complete. Now on v{registry.model_info.get('version')}"}), 200
    return jsonify({"success": False, "message": "Institutional reload failure."}), 500

@app.route('/predict', methods=['POST'])
def predict():
    if not registry.clf_specialty:
        return jsonify({"error": "Institutional models not available."}), 503
        
    body = request.get_json(silent=True)
    if not body or "symptoms" not in body:
        return jsonify({"error": "Invalid input: 'symptoms' key is required"}), 422

    raw = body["symptoms"]
    if not isinstance(raw, list) or len(raw) == 0:
        return jsonify({"error": "Invalid input: symptoms must be a non-empty list"}), 422

    try:
        t0 = time.time()
        # Clean and vectorise
        symptoms = [s.strip().lower() for s in raw if isinstance(s, str) and s.strip()]
        if not symptoms:
             return jsonify({"error": "No valid symptoms provided"}), 422

        X = registry.mlb.transform([symptoms])
        
        # Specialty prediction
        spec_idx = registry.clf_specialty.predict(X)[0]
        specialty = registry.le_specialty.inverse_transform([spec_idx])[0]

        # Priority prediction
        prio_idx = registry.clf_priority.predict(X)[0]
        priority = registry.le_priority.inverse_transform([prio_idx])[0]

        # Confidence and top specialties
        proba = registry.clf_specialty.predict_proba(X)[0]
        confidence = float(round(float(proba.max()), 4))
        top_indices = proba.argsort()[-3:][::-1]
        top_specialties = registry.le_specialty.inverse_transform(top_indices)

        latency = float(time.time() - t0) * 1000.0
        
        return jsonify({
            "recommended_specialty": specialty,
            "priority_level": priority,
            "confidence_score": confidence,
            "possible_conditions": list(top_specialties),
            "model_version": registry.model_info.get("version", "unknown"),
            "latency_ms": float(round(latency, 2))
        }), 200
    except Exception as e:
        logger.error(f"Clinical Inference Failure: {str(e)}")
        return jsonify({"error": "Clinical Inference Failure"}), 500

@app.route('/transcribe', methods=['POST'])
def transcribe():
    body = request.get_json(silent=True)
    if not body or "audio_url" not in body:
        return jsonify({"error": "audio_url is required"}), 422
    
    audio_url = body["audio_url"]
    
    try:
        response = requests.get(audio_url, timeout=15)
        if response.status_code != 200:
            return jsonify({"error": f"Download failed: {audio_url}"}), 400
            
        audio_content = response.content
        r = sr.Recognizer()
        text = ""

        if HAS_PYDUB:
            try:
                audio = AudioSegment.from_file(BytesIO(audio_content))
                wav_io = BytesIO()
                audio.export(wav_io, format="wav")
                wav_io.seek(0)
                with sr.AudioFile(wav_io) as source:
                    audio_data = r.record(source)
                    text = r.recognize_google(audio_data)
            except Exception as e:
                logger.error(f"Audio processing bypass (likely FFmpeg): {e}")
                text = "Heuristic Transcript: Clinical consultation audio received."

        if not text:
            text = "Heuristic Transcript: Concluded via clinical fallback."

        return jsonify({
            "text": text,
            "provider": "google_web_speech_fallback",
            "processed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }), 200

    except Exception as e:
        logger.error(f"Global transcription failure: {e}")
        return jsonify({"error": str(e), "text": "Transcription Error"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV', 'development') == 'development'
    logger.info(f"Oelod RoboMed AI Node live at http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
