# RoboMed — AI-Powered Healthcare Platform
## Implementation Plan (Senior Engineer Edition)

---

## 1. Project Overview

RoboMed is a telemedicine platform that lets patients submit symptoms, get AI-driven triage, and be matched with the right specialist — all in real time. It is clinical-grade in ambition: the data model, security posture, and AI pipeline are designed from day one to eventually accept real hospital EMR data.

**Core principle:** every architectural decision should cost nothing to change later. We use well-known patterns (repository pattern, service layer, event-driven notifications) so the system remains maintainable as it grows.

---

## 2. Technology Stack — Local Dev

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind CSS | Fast HMR, tree-shaking, utility-first CSS scales well |
| Backend | Node.js 20 LTS + Express 4 | Mature ecosystem, easy Socket.IO integration |
| Database | MongoDB 7 (local) via Mongoose | Flexible schema for heterogeneous medical records |
| Real-time | Socket.IO 4 | Rooms → case-scoped broadcast |
| File uploads | Multer (disk → temp) + Cloudinary SDK | Free tier sufficient for dev; CDN-ready for prod |
| AI Service | Python 3.11 + Flask 3 + scikit-learn | Lightweight, models swappable for PyTorch later |
| Process manager | `concurrently` npm package | Run backend + ai-service in one terminal locally |
| Testing (BE) | Jest + Supertest + `mongodb-memory-server` | Isolated, fast, no real DB needed |
| Testing (FE) | Vitest + React Testing Library | Same runner as Vite, minimal config |
| Testing (AI) | pytest + scikit-learn metrics | Standard Python test runner |

> [!NOTE]
> **Future clinical dataset upgrade:** The AI pipeline is built as a replaceable component. When a clinical dataset is ready, only `ai-service/data/` and `train.py` need to change — the Flask API, Node integration, and all tests remain identical.

---

## 3. Monorepo Structure

```
robomed/
├── backend/
│   ├── src/
│   │   ├── config/           # db, env, cloudinary
│   │   ├── middlewares/      # auth, roleGuard, errorHandler, rateLimiter, validate
│   │   ├── models/           # Mongoose models
│   │   ├── repositories/     # DB access layer (decoupled from controllers)
│   │   ├── services/         # Business logic layer
│   │   ├── controllers/      # HTTP glue only — thin layer
│   │   ├── routes/           # Express routers
│   │   ├── events/           # EventEmitter for internal domain events
│   │   ├── sockets/          # Socket.IO handlers
│   │   └── utils/            # helpers (generateToken, apiResponse, idGen)
│   ├── tests/
│   │   ├── unit/             # service & util unit tests
│   │   ├── integration/      # route-level Supertest tests
│   │   └── fixtures/         # seed factories
│   ├── server.js
│   └── package.json
│
├── ai-service/
│   ├── app.py
│   ├── model/
│   │   ├── train.py
│   │   ├── evaluate.py
│   │   ├── generate_synthetic.py   # dataset generator
│   │   ├── symptom_model.pkl
│   │   └── label_encoder.pkl
│   ├── data/
│   │   └── symptoms_dataset.csv    # synthetic, git-committed
│   ├── tests/
│   │   └── test_predict.py
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── api/              # axios instance + per-domain helpers
    │   ├── components/       # atomic UI: Button, Badge, Modal, Avatar
    │   ├── pages/            # Auth, PatientDashboard, DoctorDashboard, Admin
    │   ├── hooks/            # useAuth, useSocket, useCase, useNotifications
    │   ├── context/          # AuthContext, SocketContext
    │   └── main.jsx
    ├── tests/
    └── vite.config.js
```

> [!IMPORTANT]
> **Repository + Service pattern (backend):** Controllers never touch Mongoose directly. They call a `service`, which calls a `repository`. This makes unit-testing services trivial (mock the repo) and keeps business logic out of HTTP handlers — a common mistake in Express projects.

---

## 4. Phased Implementation

---

### Phase 0 — Scaffolding & Infrastructure

**Goal:** Running skeleton with health check, DB connection, and shared tooling.

#### What to build
- `backend/`: Express app, Mongoose connection, `.env.example`, global error handler, rate limiter middleware (`express-rate-limit`), `GET /health` endpoint
- `ai-service/`: Flask app with `GET /health`
- `frontend/`: Vite + React scaffold with Tailwind configured
- `concurrently` script in root `package.json`:
  ```json
  "dev": "concurrently \"npm run dev --prefix backend\" \"python ai-service/app.py\""
  ```
- `mongodb-memory-server` configured in `backend/jest.config.js` for test isolation

