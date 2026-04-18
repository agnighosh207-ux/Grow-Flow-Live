import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ReferralInfo {
  referralCode: string;
  shareableLink: string;
  successfulReferrals: number;
  totalBonusDays: number;
  hasNewReward: boolean;
  hasSeenReferralPopup: boolean;
}

export function useReferralInfo() {
  return useQuery<ReferralInfo>({
    queryKey: ["referral-info"],
    queryFn: async () => {
      const res = await fetch("/api/referral/info");
      if (!res.ok) throw new Error("Failed to fetch referral info");
      const data = await res.json();
      const origin = window.location.origin;
      const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      data.shareableLink = `${origin}${basePath}${data.shareableLink}`;
      return data;
    },
    staleTime: 30_000,
  });
}

export function useMarkReferralPopupSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/referral/popup-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/referral/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
