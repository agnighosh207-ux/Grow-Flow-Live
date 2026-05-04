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
    // authSyncMiddleware in backend already handles lastLoginAt and isFirstLogin.
    // This endpoint (/api/user/login) now only needs to be called if deviceId explicitly needs updating.
    // For now, we remove the automated fetch to reduce redundant backend hits.
  }, [isSignedIn, user?.id]);
}

// isFirstLogin: used for analytics to count new vs returning users in authSyncMiddleware
// Frontend onboarding uses localStorage "gf_onboarding_v1" independently
