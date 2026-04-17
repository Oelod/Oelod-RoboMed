# OELOD ROBOMED — THE ARCHITECTURAL MASTERCLASS (v2.1.0)
## Senior Engineer Handbook & Institutional Blueprint

Welcome, Practitioner. This is the **Definitive Institutional Manifest** for the Oelod RoboMed System. This guide is built to teach a "novice" mind how a clinical-grade architecture breathes, while providing "senior-level" precision for deployment. 

---

## 1. The Monorepo Ecosystem
RoboMed uses a **Monorepo** structure. Imagine a hospital: instead of having the pharmacy, the surgery, and the records in three different cities, we put them all in one building.

### **The Root Building Map**
- `/backend`: The Administrative Office (Server logic).
- `/frontend`: The Public Wards & Reception (User Interface).
- `/ai-service`: The Specialized Laboratory (Medical Intelligence).
- `package.json`: The "Manifest" of the whole building's shared tools.

---

## 2. The Backend Manifold (The Heart)
The backend is the "Central Nerve Center". It handles security, saves data, and talks to the AI.

### **Clinical Folder Structure**
- `src/config/`: **The Key Vault**. Stores database connections and secret managers.
- `src/models/`: **The Medical Records**. Defines exactly how a "Patient" or a "Case" looks.
- `src/controllers/`: **The Hospital Managers**. They receive requests and decide which service to call.
- `src/services/`: **The Specialized Practitioners**. This is where the actual clinical math and logic live.
- `src/routes/`: **The Receptionist Desk**. Maps web addresses (URLs) to specific Managers (Controllers).
- `src/middlewares/`: **The Security Gates**. Checks if a user is "Active" or "Suspended" before they can enter.

### **The Toolset (Backend Dependencies)**
| Package | Novice Explanation | Institutional Why |
| :--- | :--- | :--- |
| **express** | The skeleton. | Mature, fast, and handles thousands of clicks. |
| **mongoose** | The translator between code and database. | Ensures medical records are never "messy". |
| **jsonwebtoken** | A digital "Security Badge". | Validates who you are without asking for passwords twice. |
| **bcryptjs** | The "Password Scrambler". | HIPAA/GDPR standard for never saving real passwords. |
| **socket.io** | The "Real-Time Walkie-Talkie". | Instant chat between doctor and patient. |
| **multer + cloudinary**| The "Filing Cabinet" for photos. | Remote storage for lab results and X-rays. |
| **joi** | The "Input Inspector". | Validates that an email is actually an email. |
| **prom-client** | The "Heart Monitor". | Exposes system performance (Telemetry). |
| **redis** | The "Super-Fast Post-it Note". | High-speed memory for distributed rate limiting. |

---

## 3. The AI Triage Node (The Brain)
The AI Service is isolated. It doesn't know who is logged in; it only knows medical data.

### **Clinical Folder Structure**
- `model/`: **The Serialized Knowledge**. Contains `.pkl` files (Saved Brains).
- `data/`: **The Study Lab**. Contains the CSVs used to teach the AI.
- `tests/`: **The Validation Suite**. Checks that the AI isn't making mistakes.

### **The Toolset (AI Dependencies)**
- **flask**: The "Express" of the Python world.
- **scikit-learn**: The intelligence builder (Models, Vectorizers).
- **joblib**: The "Quick-Save" tool for the AI brain.
- **waitress**: The "Production Bodyguard" for the Flask server.

---

## 4. The Frontend Portal (The Skin)
Built with React 18. This is what the world interacts with.

### **Clinical Folder Structure**
- `src/context/`: **The Global Memory**. Remembers "Am I logged in?" on every page.
- `src/pages/`: **The Wards**. One screen for Admin, one for Patient, one for Doctor.
- `src/components/`: **原子 (Atomic) Components**. Small buttons, inputs, and cards.
- `src/api/`: **The Couriers**. Functions that carry data to the Backend.

### **The Toolset (Frontend Dependencies)**
| Package | Novice Explanation | Institutional Why |
| :--- | :--- | :--- |
| **react** | The UI puzzle builder. | Efficient, dynamic, and role-reactive. |
| **react-query** | The "Smart Data Cache". | Prevents the system from reloading data unnecessarily. |
| **axios** | The "Postman". | Reliable HTTP delivery to the clinical backend. |
| **tailwindcss** | The "Premium Paint". | Consistent, character-perfect clinical aesthetics. |
| **framer-motion** | The "Smooth Transitions". | Adds institutional premium "wow" factor. |

---

## 5. Security Protocol: One-Time-Token (OTT) Rotation
This is a must-know. When a practitioner logs in:
1.  **Backend** gives an "Access Token" (lasts 15 min) and a "Refresh Token" (lasts 7 days).
2.  **Access Token** is used for every click.
3.  When it expires, the **Refresh Token** is traded for a NEW one. 
4.  **Crucial**: The OLD refresh token is instantly deleted from the DB. 
*Teaching Case*: If a hacker steals a used token and tries to "Replay" it, the system sees the token is gone and **kills all active sessions** for that user.

---

## 6. How to Read the Code (Senior-to-Novice Example)
**The "Admin Approve" Manifold:**
```javascript
// adminController.js
exports.approveRole = async (req, res) => {
   const user = await User.findById(req.params.id); // 1. Find the person
   user.roles.push(user.roleRequest.requestedRole); // 2. Add the new badge
   user.roleRequest.status = 'approved';           // 3. Mark the paperwork as done
   await user.save();                              // 4. File it in the cabinet (DB)
   res.json({ success: true });                    // 5. Tell the UI it worked
}
```
*Novice Lesson*: We don't just change the role. We find the specific person, update their "Badge List", and then **Commit to Memory (Save)**.

---
**Institutional Masterclass End — OELOD ROBOMED BLUEPRINT**
*This document is high-fidelity. For a formal print, open in your browser, right-click, and select "Print to PDF". Your clinical architecture is now formally transparent.*
