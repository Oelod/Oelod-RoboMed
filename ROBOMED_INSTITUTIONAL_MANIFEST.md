# Oelod RoboMed — Institutional Manifest (v2.1.0)
## Senior Engineer Handover Edition

---

## 1. Clinical Core Architecture

**Oelod RoboMed** is an institutional-grade AI healthcare asset designed for character-perfect triage, case-scoped role isolation, and regulatory-ready auditing. The platform follows a **"Service-to-Registry"** pattern, which decouples clinical logic from data ingestion and AI inference.

### **Institutional Deployment Modes**
- **Shadow-Reload Engine (AI)**: Supports zero-downtime model updates.
- **Precision Throttling (Scaling)**: Redis-backed rate limiting for distributed throughput.
- **Zero-Trust Secrets (Security)**: Decoupled credentials for local agility or Vault deployment.

---

## 2. Practitioner Dashboard Mapping

### **A. Personnel Datastream (Admin View)**

| Column / Button | Institutional Function | Logic Trace |
| :--- | :--- | :--- |
| **Practitioner** | Displays Full Name + Assigned Roles. | Maps to `User.roles` manifest. |
| **Contact & License** | Identity Verification Fragment. | Shows `email` + `licenseNumber` (Clinical Gate). |
| **Specialization** | Filtered Expertise Badges. | Limits case visibility to specialty-scoped doctors. |
| **Status Badge** | Institutional Access State. | `active` (Live), `suspended` (Locked), `pending` (Unauthorized). |
| **Suspend Access** | Session Revocation Trigger. | Instantly invalidates all `RefreshToken` OTTs for the user. |
| **Restore Access** | Reactivate Institutional ID. | Reinstates the practitioner's ability to login. |
| **+ Lab / + Pharm** | Role Escalation Logic. | Dynamically appends roles to the `User` object. |
| **Governance Assignment** | Super-Admin (L3) Office Delegation. | Assigns user to `Chief Medical Office`, `Ethics`, or `IT`. |

### **B. Clinical Case Pipeline**

| Column / Button | Institutional Function | Logic Trace |
| :--- | :--- | :--- |
| **Case ID (CASE-XXXX)** | Human-Readable Institutional Identifier. | Atomic sequence generation via `idGen.js`. |
| **AITriageCard** | Diagnostic Intelligence Output. | Displays `Priority`, `Recommended Specialty`, and `Confidence`. |
| **Status Tag** | Clinical Workflow State. | `Open` → `Assigned` → `In-Progress` → `Closed` / `Flagged`. |
| **Monitor →** | Opens Case Manifest. | Redirects to `CaseDetailPage` for deep clinical auditing. |
| **Archive** | Historical Record Lock. | Moves the case into the permanent long-term clinical storage. |

### **C. Governance Board Controls**

| Global Button | Institutional Function | Technical Manifold |
| :--- | :--- | :--- |
| **⬇ Export CSV** | Exports the *current visible* Datastream. | Local memory-mapped CSV generation. |
| **🏛️ Master Manifest** | **HIPAA/GDPR Regulatory Export.** | Calls `GET /api/admin/download-governance-report` for full Excel auditing. |
| **📄 System Print** | Character-Perfect PDF Generation. | Specialized CSS `no-print` styling for clinical documentation. |
| **⚖️ Settlement Ruling** | Final Departmental Adjudication. | CMO or Ethics Board's final case settlement input. |

---

## 3. Clinical Workflow Manifolds

### **I. Triage & Matching**
- **Patient Node**: Submits symptoms via free-text or voice (transcribed).
- **AI Node**: Performs vectorization-inference (`MultiLabelBinarizer`). Returns a high-fidelity specialty matching.
- **Doctor Node**: Sees the case in their **"Institutional Queue"** based on specialty-alignment.

### **II. Security & Hardening**
- **OTT Rotation**: Every time a user's session "refreshes," the previous token is character-perfectly revoked in the database.
- **Audit Immortality**: Actions (approvals, suspensions, role-changes) are recorded in the **Immortality Log (`AuditLog`)** and cannot be deleted by standard administrators.

---

## 4. Operational Telemetry (Metrics)

Practitioners and IT Leads can audit the system's "Heartbeat" directly:
- **Clinical Health**: `http://localhost:5000/health`
- **Institutional Telemetry**: `http://localhost:5000/metrics`

---
**Institutional Manifest End — Clearing Session: a465b6ad-b2f7-45de-b437-fd706c2af8f4**
**Practitioner Approval Required for Final Handover.**
