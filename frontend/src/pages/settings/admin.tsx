import React, { useEffect, useState, useRef } from "react";
import { useUser, useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { 
  Shield, Users, Mail, Zap, Calendar, ArrowLeft, BarChart3, Presentation, Link,
  Search, Ban, Gift, RefreshCw, TrendingUp, DollarSign, Activity, AlertTriangle, 
  CheckCircle, XCircle, Eye, CreditCard, Settings2, Bell, ChevronDown
} from "lucide-react";
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell 
} from "recharts";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";

type AdminTab = "overview" | "users" | "churn" | "revenue" | "announcements" | "system";

interface AdminStats {
  totalUsers: number;
  totalEmails: number;
  totalGenerations: number;
  maintenanceMode: boolean;
  recentUsers: { id: string; email: string | null; planType: string; subscriptionStatus: string; createdAt: string; generations_count?: number }[];
  dauData?: any[];
  languageData?: any[];
  revenueData?: any[];
  topReferrers?: any[];
  generationsData?: any[];
  activeAnnouncements?: any[];
  featureUsageData?: { feature: string; count: number }[];
  couponStats?: { code: string; count: number }[];
  churnRisk?: {
    id: string;
    email: string;
    plan_type: string;
    plan_tier: string;
    days_since_login: number;
    gens_last_30_days: number;
    churn_risk: "HIGH" | "MEDIUM";
  }[];
}

interface RevenueBreakdown {
  mrr: number;
  arr: number;
  churnRate: number;
  activeSubscribers: number;
  cancelledSubscribers: number;
  byPlan: Record<string, { count: number; mrr: number }>;
}

interface SystemStatus {
  providers: { name: string; configured: boolean; model: string }[];
  nodeVersion: string;
  uptime: number;
  memoryUsageMB: number;
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none
        ${checked ? "bg-red-600" : "bg-white/15"}
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

export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [banningUserId, setBanningUserId] = useState<string | null>(null);
  const [isRunningReengagement, setIsRunningReengagement] = useState(false);

  const COLORS = ['#00F2FF', '#00D9E5', '#00BEC9', '#00A3AD', '#00848D'];

  const { data: subData, isPending: isSubPending } = useSubscriptionStatus();

