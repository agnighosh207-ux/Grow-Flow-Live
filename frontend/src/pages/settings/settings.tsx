import { useState, useEffect, useMemo } from "react";
import { useUser, useClerk, useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionStatus, useRetrySubscription } from "@/hooks/useSubscription";
import { useReferralInfo } from "@/hooks/useReferral";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { AvatarPicker } from "@/components/shared/AvatarPicker";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import {
  Settings, User, CreditCard, Bell, AlertTriangle,
  Loader2, Crown, Zap, Shield, Mail,
  Trash2, X, RefreshCcw, Gift, Copy, Check, Users, Sliders, Camera, Trophy, Download, History
} from "lucide-react";
import { format } from "date-fns";

interface NotificationPrefs {
  emailNotifications: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
  emailReports: boolean;
  streakReminders: boolean;
}

interface ContentPrefs {
  niche: string;
  tonePreference: string;
  platformPreference: string;
  languagePreference: string;
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
        ${checked ? "bg-cyan-600" : "bg-white/15"}
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
              <p className="text-red-400/80 text-xs mt-0.5">7-day grace period before permanent removal</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-white/60 text-sm">
          <p>This will schedule your account for deletion. During the next 7 days:</p>
          <ul className="space-y-1 ml-3">
            {["Your subscription will be canceled", "You can cancel deletion any time", "After 7 days, all data will be permanently purged"].map(item => (
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Schedule Deletion"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Tab Management
  const queryParams = new URLSearchParams(window.location.search);
  const initialTab = queryParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [window.location.search]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url.toString());
  };

  const { data: sub, refetch: refetchSub } = useSubscriptionStatus();
  const { data: referral } = useReferralInfo();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [prefs, setPrefs] = useState<NotificationPrefs>({
    emailNotifications: true,
    productUpdates: true,
    weeklyDigest: true,
    marketingEmails: false,
    emailReports: true,
    streakReminders: true,
  });
  const [browserNotifPermission, setBrowserNotifPermission] = useState<NotificationPermission>("default");
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const [contentPrefs, setContentPrefs] = useState<ContentPrefs>({
    niche: "",
    tonePreference: "",
    platformPreference: "",
    languagePreference: "English",
  });
  const [contentPrefsSaving, setContentPrefsSaving] = useState(false);
  const [contentPrefsLoaded, setContentPrefsLoaded] = useState(false);

  const [cancelLoading, setCancelLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [profile, setProfile] = useState({
    username: "",
    displayName: "",
    showOnLeaderboard: false,
    avatarUrl: "",
  });

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [scheduledDeletionAt, setScheduledDeletionAt] = useState<string | null>(null);

  const retrySub = useRetrySubscription();

  async function secureFetch(url: string, options: RequestInit = {}) {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...options.headers,
      }
    });
  }

  useEffect(() => {
    secureFetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (data.notifications) {
          setPrefs(data.notifications);
        }
        if (data.profile) {
          setProfile(data.profile);
        }
        if (data.account?.scheduledDeletionAt) {
          setScheduledDeletionAt(data.account.scheduledDeletionAt);
        }
        setPrefsLoaded(true);
      })
      .catch(() => setPrefsLoaded(true));

    secureFetch("/api/settings/preferences")
      .then(r => r.json())
      .then(data => {
        setContentPrefs({
          niche: data.niche ?? "",
          tonePreference: data.tonePreference ?? "",
          platformPreference: data.platformPreference ?? "",
          languagePreference: data.languagePreference ?? "English",
        });
        setContentPrefsLoaded(true);
      })
      .catch(() => setContentPrefsLoaded(true));

    if (typeof Notification !== "undefined") {
      setBrowserNotifPermission(Notification.permission);
    }
  }, []);

  // Debounced Username Check
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (profile.username && profile.username.length >= 3) {
        setCheckingUsername(true);
        try {
          const res = await secureFetch(`/api/settings/check-username?username=${encodeURIComponent(profile.username)}`);
          const data = await res.json();
          setUsernameAvailable(data.available);
        } finally {
          setCheckingUsername(false);
        }
      } else {
        setUsernameAvailable(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [profile.username]);

  async function saveContentPrefs() {
    setContentPrefsSaving(true);
    try {
      const res = await secureFetch("/api/settings/preferences", {
        method: "PATCH",
        body: JSON.stringify({
          niche: contentPrefs.niche || null,
          tonePreference: contentPrefs.tonePreference || null,
          platformPreference: contentPrefs.platformPreference || null,
          languagePreference: contentPrefs.languagePreference || "English",
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

  async function updatePref(key: keyof NotificationPrefs, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setPrefsSaving(true);
    try {
      await secureFetch("/api/settings/notifications", {
        method: "PATCH",
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
      const res = await secureFetch("/api/subscription/cancel", { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to cancel with payment provider");
      }
      toast({ title: "Subscription cancelled", description: "Access continues until end of billing period." });
      refetchSub();
    } catch (e: any) {
      toast({ 
        variant: "destructive", 
        title: "Cancellation failed", 
        description: e.message || "Please try again or contact support." 
      });
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      const res = await secureFetch("/api/settings/account", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      
      setScheduledDeletionAt(data.scheduledDeletionAt);
      toast({ title: "Account deletion scheduled", description: "You have 7 days to cancel this action." });
      refetchSub();
    } catch {
      toast({ variant: "destructive", title: "Failed to schedule deletion", description: "Please contact support." });
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  }

  async function cancelDeletion() {
    try {
      const res = await secureFetch("/api/settings/cancel-deletion", { method: "POST" });
      if (!res.ok) throw new Error();
      setScheduledDeletionAt(null);
      toast({ title: "Deletion cancelled", description: "Your account is safe." });
      refetchSub();
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to cancel deletion." });
    }
  }

  async function handleExportData() {
    setExportLoading(true);
    try {
      const res = await secureFetch("/api/settings/export");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `growflow-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast({ title: "Data export started", description: "Your JSON file is downloading." });
    } catch {
      toast({ variant: "destructive", title: "Export failed", description: "Please try again later." });
    } finally {
      setExportLoading(false);
    }
  }

  async function saveProfile() {
    if (usernameAvailable === false) {
        toast({ variant: "destructive", title: "Username taken", description: "Please choose another one." });
        return;
    }
    setProfileSaving(true);
    try {
      const res = await secureFetch("/api/settings/profile", {
        method: "PATCH",
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update profile");
      }
      toast({ title: "Profile updated!", description: "Your changes are now live." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error updating profile", description: e.message });
    } finally {
      setProfileSaving(false);
    }
  }

  async function requestBrowserNotif() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setBrowserNotifPermission(result);
    if (result === "granted") {
      toast({ title: "Notifications on!", description: "We'll ping you for trial alerts and weekly wins." });
    }
  }

  const planConfig = {
    free: { label: "Free", color: "text-white/50", bg: "bg-white/5 border-white/10", icon: <User className="w-3.5 h-3.5" /> },
    trial: { label: "Trial", color: "text-cyan-300", bg: "bg-cyan-500/10 border-cyan-500/20", icon: <Zap className="w-3.5 h-3.5" /> },
    active: { label: "Pro", color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20", icon: <Crown className="w-3.5 h-3.5" /> },
    blocked: { label: "Expired", color: "text-red-300", bg: "bg-red-500/10 border-red-500/20", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  };
  const plan = planConfig[sub?.plan as keyof typeof planConfig] ?? planConfig.free;

  const memberSince = user?.createdAt ? format(new Date(user.createdAt), "MMMM yyyy") : null;

  return (
    <div className="space-y-6 pb-16 max-w-2xl mx-auto px-4 sm:px-0">
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1.5 flex items-center gap-3">
            <Settings className="w-7 h-7 text-white/60" />
            Settings
          </h1>
          <p className="text-white/40 text-sm">Manage your account and preferences.</p>
        </div>
        <Button 
          onClick={handleExportData} 
          disabled={exportLoading}
          variant="outline" 
          className="rounded-xl border-white/10 text-white/60 hover:text-white"
        >
          {exportLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
          Export Data
        </Button>
      </div>

      {scheduledDeletionAt && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <History className="w-5 h-5 text-red-400" />
            <p className="text-sm text-white/80">
              Account scheduled for deletion on <span className="font-bold text-red-400">{format(new Date(scheduledDeletionAt), "MMM d, yyyy")}</span>
            </p>
          </div>
          <Button size="sm" onClick={cancelDeletion} className="bg-red-600 hover:bg-red-500 text-white rounded-lg">
            Cancel Deletion
          </Button>
        </div>
      )}

      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 overflow-x-auto">
        {[
          { id: "profile", label: "Profile", icon: Users },
          { id: "account", label: "Account", icon: Settings },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "billing", label: "Billing", icon: CreditCard },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
              activeTab === tab.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-cyan-400" : "text-white/20"}`} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {activeTab === "profile" && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                <h2 className="text-white/80 font-semibold text-sm mb-4">Public Profile</h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-white/60 text-xs font-medium">Username</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={profile.username}
                        onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                        className={`w-full bg-black/20 border ${usernameAvailable === false ? 'border-red-500/50' : usernameAvailable === true ? 'border-emerald-500/50' : 'border-white/10'} rounded-xl px-3 py-2.5 text-white text-sm font-mono`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingUsername ? <Loader2 className="w-4 h-4 animate-spin text-white/20" /> : usernameAvailable === true ? <Check className="w-4 h-4 text-emerald-500" /> : usernameAvailable === false ? <X className="w-4 h-4 text-red-500" /> : null}
                      </div>
                    </div>
                    {usernameAvailable === false && <p className="text-[10px] text-red-400">Username already taken</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-white/60 text-xs font-medium">Display Name</label>
                    <input
                      type="text"
                      value={profile.displayName}
                      onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
                    />
                  </div>
                  <Button onClick={saveProfile} disabled={profileSaving} className="w-full bg-white text-black font-bold rounded-xl">
                    {profileSaving ? "Saving..." : "Update Profile"}
                  </Button>
                </div>
              </section>

              <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                <h2 className="text-white/80 font-semibold text-sm mb-4">Default Style</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-white/60 text-xs font-medium">Your Niche</label>
                      <input 
                        value={contentPrefs.niche} 
                        onChange={e => setContentPrefs({ ...contentPrefs, niche: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-white/60 text-xs font-medium">Default Tone</label>
                      <select 
                        value={contentPrefs.tonePreference} 
                        onChange={e => setContentPrefs({ ...contentPrefs, tonePreference: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm appearance-none"
                      >
                        {TONE_OPTIONS.map(o => <option key={o} value={o}>{o || "Neutral"}</option>)}
                      </select>
                    </div>
                  </div>
                  <Button onClick={saveContentPrefs} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl">Save Preferences</Button>
                </div>
              </section>
            </div>
          )}

          {activeTab === "notifications" && (
            <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-6">
              {[
                { key: "emailReports" as const, label: "Weekly Growth Report", desc: "Get a summary of your reach and engagement wins every Monday." },
                { key: "streakReminders" as const, label: "Streak Reminders", desc: "Don't lose your consistency. We'll nudge you if you haven't posted." },
                { key: "productUpdates" as const, label: "Product Updates", desc: "New tools and feature improvements." },
                { key: "emailNotifications" as const, label: "Security & Billing", desc: "Receipts and login alerts (Recommended)." },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white font-medium text-sm">{label}</p>
                    <p className="text-white/30 text-xs mt-0.5">{desc}</p>
                  </div>
                  <ToggleSwitch checked={prefs[key]} onChange={(v) => updatePref(key, v)} />
                </div>
              ))}
            </section>
          )}

          {activeTab === "account" && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-red-500/15 bg-red-500/[0.02] p-5">
                <h2 className="text-red-400/80 font-semibold text-sm mb-4">Danger Zone</h2>
                <div className="flex items-center justify-between">
                  <p className="text-white/40 text-xs max-w-[250px]">Once deleted, your content history and sub data will be purged after 7 days.</p>
                  <Button variant="ghost" onClick={() => setShowDeleteModal(true)} className="text-red-400 hover:bg-red-500/10 border border-red-500/20">
                    Delete Account
                  </Button>
                </div>
              </section>
            </div>
          )}

          {activeTab === "billing" && (
            <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-4">
              <div className={`flex items-center gap-3 rounded-xl border ${plan.bg} px-4 py-3`}>
                {plan.icon}
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${plan.color}`}>{plan.label} Plan</p>
                  <p className="text-white/30 text-xs mt-0.5">
                    {sub?.plan === "free" ? `${sub.generationsUsed}/${sub.generationLimit} credits used` : "Subscription active"}
                  </p>
                </div>
                <Button size="sm" onClick={() => navigate("/pricing")} className="bg-white/10 hover:bg-white/20 text-white border-white/10">Manage</Button>
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
