import posthog from 'posthog-js';

export const initAnalytics = () => {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;
  
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
    autocapture: true,
    capture_pageview: true,
    persistence: 'localStorage',
  });
};

export const track = (event: string, props?: Record<string, any>) => {
  try {
    posthog.capture(event, props);
  } catch (err) {
    console.error("Analytics capture failed:", err);
  }
};

export const identify = (userId: string, email?: string, props?: Record<string, any>) => {
  try {
    posthog.identify(userId, { email, ...props });
  } catch (err) {
    console.error("Analytics identify failed:", err);
  }
};
