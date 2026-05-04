import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";

export interface ReferralInfo {
  referralCode: string;
  shareableLink: string;
  successfulReferrals: number;
  totalReferrals: number;
  totalBonusDays: number;
  totalBonusCredits: number;
  hasNewReward: boolean;
  hasSeenReferralPopup: boolean;
  hasAppliedCode: boolean;
  error?: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Hook to fetch referral information with explicit error tracking.
 */
export function useReferralInfo() {
  const { getToken, isSignedIn } = useAuth();
  
  return useQuery<ReferralInfo>({
    queryKey: ["referral-info"],
    enabled: !!isSignedIn,
    queryFn: async () => {
      try {
        const token = await getToken();
        console.log("[REFERRAL_HOOK] Fetching referral info...");
        
        const res = await fetch(`${BASE}/api/referral/info`, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`[REFERRAL_HOOK_ERROR] API returned ${res.status}: ${errorText}`);
          throw new Error(`API_${res.status}`);
        }

        const text = await res.text();
        if (!text) {
          throw new Error("Server returned an empty response.");
        }
        
        try {
          const data = JSON.parse(text);
          console.log("[REFERRAL_HOOK] Data received:", data);
          return data;
        } catch (e) {
          console.error("[REFERRAL_HOOK_PARSE_ERROR] Failed to parse JSON:", text);
          throw new Error("Invalid server response format.");
        }
      } catch (err: any) {
        console.error("[REFERRAL_HOOK_CRITICAL] Failed to fetch referral info:", err);
        throw err;
      }
    },
    staleTime: 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
  });
}

export function useMarkReferralPopupSeen() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/referral/popup-seen`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
      });
      if (!res.ok) throw new Error("Failed to mark popup as seen");
      
      const text = await res.text();
      if (!text) return { success: true }; // Allow empty successful responses
      
      try {
        return JSON.parse(text);
      } catch (e) {
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.setQueryData<ReferralInfo>(["referral-info"], (old) =>
        old ? { ...old, hasSeenReferralPopup: true } : old
      );
    },
  });
}

export function useApplyReferralCode() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  
  return useMutation({
    mutationFn: async (code: string) => {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/referral/claim`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const errText = await res.text();
        let errorMessage = "Failed to apply code";
        if (errText) {
          try {
            const errData = JSON.parse(errText);
            errorMessage = errData.error || errorMessage;
          } catch (e) {
            errorMessage = errText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }
      
      const text = await res.text();
      if (!text) return { success: true };
      
      try {
        return JSON.parse(text);
      } catch (e) {
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referral-info"] });
    },
  });
}