  // Debounce search
  const [isDebouncing, setIsDebouncing] = useState(false);
  useEffect(() => {
    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setDebouncedSearch(userSearchQuery);
      setIsDebouncing(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  const isAdmin = subData?.isAdmin === true || user?.primaryEmailAddress?.emailAddress === "agnighosh207@gmail.com";

  useEffect(() => {
    if (!isLoaded || isSubPending) return;
    
    // BUG 9 FIX: Explicitly sync auth cache on admin load
    const syncAuth = async () => {
      try {
        const token = await getToken();
        await fetch("/api/auth/sync", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        // Invalidate sub data to reflect admin status
        queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
      } catch (err) {
        console.error("Auth sync failed", err);
      }
    };
    syncAuth();

    // Only redirect if we are SURE they aren't admin after loading
    if (!user || (!isAdmin && !isSubPending)) {
      const isActuallyAdminEmail = user?.primaryEmailAddress?.emailAddress === "agnighosh207@gmail.com";
      if (!isActuallyAdminEmail) {
        setLocation("/");
      }
    }
  }, [isLoaded, user, isSubPending, subData, isAdmin, getToken, setLocation, queryClient]);

  const { data: stats, isLoading: isStatsLoading } = useQuery<AdminStats>({
    queryKey: ["admin_stats"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!subData?.isAdmin || isAdmin,
  });

  const { data: revenue, isLoading: isRevenueLoading } = useQuery<RevenueBreakdown>({
    queryKey: ["admin_revenue"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/admin/revenue/breakdown", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch revenue");
      return res.json();
    },
    enabled: (!!subData?.isAdmin || isAdmin) && (activeTab === "revenue" || activeTab === "overview"),
  });

  const { data: systemStatus, isLoading: isSystemLoading } = useQuery<SystemStatus>({
    queryKey: ["admin_system"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/admin/system/status", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch system status");
      return res.json();
    },
    enabled: (!!subData?.isAdmin || isAdmin) && activeTab === "system",
  });

  const { data: searchResults, isFetching: isSearching } = useQuery<any[]>({
    queryKey: ["admin_users_search", debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return [];
      const token = await getToken();
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(debouncedSearch)}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: (!!subData?.isAdmin || isAdmin) && activeTab === "users" && debouncedSearch.length >= 2,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin_users_search"] });
    queryClient.invalidateQueries({ queryKey: ["admin_revenue"] });
  };

  const modifyUserMutation = useMutation({
    mutationFn: async ({ targetUserId, newPlan, newTier, newStatus }: { targetUserId: string; newPlan: string; newTier: string; newStatus?: string }) => {
      const token = await getToken();
      const res = await fetch("/api/admin/modify-user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUserId, newPlan, newTier, newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User updated!" });
      setOpenDropdownId(null);
      invalidateAll();
    }
  });

  const grantCreditsMutation = useMutation({
    mutationFn: async ({ userId, credits }: { userId: string, credits: number }) => {
      const token = await getToken();
      await fetch(`/api/admin/users/${userId}/grant-credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ credits }),
      });
    },
    onSuccess: () => {
      toast({ title: "Credits granted!" });
      invalidateAll();
    }
  });

  const resetCreditsMutation = useMutation({
    mutationFn: async (userId: string) => {
      const token = await getToken();
      await fetch(`/api/admin/users/${userId}/reset-credits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      toast({ title: "Credits reset to plan default" });
      invalidateAll();
    }
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string, reason: string }) => {
      const token = await getToken();
      await fetch(`/api/admin/users/${userId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      toast({ title: "User banned" });
      setBanningUserId(null);
      invalidateAll();
    }
  });

  const unbanUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const token = await getToken();
      await fetch(`/api/admin/users/${userId}/unban`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      toast({ title: "User unbanned" });
      invalidateAll();
    }
  });

  const toggleMaintenanceMutation = useMutation({
    mutationFn: async (mode: boolean) => {
      const token = await getToken();
      await fetch("/api/admin/settings/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ maintenanceMode: mode }),
      });
    },
    onSuccess: () => {
      toast({ title: "Maintenance mode updated" });
      invalidateAll();
    }
  });

  const toggleAnnouncementMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      const token = await getToken();
      await fetch(`/api/admin/announcement/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      toast({ title: "Announcement status toggled" });
      invalidateAll();
    }
  });

  async function impersonateUser(targetUserId: string) {
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUserId, reason: "Admin initiated view-as-user" }),
      });
      if (!res.ok) throw new Error("Failed to create impersonation session");
      const { sessionId } = await res.json();
      
      // Store session info for the custom-fetch layer
      sessionStorage.setItem("impersonation_session_id", sessionId);
      sessionStorage.setItem("impersonated_user_id", targetUserId);
      
