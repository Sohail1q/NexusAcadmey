# 🌐 Nexus Academy Management System — Cloud Deployment & Database Integration Guide

Welcome to the **Nexus Academy Management System** complete cloud deployment guide. This document provides clear, step-by-step instructions to connect your application to a live cloud database (Firebase Firestore or Supabase), deploy to production, and save data globally with zero lag.

---

## ⚡ 1. Quick Start: Built-in Live Cloud Backend (Zero Config)

Nexus Academy comes with a high-performance, real-time Node/Express server daemon:
1. Double-click `RUN-NEXUS-ACADEMY.bat` or run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\SETUP-INSTALLER.ps1
   ```
2. Select **[1] START GAME** to launch the server on `http://localhost:3000`.
3. All changes (Students, Classes, Attendance, Test Marks, Fees, Receipts) are saved persistently to `data/nexus-db.json` and synchronized in real-time across all browser tabs via Server-Sent Events (SSE).

---

## 🔥 2. Google Firebase (Firestore) Integration Guide

If you prefer storing all academy data directly in Google Cloud Firebase:

### Step 2.1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and name it (e.g., `nexus-academy-prod`).
3. (Optional) Disable or enable Google Analytics, then click **Create project**.

### Step 2.2: Enable Cloud Firestore
1. In the left sidebar, click **Build** > **Firestore Database**.
2. Click **Create database**.
3. Choose your preferred database location (e.g. `nam5` / `us-central` or `asia-south1`).
4. Select **Start in test mode** for instant read/write access during setup.

### Step 2.3: Configure Security Rules
In Firebase Console > Firestore Database > **Rules**, paste:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /nexus_academy/{document=**} {
      allow read, write: if true; // Or restrict to authenticated academy staff
    }
  }
}
```
Click **Publish**.

### Step 2.4: Get Your Web Credentials
1. Click the **Project Settings** (gear icon) in the top-left.
2. Under **General** > **Your apps**, click the **Web icon (`</>`)**.
3. Register your app (e.g. `nexus-web`).
4. Copy the config object:
   - `apiKey`
   - `projectId`
   - `authDomain`
   - `storageBucket`
   - `appId`

### Step 2.5: Connect in Nexus Academy UI
1. Open Nexus Academy and navigate to the **Settings** tab.
2. Under **Real-time Cloud Database Sync**, select **Firebase Firestore**.
3. Paste your **Firebase Project ID** and **API Key**.
4. Click **Test Cloud Connection** and **Save Settings**.
5. Your academy data will now sync to Firestore in real time!

---

## ⚡ 3. Supabase (PostgreSQL) Integration Guide

If you prefer a relational PostgreSQL database with Supabase:

### Step 3.1: Create a Free Supabase Project
1. Visit [Supabase](https://supabase.com/) and click **Start your project**.
2. Click **New Project**, name it `nexus-academy`, choose a database password and region.

### Step 3.2: Create the Database Table
1. In Supabase dashboard, click **SQL Editor** > **New Query**.
2. Run the following SQL script:
```sql
CREATE TABLE IF NOT EXISTS public.nexus_state (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.nexus_state ENABLE ROW LEVEL SECURITY;

-- Allow public read/write with anon key (or restrict to authenticated users)
CREATE POLICY "Allow anon read and write"
ON public.nexus_state
FOR ALL
TO anon
USING (true)
WITH CHECK (true);
```
3. Click **Run**.

### Step 3.3: Copy API Credentials
1. In the Supabase project dashboard, go to **Project Settings** > **API**.
2. Copy:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Project API Keys** > `anon` `public` key.

### Step 3.4: Connect in Nexus Academy UI
1. In Nexus Academy, click the **Settings** tab.
2. Select **Supabase** in the Cloud Database section.
3. Paste your **Supabase URL** and **Anon Key**.
4. Click **Test Cloud Connection** then **Save Settings**.

---

## 🚀 4. Production Cloud Deployment: GitHub & Cloudflare

### Step 4.1: Initializing & Pushing to GitHub
Your repository is already pre-configured with `.gitignore`, `.env.example`, and clean production configurations.

1. Create a new repository on [GitHub](https://github.com/new) (e.g., `nexus-academy-management-system`).
2. Run these commands in your project directory:
   ```bash
   # Initialize and commit (if not already committed)
   git init -b main
   git add .
   git commit -m "feat: complete Nexus Academy system with Biometric Attendance and Excel export"

   # Link your GitHub repository and push
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/nexus-academy-management-system.git
   git push -u origin main
   ```

---

### Step 4.2: Deploying Frontend to Cloudflare Pages

Cloudflare Pages provides global CDN hosting with zero egress fees and automated Git CI/CD:

1. **Connect GitHub**:
   - Log into the [Cloudflare Dashboard](https://dash.cloudflare.com/).
   - Navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
   - Select your `nexus-academy-management-system` GitHub repository.

2. **Configure Build Settings**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
   - **Root Directory**: `/` (leave blank)
   - **Node.js Version**: In **Environment Variables**, add `NODE_VERSION` = `20` or `18`.

3. **Single-Page Application (SPA) Routing**:
   - Cloudflare Pages handles SPA routing automatically when `dist/index.html` is the output.
   - For custom error routing, a `_redirects` file in `public/` with:
     ```text
     /*  /index.html  200
     ```
     ensures all subpaths route to the React dashboard.

4. Click **Save and Deploy**. Your academy dashboard will be live at `https://nexus-academy-management-system.pages.dev` in ~60 seconds!

---

### Step 4.3: Deploying Full-Stack API & Database on Cloudflare (Workers & D1)

To host the backend API routes (`/api/biometric/scan`, `/api/attendance/export-excel`, etc.) on Cloudflare:

1. **Install Wrangler CLI**:
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Cloudflare D1 SQL Database (Optional Free Edge DB)**:
   ```bash
   # Create a free edge database
   wrangler d1 create nexus-academy-db
   ```
   Copy the `database_id` and add it to your `Settings` > `Cloud Database Synchronization` inside the Nexus Academy web app.

3. **Cloudflare Tunnel for Local Hardware Biometric Scanners**:
   Because physical fingerprint scanners (such as ZKTeco, USB scanners, or Anviz devices) are connected to your academy's local PC, use Cloudflare's free **`cloudflared` tunnel** to securely connect the local scanner daemon to your live Cloudflare deployment:
   ```bash
   # Install cloudflared and create tunnel
   cloudflared tunnel --url http://localhost:3000
   ```
   Paste the generated tunnel URL into your Cloudflare Pages dashboard so all biometric scans post directly from the physical machine to the cloud.

---

## 🔒 5. Administrative Access & Security
- **Default Principal PIN**: `2026`
- You can customize this PIN anytime in the **Settings** tab.
- Sensitive actions (Deleting student records, updating dues, modifying classes, restoring database backups) are locked to protect student integrity.

