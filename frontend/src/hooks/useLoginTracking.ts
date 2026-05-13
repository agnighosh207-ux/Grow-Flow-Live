import { useEffect } from "react";
import { useUser } from "@clerk/react";

function getOrCreateDeviceId(): string {
  const key = "gf_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export function useLoginTracking() {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn && user?.id) {
      const email = user.primaryEmailAddress?.emailAddress;
      const name = user.fullName || undefined;
      
      // Identify user in PostHog
      import("@/lib/analytics").then(({ identify }) => {
        identify(user.id, email, {
          name,
          plan: user.publicMetadata?.planType || "free",
          deviceId: getOrCreateDeviceId()
        });
      }).catch(() => {});
    }
  }, [isSignedIn, user?.id, user?.fullName, user?.primaryEmailAddress, user?.publicMetadata]);
}

// isFirstLogin: used for analytics to count new vs returning users in authSyncMiddleware
// Frontend onboarding uses localStorage "gf_onboarding_v1" independently
