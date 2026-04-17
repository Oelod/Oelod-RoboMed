# OELOD ROBOMED — INSTITUTIONAL OPERATING MANUAL (v2.1.0)
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

## 3. Component Definitions

### **3.1 Identity & Access Manifold**
*   **User Profiles**: Every identity (Patient, Doctor, Admin, Lab, Pharmacist) is formally gated.
*   **Role Requests**: Standard users can request clinical roles, which require a **Super-Admin (L3)** formal approval.
*   **Institutional ID (HSP-XXXX)**: Atomic, human-readable identifiers assigned to every personnel and patient asset.

### **3.2 Case Life-Cycle Node**
*   **Case Submission**: Patients provide symptoms (text or diagnostic voice).
*   **AI Triage Card**: Displays priority (LOW/MED/HIGH/CRITICAL) and specialty-matching indicators.
*   **Atomic Acceptance**: Ensures that only one Specialist can formally "accept" a case, preventing institutional race conditions.

### **3.3 Clinical Communication Manifold**
*   **Case-Scoped Chat**: Real-time Socket.IO messaging between Practitioner and Patient.
*   **Presence Indicators**: Live typing awareness and read-receipt logic.
*   **Attachment Handling**: High-fidelity clinical file uploads (PDF, JPEG, PNG) through Cloudinary CDN.

---

## 4. Security & Governance Matrix

### **4.1 Regulatory Compliance (HIPAA/GDPR READY)**
*   **AuditLog Collection**: Every administrative action (role change, suspension, record extraction) is formally recorded.
*   **Governance Health**: Real-time metrics on Average Resolution Time (ATR) and departmental efficiency.
*   **Master Manifest**: One-click Excel-compatible extraction of all institutional data for legal audits.

### **4.2 Scaling & Isolation Logic**
*   **Redis-Backed Throttling**: Precision rate-limiting protects institutional resources from distributed throughput spikes.
*   **Zero-Trust Secrets**: Decoupled credential management (Vault-Ready) ensures no sensitive data is local.

---

## 5. Dashboard Functional Mapping

### **5.1 Personnel Datastream Columns**
*   **Practitioner**: Primary identity and role badges.
*   **License**: Clinical Gate (License Number verification).
*   **Status**: Live institutional access state (Active/Suspended/Pending).

### **5.2 Clinical Pipeline Buttons**
*   **Suspend Access**: Instant session revocation for the target identity.
*   **Monitor →**: Opens the deep case manifest for clinical auditing.
*   **+ Lab / + Pharm**: Dynamic role escalation for inter-disciplinary collaboration.
*   **Institutional Audit**: Downloads the character-perfect Master Manifest (Audit History).

---

## 6. Operational Telemetry
Administrator and IT leads utilize the following "Heartbeat" endpoints:
*   **Health Node**: `http://localhost:5000/health` (Service Availability)
*   **Telemetry Node**: `http://localhost:5000/metrics` (Performance Histograms)

---
**Institutional Manifest End — OELOD ROBOMED v2.1.0**
*This document is formatted for PDF conversion. Open in a standard browser or Markdown editor and select "Print to PDF" for official institutional distribution.*