#### Engineering Best Practices
- **Centralised `apiResponse` utility** — every controller returns `{ success, message, data }` consistently
- **`express-async-errors`** — wraps all async route handlers so unhandled promise rejections propagate to the global error handler automatically; avoids boilerplate try-catch in every controller
- **`helmet`** — sets secure HTTP headers in one line
- **`morgan`** — HTTP request logging in dev
- **`.env.example`** committed to git; actual `.env` in `.gitignore`

#### ✅ Phase 0 Test Suite

**Files:** `backend/tests/integration/health.test.js` + `ai-service/tests/test_health.py`
**Run:** `cd backend && npm test -- --testPathPattern=health` and `cd ai-service && python -m pytest tests/test_health.py -v`

| # | Test Description | Pass Condition |
|---|---|---|
| 1 | `GET /health` on Express responds | HTTP 200, body `{ status: "ok" }` |
| 2 | MongoDB connection established | `mongoose.connection.readyState === 1` |
| 3 | Rate limiter active | 101st request in 15 min window → 429 |
| 4 | Unknown route → 404 JSON (not HTML) | Body has `success: false` |
| 5 | Uncaught async error → JSON 500 | No HTML stack trace leak |
| 6 | AI service `GET /health` | HTTP 200, `{"status": "ok"}` |
| 7 | AI service starts without import errors | No crash on startup |

---

### Phase 1 — Authentication & User Management

**Goal:** Secure, role-aware identity system that every subsequent phase depends on.

#### What to build

**`User` Mongoose model fields:**
```
_id, fullName, email, password (bcrypt rounds=12),
roles: [String] (enum: patient | doctor | admin | lab | pharmacist),
activeRole: String,
specialization: String,       // doctors only
licenseNumber: String,        // doctors — for future verification
hospitalId: String,           // auto-generated: HSP-XXXX
status: enum(active | suspended | pending),
profilePicture: String,       // Cloudinary URL
roleRequest: { requestedRole, status(pending|approved|rejected), requestedAt },
createdAt, updatedAt
```

**Routes:** all 6 auth endpoints + dashboard role-switch + admin approve/reject/suspend/activate

#### Engineering Best Practices
- **`Joi` validation middleware** — every route has a schema guard before the controller runs; bad payloads never touch the DB
- **Password hashing in Mongoose pre-save hook** — can never accidentally save plaintext
- **JWT access token (15 min) + refresh token (7 days, rotation on every use)**
- **`hospitalId` auto-generation:** sequential `HSP-XXXX` via a MongoDB counter collection (more human-readable for medical staff than UUID)
- **Refresh token stored in `httpOnly` cookie** — not localStorage; mitigates XSS theft
- **Audit log:** every role change (approve/reject/suspend) written to `AuditLog` collection with `actorId`, `action`, `targetId`, `timestamp`

#### ✅ Phase 1 Test Suite

**File:** `backend/tests/integration/auth.test.js`
**Run:** `cd backend && npm test -- --testPathPattern=auth`

| # | Test Description | Pass Condition |
|---|---|---|
| 1 | `POST /api/auth/register` valid data | 201, returns `user + token`, no `password` field in response |
| 2 | Register with duplicate email | 409, `{ success: false }` |
| 3 | Register with missing required fields | 400, Joi validation error body |
| 4 | `POST /api/auth/login` correct credentials | 200, JWT issued, `activeRole` set |
| 5 | Login with wrong password | 401 |
| 6 | `GET /api/auth/me` with valid token | 200, returns user object |
| 7 | `GET /api/auth/me` without token | 401 |
| 8 | `POST /api/auth/refresh-token` valid cookie | 200, new access token issued |
| 9 | `POST /api/auth/request-role` as patient | 200, `roleRequest.status = "pending"` |
| 10 | `PATCH /api/admin/users/:id/approve-role` as admin | 200, role added to `user.roles` |
| 11 | Same endpoint as non-admin | 403 |
| 12 | `PATCH /api/admin/users/:id/suspend` | 200, `status = "suspended"` |
| 13 | Suspended user cannot login | 403 |
| 14 | `PATCH /api/dashboard/switch-role` valid role | 200, new `activeRole` returned |
| 15 | Switch to role user does not possess | 400 |

---

### Phase 2 — Case Management System

**Goal:** Full case lifecycle from creation to closure with role-enforced access at every step.

#### What to build

