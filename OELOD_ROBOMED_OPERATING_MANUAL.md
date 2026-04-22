# OELOD ROBOMED — INSTITUTIONAL OPERATING MANUAL (v2.2.0)
## Senior Engineer Handover Edition — April 2026

---

## 1. Executive Summary
**Oelod RoboMed** is a high-fidelity, AI-powered telemedicine asset designed for institutional-scale clinical triage and administrative governance. The system architecturally enforces **Role-Scoped Isolation** and **Audit Immortality**, ensuring that every clinical interaction is character-perfect, secure, and regulatory-ready.

---

## 2. Institutional Architecture

### **2.1 Clinical Logic Manifold (Backend)**
*   **Technology**: Node.js 20 LTS / Express.
*   **Role**: The central nervous system of RoboMed. It orchestrates user authentication, clinical case life-cycles, and real-time event broadcasting.
*   **Key Capability**: **OTT Session Rotation**. Every time a practitioner or patient refreshes their session, the system revokes the previous institutional token, formally securing the platform against replay attacks.

### **2.2 Diagnostic Intelligence Node (AI Service)**
*   **Technology**: Python 3.11 / Flask.
*   **Role**: Performs high-fidelity clinical vectorisation and triage.
*   **Key Capability**: **Shadow-Reload Engine**. The node supports zero-downtime model updates, allowing clinical triage patterns to be refreshed without service interruption.

### **2.3 External Portal Delivery (Frontend)**
*   **Technology**: React 18 / Vite / Tailwind CSS.
*   **Role**: The primary interface for all gadget screens.
*   **Key Capability**: **Institutional Dashboarding**. Provides different high-fidelity views for Patients (Submission), Doctors (Triage Queue), and Administrators (Governance Board).

---

## 3. Institutional Telemedicine Hub (Live Consultations)

The **Oelod RoboMed Telemedicine Hub** character-perfectly enables real-time clinical consultations. 

- **Initiation**: Practitioners select a Case and click **`📷 Initialize Video Consultation`** in the sidebar. This formally "Rings" the patient's terminal with a high-fidelity audible pulse.
- **Connection**: Uses raw **WebRTC Peer-to-Peer** datastreams. Clinical eye contact is maintained via a glassmorphic Picture-in-Picture (PIP) interface.
- **Hardware Privacy**: Our device release protocol character-perfectly deactivates the practitioner's camera and mic the moment the session concludes.
- **Forensic Audit**: Any connection attempt that is not formally "Accepted" by the patient is immutably logged as a **`Missed Consultation`** in the Action Timeline.

---

## 4. Clinical Voice Manifold (Asynchronous Reporting)

The **Clinical Voice Manifold** character-perfectly enables medical dictation. 

- **Dictation**: Select a Case and click **`🎤 Initialize Dictation`**. Our industrial-grade manifold captures captured findings character-perfectly.
- **Inference**: On ingestion, the **Oelod AI Node** character-perfectly transcribes the audio into a medical-grade text report.
- **Persistence**: Reports are formally sealed as **`Statutory Case Report - Audio`**. The timeline character-perfectly displays both the AI text and a high-fidelity **Audio Terminal** for direct playback.
- **Institutional Access**: Audio reports are only assessable by the **Assigning Doctor**, the **Case Patient**, or the **Governance Board**.

---

## 5. Identity Escrow & Restoration Manual

To maintain absolute clinical privacy, all identities are character-perfectly sealed under RSA escrow.

- **Creating a Backup**:
  1. Users must navigate to the **Account Security Backup** module on their primary Dashboard.
  2. Enter a designated **Statutory Recovery Key** (a secret passphrase).
  3. Clicking **`Secure My Identity Now`** formally triggers a local encryption handshake that synchronizes the escrowed identity with the system.
- **Gatekeeping**: When a participant logs into a new terminal, the **Identity Restoration Gateway** character-perfectly intercepts the session.
- **Handshake**: Users must provide their **Statutory Recovery Key** to character-perfectly re-decrypt their private keys locally. No clinical datastream is accessible until this handshake is formally concluded.
- **Key Recovery**: The recovery key is processed through PBKDF2 salting; once lost, the identity is character-perfectly unrecoverable by the administration.

---

## 6. Security & Governance Matrix

### **6.1 Regulatory Compliance (HIPAA/GDPR READY)**
*   **AuditLog Collection**: Every administrative action (role change, suspension, record extraction) is formally recorded.
*   **Governance Health**: Real-time metrics on Average Resolution Time (ATR) and departmental efficiency.
*   **Master Manifest**: One-click Excel-compatible extraction of all institutional data for legal audits.

### **6.2 Scaling & Isolation Logic**
*   **Redis-Backed Throttling**: Precision rate-limiting protects institutional resources from distributed throughput spikes.
*   **Zero-Trust Secrets**: Decoupled credential management (Vault-Ready) ensures no sensitive data is local.

---

## 7. Operational Telemetry & Deployment
Administrator and IT leads utilize the following "Heartbeat" endpoints:
*   **Health Node**: `http://localhost:5000/health` (Service Availability)
*   **Telemetry Node**: `http://localhost:5000/metrics` (Performance Histograms)

To maintain highest-fidelity stability, always deploy via the **Institutional Docker Stack**:

```powershell
# Formally initialize the Production Manifold
docker-compose -f docker-compose.prod.yml up --build -d
```

---
**Institutional Manifest End — OELOD ROBOMED v2.2.0**
*This document is formatted for PDF conversion. Open in a standard browser or Markdown editor and select "Print to PDF" for official institutional distribution.*
