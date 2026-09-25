import React, { useState } from 'react';
import { BookOpen, Terminal, Flame, Database, Globe, Copy, Check } from 'lucide-react';

interface DeploymentGuideModalProps {
  onClose?: () => void;
  isView?: boolean;
}

export const DeploymentGuideModal: React.FC<DeploymentGuideModalProps> = ({
  onClose,
  isView = false,
}) => {
  const [activeSection, setActiveSection] = useState<'powershell' | 'firebase' | 'supabase' | 'hosting'>('powershell');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const content = (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" /> Nexus Academy Cloud Deployment &amp; Database Guide
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete walkthrough for running the PowerShell game-type installer, integrating Firebase Firestore, or Supabase.
          </p>
        </div>
        {onClose && !isView && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
          >
            Close Guide
          </button>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSection('powershell')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
            activeSection === 'powershell'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Terminal className="w-4 h-4" /> 1. PowerShell Game Launcher
        </button>

        <button
          onClick={() => setActiveSection('firebase')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
            activeSection === 'firebase'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Flame className="w-4 h-4" /> 2. Firebase Firestore
        </button>

        <button
          onClick={() => setActiveSection('supabase')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
            activeSection === 'supabase'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" /> 3. Supabase Database
        </button>

        <button
          onClick={() => setActiveSection('hosting')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
            activeSection === 'hosting'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Globe className="w-4 h-4" /> 4. Worldwide Production Hosting
        </button>
      </div>

      {/* SECTION 1: POWERSHELL SETUP */}
      {activeSection === 'powershell' && (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed animate-in fade-in duration-150">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-600" /> Running the Game-Type PowerShell Setup Wizard
          </h3>
          <p>
            Nexus Academy features an arcade-styled interactive PowerShell setup script (<code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">SETUP-INSTALLER.ps1</code>) and Windows quick launcher (<code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">RUN-NEXUS-ACADEMY.bat</code>).
          </p>

          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs space-y-2 relative">
            <div className="text-slate-400"># Option A: Double click on Windows</div>
            <div className="text-emerald-400 font-bold">RUN-NEXUS-ACADEMY.bat</div>
            <div className="text-slate-400 mt-2"># Option B: Run via PowerShell directly</div>
            <div className="text-emerald-400 font-bold">powershell -ExecutionPolicy Bypass -File .\SETUP-INSTALLER.ps1</div>
            <button
              onClick={() => copyToClipboard('powershell -ExecutionPolicy Bypass -File .\\SETUP-INSTALLER.ps1', 'ps1')}
              className="absolute top-3 right-3 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Copy Command"
            >
              {copiedCode === 'ps1' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900">What the Game Setup Script Does:</h4>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Scans your system for Node.js LTS and auto-installs via winget if missing.</li>
              <li>Installs all required dependencies and builds production assets.</li>
              <li>Provides an interactive game-style Quest Menu with animated progress bars &amp; audio alerts.</li>
              <li>Launches the live server daemon on Port 3000 and opens your default browser automatically.</li>
              <li>Allows exporting/importing system backups and running diagnostics.</li>
            </ul>
          </div>
        </div>
      )}

      {/* SECTION 2: FIREBASE FIRESTORE */}
      {activeSection === 'firebase' && (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed animate-in fade-in duration-150">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" /> Integrating Google Firebase Firestore
          </h3>
          <p>
            Connect Nexus Academy directly to Firebase Firestore for real-time NoSQL document storage across web and mobile browsers.
          </p>

          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <strong>Create a Firebase Project:</strong> Visit{' '}
              <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline">
                Firebase Console
              </a>{' '}
              and click <em>Add Project</em> (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded">nexus-academy</code>).
            </li>
            <li>
              <strong>Enable Cloud Firestore:</strong> In the sidebar under <strong>Build</strong>, select <strong>Firestore Database</strong> &gt; <strong>Create Database</strong>. Choose your nearest region (e.g. Asia, Europe, or US).
            </li>
            <li>
              <strong>Configure Security Rules:</strong> Under Firestore &gt; <strong>Rules</strong>, apply the following rule:
              <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-xs my-2 relative">
                <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /nexus_academy/{document=**} {
      allow read, write: if true;
    }
  }
}`}</pre>
                <button
                  onClick={() =>
                    copyToClipboard(
                      "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /nexus_academy/{document=**} {\n      allow read, write: if true;\n    }\n  }\n}",
                      'fbrules'
                    )
                  }
                  className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {copiedCode === 'fbrules' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </li>
            <li>
              <strong>Copy Web Credentials:</strong> In Project Settings &gt; General &gt; Your Apps, register a Web App and copy the <code className="bg-slate-100 px-1 py-0.5 rounded">projectId</code> and <code className="bg-slate-100 px-1 py-0.5 rounded">apiKey</code>.
            </li>
            <li>
              <strong>Enter in Settings:</strong> In the Nexus Academy app, go to the <strong>Settings</strong> tab, select <strong>Firebase Firestore</strong>, paste your credentials, and click <strong>Test Cloud Connection</strong>!
            </li>
          </ol>
        </div>
      )}

      {/* SECTION 3: SUPABASE */}
      {activeSection === 'supabase' && (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed animate-in fade-in duration-150">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" /> Integrating Supabase (PostgreSQL)
          </h3>
          <p>
            Connect Nexus Academy to Supabase to persist student records, attendance, and fee history in a cloud PostgreSQL database.
          </p>

          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <strong>Create a Supabase Project:</strong> Sign up at{' '}
              <a href="https://supabase.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline">
                supabase.com
              </a>{' '}
              and click <em>New Project</em>.
            </li>
            <li>
              <strong>Create Table via SQL Editor:</strong> In your Supabase project dashboard, open the <strong>SQL Editor</strong> and run:
              <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-xs my-2 relative">
                <pre>{`CREATE TABLE IF NOT EXISTS public.nexus_state (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.nexus_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon access"
ON public.nexus_state FOR ALL
TO anon USING (true) WITH CHECK (true);`}</pre>
                <button
                  onClick={() =>
                    copyToClipboard(
                      'CREATE TABLE IF NOT EXISTS public.nexus_state (\n  id TEXT PRIMARY KEY,\n  payload JSONB NOT NULL,\n  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);\n\nALTER TABLE public.nexus_state ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY "Allow anon access"\nON public.nexus_state FOR ALL\nTO anon USING (true) WITH CHECK (true);',
                      'sbsql'
                    )
                  }
                  className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {copiedCode === 'sbsql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </li>
            <li>
              <strong>Copy Project URL &amp; Anon Key:</strong> Go to <strong>Project Settings &gt; API</strong>, copy the Project URL and <code className="bg-slate-100 px-1 py-0.5 rounded">anon public</code> key.
            </li>
            <li>
              <strong>Configure in App:</strong> In Nexus Academy &gt; Settings, select <strong>Supabase</strong>, paste the credentials, and click <strong>Test Cloud Connection</strong>.
            </li>
          </ol>
        </div>
      )}

      {/* SECTION 4: PRODUCTION HOSTING */}
      {activeSection === 'hosting' && (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed animate-in fade-in duration-150">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" /> Worldwide Production Hosting
          </h3>
          <p>
            Deploy Nexus Academy so your staff, teachers, and students can access the system securely from anywhere on Earth.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <h4 className="font-bold text-slate-900">Google Cloud Run (Recommended)</h4>
              <p className="text-xs text-slate-500">
                AI Studio automatically connects to Google Cloud Run with SSL and automatic horizontal scaling. Click <strong>Deploy</strong> in the AI Studio header.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <h4 className="font-bold text-slate-900">Vercel or Netlify</h4>
              <p className="text-xs text-slate-500">
                Push your code to GitHub. Connect to Vercel/Netlify with Build Command <code className="bg-white px-1 py-0.5 rounded border border-slate-200">npm run build</code> and Output Directory <code className="bg-white px-1 py-0.5 rounded border border-slate-200">dist</code>.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <h4 className="font-bold text-slate-900">VPS / Ubuntu Server</h4>
              <p className="text-xs text-slate-500">
                Run <code className="bg-white px-1 py-0.5 rounded border border-slate-200">npm install &amp;&amp; npm run build</code> then keep alive with <code className="bg-white px-1 py-0.5 rounded border border-slate-200">pm2 start server.ts --name "nexus"</code>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isView) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="max-w-3xl w-full my-8">{content}</div>
    </div>
  );
};