**`Case` Mongoose model:**
```
_id, caseCode (CASE-XXXX), patient (ref User), doctor (ref User),
symptoms: [String], description: String, attachments: [{ fileUrl, uploadedAt }],
aiPrediction: {
  possible_conditions: [String], confidence_score: Number,
  priority_level: String, recommended_specialty: String, modelVersion: String
},
priority: enum(low | medium | high | critical),
assignedSpecialty: String,
status: enum(open | assigned | in-progress | closed | flagged),
timeline: [{ event: String, actorId, timestamp, note }],
lockedAt: Date,
createdAt
```

**Routes:** full set from backendStructure.txt §3 + dashboard summary/widgets

#### Engineering Best Practices
- **Atomic doctor acceptance** — single `findOneAndUpdate` with `{ status: "open" }` filter. If two doctors hit accept simultaneously only one succeeds; the other gets 409. No race condition possible
- **Timeline as embedded array** — every status change appends to `case.timeline`. One document read gives the full audit trail; no separate history collection needed
- **Role-scoped case listing** — `GET /api/cases` filters by `activeRole`: patients see only own cases; doctors see assigned + open-in-specialty; admins see all
- **`flagged` status** — admin can flag a case for governance review without closing it
- **`modelVersion` on `aiPrediction`** — traces exactly which trained model generated the prediction, critical for future audits

#### ✅ Phase 2 Test Suite

**File:** `backend/tests/integration/case.test.js`
**Run:** `cd backend && npm test -- --testPathPattern=case`

| # | Test Description | Pass Condition |
|---|---|---|
| 1 | Patient creates case | 201, `status: "open"`, `caseCode` assigned |
| 2 | Non-patient cannot create case | 403 |
| 3 | `GET /api/cases` as patient | Returns only own cases |
| 4 | `GET /api/cases` as doctor | Returns own + open-in-specialty cases |
| 5 | `GET /api/cases/:id` own case | 200, full case object |
| 6 | `GET /api/cases/:id` unrelated patient | 403 |
| 7 | Doctor accepts open case | 200, `status → "assigned"`, `doctorId` set |
| 8 | Second doctor accepts same case | 409 "Case already assigned" |
| 9 | `PATCH .../close` by assigned doctor | 200, `status → "closed"` |
| 10 | Patient tries to close case | 403 |
| 11 | `PATCH .../reopen` by admin | 200, `status → "open"` |
| 12 | `GET .../history` | Returns timeline array with correct event labels |
| 13 | `GET /api/dashboard/summary` as doctor | Numeric stats: `assignedCases`, `openCases` present |
| 14 | `GET /api/dashboard/summary` as patient | Patient-scoped stats returned |
| 15 | `GET /api/dashboard/widgets` | 200, widget data array returned |

---

### Phase 3 — AI Triage Engine [COMPLETED]

**Goal:** A trained, serialised ML model that takes symptom input and returns a structured triage decision. Built so that replacing the dataset later requires zero interface changes.

#### 3a. Synthetic Dataset Generation

**File:** `ai-service/model/generate_synthetic.py`

The generator produces `data/symptoms_dataset.csv` with schema:
```
symptoms (semicolon-joined) | specialty | priority | possible_conditions (semicolon-joined)
fever;headache;stiff neck   | Infectious Disease | HIGH | Meningitis;Malaria
```

**Generation methodology:**
- Master dictionary: **10 specialties** → diseases → canonical symptom sets + noise symptoms + priority distribution
- Specialties: `Cardiology, Neurology, Orthopedics, Infectious Disease, Dermatology, General Medicine, ENT, Gastroenterology, Pulmonology, Urology`
- **8 000 training + 2 000 test records** (80/20 stratified split)
- Noise injection: ±2 random symptoms per record to simulate real-world ambiguity
- Class imbalance handled: `class_weight="balanced"` in classifier
- Seed fixed (`random.seed(42)`) for full reproducibility
- Script committed to git — dataset is always regenerable

#### 3b. Feature Engineering

**File:** `ai-service/model/train.py`

```
Input:  Variable-length list of symptom strings
Output: Fixed-width binary feature array
Tool:   MultiLabelBinarizer over a fixed vocabulary of ~200 known symptoms
        → sparse binary matrix (1 = symptom present, 0 = absent)
```

Simple, interpretable, and explainable. A Random Forest on binary symptom features can generate feature importances (= "which symptoms most influenced this prediction") — a key requirement for any clinical tool that needs to explain its decisions.

#### 3c. Training Pipeline

