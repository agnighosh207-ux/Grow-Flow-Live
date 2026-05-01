import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useSession } from "@clerk/react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type SubscriptionPlan = "free" | "trial" | "active" | "blocked" | "pending" | "past_due";
export type PlanType = "free" | "starter" | "creator" | "infinity";

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  planType: PlanType;
  canGenerate: boolean;
  generationsUsed: number;
  monthlyGenerationsUsed: number;
  generationsRemaining: number;
  generationLimit: number | null;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  planExpiry: string | null;
  subscriptionStatus: string;
  razorpaySubscriptionId: string | null;
  isAdmin: boolean;
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

  const contentType = res.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`;
    if (isJson) {
      try {
        const errData = await res.json();
        errorMessage = errData.error || errData.message || errorMessage;
      } catch (e) {
        // Fallback
      }
    } else {
      const text = await res.text();
      if (text && text.length < 150 && !text.startsWith("<")) {
        errorMessage = text;
      } else {
        errorMessage = `Server Error (${res.status})`;
      }
    }
    throw new Error(errorMessage);
  }

  if (isJson) {
    return res.json().catch(() => ({}));
  }
  return res.text();
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
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: 1000,
  });
}


export function useCreateSubscription() {
  const { getToken } = useAuth();
  return useMutation({
    mutationFn: async (params: { planType: "starter" | "creator" | "infinity", couponCode?: string, billingPeriod?: "monthly" | "yearly" }) => {
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
      couponCode?: string;
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
