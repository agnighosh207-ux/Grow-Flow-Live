import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useSession } from "@clerk/react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type SubscriptionPlan = "free" | "trial" | "active" | "blocked";
export type PlanType = "free" | "starter" | "creator" | "infinity";

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  planType: PlanType;
  canGenerate: boolean;
  generationsUsed: number;
  monthlyGenerationsUsed: number;
  generationLimit: number | null;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  planExpiry: string | null;
  subscriptionStatus: string;
  razorpaySubscriptionId: string | null;
}

async function fetchWithAuth(url: string, token: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export function useSubscriptionStatus() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery<SubscriptionStatus>({
    queryKey: ["subscription-status"],
    enabled: !!isSignedIn,
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return fetchWithAuth(`${BASE}/api/subscription/status`, token);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useBetaActivate() {
  const { getToken } = useAuth();
  const { session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { planType: "starter" | "creator" | "infinity" }) => {

      // Get token
      const token = await getToken();

      if (!token) {
        throw new Error("Authentication required - please sign in");
      }

      // Make request
      const response = await fetchWithAuth(`${BASE}/api/subscription/activate-beta`, token, {
        method: "POST",
        body: JSON.stringify(params),
      });

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    },
    onError: (error: any) => {
      console.error("[useBetaActivate] Error:", error?.message || error);
    },
  });
}

export function useCreateSubscription() {
  const { getToken } = useAuth();
  return useMutation({
    mutationFn: async (params: { planType: "starter" | "creator" | "infinity", couponCode?: string }) => {
      const token = await getToken();
      return fetchWithAuth(`${BASE}/api/subscription/create`, token!, {
        method: "POST",
        body: JSON.stringify(params),
      });
    },
  });
}

export function useValidateCoupon() {
  const { getToken } = useAuth();
  return useMutation({
    mutationFn: async (code: string) => {
      const token = await getToken();
      return fetchWithAuth(`${BASE}/api/subscription/validate-coupon?code=${code}`, token!);
    },
  });
}

export function useVerifySubscription() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      razorpay_payment_id: string;
      razorpay_subscription_id: string;
      razorpay_signature: string;
      planType: "starter" | "creator" | "infinity";
    }) => {
      const token = await getToken();
      return fetchWithAuth(`${BASE}/api/subscription/verify`, token!, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    },
  });
}

export function useCancelSubscription() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return fetchWithAuth(`${BASE}/api/subscription/cancel`, token!, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    },
  });
}

export function useRetrySubscription() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return fetchWithAuth(`${BASE}/api/subscription/retry`, token!, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    },
  });
}

export function useActivateBetaPlan() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { planType: "starter" | "creator" | "infinity" }) => {
      const token = await getToken();
      return fetchWithAuth(`${BASE}/api/subscription/activate-beta`, token!, {
        method: "POST",
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    },
  });
}

export function useCreateTipOrder() {
  const { getToken } = useAuth();
  return useMutation({
    mutationFn: async (params: { amount: 4900 | 9900 }) => {
      const token = await getToken();
      return fetchWithAuth(`${BASE}/api/payment/tip/create`, token!, {
        method: "POST",
        body: JSON.stringify(params),
      });
    },
  });
}

export function useVerifyTipOrder() {
  const { getToken } = useAuth();
  return useMutation({
    mutationFn: async (data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      amount?: number;
    }) => {
      const token = await getToken();
      return fetchWithAuth(`${BASE}/api/payment/tip/verify`, token!, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  });
}