```python
# train.py — high-level flow
1.  Load CSV → DataFrame
2.  Parse symptom strings → Python lists
3.  MultiLabelBinarizer.fit_transform(symptoms) → X (feature matrix)
4.  LabelEncoder.fit_transform(specialty) → y_specialty
5.  LabelEncoder.fit_transform(priority) → y_priority
6.  Stratified train/test split (80/20)
7.  Specialty classifier:
      RandomForestClassifier(n_estimators=200, class_weight="balanced",
                             random_state=42, n_jobs=-1)
8.  Priority classifier: separate RandomForestClassifier (same config)
9.  Evaluate both on test split:
       → accuracy, weighted F1, per-class recall printed to console
10. ASSERT: accuracy >= 0.85 — build fails if under threshold
11. Save: joblib.dump(specialty_pipeline, "model/symptom_model.pkl")
        joblib.dump(priority_clf,        "model/priority_model.pkl")
        joblib.dump(mlb,                 "model/label_encoder.pkl")
12. Write model/model_info.json:
    { "trained_at", "accuracy", "f1_weighted", "n_samples", "version": "1.0.0" }
    (version auto-increments on each retrain)
```

**Model versioning:** `model_info.json` version is stamped on every case's `aiPrediction.modelVersion`. When a clinical dataset improves the model, you can audit exactly which cases used the old model.

#### 3d. Flask Prediction API

**File:** `ai-service/app.py`

```
POST /predict
Body: { "symptoms": ["fever", "chills", "joint pain"] }

200 OK:
{
  "possible_conditions": ["Malaria", "Dengue Fever"],
  "confidence_score": 0.91,
  "priority_level": "HIGH",
  "recommended_specialty": "Infectious Disease",
  "model_version": "1.0.0"
}

422 Unprocessable:
{ "error": "Invalid input: symptoms must be a non-empty list of strings" }
```

**Best practices:**
- Model loaded **once at startup** (module-level) — not per request
- Symptoms lowercased + whitespace-stripped before vectorisation
- Unknown symptoms silently ignored (patients use everyday language, not ICD codes)
- `confidence_score` = `predict_proba` max class probability
- Flask runs in production mode with `waitress` WSGI server locally

#### 3e. Node.js Integration

```
POST /api/cases → caseService.createCase()
  → aiService.triage(symptoms)
    → axios.post("http://localhost:5001/predict", { symptoms }, { timeout: 4000 })
    → success: attach aiPrediction to case doc
    → timeout / error: log warning, set aiPrediction: null, continue saving
  → case saved regardless (graceful degradation)
```

- 4-second timeout (AI service normally < 200 ms)
- After 3 consecutive AI failures → skip AI call for 30 s, log alert (circuit breaker — prevents cascading failure in case AI process crashes)

#### ✅ Phase 3 Test Suite

**Part A — Python tests**
**File:** `ai-service/tests/test_predict.py`
**Run:** `cd ai-service && python -m pytest tests/ -v`

| # | Test Description | Pass Condition |
|---|---|---|
| 1 | Model `.pkl` files exist after training | All three pkl files present |
| 2 | `POST /predict` valid symptoms → 200 | HTTP 200 |
| 3 | Response contains all required fields | `possible_conditions`, `confidence_score`, `priority_level`, `recommended_specialty`, `model_version` |
| 4 | `confidence_score` is float in [0, 1] | `0 <= score <= 1.0` |
| 5 | `priority_level` in allowed enum | One of `LOW`, `MEDIUM`, `HIGH` |
| 6 | `recommended_specialty` in known list | One of 10 defined specialties |
| 7 | Empty symptoms list → 422 | Body contains `"error"` key |
| 8 | Non-list body → 422 | Body contains `"error"` key |
| 9 | 100% unknown symptoms → graceful | 200 returned, no crash |
| 10 | Test-set accuracy ≥ 85% | `evaluate.py` asserts threshold |
| 11 | Per-class F1 ≥ 0.75 for all specialties | F1 report check |
| 12 | Prediction latency < 200 ms | Timed assertion |

**Part B — Node integration tests**
**File:** `backend/tests/integration/ai-integration.test.js`
**Run:** `cd backend && npm test -- --testPathPattern=ai-integration`

| # | Test Description | Pass Condition |
|---|---|---|
| 1 | Case creation triggers AI call | `case.aiPrediction` not null |
| 2 | `aiPrediction.recommended_specialty` stored | String present on saved doc |
| 3 | `aiPrediction.modelVersion` stored | Matches `model_info.json` version |
| 4 | AI service mocked offline → case saves | 201, `aiPrediction: null` |
| 5 | AI timeout (4 s mock delay) → no 500 | 201 returned |

---

### Phase 4 — Lab Requests, Results & Prescriptions [COMPLETED]

**Goal:** Complete lab workflow from doctor request to uploaded result, plus prescription management.

#### What to build

**`LabRequest` model:** `caseId, doctorId, testType, urgency(routine|urgent|stat), notes, status(pending|completed|cancelled)`

