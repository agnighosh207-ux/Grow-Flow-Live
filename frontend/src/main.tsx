import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initAnalytics } from "./lib/analytics";



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

async function init() {
  initAnalytics();
  await import("./lib/i18n"); // Wait for i18n before rendering
  createRoot(document.getElementById("root")!).render(<App />);
  
  // Remove loading screen
  requestAnimationFrame(() => {
    const loader = document.getElementById('app-loading');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 300);
    }
  });
}
init();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('[SW] Registered:', reg.scope);
    }).catch(err => {
      console.error('[SW] Registration failed:', err);
    });
  });
}
