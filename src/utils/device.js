export const isIOS = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
};

export const isPushSupported = () => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

export const getPushUnsupportedMessage = () => {
  if (isIOS() && !isStandalone()) {
    return "To get daily reminders on iPhone, tap the 'Share' icon at the bottom and select 'Add to Home Screen'. Then open the app from your home screen!";
  }
  return "Your browser doesn't support this 😔, use Chrome or turn off adblockers for daily reminders.";
};
