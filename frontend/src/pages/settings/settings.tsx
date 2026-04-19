import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionStatus, useRetrySubscription } from "@/hooks/useSubscription";
import { useReferralInfo } from "@/hooks/useReferral";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { AvatarPicker } from "@/components/shared/AvatarPicker";
import {
  Settings, User, CreditCard, Bell, AlertTriangle,
  Loader2, Crown, Zap, Shield, Mail,
  Trash2, X, RefreshCcw, Gift, Copy, Check, Users, Sliders, Camera
} from "lucide-react";
import { format } from "date-fns";

interface NotificationPrefs {
  emailNotifications: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
}

interface ContentPrefs {
  niche: string;
  tonePreference: string;
  platformPreference: string;
}

const TONE_OPTIONS = ["", "Casual", "Professional", "Humorous", "Inspirational", "Educational"];
const PLATFORM_OPTIONS = ["", "Instagram", "YouTube", "Twitter", "LinkedIn", "All"];

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none
        ${checked ? "bg-violet-600" : "bg-white/15"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
          ${checked ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  );
}

function DeleteConfirmModal({ onConfirm, onClose, loading }: {
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [confirmText, setConfirmText] = useState("");
  const isValid = confirmText === "DELETE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/25 p-6 space-y-5"
        style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(10,4,28,0.98) 100%)" }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Delete Account</h3>
              <p className="text-red-400/80 text-xs mt-0.5">This action is permanent and irreversible</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-white/60 text-sm">
          <p>Deleting your account will permanently remove:</p>
          <ul className="space-y-1 ml-3">
            {["All generated content history", "Subscription and billing data", "Notification preferences", "Your account and profile"].map(item => (
              <li key={item} className="flex items-center gap-2 text-white/50 text-xs">
                <span className="w-1 h-1 rounded-full bg-red-400/60 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <label className="text-white/60 text-xs font-medium">
            Type <span className="text-red-400 font-mono font-semibold">DELETE</span> to confirm
          </label>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 font-mono"
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1 text-white/50 hover:text-white/80 border border-white/10 rounded-xl"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            disabled={!isValid || loading}
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete My Account"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data: sub, refetch: refetchSub } = useSubscriptionStatus();
  const { data: referral } = useReferralInfo();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  function copyToClipboard(text: string, type: "code" | "link") {
    navigator.clipboard.writeText(text).then(() => {
      if (type === "code") {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    });
  }

  const [prefs, setPrefs] = useState<NotificationPrefs>({
    emailNotifications: true,
    productUpdates: true,
    weeklyDigest: true,
    marketingEmails: false,
  });
  const [browserNotifPermission, setBrowserNotifPermission] = useState<NotificationPermission>("default");
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const [contentPrefs, setContentPrefs] = useState<ContentPrefs>({
    niche: "",
    tonePreference: "",
    platformPreference: "",
  });
  const [contentPrefsSaving, setContentPrefsSaving] = useState(false);
  const [contentPrefsLoaded, setContentPrefsLoaded] = useState(false);

  const [cancelLoading, setCancelLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const retrySub = useRetrySubscription();

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (data.notifications) {
          setPrefs(data.notifications);
        }
        setPrefsLoaded(true);
      })
      .catch(() => setPrefsLoaded(true));

    fetch("/api/settings/preferences")
      .then(r => r.json())
      .then(data => {
        setContentPrefs({
          niche: data.niche ?? "",
          tonePreference: data.tonePreference ?? "",
          platformPreference: data.platformPreference ?? "",
        });
        setContentPrefsLoaded(true);
      })
      .catch(() => setContentPrefsLoaded(true));

    if (typeof Notification !== "undefined") {
      setBrowserNotifPermission(Notification.permission);
    }
  }, []);

  async function saveContentPrefs() {
    setContentPrefsSaving(true);
    try {
      const res = await fetch("/api/settings/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: contentPrefs.niche || null,
          tonePreference: contentPrefs.tonePreference || null,
          platformPreference: contentPrefs.platformPreference || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Preferences saved!", description: "Your content style will be applied automatically." });
    } catch {
      toast({ variant: "destructive", title: "Failed to save preferences" });
    } finally {
      setContentPrefsSaving(false);
    }
  }

  async function requestBrowserNotif() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setBrowserNotifPermission(result);
    if (result === "granted") {
      toast({ title: "Notifications on!", description: "We'll ping you for trial alerts and weekly wins." });
      try {
        new Notification("You're in! 🎉", {
          body: "We'll let you know when your trial is ending and drop weekly tips your way.",
          icon: "/favicon.ico",
        });
      } catch {}
    }
  }

  async function updatePref(key: keyof NotificationPrefs, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setPrefsSaving(true);
    try {
      await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      setPrefs(prefs);
      toast({ variant: "destructive", title: "Failed to save preference" });
    } finally {
      setPrefsSaving(false);
    }
  }

  async function handleRetryPayment() {
    setRetryLoading(true);
    try {
      await retrySub.mutateAsync();
      setShowUpgradeModal(true);
    } catch {
      toast({ variant: "destructive", title: "Something went wrong", description: "Please try again or contact support." });
    } finally {
      setRetryLoading(false);
    }
  }

  async function handleCancelSubscription() {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      if (!res.ok) throw new Error();
      toast({ title: "Subscription cancelled", description: "Access continues until end of billing period." });
      refetchSub();
    } catch {
      toast({ variant: "destructive", title: "Failed to cancel subscription" });
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/settings/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await signOut();
      navigate("/");
    } catch {
      toast({ variant: "destructive", title: "Failed to delete account", description: "Please contact support." });
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  }

  const activePlanLabel = sub?.planType === "infinity" ? "Infinity" : sub?.planType === "creator" ? "Creator" : sub?.planType === "starter" ? "Starter" : "Active";
  const trialPlanLabel = sub?.planType === "infinity" ? "Infinity Trial" : sub?.planType === "creator" ? "Creator Trial" : "Starter Trial";
  const planConfig = {
    free: { label: "Free", color: "text-white/50", bg: "bg-white/5 border-white/10", icon: <User className="w-3.5 h-3.5" /> },
    trial: { label: trialPlanLabel, color: "text-violet-300", bg: "bg-violet-500/10 border-violet-500/20", icon: <Zap className="w-3.5 h-3.5" /> },
    active: { label: activePlanLabel, color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20", icon: <Crown className="w-3.5 h-3.5" /> },
    blocked: { label: "Expired", color: "text-red-300", bg: "bg-red-500/10 border-red-500/20", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  };
  const plan = planConfig[sub?.plan as keyof typeof planConfig] ?? planConfig.free;

  const memberSince = user?.createdAt ? format(new Date(user.createdAt), "MMMM yyyy") : null;

  return (
    <div className="space-y-6 pb-16 max-w-2xl mx-auto">
      {showDeleteModal && (
        <DeleteConfirmModal
          onConfirm={handleDeleteAccount}
          onClose={() => setShowDeleteModal(false)}
          loading={deleteLoading}
        />
      )}

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => { setShowUpgradeModal(false); refetchSub(); }}
        reason="blocked"
        targetPlan={(sub?.planType === "infinity" ? "infinity" : "starter") as any}
      />
      <AvatarPicker open={showAvatarPicker} onClose={() => setShowAvatarPicker(false)} />

      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-1.5 flex items-center gap-3">
          <Settings className="w-7 h-7 text-white/60" />
          Settings
        </h1>
        <p className="text-white/40 text-sm">Manage your account, subscription, and preferences.</p>
      </div>

      {/* Account Info */}
      <section className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="px-5 py-4 border-b border-white/6 flex items-center gap-2">
          <User className="w-4 h-4 text-white/40" />
          <h2 className="text-white/80 font-semibold text-sm">Account</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => setShowAvatarPicker(true)}>
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="" className="w-14 h-14 rounded-full border border-white/20 object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-lg text-white/40 font-bold">
                  {(user?.fullName || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white/80" />
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-lg">{user?.fullName || "User"}</p>
              {memberSince && <p className="text-white/50 text-xs mt-0.5">Member since {memberSince}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-black/20 border border-white/5 px-4 py-3">
              <Mail className="w-4 h-4 text-white/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white/40 text-[10px] font-medium uppercase tracking-wider">Email Address</p>
                <p className="text-white/80 text-sm truncate">{user?.primaryEmailAddress?.emailAddress ?? "—"}</p>
              </div>
              <span className="text-[10px] text-white/25 font-medium border border-white/8 rounded px-1.5 py-0.5">Managed by Clerk</span>
            </div>

            {user?.username && (
              <div className="flex items-center gap-3 rounded-xl bg-black/20 border border-white/5 px-4 py-3">
                <User className="w-4 h-4 text-white/30 shrink-0" />
                <div>
                  <p className="text-white/40 text-[10px] font-medium uppercase tracking-wider">Username</p>
                  <p className="text-white/80 text-sm">@{user.username}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {sub?.plan === "blocked" && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-500/30 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.07) 0%, rgba(10,4,28,0.95) 100%)" }}
        >
          <div className="flex items-start gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-red-300 font-semibold text-sm">Payment failed</p>
              <p className="text-white/45 text-xs mt-0.5 leading-relaxed">
                We couldn't process your payment. Update your payment method to restore full access.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleRetryPayment}
            disabled={retryLoading}
            className="bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 hover:border-red-500/50 font-semibold text-xs rounded-lg shrink-0 transition-all"
          >
            {retryLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <><RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Update payment method</>
            )}
          </Button>
        </motion.div>
      )}

      {/* Subscription */}
      <section className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="px-5 py-4 border-b border-white/6 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-white/40" />
          <h2 className="text-white/80 font-semibold text-sm">Subscription</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className={`flex items-center gap-3 rounded-xl border ${plan.bg} px-4 py-3`}>
            <span className={plan.color}>{plan.icon}</span>
            <div className="flex-1">
              <p className={`font-semibold text-sm ${plan.color}`}>{plan.label} Plan</p>
              {sub?.plan === "trial" && sub.trialDaysLeft !== null && (
                <p className="text-violet-300/60 text-xs mt-0.5">{sub.trialDaysLeft} day{sub.trialDaysLeft !== 1 ? "s" : ""} remaining in trial</p>
              )}
              {sub?.plan === "active" && (
                <p className="text-emerald-300/60 text-xs mt-0.5">Unlimited generations active</p>
              )}
              {sub?.plan === "free" && (
                <p className="text-white/40 text-xs mt-0.5">{sub.generationsUsed}/5 free generations used</p>
              )}
            </div>
            {(sub?.plan === "free" || sub?.plan === "blocked" || sub?.plan === "trial") && (
              <Button
                size="sm"
                onClick={() => navigate("/pricing")}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-xs rounded-lg shrink-0 shadow shadow-violet-900/30"
              >
                <Zap className="w-3 h-3 mr-1.5" /> Upgrade
              </Button>
            )}
          </div>

          {sub?.plan === "active" && (
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-white/60 text-sm font-medium">Cancel Subscription</p>
                <p className="text-white/35 text-xs mt-0.5">Your access continues until the end of the billing period.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={cancelLoading}
                onClick={handleCancelSubscription}
                className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-white/8 hover:border-red-500/20 text-xs rounded-lg shrink-0"
              >
                {cancelLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Cancel"}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Content Preferences */}
      <section className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-white/40" />
            <h2 className="text-white/80 font-semibold text-sm">Content Preferences</h2>
          </div>
          {contentPrefsSaving && <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin" />}
        </div>
        <div className="p-5 space-y-5">
          <p className="text-white/40 text-xs leading-relaxed">
            Set your default content style. The AI will automatically personalize generated content based on these preferences.
          </p>
          {!contentPrefsLoaded ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                  <div className="h-10 w-full bg-white/3 rounded-xl animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-white/60 text-xs font-medium">Your Niche</label>
                <input
                  type="text"
                  value={contentPrefs.niche}
                  onChange={e => setContentPrefs(p => ({ ...p, niche: e.target.value }))}
                  placeholder="e.g. Fitness, Finance, Tech, Marketing..."
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-white/60 text-xs font-medium">Default Tone</label>
                <select
                  value={contentPrefs.tonePreference}
                  onChange={e => setContentPrefs(p => ({ ...p, tonePreference: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 appearance-none"
                >
                  <option value="" className="bg-[#0f0a1e]">Select your preferred tone</option>
                  {TONE_OPTIONS.filter(t => t !== "").map(t => (
                    <option key={t} value={t} className="bg-[#0f0a1e]">{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-white/60 text-xs font-medium">Preferred Platform</label>
                <select
                  value={contentPrefs.platformPreference}
                  onChange={e => setContentPrefs(p => ({ ...p, platformPreference: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 appearance-none"
                >
                  <option value="" className="bg-[#0f0a1e]">Select your preferred platform</option>
                  {PLATFORM_OPTIONS.filter(p => p !== "").map(p => (
                    <option key={p} value={p} className="bg-[#0f0a1e]">{p}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={saveContentPrefs}
                disabled={contentPrefsSaving}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm disabled:opacity-50 transition-all"
              >
                {contentPrefsSaving ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Saving...</>
                ) : (
                  "Save Preferences"
                )}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Your Rewards / Referral Program */}
      <section className="rounded-2xl border border-violet-500/15 overflow-hidden" style={{ background: "rgba(139,92,246,0.03)" }}>
        <div className="px-5 py-4 border-b border-violet-500/10 flex items-center gap-2">
          <Gift className="w-4 h-4 text-violet-400/70" />
          <h2 className="text-white/80 font-semibold text-sm">Your Rewards</h2>
          <span className="ml-auto text-[10px] font-semibold text-violet-300 bg-violet-500/15 border border-violet-500/20 rounded-full px-2 py-0.5">+15 Days Infinity/ref</span>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-white/40 text-xs leading-relaxed">
            <span className="text-white/60">Refer a friend and both of you get 15 days of Infinity Access for free.</span>
          </p>

          {referral ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-black/20 border border-white/5 px-4 py-3 text-center">
                  <p className="text-white/35 text-[10px] font-medium uppercase tracking-wider mb-1">Total Friends Referred</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-violet-400" />
                    <p className="text-white font-bold text-lg">{referral.successfulReferrals}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-black/20 border border-white/5 px-4 py-3 text-center">
                  <p className="text-white/35 text-[10px] font-medium uppercase tracking-wider mb-1">Current Expiry Date</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-violet-400" />
                    <p className="text-white font-bold text-sm">
                      {sub?.trialDaysLeft ? `${sub.trialDaysLeft} Days Left` : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  const message = encodeURIComponent(
                    `Hey, I found this tool GrowFlow AI that turns 1 idea into multiple content posts instantly.\n\nTry it here: ${referral.shareableLink}\n\nYou also get bonus access if you join.`
                  );
                  window.open(`https://wa.me/?text=${message}`, "_blank");
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                  boxShadow: "0 4px 20px rgba(37,211,102,0.18)",
                }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.528 5.845L0 24l6.336-1.508A11.956 11.956 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.488-5.19-1.345l-.37-.22-3.803.906.92-3.717-.241-.382A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                Invite on WhatsApp
              </button>

              <div className="space-y-2">
                <p className="text-white/40 text-[10px] font-medium uppercase tracking-wider">Your Referral Code</p>
                <div className="flex items-center gap-2 rounded-xl bg-black/30 border border-violet-500/15 px-4 py-3">
                  <span className="flex-1 text-violet-300 font-mono font-bold text-base tracking-widest">{referral.referralCode}</span>
                  <button
                    onClick={() => copyToClipboard(referral.referralCode, "code")}
                    className="text-white/30 hover:text-violet-300 transition-colors p-1 rounded-lg hover:bg-violet-500/10"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-white/40 text-[10px] font-medium uppercase tracking-wider">Shareable Link</p>
                <div className="flex items-center gap-2 rounded-xl bg-black/20 border border-white/5 px-4 py-3">
                  <span className="flex-1 text-white/50 text-xs truncate font-mono">{referral.shareableLink}</span>
                  <button
                    onClick={() => copyToClipboard(referral.shareableLink, "link")}
                    className="text-white/30 hover:text-violet-300 transition-colors p-1 rounded-lg hover:bg-violet-500/10 shrink-0"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="h-16 rounded-xl bg-white/3 animate-pulse" />
              <div className="h-12 rounded-xl bg-white/3 animate-pulse" />
              <div className="h-12 rounded-xl bg-white/3 animate-pulse" />
            </div>
          )}
        </div>
      </section>

      {/* Notification Preferences */}
      <section className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-white/40" />
            <h2 className="text-white/80 font-semibold text-sm">Notifications</h2>
          </div>
          {prefsSaving && <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin" />}
        </div>
        <div className="p-5 space-y-5">
          {!prefsLoaded ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-3.5 w-32 bg-white/5 rounded animate-pulse" />
                    <div className="h-2.5 w-48 bg-white/3 rounded animate-pulse" />
                  </div>
                  <div className="w-11 h-6 bg-white/5 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Browser notification control */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/6">
                <div className="flex items-start gap-3">
                  <Bell className="w-4 h-4 mt-0.5 shrink-0 text-violet-400" />
                  <div>
                    <p className="text-white/80 text-sm font-medium">Browser Notifications</p>
                    <p className="text-white/35 text-xs mt-0.5 leading-relaxed">
                      {browserNotifPermission === "granted"
                        ? "You're all set — we'll ping you for trial alerts and important updates."
                        : browserNotifPermission === "denied"
                        ? "Blocked in your browser settings. Allow it from your browser's address bar."
                        : "Get pinged when your trial is ending, payment fails, or we drop something new."}
                    </p>
                  </div>
                </div>
                {browserNotifPermission === "granted" ? (
                  <span className="text-emerald-400 text-xs font-semibold whitespace-nowrap mt-1">Enabled ✓</span>
                ) : browserNotifPermission === "denied" ? (
                  <span className="text-white/20 text-xs whitespace-nowrap mt-1">Blocked</span>
                ) : (
                  <Button
                    size="sm"
                    onClick={requestBrowserNotif}
                    className="bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/20 hover:border-violet-500/30 text-xs h-7 px-3 rounded-lg font-medium shrink-0"
                  >
                    Enable
                  </Button>
                )}
              </div>

              {[
                {
                  key: "emailNotifications" as const,
                  label: "Account Emails",
                  desc: "Billing receipts, security alerts, and important account updates — you probably want these on.",
                  icon: Shield,
                  iconColor: "text-blue-400",
                },
                {
                  key: "weeklyDigest" as const,
                  label: "Weekly Content Digest",
                  desc: "Every Monday, a quick note on how your content's doing and a nudge to keep the momentum going.",
                  icon: Mail,
                  iconColor: "text-emerald-400",
                },
                {
                  key: "productUpdates" as const,
                  label: "Product Updates",
                  desc: "When we ship new features or improvements, we'll let you know. No fluff, just the good stuff.",
                  icon: Zap,
                  iconColor: "text-violet-400",
                },
                {
                  key: "marketingEmails" as const,
                  label: "Tips & Inspiration",
                  desc: "Occasional content creation tips, creator stories, and ideas to spark your next post.",
                  icon: Bell,
                  iconColor: "text-amber-400",
                },
              ].map(({ key, label, desc, icon: Icon, iconColor }) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
                    <div>
                      <p className="text-white/80 text-sm font-medium">{label}</p>
                      <p className="text-white/35 text-xs mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={prefs[key]}
                    onChange={(v) => updatePref(key, v)}
                    disabled={prefsSaving}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-2xl border border-red-500/15 overflow-hidden" style={{ background: "rgba(239,68,68,0.03)" }}>
        <div className="px-5 py-4 border-b border-red-500/10 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400/60" />
          <h2 className="text-red-400/80 font-semibold text-sm">Danger Zone</h2>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white/70 text-sm font-medium">Delete Account</p>
              <p className="text-white/35 text-xs mt-0.5 leading-relaxed max-w-xs">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border border-red-500/15 hover:border-red-500/30 text-xs rounded-lg shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Account
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
