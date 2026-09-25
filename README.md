# 🎓 Nexus Academy Management System — Live Cloud Edition

A modern, dynamic, full-stack academy management system built for educational institutes, language academies, computer training centers, and home tuition academies. Features a live real-time cloud database, student registration, admission workflows, fee collection receipts, attendance tracking, test grading, and cross-device synchronization.

---

## 🌟 Key Capabilities & Features

1. **Live Dynamic Cloud Database & Real-Time Sync**:
   - Built-in live Express daemon with atomic JSON persistence (`data/nexus-db.json`) and Server-Sent Events (SSE) for multi-device real-time sync.
   - Plug-and-play cloud adapters for **Google Firebase Firestore** and **Supabase (PostgreSQL)** directly from the Settings tab.
   - Offline-first cache with automatic background sync when reconnected.

2. **Student Lifecycle Management**:
   - **Student Registration**: Capture student details, guardian info, phone numbers, email, and webcam/uploaded photos.
   - **Admission & Course Enrollment**: Enroll students into active classes, set monthly tuition fees, calculate previous dues and advance payments, and generate printable receipts instantly.
   - **Student Directory**: High-speed live search by name, ID, father name, or class. Quick edit modal, deletion safeguards, and receipt reprinting.

3. **Academic Records & Attendance Automation**:
   - **Biometric Attendance Integration**: Real-time fingerprint scanner integration with automated time-window verification. Scans within window marked Present; late scans marked Absent.
   - **Physical Device Sync**: 1-click push of students to physical scanner memory, template import, and "Pull New IDs From Device" to capture keypad-registered IDs (e.g. ID "1111").
   - **Multi-Day Editable Excel Export**: Professional `.xlsx` export with daily class blocks, timing headers, and 3-row spacer gaps.
   - **Class Management**: Create, edit, and categorize courses (English, Computer, Tuition) with teacher names, timings, duration, and fee structure.
   - **Daily Attendance**: Mark Present, Absent, or Leave with batch "Mark All" controls and calendar date picker. Non-scanned students automatically default to Absent.
   - **Test Marks & Performance**: Record test scores with custom total marks and passing thresholds. Auto-calculates percentages and pass/fail badges.
   - **Student Profile Dossier**: Comprehensive 360° student summary view with academic scores, attendance history, dues breakdown, and direct export to CSV/Excel.

4. **Finance & Dues Tracking**:
   - **Dues Management**: View all pending fees at a glance. Single-click "Pay Dues" modal with receipt issuance.
   - **Printable Thermal & A4 Invoices**: Clean, branded receipts with school header, date, itemized fees, remaining dues, and payment confirmation.

5. **Security & Customization**:
   - **Administrative PIN Protection**: Lock sensitive settings, class configs, and deletions behind a secure PIN (Default: `2026`).
   - **White-label Academy Branding**: Customize academy name, subtitle, address, logo, currency (`PKR`, `USD`, `EUR`, `INR`, etc.), and background theme.
   - **Full Data Backup & Restore**: One-click JSON backup export and restore directly in the UI.

---

## 🚀 Quick Start (Local & Export)

### Method 1: Windows 1-Click Game-Style Launcher (Recommended for Windows)
1. Double-click **`RUN-NEXUS-ACADEMY.bat`** in the project folder.
2. The arcade-style PowerShell wizard (`SETUP-INSTALLER.ps1`) will verify Node.js, install dependencies, compile the production build, and launch the server on `http://localhost:3000`.

### Method 2: Standard Terminal / macOS / Linux
Ensure [Node.js](https://nodejs.org/) (version 18 or higher) is installed on your system.

```bash
# 1. Install dependencies
npm install

# 2. Run development server (Express + Vite with SSE live reload)
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 📦 Production Build & Self-Hosting

To compile a standalone, high-performance production build:

```bash
# Compile client assets and bundle the backend
npm run build

# Start the standalone server
npm start
```
The server binds to `http://0.0.0.0:3000` and is ready for production traffic behind Nginx or any reverse proxy.

---

## ☁️ Cloud Database Setup (Firebase & Supabase)

Nexus Academy works out of the box with zero external configuration using its built-in database. To sync with a remote cloud database:

### Google Firebase Firestore:
1. Open the [Firebase Console](https://console.firebase.google.com/) and create a project.
2. In **Firestore Database**, create a database in test mode.
3. In **Project Settings** > **General**, register a web app and copy your `projectId` and `apiKey`.
4. In Nexus Academy, navigate to **Settings** > **Cloud Database Sync**, select **Firebase Firestore**, enter your keys, and click **Save Settings**.

### Supabase (PostgreSQL):
1. Open [Supabase](https://supabase.com/) and create a new project.
2. Open the **SQL Editor** in Supabase and run:
   ```sql
   CREATE TABLE IF NOT EXISTS public.nexus_state (
     id TEXT PRIMARY KEY,
     payload JSONB NOT NULL,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   ALTER TABLE public.nexus_state ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Allow anon access" ON public.nexus_state FOR ALL TO anon USING (true) WITH CHECK (true);
   ```
3. Copy your project **URL** and **anon public key** from Project Settings > API.
4. In Nexus Academy, go to **Settings** > **Cloud Database Sync**, choose **Supabase**, and click **Save Settings**.

For full instructions, view the in-app **Deployment Guide** tab or refer to `DEPLOYMENT-GUIDE.md`.

---

## 🔑 Default Credentials

- **Default Admin PIN**: `2026`
- *To change*: Go to **Settings** > **Admin Security PIN**, unlock with `2026`, and set your custom PIN.

---

## 📂 Project Architecture

```text
├── data/                      # Local JSON database storage
│   └── nexus-db.json          # Persisted state file
├── public/                    # Static assets & academy logos
│   └── nexus-logo.svg
├── src/
│   ├── components/            # View and modal components
│   │   ├── AddFeeModal.tsx
│   │   ├── AdmissionView.tsx
│   │   ├── AppsView.tsx
│   │   ├── AttendanceView.tsx
│   │   ├── AuthModal.tsx
│   │   ├── ClassesView.tsx
│   │   ├── DashboardView.tsx
│   │   ├── DeploymentGuideModal.tsx
│   │   ├── DirectoryView.tsx
│   │   ├── DuesView.tsx
│   │   ├── EditStudentModal.tsx
│   │   ├── Navbar.tsx
│   │   ├── ReceiptModal.tsx
│   │   ├── RegistrationView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── StudentInfoView.tsx
│   │   └── TestMarksView.tsx
│   ├── server/                # Express backend & database engine
│   │   ├── api.ts             # REST endpoints & SSE streams
│   │   └── db.ts              # Storage manager & broadcast bus
│   ├── services/
│   │   └── cloudSync.ts       # Frontend cloud synchronization service
│   ├── App.tsx                # Main controller & state router
│   ├── main.tsx               # Client entry point
│   └── types.ts               # Shared TypeScript models
├── DEPLOYMENT-GUIDE.md        # Comprehensive cloud setup documentation
├── RUN-NEXUS-ACADEMY.bat      # Windows 1-click launcher
├── SETUP-INSTALLER.ps1        # Interactive game-style setup script
├── package.json               # Scripts & dependencies
├── server.ts                  # Root server entry point
├── tsconfig.json              # TypeScript configuration
└── vite.config.ts             # Vite configuration
```

---

## 📜 License
Private and proprietary. Designed for Nexus Academy and educational institutions.
