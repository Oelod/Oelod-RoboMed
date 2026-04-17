# OELOD ROBOMED — PRODUCTION ONBOARDING CHECKLIST
## Professional Cloud Manifold Configuration

---

## 1. Clinical Database: MongoDB Atlas
*Standard for high-fidelity medical records.*

1.  **Sign Up**: Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2.  **Create Cluster**: Select the **"FREE M0"** shared cluster tier. Choose a region close to your patients (e.g., AWS / N. Virginia).
3.  **Security Gate**:
    - **Database User**: Create a user (e.g., `robomed_admin`) and save the password SECURELY.
    - **IP Whitelist**: Add `0.0.0.0/0` (for now) to allow connections from your hosting provider.
4.  **Connect**: Click **"Connect"** → **"Drivers"** → **"Node.js"**. 
5.  **Environment**: Copy the URL and replace it in your `.env` as `MONGODB_URI`.

---

## 2. Institutional Cache: Redis Labs
*Powers your character-perfect rate limiting.*

1.  **Sign Up**: Go to [redis.io](https://redis.io/try-free/) and create a free account.
2.  **Create Database**: Select **"Redis Cloud"**. Choose the Free tier.
3.  **End Point**: Copy the **Public Endpoint** URL.
4.  **Environment**: Format it as `redis://:PASSWORD@HOST:PORT` and save it as `REDIS_URL` in your `.env`.

---

## 3. Communication Node: SendGrid
*Required for institutional emails and alerts.*

1.  **Sign Up**: Go to [sendgrid.com](https://sendgrid.com/) and create a free account.
2.  **API Key**: Navigate to **Settings** → **API Keys** → **Create API Key**. Give it "Full Access".
3.  **Environment**: Copy the key starting with `SG.` and save it as `SENDGRID_API_KEY`.
4.  **Verification**: You must verify a "Sender Identity" (your professional email) to start sending.

---

## 4. Analytical Intelligence: Google Cloud
*Required for high-fidelity clinical audio transcription.*

1.  **Sign Up**: Go to [console.cloud.google.com](https://console.cloud.google.com/) and login with your clinical Google account.
2.  **New Project**: Create a project named `Oelod-RoboMed`.
3.  **Enable APIs**: Search for **"Cloud Speech-to-Text API"** and click **Enable**.
4.  **Credentials**: 
    - Go to **APIs & Services** → **Credentials**. 
    - Click **"Create Credentials"** → **"API Key"**.
5.  **Environment**: Copy the key and save it as `GOOGLE_CLOUD_API_KEY` for use in your `ai-service`.

---

## 5. Summary of New `.env` Clinical Manifest

Once these are created, your backend manifold will look like this:

```env
# ── PRODUCTION MANIFEST ───────────────────────────────────────────────────────
MONGODB_URI=mongodb+srv://robomed_admin:<password>@cluster0.abcde.mongodb.net/robomed
REDIS_URL=redis://:your_password@your-redis-endpoint.com:12345
SENDGRID_API_KEY=SG.your_api_key_here
GOOGLE_CLOUD_API_KEY=your_google_key_here
# ─────────────────────────────────────────────────────────────────────────────
```

**Your clinical architecture is now formally prepared for professional deployment. Would you like me to guide you through any of these specific registration steps one-by-one?**
