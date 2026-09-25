import React, { useState, useEffect } from 'react';
import { Download, Share2, Smartphone, Monitor, CheckCircle, AlertCircle, Sparkles, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Check if already installed / running in standalone mode
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');

      setIsInstalled(isStandalone);

      // Detect iOS devices (iPhone, iPad, iPod)
      const ua = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !('MSStream' in window);
      setIsIOS(isIOSDevice);

      // Listen for Chromium beforeinstallprompt event
      const handleBeforeInstallPrompt = (e: Event) => {
        // Prevent default browser mini-infobar
        e.preventDefault();
        // Stash event so it can be triggered seamlessly on user interaction
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };

      // Listen for app installed event
      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 5000);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setInstallSuccess(true);
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Fallback instructions for browsers without direct programmatic prompt
      alert('To install this app on your device:\n• On Chrome/Edge: Click the install icon in the address bar or tap ⋮ Menu > "Install App" / "Add to Home screen".\n• On Mobile: Tap browser menu > "Add to Home screen".');
    }
  };

  // If already running in standalone mode and no success banner, hide
  if (isInstalled && !installSuccess) {
    return null;
  }

  // If dismissed during this session
  if (dismissed && !showIOSModal) {
    return null;
  }

  return (
    <>
      {/* Seamless Installation Banner across Mobile and Desktop */}
      <div className="no-print bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-b border-indigo-700/50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4 text-blue-300 animate-bounce" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                Install Nexus Academy App
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  PWA Ready
                </span>
              </p>
              <p className="text-[11px] text-blue-200/80">
                Install on your phone or desktop for instant full-screen access, faster performance &amp; offline cache.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="h-8 px-3.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm inline-flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isIOS ? 'Install on iPhone' : 'Install App Now'}</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1.5 text-blue-300 hover:text-white rounded-md transition cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Guided Installation Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" /> Install on iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <p className="font-medium text-slate-900">
                Apple iOS Safari requires adding to home screen through the share menu:
              </p>
              <ol className="space-y-3 list-decimal list-inside bg-slate-50 p-3 rounded-xl border border-slate-200">
                <li>
                  Tap the <strong className="text-blue-600 font-semibold">Share</strong> button (box with an upward arrow) in the Safari navigation bar.
                </li>
                <li>
                  Scroll down the options list and tap <strong className="text-slate-900 font-semibold">"Add to Home Screen"</strong>.
                </li>
                <li>
                  Tap <strong className="text-blue-600 font-semibold">"Add"</strong> in the top right corner.
                </li>
              </ol>
              <p className="text-[11px] text-slate-500">
                Nexus Academy will be added as a standalone mobile application on your home screen with the official academy logo!
              </p>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
