import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";
import "./lib/i18n";
import { initAnalytics } from "./lib/analytics";

initAnalytics();

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
      }),
    ],
    tracesSampleRate: 1.0, 
    replaysSessionSampleRate: 0.1, 
    replaysOnErrorSampleRate: 1.0,
  });
}

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  
  const impersonatedUserId = localStorage.getItem("impersonated_user_id");
  if (impersonatedUserId) {
    config = { ...config } as RequestInit;
    config.headers = {
      ...(config?.headers || {}),
      "x-impersonate-user": impersonatedUserId
    };
  }
  
  const response = await originalFetch(resource, config);
  
  if (response.status === 503) {
    const cloned = response.clone();
    try {
      const text = await cloned.text();
      if (text) {
        const data = JSON.parse(text);
        if (data?.error?.includes("Maintenance")) {
          window.dispatchEvent(new Event("maintenance-mode"));
        }
      }
    } catch {}
  }
  
  return response;
};

createRoot(document.getElementById("root")!).render(<App />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('[SW] Registered:', reg.scope);
    }).catch(err => {
      console.error('[SW] Registration failed:', err);
    });
  });
}
