import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ReferralInfo {
  referralCode: string;
  shareableLink: string;
  successfulReferrals: number;
  totalBonusDays: number;
  hasNewReward: boolean;
  hasSeenReferralPopup: boolean;
}

import { useAuth } from "@clerk/react";

export function useReferralInfo() {
  const { getToken } = useAuth();
  return useQuery<ReferralInfo>({
    queryKey: ["referral-info"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/referral/info", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch referral info");
      const data = await res.json();
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

export function useMarkReferralPopupSeen() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/referral/popup-seen", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
      });
      if (!res.ok) throw new Error("Failed to mark popup as seen");
      return res.json();
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
      const res = await fetch("/api/referral/claim", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error("Failed to apply referral code");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referral-info"] });
    },
  });
}
