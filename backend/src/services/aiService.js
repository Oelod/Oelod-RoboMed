const axios = require('axios');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// ── Circuit breaker state ─────────────────────────────────────────────────────
let failCount = 0;
let circuitOpenUntil = null;
const MAX_FAILS = 3;
const OPEN_MS = 30_000;

const callAI = async (endpoint, payload, timeout = 5000) => {
  // Circuit breaker check
  if (circuitOpenUntil && Date.now() < circuitOpenUntil) {
    console.warn(`[AI] Circuit breaker OPEN — skipping call to ${endpoint}`);
    return null;
  }

  try {
    const { data } = await axios.post(`${AI_URL}${endpoint}`, payload, { timeout });
    failCount = 0; // reset on success
    circuitOpenUntil = null;
    return data;
  } catch (err) {
    failCount++;
    console.warn(`[AI] Call to ${endpoint} failed (${failCount}/${MAX_FAILS}): ${err.message}`);
    if (failCount >= MAX_FAILS) {
      circuitOpenUntil = Date.now() + OPEN_MS;
      console.warn(`[AI] Circuit breaker OPENED for ${OPEN_MS / 1000}s`);
    }
    return null;
  }
};

const triage = async (symptoms) => {
  return await callAI('/predict', { symptoms }, 5000);
};

const transcribe = async (audioUrl) => {
  return await callAI('/transcribe', { audio_url: audioUrl }, 20000);
};

module.exports = { triage, transcribe };
