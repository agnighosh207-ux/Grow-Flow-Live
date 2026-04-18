import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { Shield, Users, Mail, Zap, Calendar, ArrowLeft, BarChart3, Presentation, Link } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ADMIN_EMAIL = "agnighosh207@gmail.com";

interface AdminStats {
  totalUsers: number;
  totalEmails: number;
  totalGenerations: number;
  maintenanceMode: boolean;
  recentUsers: { id: string; email: string | null; planType: string; subscriptionStatus: string; createdAt: string }[];
  dauData?: any[];
  languageData?: any[];
  revenueData?: any[];
  topReferrers?: any[];
  generationsData?: any[];
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
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "referrals" | "announcements">("overview");

  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

  useEffect(() => {
    if (isLoaded && user) {
      const email = user.primaryEmailAddress?.emailAddress;
      if (email !== ADMIN_EMAIL) {
        setLocation("/");
      }
    } else if (isLoaded && !user) {
      setLocation("/");
    }
  }, [isLoaded, user, setLocation]);

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["admin_stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Not authorized or failed to fetch");
      return res.json();
    },
    enabled: isLoaded && user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL,
  });

  const modifyUserMutation = useMutation({
    mutationFn: async ({ targetUserId, newPlan }: { targetUserId: string; newPlan: string }) => {
      const res = await fetch("/api/admin/modify-user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, newPlan }),
      });
      if (!res.ok) throw new Error("Failed to modify user");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User updated successfully!" });
      setOpenDropdownId(null);
      // force re-fetch or invalidate
      window.location.reload(); 
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    }
  });

  const toggleMaintenanceMutation = useMutation({
    mutationFn: async (mode: boolean) => {
      const res = await fetch("/api/admin/settings/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceMode: mode }),
      });
      if (!res.ok) throw new Error("Failed to toggle maintenance mode");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Maintenance mode updated successfully!" });
      window.location.reload(); 
    },
    onError: () => {
      toast({ title: "Failed to update maintenance mode", variant: "destructive" });
    }
  });

  const impersonateUser = (userId: string) => {
    localStorage.setItem("impersonated_user_id", userId);
    toast({ title: "Impersonation active", description: `You are now viewing as user ${userId}` });
    setLocation("/");
  };

  if (!isLoaded || isLoading || user?.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-[#0b0416] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-[#0b0416] text-white p-6 md:p-12 font-sans"
    >
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/")}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Shield className="text-violet-400 w-8 h-8" />
                Admin Dashboard
              </h1>
                <p className="text-white/60 text-sm mt-1">Grow Flow AI Secure Control Center</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">
              <span className="text-red-400 font-bold text-sm">Panic Mode</span>
              <ToggleSwitch 
                checked={stats?.maintenanceMode || false} 
                onChange={(v) => toggleMaintenanceMutation.mutate(v)}
                disabled={toggleMaintenanceMutation.isPending}
              />
            </div>
          </div>

          <div className="flex gap-4 border-b border-white/10 mb-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 px-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === "overview" ? "border-violet-500 text-violet-400" : "border-transparent text-white/50 hover:text-white"}`}
          >
            Overview & Analytics
          </button>
          <button
            onClick={() => setActiveTab("referrals")}
            className={`pb-3 px-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === "referrals" ? "border-violet-500 text-violet-400" : "border-transparent text-white/50 hover:text-white"}`}
          >
            Referrals Leaderboard
          </button>
          <button
            onClick={() => setActiveTab("announcements")}
            className={`pb-3 px-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === "announcements" ? "border-violet-500 text-violet-400" : "border-transparent text-white/50 hover:text-white"}`}
          >
            Announcements
          </button>
        </div>

        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#100726]/80 backdrop-blur-xl border border-violet-500/30 p-6 rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.1)]">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-violet-500/20 rounded-xl">
                <Users className="text-violet-400 w-6 h-6" />
              </div>
              <h3 className="text-white/80 font-medium text-lg">Total Users</h3>
            </div>
            <p className="text-4xl font-bold">{stats?.totalUsers.toLocaleString()}</p>
          </div>

          <div className="bg-[#100726]/80 backdrop-blur-xl border border-violet-500/30 p-6 rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.1)]">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <Mail className="text-emerald-400 w-6 h-6" />
              </div>
              <h3 className="text-white/80 font-medium text-lg">Emails Collected</h3>
            </div>
            <p className="text-4xl font-bold">{stats?.totalEmails.toLocaleString()}</p>
          </div>

          <div className="bg-[#100726]/80 backdrop-blur-xl border border-violet-500/30 p-6 rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.1)]">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <Zap className="text-cyan-400 w-6 h-6" />
              </div>
              <h3 className="text-white/80 font-medium text-lg">Total Generations</h3>
            </div>
            <p className="text-4xl font-bold">{stats?.totalGenerations.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#100726]/80 backdrop-blur-xl border border-violet-500/30 p-6 rounded-2xl">
            <h3 className="text-lg font-bold mb-4">DAU (30 Days)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.dauData || []}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#ffffff40" fontSize={12} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} />
                  <YAxis stroke="#ffffff40" fontSize={12} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0b0416', border: '1px solid #8b5cf640' }} />
                  <Area type="monotone" dataKey="activeusers" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#100726]/80 backdrop-blur-xl border border-violet-500/30 p-6 rounded-2xl">
            <h3 className="text-lg font-bold mb-4">Generations (30 Days)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.generationsData || []}>
                  <defs>
                    <linearGradient id="colorGens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#ffffff40" fontSize={12} tickFormatter={(val) => val ? new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : ''} />
                  <YAxis stroke="#ffffff40" fontSize={12} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0b0416', border: '1px solid #06b6d440' }} />
                  <Area type="monotone" dataKey="generations" stroke="#06b6d4" fillOpacity={1} fill="url(#colorGens)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#100726]/80 backdrop-blur-xl border border-violet-500/30 p-6 rounded-2xl mt-6 lg:mt-0 lg:col-span-2 xl:col-span-1">
            <h3 className="text-lg font-bold mb-4">Language Usage</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats?.languageData || []} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {(stats?.languageData || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0b0416', border: '1px solid #8b5cf640' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {(stats?.languageData || []).map((entry: any, i: number) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                    <span className="text-white/60">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#100726]/80 backdrop-blur-xl border border-violet-500/30 p-6 rounded-2xl lg:col-span-2">
            <h3 className="text-lg font-bold mb-4">Revenue by Plan</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.revenueData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} className="capitalize" />
                  <YAxis stroke="#ffffff40" fontSize={12} tickFormatter={(val) => `₹${val}`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0b0416', border: '1px solid #8b5cf640' }} cursor={{fill: '#ffffff05'}} formatter={(val) => `₹${val}`} />
                  <Bar dataKey="amount" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-[#100726]/80 backdrop-blur-xl border border-violet-500/30 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(139,92,246,0.1)]">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-400" />
              Recent Signups
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            {stats?.recentUsers.map((user, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="p-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-sm">
                    {user.email ? user.email[0].toUpperCase() : "?"}
                  </div>
                  <div>
                    <p className="font-medium text-white/90">{user.email || "No email"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold capitalize text-violet-300">
                      {user.planType}
                    </p>
                    <p className="text-xs text-white/40">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                      className="px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                    >
                      Manage Access <ChevronDown className="w-3 h-3" />
                    </button>
                    <AnimatePresence>
                      {openDropdownId === user.id && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: -10 }} 
                          animate={{ opacity: 1, scale: 1, y: 0 }} 
                          exit={{ opacity: 0, scale: 0.95, y: -10 }} 
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-1 w-32 bg-[#1a0f30] border border-violet-500/30 rounded-xl shadow-2xl overflow-hidden z-50"
                        >
                           {["free", "starter", "creator", "infinity"].map((plan) => (
                            <motion.button
                              whileHover={{ scale: 1.02, backgroundColor: "rgba(139, 92, 246, 0.2)" }}
                              whileTap={{ scale: 0.98 }}
                              key={plan}
                              className="w-full text-left px-4 py-2 text-sm text-white/80 hover:text-white capitalize transition-colors"
                              onClick={() => modifyUserMutation.mutate({ targetUserId: user.id, newPlan: plan })}
                              disabled={modifyUserMutation.isPending}
                            >
                              {plan}
                            </motion.button>
                          ))}
                          <div className="h-px bg-white/10 my-1"></div>
                          <motion.button
                            whileHover={{ scale: 1.02, backgroundColor: "rgba(6, 182, 212, 0.2)" }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full text-left px-4 py-2 text-sm text-cyan-400 transition-colors"
                            onClick={() => impersonateUser(user.id)}
                          >
                            View as User
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
            {stats?.recentUsers.length === 0 && (
              <div className="p-8 text-center text-white/50">No recent users found.</div>
            )}
          </div>
        </div>
          </>
        )}

        {activeTab === "referrals" && (
          <div className="bg-[#100726]/80 backdrop-blur-xl border border-violet-500/30 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(139,92,246,0.1)]">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Referrals Leaderboard
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {(stats?.topReferrers as any[])?.map((ref, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="p-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/30">
                      #{i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-white/90">{ref.email || ref.id}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                    <div>
                      <p className="text-xl font-bold text-emerald-400">
                        {ref.referralscount}
                      </p>
                      <p className="text-xs text-white/40">Friends Invited</p>
                    </div>
                    <button
                      className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-lg transition-colors"
                      onClick={() => impersonateUser(ref.id)}
                    >
                      View
                    </button>
                  </div>
                </motion.div>
              ))}
              {(!stats?.topReferrers || stats?.topReferrers.length === 0) && (
                <div className="p-8 text-center text-white/50">No referrals recorded yet.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "announcements" && (
          <div className="bg-[#100726]/80 backdrop-blur-xl border border-violet-500/30 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(139,92,246,0.1)]">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Presentation className="w-5 h-5 text-amber-400" />
                Global Announcement Bar
              </h3>
            </div>
            <div className="p-6">
              <form 
                className="space-y-4 max-w-2xl"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const message = (form.elements.namedItem("message") as HTMLInputElement).value;
                  const theme = (form.elements.namedItem("theme") as HTMLSelectElement).value;
                  const isActive = (form.elements.namedItem("isActive") as HTMLInputElement).checked;

                  try {
                    const res = await fetch("/api/admin/announcement", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ message, theme, isActive }),
                    });
                    if (!res.ok) throw new Error("Failed");
                    toast({ title: "Announcement updated!" });
                  } catch (err) {
                    toast({ variant: "destructive", title: "Failed to update announcement" });
                  }
                }}
              >
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Announcement Message</label>
                  <input 
                    name="message"
                    required
                    className="w-full bg-[#1a0f30] border border-violet-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
                    placeholder="We just launched a new feature! Try it out now."
                  />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-white/80 mb-2">Theme</label>
                    <select 
                      name="theme" 
                      className="w-full bg-[#1a0f30] border border-violet-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
                    >
                      <option value="info">Info (Blue)</option>
                      <option value="success">Success (Emerald)</option>
                      <option value="warning">Warning (Amber)</option>
                      <option value="error">Error (Red)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <label className="text-sm font-medium text-white/80">Active:</label>
                    <input type="checkbox" name="isActive" className="w-5 h-5 accent-violet-500" />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors mt-2"
                >
                  Save Announcement
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