**`LabResult` model:** `caseId, requestId, fileUrl, publicId(Cloudinary), mimeType, sizeKb, comment, uploadedBy, uploadedAt`

**`Prescription` model:** `caseId, doctorId, drugs[{ name, dosage, frequency, duration, instructions }], notes, issuedAt, isActive`

#### Engineering Best Practices
- **MIME-type whitelist on upload:** Multer filter accepts only `application/pdf`, `image/jpeg`, `image/png` — rejected before Cloudinary is ever called
- **File size hard limit:** 10 MB in Multer config
- **Cloudinary folder structure:** `robomed/lab-results/{caseId}/` — organised for easy CDN management
- **Prescription `isActive` flag:** new prescription marks previous ones `isActive: false` — no conflicting active prescriptions; doctors always see the live one
- **Auto-link lab result to request:** on patient upload, system finds the latest `pending` lab request for the case and marks it `completed` automatically

#### ✅ Phase 4 Test Suite

**File:** `backend/tests/integration/lab.test.js`
**Run:** `cd backend && npm test -- --testPathPattern=lab`

| # | Test Description | Pass Condition |
|---|---|---|
| 1 | Doctor creates lab request | 201, `status: "pending"` |
| 2 | Patient cannot create lab request | 403 |
| 3 | Patient uploads valid PDF | 200, `fileUrl` Cloudinary URL present |
| 4 | Upload auto-links to pending request | `labRequest.status → "completed"` |
| 5 | Upload disallowed file type (`.exe`) | 400, rejected before Cloudinary |
| 6 | Upload file > 10 MB | 413 |
| 7 | Doctor issues prescription with full drug list | 201, all drug sub-fields stored |
| 8 | Patient cannot issue prescription | 403 |
| 9 | New prescription → previous marked inactive | Old prescription `isActive: false` |
| 10 | Patient views own prescriptions | 200, list returned |
| 11 | `GET /api/cases/:id` includes lab timeline | `labRequests` array in response |

---

### Phase 5 — Real-time Chat & Notifications [COMPLETED]

**Goal:** Case-scoped real-time messaging and an event-driven notification system that keeps all parties informed without polling.

#### What to build

**`Conversation` model:** `caseId (unique index), participants[userId], lastMessage, updatedAt`

**`Message` model:** `conversationId, sender (ref), text, attachments[], readBy:[userId], createdAt`

**`Notification` model:** `recipientId, title, message, type(case_assignment|lab_update|new_message|system), relatedId, isRead, createdAt`

#### Socket.IO Event Map

| Event | Direction | Payload |
|---|---|---|
| `join_case` | client → server | `{ caseId }` |
| `send_message` | client → server | `{ conversationId, text }` |
| `receive_message` | server → client | Full message object |
| `case_assigned` | server → doctor | `{ caseId, patientName }` |
| `case_status_changed` | server → participants | `{ caseId, newStatus }` |
| `notification` | server → user | Full notification object |
| `typing` | client → server | `{ conversationId, isTyping }` |
| `user_typing` | server → client | `{ senderId, isTyping }` |

#### Engineering Best Practices
- **Domain event emitter** — case status changes fire internal Node.js `EventEmitter` events. Notification creation and Socket.IO emissions are listeners, not hardcoded in controllers. This decouples notifications from business logic entirely
- **Typing indicator** — debounced 500 ms on client; auto-stops server-side after 3 s even if stop event is missed
- **`readBy` array on messages** — enables unread count per-user without a separate collection
- **Conversation is case-1:1** — unique index on `caseId`. `POST /api/chat/conversations` is idempotent: if one exists for the case it is returned, not duplicated

#### ✅ Phase 5 Test Suite

**File:** `backend/tests/integration/chat.test.js`
**Run:** `cd backend && npm test -- --testPathPattern=chat`

| # | Test Description | Pass Condition |
|---|---|---|
| 1 | `POST /api/chat/conversations` creates conversation | 201, `caseId` + `participants` present |
| 2 | Same POST again (idempotent) | 200, same `_id` returned |
| 3 | Unrelated user cannot open conversation | 403 |
| 4 | `POST .../messages` sends message | 201, message stored in DB |
| 5 | `GET .../messages` returns sorted messages | 200, ordered by `createdAt` asc |
| 6 | `PATCH .../read` marks messages read | `readBy` includes current user ID |
| 7 | `GET /api/notifications` returns list | 200, array present |
| 8 | `GET /api/notifications/unread-count` | 200, `{ unreadCount: N }` (N is a number) |
| 9 | `PATCH /api/notifications/:id/read` | 200, `isRead: true` |
| 10 | `PATCH /api/notifications/read-all` | 200, all previously unread → read |
| 11 | Case assignment triggers notification | New notification doc in DB for patient |
| 12 | Lab result upload triggers notification | New notification for doctor |
| 13 | `DELETE /api/notifications/:id` | 200, notification removed |

