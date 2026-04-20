import { useState, useEffect } from "react";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { Link } from "wouter";
import { X, AlertTriangle, Clock, CreditCard } from "lucide-react";

type BannerKind = "trial_ending" | "trial_expired" | "payment_failed";

interface Banner {
  kind: BannerKind;
  title: string;
  message: string;
  cta: string;
  href: string;
  color: string;
  borderColor: string;
  icon: typeof AlertTriangle;
}

const BANNERS: Record<BannerKind, Omit<Banner, "kind">> = {
  trial_ending: {
    title: "Your trial is almost up",
    message: "",
    cta: "Pick a plan →",
    href: "/pricing",
    color: "from-amber-500/10 to-orange-500/5",
    borderColor: "border-amber-500/25",
    icon: Clock,
  },
  trial_expired: {
    title: "Your trial ended",
    message: "Pick up where you left off — your content history is waiting.",
    cta: "Reactivate →",
    href: "/pricing",
    color: "from-red-500/12 to-rose-500/5",
    borderColor: "border-red-500/25",
    icon: AlertTriangle,
  },
  payment_failed: {
    title: "Payment didn't go through",
    message: "Update your payment method to keep creating. We'll try again soon.",
    cta: "Update payment →",
    href: "/pricing",
    color: "from-red-500/12 to-rose-500/5",
    borderColor: "border-red-500/25",
    icon: CreditCard,
  },
};

function maybeSendBrowserNotif(kind: BannerKind, trialDaysLeft?: number | null) {
  if (typeof window === "undefined") return;
  if (Notification?.permission !== "granted") return;
  const storageKey = `notif_browser_sent_${kind}`;
  if (sessionStorage.getItem(storageKey)) return;
  sessionStorage.setItem(storageKey, "1");

  const titles: Record<BannerKind, string> = {
    trial_ending: `Only ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left on your trial`,
    trial_expired: "Your Content Engine trial has ended",
    payment_failed: "Payment issue — action needed",
  };
  const bodies: Record<BannerKind, string> = {
    trial_ending: "Don't lose access. Grab a plan and keep creating.",
    trial_expired: "Your content history is still there. Pick a plan to get back in.",
    payment_failed: "We couldn't charge your card. Update your payment to continue.",
  };

  try {
    new Notification(titles[kind], {
      body: bodies[kind],
      icon: "/favicon.ico",
      tag: kind,
    });
  } catch {}
}

export function NotificationBanner() {
  const { data: sub } = useSubscriptionStatus();
  const [dismissed, setDismissed] = useState<Set<BannerKind>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = sessionStorage.getItem("dismissed_banners");
    if (saved) setDismissed(new Set(JSON.parse(saved) as BannerKind[]));
  }, []);

  if (!sub || !mounted) return null;

  const activeBanners: BannerKind[] = [];

  if (sub.plan === "trial" && sub.trialDaysLeft !== null && sub.trialDaysLeft <= 3) {
    activeBanners.push("trial_ending");
    maybeSendBrowserNotif("trial_ending", sub.trialDaysLeft);
  }
  if (sub.plan === "blocked" && sub.subscriptionStatus === "canceled") {
    activeBanners.push("trial_expired");
    maybeSendBrowserNotif("trial_expired");
  }
  if (sub.plan === "blocked" && sub.subscriptionStatus === "past_due") {
    activeBanners.push("payment_failed");
    maybeSendBrowserNotif("payment_failed");
  }

  const visible = activeBanners.filter(k => !dismissed.has(k));
  if (visible.length === 0) return null;

  function dismiss(kind: BannerKind) {
    const next = new Set(dismissed);
    next.add(kind);
    setDismissed(next);
    sessionStorage.setItem("dismissed_banners", JSON.stringify([...next]));
  }

  return (
    <div className="space-y-1.5 mb-4">
      {visible.map(kind => {
        const b = BANNERS[kind];
        const Icon = b.icon;
        const msg = kind === "trial_ending"
          ? `You've got ${sub.trialDaysLeft} day${sub.trialDaysLeft === 1 ? "" : "s"} left. No pressure — but your ideas aren't going to post themselves.`
          : b.message;

        return (
          <div
            key={kind}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-gradient-to-r ${b.color} ${b.borderColor}`}
          >
            <Icon className="w-4 h-4 text-amber-400 shrink-0" style={kind !== "trial_ending" ? { color: "#f87171" } : {}} />
            <div className="flex-1 min-w-0">
              <span className="text-white/85 text-xs font-semibold">{b.title} · </span>
              <span className="text-white/55 text-xs">{msg}</span>
            </div>
            <Link href={b.href}>
              <span className="text-cyan-400 text-xs font-semibold whitespace-nowrap hover:text-cyan-300 cursor-pointer transition-colors">
                {b.cta}
              </span>
            </Link>
            <button
              onClick={() => dismiss(kind)}
              className="text-white/20 hover:text-white/50 transition-colors ml-1 shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
