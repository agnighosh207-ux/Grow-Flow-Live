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
    if (!isSignedIn || !user) return;

    const deviceId = getOrCreateDeviceId();
    const email = user.primaryEmailAddress?.emailAddress;

    fetch("/api/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ deviceId, email }),
    }).catch(() => {});
  }, [isSignedIn, user?.id]);
}
