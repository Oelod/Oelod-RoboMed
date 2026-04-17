# RoboMed — AI Healthcare Platform

## Quick Start (Local)

### Prerequisites
- Node.js 20 LTS
- MongoDB running locally (`mongod`)
- Python 3.11 + pip

### 1. Install all dependencies
```powershell
npm install                          # root (concurrently)
npm install --prefix backend         # Node.js deps
npm install --prefix frontend        # React deps
pip install -r ai-service/requirements.txt
```

### 2. Configure environment
```powershell
copy backend\.env.example backend\.env
# Edit backend\.env with your values
```

### 3. Train the AI model
```powershell
npm run train:ai
# Generates dataset → trains model → prints accuracy report
```

### 4. Start all services
```powershell
npm run dev
# backend  → http://localhost:5000
# ai-service → http://localhost:5001
# frontend → http://localhost:5173
```

### 5. Run tests
```powershell
npm run test:backend   # Jest + Supertest (in-memory MongoDB)
npm run test:ai        # pytest
npm run test:frontend  # Vitest
```

## Project Structure
```
robomed/
├── backend/          Node.js/Express API
├── ai-service/       Python/Flask AI Triage Engine
├── frontend/         React + Tailwind CSS
└── package.json      Root orchestration (concurrently)
```

## Phase Progress
- [x] Phase 0 — Scaffolding & Infrastructure
- [x] Phase 1 — Authentication & User Management
- [ ] Phase 2 — Case Management
- [ ] Phase 3 — AI Triage Engine (train after Phase 0)
- [ ] Phase 4 — Lab & Prescriptions
- [ ] Phase 5 — Real-time Chat & Notifications
- [ ] Phase 6 — Search & Admin
- [ ] Phase 7 — React Frontend
- [ ] Phase 8 — Integration & E2E
