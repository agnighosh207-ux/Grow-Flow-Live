import React, { useEffect, useRef } from "react";
import { useUser, useClerk } from "@clerk/react";
import { useLoginTracking } from "@/hooks/useLoginTracking";
import { useQueryClient } from "@tanstack/react-query";

export function SignedIn({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded || !isSignedIn) return null;
  return <>{children}</>;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  if (isLoaded && !isSignedIn) return <>{children}</>;
  return null;
}

export function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 90% 80% at 50% -10%, rgba(124,58,237,0.5) 0%, rgba(15,5,40,1) 55%, #080015 100%)' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-700/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/25 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-900/20 rounded-full blur-[120px]" />
      </div>
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

export function PasswordRequirements() {
  return (
    <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-950/60 backdrop-blur-sm px-4 py-3">
      <p className="text-xs font-semibold text-violet-300 mb-2">Password must include:</p>
      <ul className="space-y-1">
        {[
          "At least 8 characters",
          "One uppercase letter (A–Z)",
          "One lowercase letter (a–z)",
          "One number (0–9)",
          "One special character (e.g. @, #, $, !)",
        ].map((rule) => (
          <li key={rule} className="flex items-center gap-2 text-[11px] text-white/60">
            <span className="w-1 h-1 rounded-full bg-violet-400 shrink-0" />
            {rule}
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-white/35 mt-2">Example: <span className="text-violet-300 font-mono">MyPass@2025</span></p>
    </div>
  );
}

export function LoginTracker() {
  useLoginTracking();
  return null;
}

export function ReferralCodeCapture() {
  const { user } = useUser();
  const appliedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem("pendingReferralCode", refCode.trim().toUpperCase());
    }
  }, []);

  useEffect(() => {
    if (!user || appliedRef.current) return;
    const code = localStorage.getItem("pendingReferralCode");
    if (!code) return;
    appliedRef.current = true;
    localStorage.removeItem("pendingReferralCode");
    fetch("/api/referral/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => {});
  }, [user]);

  return null;
}

export function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}
