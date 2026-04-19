import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
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
      const data = await cloned.json();
      if (data?.error?.includes("Maintenance")) {
        window.dispatchEvent(new Event("maintenance-mode"));
      }
    } catch {}
  }
  
  return response;
};

createRoot(document.getElementById("root")!).render(<App />);
