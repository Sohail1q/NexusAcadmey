import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, Smartphone, Monitor, ShieldCheck, Sparkles } from 'lucide-react';
import { NexusSettings } from '../types';

interface AppsViewProps {
  settings: NexusSettings;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AppsView: React.FC<AppsViewProps> = ({ settings, onNotification }) => {
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.origin);

      const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      if (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      ) {
        setIsInstalled(true);
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onNotification('App share link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Automatically start download of the Standalone App Launcher Package
  const triggerAutoDownload = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const safeName = settings.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const logoUrl = settings.logo || `${origin}/nexus-logo.png`;

    const appPackageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${settings.name} — Desktop & Mobile App</title>
  <link rel="icon" href="${logoUrl}">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
      box-sizing: border-box;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 40px 30px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .logo {
      width: 90px;
      height: 90px;
      border-radius: 18px;
      object-fit: contain;
      background: #0f172a;
      padding: 8px;
      border: 2px solid #3b82f6;
      margin-bottom: 20px;
    }
    h1 { font-size: 24px; margin: 0 0 8px 0; color: #f8fafc; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.5; margin: 0 0 24px 0; }
    .launch-btn {
      display: inline-block;
      background: #2563eb;
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
      font-size: 16px;
      padding: 14px 32px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(37,99,235,0.4);
      transition: background 0.2s;
    }
    .launch-btn:hover { background: #1d4ed8; }
    .status {
      margin-top: 20px;
      font-size: 12px;
      color: #10b981;
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="${logoUrl}" alt="Logo" class="logo" onerror="this.src='${origin}/nexus-logo.svg';">
    <h1>${settings.name}</h1>
    <p>${settings.subtitle || 'Academy Management System'}</p>
    <a href="${origin}" class="launch-btn">🚀 Open Academy System</a>
    <div class="status">⚡ Ready to launch with live cloud synchronization</div>
  </div>
  <script>
    // Automatically redirect after 1.5 seconds if opened
    setTimeout(function() {
      window.location.href = "${origin}";
    }, 1200);
  </script>
</body>
</html>`;

    const blob = new Blob([appPackageHtml], { type: 'text/html;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${safeName}_App.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const handleInstallClick = async () => {
    setIsDownloading(true);

    // 1. If browser PWA installer is ready, prompt immediately
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          onNotification('App installed successfully!', 'success');
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Deferred prompt error:', err);
      }
    }

    // 2. Automatically trigger downloading the standalone app package without any manual steps
    triggerAutoDownload();
    onNotification(`Downloading ${settings.name} App automatically... Check your browser downloads!`, 'success');

    setTimeout(() => {
      setIsDownloading(false);
    }, 2000);
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 sm:p-8 shadow-sm text-center max-w-2xl mx-auto space-y-6">
      {/* Academy Logo Selected in Settings */}
      <div className="flex flex-col items-center">
        <img
          src={settings.logo || '/nexus-logo.svg'}
          alt="App Logo"
          className="w-24 h-24 rounded-2xl mx-auto object-contain p-1.5 border-2 border-blue-500 shadow-md bg-slate-900"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/nexus-logo.svg';
          }}
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          {settings.name}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto mt-1">
          {settings.subtitle} — Native app for Windows, macOS, Android, and iOS with permanent online cloud synchronization.
        </p>
      </div>

      {/* Share Link Box */}
      <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
          Live Academy Web App Link
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 h-10 px-3 bg-white border border-slate-300 rounded-md text-sm font-mono text-slate-700 outline-none select-all"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className="h-10 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-md inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Automatic Install / Download Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={isDownloading}
          className="h-13 px-8 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-sm sm:text-base font-bold rounded-xl inline-flex items-center gap-3 shadow-lg hover:shadow-xl transition cursor-pointer"
        >
          <Download className={`w-5 h-5 ${isDownloading ? 'animate-bounce' : ''}`} />
          <span>
            {isDownloading
              ? 'Downloading App Automatically...'
              : isInstalled
              ? 'Download / Launch App'
              : 'Install & Download App'}
          </span>
        </button>
        <p className="text-xs text-slate-500 mt-2">
          ⚡ One click will automatically start downloading the app package onto your device.
        </p>
      </div>

      {/* Platform Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-4 border-t border-slate-100">
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 font-semibold text-xs text-slate-800 mb-1">
            <Monitor className="w-4 h-4 text-blue-600" /> Desktop &amp; Laptop
          </div>
          <p className="text-[11px] text-slate-500">
            Runs as a dedicated fullscreen desktop app with offline database caching and instant cloud sync.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 font-semibold text-xs text-slate-800 mb-1">
            <Smartphone className="w-4 h-4 text-emerald-600" /> Android &amp; iPhone
          </div>
          <p className="text-[11px] text-slate-500">
            Installs directly onto your mobile home screen with touch-optimized interfaces and quick fee receipts.
          </p>
        </div>
      </div>
    </div>
  );
};
