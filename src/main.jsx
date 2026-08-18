import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import posthog from 'posthog-js'
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
// Note: In the Stitch design it references Work Sans and Be Vietnam Pro
import '@fontsource/be-vietnam-pro/400.css';

// Initialize PostHog
posthog.init('phc_nCNSKomSXZQ3eEN9R2LSCtGCmrpoTMfFWND2dh27eYCV', {
  api_host: "https://t.apti.live",
  ui_host: "https://us.posthog.com",
  person_profiles: "always",
  persistence: "localStorage+cookie",
  loaded: (ph) => {
    ph.capture('app_opened');
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
