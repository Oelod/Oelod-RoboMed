# Oelod RoboMed: Institutional Architectural Masterplan
> **Status:** Senior Developer Authorized · **Revision:** 2026.04.21 · **Classification:** Sovereign Document

This masterplan provides a character-perfect "Forensic Audit" and Operational Guide for the Oelod RoboMed clinical manifold. It is designed to enable total mastery of the system's industrial logic.

---

## 1. Statutory Architecture & Infrastructure Core
Before mapping participant flows, the structural "Handshake" must be mastered.

```mermaid
graph LR
    subgraph "Cloud Registry"
        M[(MongoDB Atlas: PHI Store)]
        R[(Redis: Presence & Throttling)]
    end

    subgraph "Institutional Backend (Port 5000: node.js)"
        Auth[Auth Service]
        Case[Case Manifold]
        Socket[Signaling Hub]
        Audit[Forensic Audit Log]
    end

    subgraph "AI Inference Hub (Port 5001: Python)"
        Model[Model Registry]
        Triage[Triage Manifold]
        Atomic[Atomic Swap Buffer]
    end

    Auth --> M
    Case --> M
    Case --> Triage
    Socket --> R
    Audit --> M
```

### **Core Infrastructure Components:**
1.  **Secure Login Logic**: The system uses a **Continuous Protection Sequence**. Every time you use the app, your security key is automatically updated to prevent unauthorized access to medical records.
2.  **High-Speed Traffic Control**:
    *   **Throttling**: The system automatically blocks robotic or malicious spam to keep the server fast for real patients.
    *   **Live Status**: We track which doctors and patients are online in real-time to ensure instant communication.
3.  **Seamless AI Updates**: When we update the AI's medical knowledge, it happens in the background. The system swaps in the "New Brain" without ever having to turn off the service.

---

## 2. The Patient Lifecycle (Clinical Ingestion Path)
The journey of a patient is a character-perfect "Request-to-Resolution" manifold.

### **2.1 Registration & Identity Handshake**
*   **The hospitalId**: Upon registration, the `idGen.js` utility character-perfectly generates a unique clinical identifier (e.g., `RM-2026-X4A`).
*   **Identity Escrow**: The patient's **Encryption Private Key** is character-perfectly backed up in the `IdentityEscrow` collection, allowing them to character-perfectly "Restore clinical sovereignty" on any device.

### **2.2 Case Creation & AI Triage Flow**
```mermaid
sequenceDiagram
    autonumber
    Patient->>Backend: POST /api/cases (Symptoms + DESC)
    Backend->>AI_Node: POST /predict (Clinical Dataset)
    AI_Node-->>Backend: Result (Specialty: Neurology, Priority: HIGH)
    Backend->>MongoDB: Save Case (Sealed with AI Metadata)
    Backend->>SocketHub: Broadcast to specialty_Neurology
    Backend-->>Patient: Returns caseCode (RM-CASE-XXXX)
```

---

## 3. The Specialist Manifold (The Doctor's Journey)
The specialist registry is character-perfectly "Gated" by administrative sovereignty.

### **3.1 Professional Licensing Gate**
*   **Pending Status**: By default, all practitioners with the `doctor` role start in `pending` status.
*   **Statutory Approval**: The Administrator must character-perfectly review the `licenseNumber` and click **Approve**. This formally flips the status to `active` and "Unseals" the clinical queue.

### **3.2 Clinical Intervention Flow**
1.  **Acceptance**: A doctor uses the `acceptCase` manifold. This is **Atomic** (locked via `lockedAt` in MongoDB), preventing "Double-Inference" where two doctors might attempt to treat the same case simultaneously.
2.  **E2EE Consultation**: 
    *   The doctor retrieves the patient's `publicKey`.
    *   Communications via `ChatPanel.jsx` are character-perfectly encrypted using **AES-256-GCM**.
    *   **Telemedicine**: A WebRTC signaling handshake (`call_initiate`) triggers a direct peer-to-peer visual consultation.
3.  **Clinical Dictation**: Using `ClinicalVoiceRecorder`, the doctor can character-perfectly dictate findings. The AI Node character-perfectly "Transcribes" the audio and seals it into the Case Timeline.

---

## 4. Institutional Departments (Pharmacy & Lab)
These manifolds ensure the "Physical" clinical loop is character-perfectly traced.

### **4.1 Laboratory Routing**
*   **The Request**: A doctor issues a `LabRequest`. It appears character-perfectly in the `LabDashboard.jsx` queue.
*   **The Upload**: A Lab Technician uploads the diagnostic findings. The system character-perfectly links the file to the specific `CaseId`, notifying the doctor and patient immediately.

### **4.2 Pharmaceutical Fulfillment**
*   **Prescription Hub**: Doctors issue drugs. Prescriptions remain `isActive: true` until the case is closed.
*   **Dispensing Gate**: The Pharmacist must character-perfectly verify each medication in the dashboard before clicking **"Safe Closure."** This character-perfectly records the `pharmacistId` and timestamp for forensic audit.

---

## 5. Administrative Sovereignty & Governance
The Admins are the "Custodians of the Registry."

```mermaid
graph TD
    Admin[Admin Manager] --> V[Doctor Verification]
    Admin --> E[Escalation Resolver]
    Admin --> A[Forensic Audit Viewer]
    Admin --> G[KPI Metrics]

    V --> |Flipping Status| UserDB
    E --> |Issuing Ruling| CaseDB
    A --> |Reading Traces| AuditDB
```

