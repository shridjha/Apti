import React, { useState, useEffect, useCallback } from 'react';
import posthog from 'posthog-js';

/**
 * PWA Install Banner — ihatepdf.cv-style smart app banner.
 *
 * Shows a slim dark banner at the very top of the viewport when the browser
 * fires `beforeinstallprompt`, meaning the app meets PWA install criteria.
 *
 * Auto-hides when:
 *  - The app is already installed (standalone display-mode)
 *  - The user dismissed it within the last 7 days
 *  - The user successfully installs the app
 */

const DISMISS_KEY = 'pwa-banner-dismissed';
const DISMISS_DAYS = 7;

function isDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Listen for the browser's install prompt
  useEffect(() => {
    // Don't show if already installed or recently dismissed
    if (isStandalone() || isDismissed()) return;

    const handler = (e) => {
      e.preventDefault(); // Prevent Chrome's default mini-infobar
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also listen for successful install
    const installedHandler = () => {
      setVisible(false);
      setDeferredPrompt(null);
      posthog.capture('pwa_installed');
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    posthog.capture('pwa_install_clicked');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      posthog.capture('pwa_install_accepted');
    } else {
      posthog.capture('pwa_install_dismissed');
    }
    setDeferredPrompt(null);
    setVisible(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    posthog.capture('pwa_banner_dismissed');
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch { /* ignore */ }
    // Wait for slide-up animation to finish
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, 300);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        width: '100%',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        animation: exiting ? 'pwa-slide-up 0.3s ease forwards' : 'pwa-slide-down 0.35s ease',
      }}
    >
      {/* Inline keyframes — no external CSS needed */}
      <style>{`
        @keyframes pwa-slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes pwa-slide-up {
          from { transform: translateY(0);     opacity: 1; }
          to   { transform: translateY(-100%); opacity: 0; }
        }
      `}</style>

      <div
        style={{
          maxWidth: 600,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
        }}
      >
        {/* App Icon */}
        <img
          src="/favicon.png"
          alt="Apti"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            flexShrink: 0,
          }}
        />

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            Install Apti
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 12,
              fontWeight: 500,
              lineHeight: 1.3,
              marginTop: 1,
            }}
          >
            Practice offline, anytime
          </div>
        </div>

        {/* Install Button */}
        <button
          onClick={handleInstall}
          style={{
            background: '#FD6E20',
            color: '#fff',
            border: 'none',
            borderRadius: 20,
            padding: '7px 18px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 0.2s, transform 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#e85d04'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#FD6E20'; }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          Install
        </button>

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install banner"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            padding: 4,
            fontSize: 18,
            lineHeight: 1,
            flexShrink: 0,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
