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
      style={{ 
        background: 'radial-gradient(ellipse at 50% 0%, rgba(94,106,210,0.08) 0%, var(--bg) 60%)',
        minHeight: '100vh'
      }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-700/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'rgba(94,106,210,0.12)' }} />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px]"
          style={{ background: 'rgba(94,106,210,0.06)' }} />
      </div>
      <div className="relative z-10 w-full max-w-md px-4 sm:px-0">
        {children}
      </div>
    </div>
  );
}

export function PasswordRequirements() {
  return (
    <div className="mt-3 rounded-xl px-4 py-3"
      style={{ border: '1px solid rgba(94,106,210,0.2)', background: 'rgba(94,106,210,0.06)' }}>
      <p className="text-xs font-semibold mb-2"
        style={{ color: '#8B91E3' }}>Password must include:</p>
      <ul className="space-y-1">
        {[
          "At least 8 characters",
          "One uppercase letter (A–Z)",
          "One lowercase letter (a–z)",
          "One number (0–9)",
          "One special character (e.g. @, #, $, !)",
        ].map((rule) => (
          <li key={rule} className="flex items-center gap-2 text-[11px] text-white/60">
            <span className="w-1 h-1 rounded-full shrink-0"
              style={{ background: '#8B91E3' }} />
            {rule}
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-white/35 mt-2">Example: <span className="font-mono"
        style={{ color: '#8B91E3' }}>MyPass@2025</span></p>
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
    fetch("/api/referral/claim", {
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