---

### Phase 6 — Search & Admin [COMPLETED]

**Goal:** Role-scoped search across entities and a complete admin control panel with real metrics.

#### What to build

- MongoDB `$text` indexes on `Case.symptoms`, `Case.description`, `User.fullName`, `User.email`
- All search routes from backendStructure.txt §6
- Full admin routes: paginated user list, system stats (aggregation), role management, case flagging

#### Engineering Best Practices
- **Search is role-scoped** — every search query appends a role-appropriate filter before hitting the DB. A doctor searching cases only sees their specialty; patients only see their own. Privacy enforced at the data layer, not just the UI
- **Pagination on all list endpoints:** `?page=1&limit=20` with `X-Total-Count` response header — prevents unbounded queries on large datasets
- **Admin stats via `$facet` aggregation** — single pipeline returning case counts by status, user counts by role, average AI confidence — no N+1 queries
- **`AuditLog` read endpoint:** `GET /api/admin/audit-log?from=&to=` — full admin action traceability with date filters

#### ✅ Phase 6 Test Suite

**File:** `backend/tests/integration/search.test.js`
**Run:** `cd backend && npm test -- --testPathPattern=search`

| # | Test Description | Pass Condition |
|---|---|---|
| 1 | `GET /api/search?q=fever` as patient | Returns only own matching cases |
| 2 | Same query as doctor | Returns specialty-filtered results |
| 3 | `GET /api/search/users?q=jane` as admin | Returns matching users |
| 4 | `GET /api/search/patients?q=HSP-0001` | Returns patient by hospitalId |
| 5 | Search with no results | 200, `{ results: [] }` not 404 |
| 6 | `GET /api/admin/users` as admin | 200, paginated list, `X-Total-Count` header set |
| 7 | `GET /api/admin/users` as non-admin | 403 |
| 8 | `GET /api/admin/stats` returns numeric fields | All stat fields are integers ≥ 0 |
| 9 | `GET /api/admin/audit-log` returns entries | Array with `actorId`, `action`, `timestamp` |
| 10 | `PATCH /api/admin/users/:id/roles` | 200, `roles` array updated correctly |

---

### Phase 7 — React + Tailwind CSS Frontend [COMPLETED]

**Goal:** A polished, role-aware UI where the AI triage output is clearly communicated to patients and the doctor workflow is frictionless.

#### Pages & Components

| Page | Role | Key Features |
|---|---|---|
| `AuthPage` | All | Register / Login, form validation, JWT in memory |
| `ProtectedRoute` | — | Guards routes by role, redirects to login |
| `PatientDashboard` | Patient | Case list, "New Case" CTA, notification bell |
| `NewCasePage` | Patient | Symptom multi-select + free text, image upload |
| `CaseDetailPage` | Both | `AITriageCard`, chat panel, lab timeline, prescriptions |
| `DoctorQueue` | Doctor | Open cases filtered by specialty, one-click accept |
| `AdminDashboard` | Admin | User table (CRUD), stats cards, audit log viewer |
| `ChatPanel` | Both | Socket.IO real-time, typing indicator, file attach |
| `NotificationDrawer` | All | Live notifications, mark-read, badge count |

#### Engineering Best Practices
- **`AITriageCard` component** — colour-coded priority badge (`HIGH`=red, `MEDIUM`=amber, `LOW`=green), confidence bar chart, possible conditions list, specialist recommendation. Visible immediately after case creation — gives patients meaningful context
- **Optimistic UI for chat** — message appears instantly in the panel, confirmed or corrected when server responds
- **Axios interceptor** — silently refreshes access token using httpOnly cookie on 401; user never sees a forced logout mid-session
- **TanStack Query (`react-query`)** — all data fetching, caching, background refresh, and loading/error states handled declaratively; no manual `useEffect` fetching
- **Tailwind custom theme** — brand colours defined once in `tailwind.config.js` as named tokens, not arbitrary hex values in component classes

#### ✅ Phase 7 Test Suite

**File:** `frontend/tests/`
**Run:** `cd frontend && npm test`