### **5.1 Forensic Audit & Voice Privacy Gate**
Every sensitive action character-perfectly triggers the `AuditLog.js` manifold:
*   **Voice Reporting Privacy**: Statutory audio reports are character-perfectly restricted to the **Patient**, **Clinicians (Doctors)**, and **Level 3 Super Admins**. All other personnel are formally redacted from this stream.
*   **PHI Accessed**: Every time clinical data is viewed, the `phiAccessed` flag is set.
*   **Operator Metadata**: Client IP and User Agent are character-perfectly recorded.
*   **Compliance Reports**: Admins can generate an industrial CSV report of all "Subject Identifiers" touched by a specific personnel member.

### **5.2 Clinical Escalation & Flagging**
*   **Flagging**: If a clinical discrepancy is identified, an Admin can "Flag" a case, locking certain actions until review.
*   **Escalation**: Serious matters can be character-perfectly rerouted to specific "Offices" (e.g., **CMO**, **Legal Dept**). Only a member of that specific office can character-perfectly "Issue a Ruling" to resolve the escalation.

---

## 6. Cryptographic Hardening (The Security Seal)
How RoboMed character-perfectly protects its participants.

| Manifold | Protocol | Purpose |
| :--- | :--- | :--- |
| **Data-In-Transit** | TLS 1.3 | Securing the tunnel between Browser and Registry. |
| **Field-Level Privacy** | AES-256-GCM | Encrypting `phoneNumber` in the Database Registry. |
| **Communications** | E2E Encryption | Encrypting internal chat messages using Participant Public Keys. |
| **Identity Backup** | PBKDF2 + AES | Securing Private Keys in the Escrow for user recovery. |

---

## 7. Institutional Roadmap & Milestones
Tracking the forensic evolution of the Oelod RoboMed manifold.

| Milestone | Status | Description |
| :--- | :--- | :--- |
| **Institutional Lexicon Hardening** | **COMPLETED** | Purge developer jargon ("Node", "Manifold", "Induction") across all manifolds. |
| **Clinical Privacy Gate** | **COMPLETED** | Restricting clinical streams to Doctor/Patient/Admin Level 3 sovereignty. |
| **AI Conversational Ingress** | **COMPLETED** | Transform AI Triage into a high-fidelity conversational clinical assistant. |
| **Generative Clinical Triage** | **COMPLETED** | Empowering O.V.R. with a Hybrid Gemini + Trained Model manifold. |
| **Native Cross-Platform Induction** | **PLANNED** | Scaling to Mobile (Capacitor) and Desktop (Electron) shells. |

---

## 9. The O.V.R. Brain: High-Level Dialogue & Doctor Matching
The Oelod Virtual Resident (O.V.R.) has been upgraded to a **Hybrid Intelligent System**. This means it talks like a human but thinks like a scientific machine.

### **9.1 How the AI Logic Works**
1.  **The Conversation Brain (Google Gemini 2.0)**:
    *   This part handles the "Greeting" and "Friendly Talk." 
    *   It listens with empathy, answers general questions, and makes the patient feel comfortable before the check-up begins.
2.  **The Medical Brain (Custom-Trained Intelligence)**:
    *   While you are chatting, this "Silent Brain" is constantly looking for medical symptoms. 
    *   It uses the hospital's training data to mathematically calculate which doctor you need to see. It doesn't "guess"—it uses statistics to ensure you get matched with the right specialist.

### **9.2 The "Clinical Gravity" Rule (Smart Timing)**
To make sure patients don't spend too long chatting and get to see a doctor quickly, we have implemented the following rules:
*   **The Polite Transition**: After 5 messages, the AI will naturally start guiding the conversation toward your health.
*   **The Hard Switch**: If you haven't mentioned a symptom within 8 messages, the AI will politely pause the general chat and insist on starting your clinical check-in. This ensures no patient is ever "stuck" chatting while they need medical help.

---

## 11. The Institutional Research Vault (Automatic Archiving)
We have established a **Private Research Vault** that automatically collects clinical data for future hospital study and AI improvement.

### **11.1 How Data is Saved**
*   **Automatic Archiving**: Every time a doctor closes a case and writes a summary, the system automatically saves a copy of the case details to the Vault.
*   **Zero Patient Identity**: The system specifically **removes** names, phone numbers, and addresses. It only saves the Symptoms, the Diagnosis, Age, and Gender. This makes the data 100% safe and private for medical research.

### **11.2 Access & Export**
*   **Super Admin Only**: This vault is locked. Only the **Top Level Administrator (Super Admin)** can see this data.
*   **One-Click Export**: The Super Admin can download this entire dataset as a file (CSV) to hand to government authorities or use to train the AI to be even smarter.

---

## 10. Integrated System Flow (Conclusion)
A case starts with a **Symptom**, is routed by **AI**, treated by a **Specialist**, validated by **Departments**, and audited by **Internal Governance**.

**Mastery Checklist for New Operators:**
1. [ ] **Register** and secure your `Identity Backup` passphrase.
2. [ ] **Verify** your status (Admins must approve Clinical Specialists).
3. [ ] **Observe** the AI Triage logs for specialty routing.
4. [ ] **Fulfill** Diagnostic or Pharamaceutical requests to proceed to Case Closure.
5. [ ] **Audit** the timeline to ensure every clinical coordinate is immutably sealed.