      toast({ title: "Viewing as user", description: `Session active. Redirecting...` });
      // Redirect to home with a flag
      window.location.href = "/?impersonating=1";
    } catch (err) {
      toast({ variant: "destructive", title: "Impersonation failed" });
    }
  }

  const sendReengagementMutation = useMutation({
    mutationFn: async (userData: any) => {
      const token = await getToken();
      const res = await fetch("/api/admin/reengagement/send-personal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          userId: userData.id, 
          email: userData.email, 
          daysSinceLogin: userData.days_since_login,
          name: userData.email.split('@')[0]
        }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Re-engagement email sent!", description: "Founder outreach triggered successfully." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to send email", description: "Please check service status." });
    }
  });

  if (!isLoaded || isSubPending || (isStatsLoading && !stats)) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-screen bg-[#0b0416]">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-cyan-400 animate-pulse">Initializing Secure Admin Protocol...</p>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, color = "cyan" }: any) => (
    <div className={`bg-[#100726]/80 backdrop-blur-xl border border-${color}-500/30 p-5 rounded-2xl shadow-xl`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 bg-${color}-500/20 rounded-lg`}>
          <Icon className={`text-${color}-400 w-5 h-5`} />
        </div>
        <h3 className="text-white/60 text-sm font-medium">{label}</h3>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0416] text-white font-sans selection:bg-cyan-500/30">
      <div className="max-w-[1600px] mx-auto p-6 lg:p-10 space-y-10">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#160d2b]/50 p-6 rounded-3xl border border-white/5">
          <div className="flex items-center gap-6">
            <button onClick={() => setLocation("/")} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group">
              <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <Shield className="text-cyan-400 w-8 h-8" />
                <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                  COMMAND CENTER
                </h1>
              </div>
              <p className="text-white/40 text-sm mt-1 uppercase tracking-widest font-bold">Grow Flow AI • Admin v2.1</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${stats?.maintenanceMode ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
              <div className="text-right">
                <p className={`text-xs font-black uppercase ${stats?.maintenanceMode ? 'text-red-400' : 'text-emerald-400'}`}>
                  {stats?.maintenanceMode ? 'MAINTENANCE ACTIVE' : 'SYSTEMS ONLINE'}
                </p>
                <p className="text-[10px] text-white/40 leading-none mt-1">Global Traffic Control</p>
              </div>
              <ToggleSwitch 
                checked={stats?.maintenanceMode || false} 
                onChange={(v) => toggleMaintenanceMutation.mutate(v)}
                disabled={toggleMaintenanceMutation.isPending}
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1.5 bg-[#160d2b] rounded-2xl border border-white/5 w-fit max-w-full overflow-x-auto no-scrollbar">
          {(["overview", "users", "churn", "revenue", "announcements", "system"] as AdminTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${
                activeTab === tab 
                ? "bg-cyan-500 text-[#0b0416] shadow-[0_0_20px_rgba(6,182,212,0.4)]" 
                : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <StatCard icon={Users} label="Total Users" value={stats?.totalUsers.toLocaleString()} />
                  <StatCard icon={Mail} label="Emails" value={stats?.totalEmails.toLocaleString()} color="emerald" />
                  <StatCard icon={Zap} label="Generations" value={stats?.totalGenerations.toLocaleString()} color="amber" />
                  <StatCard icon={DollarSign} label="MRR" value={`₹${revenue?.mrr.toLocaleString() || 0}`} color="cyan" />
                  <StatCard icon={Activity} label="Active Subs" value={revenue?.activeSubscribers || 0} color="indigo" />
                  <StatCard icon={TrendingUp} label="Daily Growth" value="+12%" color="emerald" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-[#100726]/80 backdrop-blur-xl border border-white/5 p-4 sm:p-8 rounded-3xl overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-cyan-400" /> DAU (30 Days)</h3>
                    </div>
                    <div className="h-64 sm:h-72 w-full overflow-x-auto no-scrollbar">
                      <div className="h-full min-w-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats?.dauData || []}>
                            <defs>
                              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis 
                              dataKey="date" 
                              stroke="rgba(255,255,255,0.3)" 
                              fontSize={9} 
                              tickFormatter={(val) => val ? new Date(val).toLocaleDateString("en-IN", {month: "short", day: "numeric"}) : ""} 
                            />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#1a0f30', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '12px', fontSize: '10px' }} />
                            <Area type="monotone" dataKey="activeusers" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#100726]/80 backdrop-blur-xl border border-white/5 p-4 sm:p-8 rounded-3xl overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-amber-400" /> Generations (30 Days)</h3>
                    </div>
                    <div className="h-64 sm:h-72 w-full overflow-x-auto no-scrollbar">
                      <div className="h-full min-w-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats?.generationsData || []}>
                            <defs>
                              <linearGradient id="colorGens" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis 
                              dataKey="date" 
                              stroke="rgba(255,255,255,0.3)" 
                              fontSize={9} 
                              tickFormatter={(val) => val ? new Date(val).toLocaleDateString("en-IN", {month: "short", day: "numeric"}) : ""} 
                            />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#1a0f30', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', fontSize: '10px' }} />
                            <Area type="monotone" dataKey="generations" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorGens)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#100726]/80 backdrop-blur-xl border border-white/5 p-4 sm:p-8 rounded-3xl overflow-hidden">
                    <h3 className="text-lg sm:text-xl font-bold mb-8 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-400" /> Feature Performance</h3>
                    <div className="h-64 sm:h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.featureUsageData || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="feature" stroke="rgba(255,255,255,0.3)" fontSize={9} />
                          <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#1a0f30', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                          <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#100726]/80 backdrop-blur-xl border border-white/5 p-4 sm:p-8 rounded-3xl overflow-hidden">
                    <h3 className="text-lg sm:text-xl font-bold mb-8 flex items-center gap-2"><Eye className="w-5 h-5 text-pink-400" /> Content Categories</h3>
                    <div className="h-64 sm:h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats?.languageData || []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={8} dataKey="value">
                            {(stats?.languageData || []).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "users" && (
              <div className="space-y-6">
                <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-400 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search by email or exact Clerk ID..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-[#160d2b] border border-white/5 rounded-3xl pl-16 pr-8 py-5 text-lg focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-white/10"
                  />
                  {(isSearching || (isDebouncing && userSearchQuery.length >= 2)) && <div className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />}
                </div>

                <div className="bg-[#100726]/80 backdrop-blur-xl border border-white/5 rounded-3xl pb-32">
                  <div className="p-8 border-b border-white/5 bg-white/[0.02] rounded-t-3xl">
                    <h3 className="text-2xl font-black">{debouncedSearch ? `Search Results (${searchResults?.length || 0})` : "Recent Command Log (100 Users)"}</h3>
                  </div>
                  <div className="w-full">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-black border-b border-white/5">
                          <th className="px-8 py-6">User Identity</th>
                          <th className="px-8 py-6">Intelligence Tier</th>
                          <th className="px-8 py-6">Status</th>
                          <th className="px-8 py-6 text-center">Gens</th>
                          <th className="px-8 py-6">Enrolled At</th>
                          <th className="px-8 py-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(debouncedSearch ? searchResults : stats?.recentUsers)?.map((user: any) => (
                          <React.Fragment key={user.id}>
                            <tr className={`hover:bg-white/[0.03] transition-colors group ${banningUserId === user.id ? 'bg-red-500/5' : ''}`}>
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center font-black text-white/40 group-hover:text-cyan-400 group-hover:border-cyan-500/50 transition-all">
                                    {user.email ? user.email[0].toUpperCase() : "?"}
                                  </div>
                                  <div>
                                    <p className="font-bold text-white/90 group-hover:text-white transition-colors">{user.email || "System/Unknown"}</p>
                                    <p className="text-[10px] font-mono text-white/20 mt-1">{user.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  user.plan_type === 'infinity' ? 'bg-cyan-500/20 text-cyan-400' :
                                  user.plan_type === 'creator' ? 'bg-amber-500/20 text-amber-400' :
                                  user.plan_type === 'starter' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/40'
                                }`}>
                                  {user.plan_type || 'FREE'}
                                </span>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-2">
                                  <div className={`w-1.5 h-1.5 rounded-full ${user.subscription_status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/20'}`} />
                                  <span className="text-xs font-bold text-white/60 capitalize">{user.subscription_status || 'free'}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-center font-mono font-bold text-cyan-400/60">
                                {user.generations_count || 0}
                              </td>
                              <td className="px-8 py-6">
                                <p className="text-xs text-white/40">{format(new Date(user.created_at || Date.now()), "MMM d, HH:mm")}</p>
                              </td>
                              <td className="px-8 py-6 text-right relative">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)} className="p-2 bg-white/5 hover:bg-cyan-500/20 text-white/40 hover:text-cyan-400 rounded-xl transition-all">
                                    <ChevronDown className={`w-5 h-5 transition-transform ${openDropdownId === user.id ? 'rotate-180' : ''}`} />
                                  </button>
                                </div>

                                <AnimatePresence>
                                  {openDropdownId === user.id && (
                                    <motion.div 
                                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                      className="absolute right-8 top-full mt-2 w-56 bg-[#1a0f30] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100]"
                                    >
                                      <div className="p-2">
                                        <button onClick={() => impersonateUser(user.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                                          <Eye className="w-4 h-4" /> View as User
                                        </button>
                                        <div className="h-px bg-white/5 my-2" />
                                        <p className="px-4 py-1.5 text-[10px] font-black uppercase text-white/20 tracking-widest">Plan Overrides</p>
                                          {["starter", "creator", "infinity", "free"].map(p => (
                                            <button 
                                              key={p}
                                              onClick={() => modifyUserMutation.mutate({ 
                                                targetUserId: user.id, 
                                                newPlan: p, 
                                                newTier: p.toUpperCase(),
                                                newStatus: p === 'free' ? 'free' : 'active'
                                              })}
                                              className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-white/60 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all capitalize"
                                            >
                                              <Zap className="w-4 h-4" /> Set to {p}
                                            </button>
                                          ))}
                                        <div className="h-px bg-white/5 my-2" />
                                        <button onClick={() => grantCreditsMutation.mutate({ userId: user.id, credits: 50 })} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all">
                                          <Gift className="w-4 h-4" /> Grant 50 Credits
                                        </button>
                                        <button onClick={() => resetCreditsMutation.mutate(user.id)} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all">
                                          <RefreshCw className="w-4 h-4" /> Reset Credits
                                        </button>
                                        <div className="h-px bg-white/5 my-2" />
                                        {user.isBanned ? (
                                           <button onClick={() => unbanUserMutation.mutate(user.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all">
                                              <CheckCircle className="w-4 h-4" /> Unban Access
                                           </button>
                                        ) : (
                                          <button onClick={() => { setBanningUserId(user.id); setOpenDropdownId(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                                            <Ban className="w-4 h-4" /> Terminate Access
                                          </button>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </td>
                            </tr>
                            {banningUserId === user.id && (
                              <tr>
                                <td colSpan={6} className="px-8 py-6 bg-red-500/10 border-l-4 border-red-500">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <AlertTriangle className="text-red-400 w-6 h-6" />
                                      <div>
                                        <p className="font-black text-red-400 uppercase tracking-tighter">CONFIRM BAN PROTOCOL</p>
                                        <p className="text-xs text-white/60">This will immediately block all API access for {user.email}.</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-3">
                                      <button onClick={() => setBanningUserId(null)} className="px-4 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 rounded-xl transition-all">ABORT</button>
                                      <button onClick={() => banUserMutation.mutate({ userId: user.id, reason: "Manual admin ban" })} className="px-4 py-2 text-xs font-bold bg-red-500 hover:bg-red-600 rounded-xl transition-all">CONFIRM TERMINATION</button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "churn" && (
              <div className="space-y-6">
                <div className="bg-red-500/5 border border-red-500/20 p-8 rounded-[32px]">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="text-red-400 w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white">Retention Guard</h2>
                      <p className="text-white/40 text-sm">Identifying paid users at high risk of churn based on inactivity.</p>
                    </div>
                  </div>

                  <div className="bg-[#100726]/80 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-black border-b border-white/5">
                          <th className="px-8 py-6">At-Risk Creator</th>
                          <th className="px-8 py-6">Inactivity</th>
                          <th className="px-8 py-6">Usage (30d)</th>
                          <th className="px-8 py-6">Risk Level</th>
                          <th className="px-8 py-6 text-right">Intervention</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {stats?.churnRisk?.map((user: any) => (
                          <tr key={user.id} className="hover:bg-white/[0.03] transition-colors group">
                            <td className="px-8 py-6">
                              <div>
                                <p className="font-bold text-white/90">{user.email}</p>
                                <p className="text-[10px] text-white/20 mt-1 uppercase font-black">{user.plan_tier} • {user.plan_type}</p>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <p className={`text-sm font-bold ${user.days_since_login > 14 ? 'text-red-400' : 'text-amber-400'}`}>
                                {user.days_since_login} days away
                              </p>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-sm font-bold text-white/60">{user.gens_last_30_days} generations</p>
                            </td>
                            <td className="px-8 py-6">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                user.churn_risk === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {user.churn_risk} RISK
                              </span>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <Button
                                onClick={() => sendReengagementMutation.mutate(user)}
                                disabled={sendReengagementMutation.isPending}
                                className="bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-[#0b0416] border border-cyan-500/30 text-xs font-black rounded-xl h-10 px-4 transition-all"
                              >
                                {sendReengagementMutation.isPending ? "Sending..." : "Send Personal Outreach"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {(!stats?.churnRisk || stats.churnRisk.length === 0) && (
                          <tr>
                            <td colSpan={5} className="px-8 py-20 text-center">
                              <CheckCircle className="w-12 h-12 text-emerald-500/20 mx-auto mb-4" />
                              <p className="text-white/40 font-bold uppercase tracking-widest">No high-risk churners detected</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "revenue" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard icon={DollarSign} label="Monthly Revenue (MRR)" value={`₹${revenue?.mrr.toLocaleString() || 0}`} />
                  <StatCard icon={TrendingUp} label="Annual Proj. (ARR)" value={`₹${revenue?.arr.toLocaleString() || 0}`} color="indigo" />
                  <StatCard icon={Activity} label="Active Subs" value={revenue?.activeSubscribers || 0} color="emerald" />
                  <StatCard icon={AlertTriangle} label="Churn Rate" value={`${revenue?.churnRate || 0}%`} color="red" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-[#100726]/80 backdrop-blur-xl border border-white/5 p-8 rounded-3xl">
                    <h3 className="text-xl font-bold mb-8 flex items-center gap-2"><CreditCard className="w-5 h-5 text-cyan-400" /> Revenue by Plan</h3>
                    <div className="h-72 overflow-x-auto no-scrollbar">
                      <div className="h-full min-w-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats?.revenueData || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} className="capitalize" />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickFormatter={(val) => `₹${val}`} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#1a0f30', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '12px' }} />
                            <Bar dataKey="amount" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#100726]/80 backdrop-blur-xl border border-white/5 p-8 rounded-3xl">
                    <h3 className="text-xl font-bold mb-6">Churn Intelligence</h3>
                    <div className="space-y-6">
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Active Retention</span>
                          <span className="text-emerald-400 font-bold">{100 - (revenue?.churnRate || 0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${100 - (revenue?.churnRate || 0)}%` }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Cancellations</p>
                          <p className="text-2xl font-bold">{revenue?.cancelledSubscribers || 0}</p>
                        </div>
                        <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl">
                          <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">Recovered</p>
                          <p className="text-2xl font-bold">0</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-3 bg-[#100726]/80 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden">
                    <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                      <h3 className="text-xl font-bold">Plan Breakdown Matrix</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-black border-b border-white/5">
                            <th className="px-8 py-6">Tier Configuration</th>
                            <th className="px-8 py-6">Cycle</th>
                            <th className="px-8 py-6">Active Nodes</th>
                            <th className="px-8 py-6">MRR Contribution</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {Object.entries(revenue?.byPlan || {}).map(([key, data]) => {
                            const [plan, cycle] = key.split('_');
                            return (
                              <tr key={key} className="hover:bg-white/[0.03] transition-colors">
                                <td className="px-8 py-6 font-bold capitalize text-white/80">{plan}</td>
                                <td className="px-8 py-6">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${cycle === 'yearly' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-white/40'}`}>
                                    {cycle}
                                  </span>
                                </td>
                                <td className="px-8 py-6 font-mono font-bold text-emerald-400">{data.count}</td>
                                <td className="px-8 py-6 font-mono font-bold text-white">₹{Math.round(data.mrr).toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "announcements" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-[#100726]/80 backdrop-blur-xl border border-white/5 p-8 rounded-3xl">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Bell className="w-5 h-5 text-amber-400" /> New Broadcast</h3>
                    <form 
                      ref={formRef}
                      className="space-y-5"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const formData = new FormData(form);
                        try {
                          const token = await getToken();
                          const res = await fetch("/api/admin/announcement", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ 
                              message: formData.get("message"), 
                              theme: formData.get("theme"), 
                              isActive: formData.get("isActive") === "on" 
                            }),
                          });
                          if (!res.ok) throw new Error();
                          toast({ title: "Broadcast active!" });
                          form.reset();
                          invalidateAll();
                        } catch { toast({ variant: "destructive", title: "Transmission failed" }); }
                      }}
                    >
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-white/40 tracking-widest px-1">Signal Payload</label>
                        <textarea name="message" required className="w-full h-32 bg-[#160d2b] border border-white/5 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-amber-500/50 transition-all resize-none" placeholder="Alert message here..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-white/40 tracking-widest px-1">Visual Theme</label>
                          <select name="theme" className="w-full bg-[#160d2b] border border-white/5 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 appearance-none">
                            <option value="info">Information (Blue)</option>
                            <option value="success">Success (Emerald)</option>
                            <option value="warning">Critical (Amber)</option>
                            <option value="error">Emergency (Red)</option>
                          </select>
                        </div>
                        <div className="flex flex-col justify-center items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                          <label className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-2">Live Status</label>
                          <input type="checkbox" name="isActive" className="w-6 h-6 accent-amber-500" defaultChecked />
                        </div>
                      </div>
                      <button type="submit" className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-[#0b0416] font-black rounded-2xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                        DEPLOY ANNOUNCEMENT
                      </button>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-white/20 tracking-[0.3em] px-4">Broadcast History</h3>
                  <div className="space-y-3">
                    {stats?.activeAnnouncements?.map((ann) => (
                      <motion.div 
                        key={ann.id} 
                        layout
                        className={`bg-[#100726]/80 backdrop-blur-xl border p-6 rounded-3xl transition-all ${ann.isActive ? 'border-amber-500/20 bg-amber-500/[0.02]' : 'border-white/5'}`}
                      >
                        <div className="flex items-start justify-between gap-6">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                                ann.theme === 'error' ? 'bg-red-500/20 text-red-400' : 
                                ann.theme === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                ann.theme === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'
                              }`}>{ann.theme}</span>
                              <span className="text-[10px] text-white/20 font-mono">{format(new Date(ann.createdAt), "yyyy-MM-dd HH:mm")}</span>
                            </div>
                            <p className="text-white/90 font-bold leading-relaxed">{ann.message}</p>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="flex flex-col items-center gap-1">
                               <p className="text-[8px] font-black text-white/20 uppercase">Active</p>
                               <ToggleSwitch 
                                  checked={ann.isActive} 
                                  onChange={(v) => toggleAnnouncementMutation.mutate({ id: ann.id, isActive: v })} 
                                />
                             </div>
                             <div className="w-px h-10 bg-white/5 mx-2" />
                             <button 
                               onClick={async () => {
                                 if (!confirm("Destroy this signal?")) return;
                                 const token = await getToken();
                                 await fetch(`/api/admin/announcement/${ann.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
                                 invalidateAll();
                               }}
                               className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                             >
                               <XCircle className="w-5 h-5" />
                             </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "system" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {systemStatus?.providers.map((p) => (
                        <div key={p.name} className={`p-6 rounded-3xl border transition-all ${p.configured ? 'bg-emerald-500/[0.02] border-emerald-500/20' : 'bg-red-500/[0.02] border-red-500/20'}`}>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-black text-white/90 uppercase tracking-widest text-xs">{p.name}</h4>
                            {p.configured ? <CheckCircle className="text-emerald-400 w-4 h-4" /> : <XCircle className="text-red-400 w-4 h-4" />}
                          </div>
                          <p className="text-white/40 text-[10px] mb-1 uppercase font-bold tracking-tighter">Active Model</p>
                          <p className={`font-mono text-xs ${p.configured ? 'text-white/80' : 'text-white/20'}`}>{p.model}</p>
                          <div className="mt-4 flex items-center justify-between">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${p.configured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                              {p.configured ? 'CONFIGURED' : 'NOT FOUND'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-[#100726]/80 backdrop-blur-xl border border-white/5 p-8 rounded-3xl space-y-6">
                      <h3 className="text-xl font-bold flex items-center gap-2"><Settings2 className="w-5 h-5 text-cyan-400" /> Instance Metrics</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                          <span className="text-white/40 text-xs font-bold uppercase">Node Runtime</span>
                          <span className="text-white/80 font-mono text-sm">{systemStatus?.nodeVersion}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                          <span className="text-white/40 text-xs font-bold uppercase">Process Uptime</span>
                          <span className="text-white/80 font-mono text-sm">{Math.round((systemStatus?.uptime || 0) / 3600)}h {Math.round(((systemStatus?.uptime || 0) % 3600) / 60)}m</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                          <span className="text-white/40 text-xs font-bold uppercase">Memory Heap</span>
                          <span className="text-white/80 font-mono text-sm">{systemStatus?.memoryUsageMB} MB</span>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          const start = Date.now();
                          try {
                            const res = await fetch("/api/health");
                            const end = Date.now();
                            toast({ title: "Health Check Result", description: `Database responsive. Latency: ${end - start}ms` });
                          } catch { toast({ variant: "destructive", title: "Health Check Failed" }); }
                        }}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all border border-white/5"
                      >
                        RUN HEALTH DIAGNOSTIC
                      </button>

                      <button 
                        disabled={isRunningReengagement}
                        onClick={async () => {
                          setIsRunningReengagement(true);
                          try {
                            const token = await getToken();
                            const res = await fetch("/api/admin/trigger-reengagement", {
                              method: "POST",
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            const data = await res.json();
                            if (data.success) {
                              toast({ 
                                title: "Re-engagement Signal Sent", 
                                description: `Successfully targeted ${data.sent} churned users. ${data.skipped || 0} users were already notified recently.` 
                              });
                            } else {
                              throw new Error(data.error);
                            }
                          } catch (err: any) { 
                            toast({ variant: "destructive", title: "Protocol Failure", description: err.message || "Manual re-engagement failed" }); 
                          } finally {
                            setIsRunningReengagement(false);
                          }
                        }}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-2xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)] disabled:opacity-50"
                      >
                        {isRunningReengagement ? (
                          <div className="flex items-center justify-center gap-2">
                             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                             TRANSMITTING...
                          </div>
                        ) : "RUN RE-ENGAGEMENT ENGINE"}
                      </button>
                    </div>

                    <div className="bg-[#100726]/80 backdrop-blur-xl border border-white/5 p-8 rounded-3xl space-y-6">
                      <h3 className="text-xl font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-400" /> Coupon Tracking</h3>
                      <div className="space-y-3">
                        {stats?.couponStats?.map(c => (
                          <div key={c.code} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="font-mono font-bold text-indigo-400">{c.code}</span>
                            <div className="text-right">
                              <span className="text-white/80 font-bold">{c.count}</span>
                              <span className="text-[10px] text-white/20 ml-1 font-bold uppercase">USES</span>
                            </div>
                          </div>
                        ))}
                        {(!stats?.couponStats || stats.couponStats.length === 0) && <p className="text-center text-white/20 text-xs py-4 italic">No coupon redemptions logged</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