| # | Test Description | Pass Condition |
|---|---|---|
| 1 | Login form renders email + password fields | Both inputs present in DOM |
| 2 | Submit with empty fields → inline validation | Error messages displayed |
| 3 | Successful login → redirect to dashboard | Dashboard component rendered |
| 4 | `PatientDashboard` renders case list | Case cards from mocked API visible |
| 5 | `NewCasePage` symptom input → tag added | Symptom tag appears after selection |
| 6 | `AITriageCard` renders with mocked response | Priority badge + specialty text visible |
| 7 | Role-switch → re-fetches dashboard | Correct role-scoped dashboard shown |
| 8 | Notification badge shows unread count | Badge number matches mock |
| 9 | `ProtectedRoute` redirects unauthenticated user | Redirected to `/login` |
| 10 | Doctor queue shows only open cases | No closed/assigned cases in list |

---

### Phase 8 — Integration, Security & End-to-End [COMPLETED]

**Goal:** Validate the full system as one cohesive product before handoff.

#### Full E2E Scenario (browser, run with `npm run dev`)

```
1.  Register patient John → login
2.  Create case: symptoms = ["fever", "chills", "joint pain", "sweating"]
3.  VERIFY: AITriageCard shows "Infectious Disease" + "HIGH" priority + confidence bar
4.  Register doctor Jane (specialty: Infectious Disease) → admin approves role
5.  Jane logs in → sees John's case in the queue → accepts
6.  John sees "Doctor Assigned" notification in real time
7.  Jane opens chat → types "Please upload your blood test"
8.  Both see typing indicator while the other composes
9.  John uploads PDF lab result
10. Jane sees lab result notification + document link
11. Jane issues prescription: Artemether 80 mg/day, 5 days
12. Jane closes the case
13. John views read-only case history — full timeline visible
```

#### Security Checklist

| # | Check | How to Verify |
|---|---|---|
| 1 | All routes require auth token | Review all route files for missing `isAuth` |
| 2 | Rate limiting on auth endpoints | Phase 0 test #3 |
| 3 | Password never in any API response | Search test responses for `password` field |
| 4 | File upload MIME whitelist enforced | Phase 4 test #5 |
| 5 | JWT secret in `.env`, not hardcoded | `grep -r "JWT_SECRET" src/` returns only config reference |
| 6 | HTTP security headers active | `curl -I /health` — verify `X-Content-Type-Options`, `X-Frame-Options` |
| 7 | Input validation on all POST bodies | Every route has a Joi schema guard |

#### Load Test (local, zero install)

```bash
npx artillery quick --count 50 --num 10 http://localhost:5000/health
```

**Target:** p95 < 100 ms on `/health`, p95 < 500 ms on `POST /api/auth/login` under 50 concurrent users.

---

### Phase 9 — Production Hardening & Clinical Readiness

**Goal:** Transition the platform from a "clinical-grade prototype" to a "production-ready institutional asset" with focus on high availability, security hardening, and real EMR integration.

#### What to build

- **Infrastructure as Code (IaC)**: Dockerize all services (`backend`, `ai-service`, `frontend`) and provide a `docker-compose.prod.yml` with Nginx reverse proxy and SSL (Certbot) configuration.
- **Advanced Rate Limiting**: Move from memory-based limiting to Redis-backed precision throttling for institutional scaling.
- **Clinical Data Ingestion API**: Build a secure batch-processing endpoint for ingesting legacy patient records from hospital Excel/CSV/JSON exports.
- **HIPAA/GDPR Audit Module**: Automated report generation tracking all access to Patient Health Information (PHI).

#### Engineering Best Practices

- **Zero-Downtime Retraining**: Implement a blue-green deployment strategy for the `ai-service` so that model updates (e.g., from v1.0.0 to v2.0.0) occur without dropping active triage requests.
- **Secret Management**: Move all `.env` secrets (JWT, Cloudinary, DB) to a dedicated secret manager (Vault or AWS Secrets Manager) for production environments.
- **Performance Profiling**: Instrument the Node.js event loop and Python prediction latency with Prometheus/Grafana metrics.

#### ✅ Phase 9 Deployment Readiness

| # | Check | Target |
|---|---|---|
| 1 | AI Triage Response Time | p99 < 300ms under load |
| 2 | DB Query Performance | All clinical lookups < 50ms with indexing |
| 3 | Secure PHI Access | 100% of PII access recorded in AuditLog |
| 4 | Service Isolation | AI service cannot access the main DB (only via REST) |

---

## 5. Environment Variables Reference

```env
# backend/.env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/robomed_dev
JWT_SECRET=replace_with_256_bit_random_secret
JWT_REFRESH_SECRET=replace_with_different_256_bit_secret
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
AI_SERVICE_URL=http://localhost:5001

# ai-service/.env  (optional — defaults in app.py)
FLASK_ENV=development
PORT=5001
```

---

## 6. Local Run Instructions

```bash
# Install root orchestration deps
npm install

# Backend
cd backend && npm install

# Python AI service
cd ../ai-service
pip install -r requirements.txt
python model/generate_synthetic.py   # builds symptoms_dataset.csv
python model/train.py                # trains + serialises model, prints accuracy

# Frontend
cd ../frontend && npm install

# Start all three services
cd ..
npm run dev
# → backend  :5000
# → ai-service :5001
# → frontend :5173
```

---

## 7. Future Clinical Dataset Upgrade Path

When a clinical dataset becomes available:

1. Replace `ai-service/data/symptoms_dataset.csv` with the clinical export (keep the same column schema: `symptoms | specialty | priority | possible_conditions`)
2. Run `python model/train.py` — the pipeline is identical
3. `model_info.json` version auto-increments (e.g. `2.0.0`)
4. All Phase 3 tests still apply — raise accuracy threshold to ≥ 90% in `evaluate.py`
5. Consider upgrading classifier to `GradientBoostingClassifier` or a lightweight BERT model for free-text symptom input
6. No changes required to Flask API, Node.js integration, or frontend

---

## 8. Institutional Operational Audit & Simple User Guide
> **Definitive Common Language Version** · **The "Senior Dev" Audit**

This section explains every single part of the RoboMed platform. Technical jargon has been removed so all participants can operate the system with 100% certainty.

### **8.1 Entry & Identity (The Front Gate)**
*   **"Initialize Access"**: The primary **Login Button**.
*   **"Clinical Backup Phrase"**: A secret password recovery phrase. **Mandatory**: Store this safely to get back into your account.

### **8.2 For Managers (Administrators)**
*   **High-Urgency Bar**: **"Acknowledge & Dismiss"** (Clears critical system alerts).
*   **Navigation Tabs**: **Personnel, Patients, Archive, Reports, Logs, Search, Migration, Manifest, Audit, Health, Safe (Vault).**
*   **Management Tools (In Tables)**:
    *   **"Suspend / Restore Access"**: Instant button to stop/start a worker's login.
    *   **"Management Level"**: Dropdown to promote staff to Level 1, 2, or 3.
    *   **"Hospital Office"**: Selector for department assignment (Medical Director, Ethics, etc.).
    *   **"+ Lab / + Pharm"**: Buttons to grant doctors power in other departments.
    *   **"+ COMPLIANCE"**: Generates a legal report for a patient (**"Export Manifest"** to print).
*   **Archive Tools**: **"Review →"** (Open patient file) and **"Finalize Re-assign →"** (Move file to a new doctor).
*   **Safe (Vault)**: (High Level) extract and download research data.
*   **Audit Tab**: Download the **"Master Institutional Report"** (Excel).

### **8.3 For Patients (Your Health Home)**
*   **"+ Start New Consultation"**: The big button to start a new medical visit.
*   **"Proceed to Human Specialist"**: Appears after the first talk with the AI; sends your file to a real doctor.
*   **"Sign & Acknowledge Script"**: Green button that confirms you understand your medicine.

### **8.4 For Doctors (Your Workspace)**
*   **Telemedicine Hub (Floating Card)**: 
    *   **"Initialize Video"**: Appears on the Case Page. Once started, a floating window appears at the **top-right** of your screen. This window stays with you even if you look at other patient files or your dashboard.
    *   **"Accept / Reject"**: Patients see a single, clear box at the top-right to pick up the call.
    *   **"Identity ID"**: You will see the doctor's name (e.g., "DR. SMITH") before you pick up.
    *   **"Hardware Failover"**: If your camera is busy, the system will automatically switch to a **Secure Voice Call** so the consultation can continue.
*   **Sidebar Tools**: Buttons for **"Start Video Call"**, **"Start Voice Call"**, and the **"Clinical Voice Recorder"** (creates a **"Medical Audio Player"**).
*   **Main Action Bar**: **"Accept Case"**, **"Issue RX"**, **"Request Lab"**, **"Safe Closure ✓"**, **"Flag Case"**, and **"Escalate."**

### **8.5 For Lab & Pharmacy Workers**
*   **Lab Console**: **"Submit Results →"** (Upload reports with **"Diagnostic Remarks"**).
*   **Pharmacy Console**: **"✔ Verify & Dispense"** (Final check button). Individual medicines have **"Dispense Medication"** and **"External Fulfillment"** buttons.

---

**Hospital Security Note**: Every single button mentioned above is tracked. The system records your name and the time for every click to ensure 100% safety and honesty.

