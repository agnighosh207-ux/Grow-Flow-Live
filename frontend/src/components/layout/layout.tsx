import { ReactNode, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBanner } from "@/components/banners/NotificationBanner";
import { NotificationPermissionModal } from "@/components/modals/NotificationPermissionModal";
import { ReferralPopup } from "@/components/modals/ReferralPopup";
import { FoundersBanner } from "@/components/banners/FoundersBanner";
import { TopBanner } from "@/components/banners/TopBanner";
import { FeedbackModal, checkShouldShowFeedback } from "@/components/modals/FeedbackModal";
import { Link, useLocation } from "wouter";
import { useClerk, useUser, useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Wand2,
  History,
  MessageSquareQuote,
  LogOut,
  Menu,
  Crown,
  Zap,
  CreditCard,
  Lightbulb,
  CalendarDays,
  Calendar,
  HelpCircle,
  Settings,
  Heart,
  BarChart3,
  Lock,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Swords,
  User,
  Flame,
  Package2,
  MessageSquare,
  PenTool,
  Brain,
  BarChart2,
  RefreshCw,
  GitBranch,
  Target,
  ArrowRight,
  AlertTriangle,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useReferralInfo } from "@/hooks/useReferral";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/layout/Logo";
import { MoreHorizontal } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";


function ImpersonationBanner() {
  const [impersonatedUser, setImpersonatedUser] = useState<string | null>(null);
  
  useEffect(() => {
    // Check for session-based impersonation
    setImpersonatedUser(sessionStorage.getItem("impersonated_user_id"));
  }, []);

  if (!impersonatedUser) return null;

  const endSession = () => {
    sessionStorage.removeItem("impersonation_session_id");
    sessionStorage.removeItem("impersonated_user_id");
    window.location.href = "/settings/admin";
  };

  return (
    <div className="bg-red-500 text-white text-center py-2 text-sm font-bold sticky top-0 z-[100] flex items-center justify-center gap-4">
      <span className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 animate-pulse" />
        IMPERSONATION MODE — Viewing as {impersonatedUser}
      </span>
      <button 
        onClick={endSession}
        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded border border-white/40 transition-colors text-[10px] uppercase tracking-wider"
      >
        End Session
      </button>
    </div>
  );
}

interface NavItemDef {
  path: string;
  label: string;
  icon: any;
  pro?: boolean;
  desc?: string;
}

interface NavGroup {
  label: string;
  items: NavItemDef[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Create",
    items: [
      { path: "/generate", label: "Generate", icon: Wand2, desc: "AI Content Campaign Generator" },
      { path: "/ideas", label: "Idea Generator", icon: Lightbulb, desc: "Daily viral content concepts" },
      { path: "/trends", label: "Trend Engine", icon: TrendingUp, desc: "Live viral trend detection" },
      { path: "/hooks", label: "Viral Hooks", icon: MessageSquareQuote, desc: "100+ viral hook frameworks" },
      { path: "/improve", label: "Competitor Intel", icon: Swords, desc: "Analyze competitor performance" },
      { path: "/hashtags", label: "Hashtag Intel", icon: Flame, desc: "SEO-optimized tag intelligence" },
      { path: "/bio", label: "Profile Suite", icon: User, desc: "Optimize your creator profile" },
      { path: "/repurpose", label: "Content Repurposer", icon: RefreshCw, desc: "Turn one video into 10 posts" },
      { path: "/caption", label: "Caption Enhancer", icon: Wand2, desc: "Polish your raw captions" },
      { path: "/ghostwriter", label: "AI Ghostwriter", icon: PenTool, desc: "Write in your authentic voice" },
      { path: "/predictor", label: "Performance Predictor", icon: BarChart2, desc: "Predict virality before posting" },
      { path: "/ab-test", label: "A/B Duel", icon: GitBranch, desc: "Dual-concept performance test" },
      { path: "/hook-scorer", label: "Hook Radar", icon: Target, desc: "Radar-grade hook strength" },
    ],
  },
  {
    label: "Strategy",
    items: [
      { path: "/daily", label: "Daily Growth Plan", icon: Flame, desc: "Your 10-min growth ritual" },
      { path: "/coach", label: "AI Content Coach", icon: Brain, desc: "Real-time AI content feedback" },
      { path: "/strategy", label: "7-Day Strategy", icon: CalendarDays, desc: "Custom 7-day content roadmap" },
      { path: "/calendar", label: "Content Calendar", icon: Calendar, pro: true, desc: "Plan and track your posting" },
      { path: "/insights", label: "Analytics", icon: BarChart3, pro: true, desc: "Advanced performance metrics" },
    ],
  },
  {
    label: "Library",
    items: [
      { path: "/vault", label: "Swipe Vault", icon: Flame, desc: "Library of viral frameworks" },
      { path: "/saved", label: "Saved", icon: Heart, desc: "Revisit your top generations" },
      { path: "/history", label: "History", icon: History, desc: "Full archive of past work" },
    ],
  },
  {
    label: "Account",
    items: [
      { path: "/referrals", label: "Refer & Earn", icon: Zap, desc: "Earn credits for sharing" },
      { path: "/pricing", label: "Plans & Billing", icon: CreditCard, desc: "Manage your subscription" },
      { path: "/support", label: "Support", icon: HelpCircle, desc: "Get help from our team" },
      { path: "/settings", label: "Settings", icon: Settings, desc: "Adjust your preferences" },
    ],
  },
];

const DISCOVERY_ITEMS = [
  { path: "/ghostwriter", label: "Writer", icon: PenTool, desc: "Write in your voice" },
  { path: "/predictor", label: "Predict", icon: BarChart2, desc: "Predict virality" },
  { path: "/ab-test", label: "A/B Duel", icon: GitBranch, desc: "Compare ideas" },
  { path: "/coach", label: "Coach", icon: Brain, desc: "AI Feedback" },
  { path: "/vault", label: "Vault", icon: Flame, desc: "Viral Swipe" },
  { path: "/repurpose", label: "Repurpose", icon: RefreshCw, desc: "Video to Post" },
];

const SIDEBAR_NAV = NAV_GROUPS.flatMap((g) => g.items);

const BOTTOM_NAV = [
  { path: "/generate", label: "Generate", icon: Wand2 },
  { path: "/hooks", label: "Hooks", icon: MessageSquareQuote },
  { path: "/ideas", label: "Ideas", icon: Lightbulb },
  { path: "discover", label: "Discover", icon: Sparkles },
  { path: "menu", label: "Menu", icon: MoreHorizontal },
];

function PlanPill({ plan, planType }: { plan?: string; planType?: string }) {
  if (!plan || (plan === "free" && (!planType || planType === "free")))
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/6 text-white/40 border border-white/8">
        Explorer
      </span>
    );
  if (plan === "trial")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00F2FF]/15 text-[#00F2FF] border border-[#00F2FF]/20">
        <Zap className="w-2.5 h-2.5" /> Trial
      </span>
    );
  // Show correct pill for active, pending, and past_due statuses with a paid planType
  const isPaidStatus = plan === "active" || plan === "pending" || plan === "past_due";
  if (isPaidStatus && planType && planType !== "free") {
    if (planType === "infinity")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-[#00F2FF]/20 to-sky-500/20 text-[#00F2FF] border border-[#00F2FF]/25 shadow-[0_0_10px_rgba(0,242,255,0.2)]">
          <Crown className="w-2.5 h-2.5" /> Infinity{plan !== "active" ? " ⏳" : ""}
        </span>
      );
    if (planType === "starter")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00F2FF]/5 text-[#00F2FF]/70 border border-[#00F2FF]/20">
          <Zap className="w-2.5 h-2.5" /> Starter{plan !== "active" ? " ⏳" : ""}
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00F2FF]/10 text-[#00F2FF]/90 border border-[#00F2FF]/40">
        <Zap className="w-2.5 h-2.5" /> Creator{plan !== "active" ? " ⏳" : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-300 border border-red-500/20">
      Blocked
    </span>
  );
}

function CreditCounter({ sub }: { sub: any }) {
  if (!sub || sub.plan === "blocked") return null;
  
  if (sub.planType === "infinity" || sub.plan === "infinity") {
    return (
      <div className="mx-3 mb-3 px-3 py-2 rounded-lg bg-cyan-600/10 border border-cyan-500/20">
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/60 font-medium">Credits Remaining</span>
          <span className="text-cyan-300 font-bold flex items-center gap-1"><Sparkles className="w-3 h-3"/> Unlimited</span>
        </div>
      </div>
    );
  }

  // Future-proof reading directly from backend or fallback to limit calc
  const remaining = typeof sub.generationsRemaining === "number" ? sub.generationsRemaining : (typeof sub.creditsRemaining === "number" ? sub.creditsRemaining : (sub.generationLimit ? Math.max(0, sub.generationLimit - (sub.monthlyGenerationsUsed || 0)) : (sub.plan === "free" ? 5 : 0)));
  const baseTotal = sub.generationLimit || (sub.planType === 'starter' ? 25 : (sub.planType === 'creator' ? 150 : 5));
  
  // If user has bonus credits (e.g. 40/5), show the bar relative to the larger number
  const total = Math.max(baseTotal, remaining);
  const percentage = Math.min(100, Math.max(0, (remaining / total) * 100));
  
  return (
    <div className="mx-3 mb-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
       <div className="flex justify-between items-center text-[11px] mb-1.5">
          <span className="text-white/60 font-medium tracking-wide">Credits Remaining</span>
          <span className="text-white font-bold">{remaining} <span className="text-white/40">/ {total}</span></span>
       </div>
       <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
             className={`h-full rounded-full transition-all duration-500 ${remaining < 3 ? 'bg-red-500' : 'bg-cyan-500 shadow-[0_0_10px_rgba(124,58,237,0.5)]'}`}
             style={{ width: `${percentage}%` }}
          />
       </div>
       {remaining < 3 && (
         <Link href="/pricing">
          <div className="mt-1.5 text-[9px] text-red-400 hover:text-red-300 font-semibold cursor-pointer text-right transition-colors">Upgrade for more limits →</div>
         </Link>
       )}
    </div>
  );
}

function ReferralRewardNotifier() {
  const { data: referral } = useReferralInfo();
  const { toast } = useToast();

  useEffect(() => {
    if (referral?.hasNewReward) {
      toast({
        title: "🎁 Referral Reward!",
        description: "You've earned 7 extra free days. Keep sharing!",
      });
    }
  }, [referral?.hasNewReward]);

  return null;
}

function NavItem({
  path,
  label,
  icon: Icon,
  pro,
  isPro,
  isActive,
  onClick,
  showDot,
  badge,
  isAccountGroup,
}: {
  path: string;
  label: string;
  icon: any;
  pro?: boolean;
  isPro: boolean;
  isActive: boolean;
  onClick?: () => void;
  showDot?: boolean;
  badge?: ReactNode;
  isAccountGroup?: boolean;
}) {
  const [isVisited, setIsVisited] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const visited = localStorage.getItem(`visited_${path}`);
    setIsVisited(!!visited);
  }, [path]);

  const handleVisit = () => {
    localStorage.setItem(`visited_${path}`, "true");
    setIsVisited(true);
    onClick?.();
  };

  const isLocked = pro && !isPro;
  const showNewBadge = !isVisited && !isLocked && !isAccountGroup && path !== "/generate";

  let baseColorClass = "text-white/55 hover:bg-white/[0.06] hover:text-white/90";
  if (isAccountGroup) {
    baseColorClass = "text-white/40 hover:bg-white/[0.06] hover:text-white/70";
  }

  return (
    <Link key={path} href={path} onClick={handleVisit}>
      <span
        className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer relative
          ${isActive
            ? "bg-cyan-600/20 text-white font-medium"
            : isLocked
            ? "text-white/25 hover:bg-white/3 hover:text-white/40"
            : baseColorClass
          }
        `}
      >
        {isActive && (
          <motion.span
            layoutId="activeNavIndicator"
            className="absolute left-0 inset-y-1 w-0.5 rounded-r-full bg-cyan-500 shadow-[0_0_10px_#00F2FF]"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <Icon
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-cyan-400" : ""}`}
        />
        <span className="text-sm flex-1 truncate">{label}</span>
        {badge}
        {showNewBadge && (
          <span className="text-[8px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]">
            NEW
          </span>
        )}
        {isLocked && <Lock className="w-3 h-3 text-cyan-500/40 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />}
        {pro && isPro && (
          <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-1.5 py-0.5 flex-shrink-0">
            PRO
          </span>
        )}
      </span>
    </Link>
  );
}

function StreakBanner({ streak, completedToday }: { streak: number; completedToday: boolean }) {
  if (streak === 0) return null;

  const milestones = [7, 14, 30];
  const nextMilestone = milestones.find(m => m > streak) || 100;
  const progress = Math.min(100, (streak / nextMilestone) * 100);

  const isElite = streak >= 30;
  const isSteady = streak >= 7;

  return (
    <div className={`mx-3 mb-4 p-3 rounded-xl border transition-all duration-500 overflow-hidden relative group
      ${isElite ? "bg-gradient-to-br from-yellow-500/20 to-amber-600/10 border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.15)]" : 
        isSteady ? "bg-slate-900/60 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : 
        "bg-white/[0.03] border-white/10"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isElite ? "bg-yellow-500/20" : isSteady ? "bg-amber-500/10" : "bg-white/5"}`}>
            {isElite ? <Crown className="w-3.5 h-3.5 text-yellow-400" /> : <Flame className={`w-3.5 h-3.5 ${isSteady ? "text-amber-500" : "text-orange-500"}`} />}
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">{streak} Day Streak</p>
            <p className="text-[10px] text-white/40 font-medium">Next: {nextMilestone} days</p>
          </div>
        </div>
      </div>

      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={`h-full rounded-full ${isElite ? "bg-yellow-500 shadow-[0_0_10px_#EAB308]" : isSteady ? "bg-amber-500 shadow-[0_0_8px_#F59E0B]" : "bg-orange-500 shadow-[0_0_8px_#F97316]"}`}
        />
      </div>

      {!completedToday && (
        <Link href="/daily">
          <div className="flex items-center justify-between text-[10px] font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors cursor-pointer">
            Complete today's plan <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      )}
      
      {isSteady && <div className="absolute -right-4 -top-4 w-12 h-12 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-700" />}
    </div>
  );
}

function SidebarContent({
  isPro,
  sub,
  user,
  signOut,
  location,
  onClick,
}: {
  isPro: boolean;
  sub: any;
  user: any;
  signOut: () => void;
  location: string;
  onClick?: () => void;
}) {
  const { i18n } = useTranslation();
  const { getToken } = useAuth();
  const { data: streakData } = useQuery({ 
    queryKey: ['daily-streak'], 
    queryFn: async () => {
      const token = await getToken();
      const r = await fetch('/api/daily/streak', {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      return r.json();
    }, 
    staleTime: 5 * 60 * 1000, 
    enabled: !!user 
  });
  const streak = streakData?.streak ?? 0;

  return (
    <>
      <div className="px-5 py-4 flex items-center gap-2">
        <Logo size="sm" />
        <span className="text-[10px] font-semibold text-white/40 bg-white/10 border border-white/10 rounded px-1.5 py-0.5 ml-auto shadow-sm">
          v2.0
        </span>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-1 space-y-6" data-lenis-prevent>
        <StreakBanner streak={streak} completedToday={!!streakData?.completedToday} />
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[11px] font-semibold text-white/20 uppercase tracking-widest mb-1.5 border-l-2 border-white/10 pl-2 ml-3">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ path, label, icon, pro }) => (
                <NavItem
                  key={path}
                  path={path}
                  label={label}
                  icon={icon}
                  pro={pro}
                  isPro={isPro}
                  isActive={location === path}
                  onClick={onClick}
                  isAccountGroup={group.label === "Account"}
                  showDot={
                    path === "/pricing" &&
                    sub?.plan === "free" &&
                    (sub?.generationsUsed ?? 0) >= 1 &&
                    !(pro && !isPro)
                  }
                  badge={path === "/daily" && streak > 0 ? (
                    <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-1.5 py-0.5 flex-shrink-0 flex items-center gap-0.5">
                      🔥{streak}
                    </span>
                  ) : undefined}
                />
              ))}
            </div>
          </div>
        ))}

        {(() => {
          const isActuallyAdminEmail = user?.primaryEmailAddress?.emailAddress === "agnighosh207@gmail.com";
          if (sub?.isAdmin || isActuallyAdminEmail) {
          return (
            <div>
              <p className="text-[11px] font-semibold text-cyan-400 uppercase tracking-widest mb-1.5 border-l-2 border-cyan-500/50 pl-2 ml-3">
                Admin Control
              </p>
              <div className="space-y-0.5">
                <NavItem
                  path="/admin"
                  label="Admin Dashboard"
                  icon={Shield}
                  isPro={true}
                  isActive={location === "/admin"}
                  onClick={onClick}
                />
              </div>
            </div>
          );
        }
        return null;
      })()}
      </div>

      {sub && (sub.plan === "free" || sub.plan === "blocked") && (!sub.planType || sub.planType === "free") && (
        <Link href="/pricing">
          <div id="tour-upgrade" className="mx-3 mb-3 p-3 rounded-xl cursor-pointer group pulse-glow transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(168,85,247,0.1) 100%)",
              border: "1px solid rgba(124,58,237,0.4)",
            }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-white/80">Unlock Full Power</span>
            </div>
            <p className="text-[11px] text-white/40 mb-2.5 leading-relaxed">
              Unlock all tools · Multi-language · Priority AI
            </p>
            <div className="flex items-center gap-1 text-xs font-semibold text-cyan-300 group-hover:text-cyan-200 transition-colors">
              Get unlimited access <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>
      )}

      {sub && sub.plan === "trial" && (
        <div className="mx-3 mb-3 p-3 rounded-xl"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-cyan-300">Trial Active</span>
            {sub.trialDaysLeft !== null && (
              <span className="text-[10px] text-white/40">{sub.trialDaysLeft}d left</span>
            )}
          </div>
          <Link href="/pricing">
            <span className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer">
              Subscribe to keep access →
            </span>
          </Link>
        </div>
      )}

      {sub && (sub.plan === "active" || sub.plan === "pending" || sub.plan === "past_due") && sub.planType !== "free" && (
        <div className="mx-3 mb-3 px-3 py-2.5 rounded-lg flex items-center justify-between"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Current Plan</p>
            <PlanPill plan={sub.plan} planType={sub.planType} />
          </div>
          {sub.planType !== "infinity" && (
            <Link href="/pricing">
              <span className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer">
                Upgrade
              </span>
            </Link>
          )}
        </div>
      )}

      {sub && <CreditCounter sub={sub} />}

      <div className="border-t border-white/[0.06] px-4 py-3">
        <div className="flex items-center justify-between mb-3 px-2">
           <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Interface Language</span>
            <select 
              value={i18n.language} 
              onChange={e => i18n.changeLanguage(e.target.value)}
              className="text-[10px] font-bold bg-transparent text-cyan-400 border-none outline-none cursor-pointer hover:text-cyan-300 transition-colors"
            >
              <option value="en" className="bg-zinc-950 text-white">English</option>
              <option value="hi" className="bg-zinc-950 text-white">Hindi</option>
              <option value="bn" className="bg-zinc-950 text-white">Bengali</option>
            </select>
        </div>

        <div className="flex items-center gap-2.5 mb-2.5">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.fullName || "User"}
              className="w-8 h-8 rounded-full border border-white/10 flex-shrink-0 object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex-shrink-0 flex items-center justify-center text-xs text-white/40 font-semibold">
              {(user?.fullName || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-white/80 leading-none truncate">
              {user?.fullName || "User"}
            </span>
            <span className="text-[10px] text-white/30 truncate mt-0.5">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-white/35 hover:text-white/70 hover:bg-white/5 text-xs px-2 h-8"
          onClick={() => signOut()}
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Sign Out
        </Button>
      </div>
    </>
  );
}

function ToolsGrid({ isPro, onClick }: { isPro: boolean; onClick?: () => void }) {
  const [, setLocation] = useLocation();

  const handleNavigate = (path: string) => {
    localStorage.setItem(`visited_${path}`, "true");
    setLocation(path);
    onClick?.();
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 custom-scrollbar">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-1">{group.label}</h3>
          <div className="grid grid-cols-1 gap-3">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isLocked = item.pro && !isPro;
              const visited = typeof window !== "undefined" ? localStorage.getItem(`visited_${item.path}`) : "true";
              const isNew = !visited && !isLocked && group.label !== "Account" && item.path !== "/generate";

              return (
                <div
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className={`group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center gap-4
                    ${isLocked 
                      ? "bg-white/[0.01] border-white/5 opacity-60" 
                      : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(0,242,255,0.05)]"
                    }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300
                    ${isLocked ? "bg-white/5 border-white/5 text-white/20" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 group-hover:scale-110 group-hover:border-cyan-500/40"}
                  `}>
                    {isLocked ? <Lock className="w-5 h-5" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white/90 group-hover:text-white transition-colors">{item.label}</span>
                      {isNew && (
                        <span className="text-[8px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/40 truncate font-medium group-hover:text-white/60 transition-colors">{(item as any).desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-all group-hover:translate-x-1" />
                  
                  {isLocked && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[8px] font-black text-cyan-500/60 uppercase tracking-widest bg-cyan-500/10 px-1.5 py-0.5 rounded-md">Locked</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [location, setLocation] = useLocation();
  const { data: sub } = useSubscriptionStatus();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackTrigger, setFeedbackTrigger] = useState<string>("manual");
  const { i18n } = useTranslation();
  const [discoverItem, setDiscoverItem] = useState(DISCOVERY_ITEMS[0]);
  
  useEffect(() => {
    // Session-based discovery rotation
    const sessionIdx = sessionStorage.getItem("discovery_idx");
    let nextIdx = 0;
    if (sessionIdx !== null) {
      nextIdx = (parseInt(sessionIdx) + 1) % DISCOVERY_ITEMS.length;
    }
    sessionStorage.setItem("discovery_idx", nextIdx.toString());
    setDiscoverItem(DISCOVERY_ITEMS[nextIdx]);
  }, []);
  
  const { toast } = useToast();
  const { getToken } = useAuth();
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!checkShouldShowFeedback()) return;
    sessionTimerRef.current = setTimeout(() => {
      if (!checkShouldShowFeedback()) return;
      setFeedbackTrigger("session-10min");
      setShowFeedback(true);
    }, 10 * 60 * 1000);
    return () => {
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    };
  }, [user]);
  
  useEffect(() => {
    const handlePlanLimit = (e: any) => {
      toast({
        variant: "destructive",
        title: "Upgrade Required",
        description: e.detail.message || "You've reached your plan limit. Upgrade to continue.",
      });
    };
    const handleApiError = (e: any) => {
      if (e.detail.status === 401) return; // Silent for unauthorized (usually handled by Clerk)
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: e.detail.message || "An unexpected error occurred.",
      });
    };
    window.addEventListener('plan-limit-reached', handlePlanLimit);
    window.addEventListener('api-error', handleApiError);
    return () => {
      window.removeEventListener('plan-limit-reached', handlePlanLimit);
      window.removeEventListener('api-error', handleApiError);
    };
  }, [toast]);

  const isPro = !!(sub && sub.planType === "infinity" && ["active", "trial", "pending", "past_due"].includes(sub.plan));

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col bg-[#050110] selection:bg-cyan-500/30">
      <ImpersonationBanner />
      <NotificationBanner />
      
      <div className="flex-1 flex min-h-0 relative h-full">
        {/* Desktop Layout */}
        <div className="hidden md:flex flex-1 h-full min-h-0">
          <ResizablePanelGroup direction="horizontal" autoSaveId="growflow-main-layout" className="h-full">
            <ResizablePanel
              defaultSize={20}
              minSize={15}
              maxSize={30}
              className="bg-[#080316]/60 backdrop-blur-3xl border-r border-white/[0.06] flex flex-col z-30 h-full"
            >
              <SidebarContent
                user={user}
                location={location}
                sub={sub}
                isPro={isPro}
                signOut={signOut}
              />
            </ResizablePanel>
            
            <ResizableHandle withHandle className="bg-white/[0.05] hover:bg-cyan-500/20 transition-colors z-40" />
            
            <ResizablePanel defaultSize={80} className="flex flex-col min-h-0 h-full min-w-0">
              <div className="flex flex-col h-full overflow-hidden">
                <TopBanner />
                <FoundersBanner />
                
                <main className="flex-1 overflow-y-auto relative custom-scrollbar h-full">
                  <div className="bg-grid-pattern fixed inset-0 z-0 pointer-events-none opacity-20" />
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={location}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="pb-32 relative overflow-x-hidden min-h-screen"
                    >
                      <ReferralRewardNotifier />
                      {children}
                    </motion.div>
                  </AnimatePresence>
                </main>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex flex-1 flex-col min-h-0 overflow-x-hidden">
          <header className="h-16 border-b border-white/[0.06] bg-[#080316]/95 backdrop-blur-2xl flex items-center justify-between px-6 z-[60] sticky top-0">
            <Logo size="sm" />
            <div className="flex items-center gap-3">
               <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white/70">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="p-0 h-[85vh] bg-[#050110] border-t border-white/10 rounded-t-[40px] flex flex-col focus:outline-none ring-0">
                  <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 shrink-0" />
                  <div className="px-8 pt-8 pb-2">
                    <h2 className="text-2xl font-black text-white">All Toolkits</h2>
                    <p className="text-sm text-white/40 font-medium">Browse our entire intelligence engine.</p>
                  </div>
                  <ToolsGrid
                    isPro={isPro}
                    onClick={() => setIsSheetOpen(false)}
                  />
                  <div className="mt-auto border-t border-white/5 p-8 flex items-center justify-between">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Language</span>
                    <div className="flex gap-4">
                      {['en', 'hi', 'bn'].map(lang => (
                        <button 
                          key={lang}
                          onClick={() => { i18n.changeLanguage(lang); setIsSheetOpen(false); }}
                          className={`text-xs font-bold uppercase tracking-widest ${i18n.language === lang ? 'text-cyan-400' : 'text-white/40'}`}
                        >
                          {lang === 'en' ? 'EN' : lang === 'hi' ? 'HI' : 'BN'}
                        </button>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto relative pb-32 custom-scrollbar">
            <div className="bg-grid-pattern fixed inset-0 z-0 pointer-events-none opacity-20" />
            <TopBanner />
            <FoundersBanner />
            <AnimatePresence mode="wait">
              <motion.div
                key={location}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="relative z-10 p-4"
              >
                <ReferralRewardNotifier />
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          <nav className="fixed bottom-0 inset-x-0 border-t border-white/[0.08] flex justify-around items-center p-2 z-[100] bg-[#080316]/95 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
            {BOTTOM_NAV.map((item) => {
               if (item.path === "menu") {
                 const hasNew = SIDEBAR_NAV.some(n => !localStorage.getItem(`visited_${n.path}`) && !n.pro);
                 return (
                   <button key="menu" onClick={() => setIsSheetOpen(true)} className="flex flex-col items-center gap-1 p-2 text-white/40 relative">
                     <Menu className="w-5 h-5" />
                     <span className="text-[9px] font-bold uppercase">Menu</span>
                     {hasNew && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#080316] animate-pulse" />}
                   </button>
                 );
               }
               
               const navItem = item.path === "discover" ? discoverItem : item;
               const isActive = location === navItem.path;
               const Icon = navItem.icon;
               
               return (
                  <Link 
                    key={item.path} 
                    href={navItem.path} 
                    className={`flex flex-col items-center gap-1 p-2 transition-all relative ${isActive ? "text-cyan-400" : "text-white/40"}`}
                    onClick={() => localStorage.setItem(`visited_${navItem.path}`, "true")}
                  >
                    <Icon className={`w-5 h-5 ${item.path === "discover" && !isActive ? "text-cyan-400/60 animate-pulse" : ""}`} />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">{navItem.label}</span>
                    {item.path === "discover" && !isActive && (
                      <span className="absolute -top-1 right-0 text-[7px] font-black bg-cyan-500 text-black px-1 rounded-sm tracking-tighter">HOT</span>
                    )}
                  </Link>
                );
            })}
          </nav>
        </div>
      </div>

      <FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} trigger={feedbackTrigger} />
      <NotificationPermissionModal />
      <ReferralPopup />

      {/* Global Feedback Trigger */}
      {user && (
        <button
          onClick={() => { setFeedbackTrigger("manual"); setShowFeedback(true); }}
          className="fixed bottom-6 right-6 z-40 hidden md:flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/10 text-white/50 hover:text-white/80 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all text-xs font-bold shadow-2xl"
          style={{ background: "rgba(10,4,28,0.85)", backdropFilter: "blur(12px)" }}
        >
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          Feedback
        </button>
      )}
    </div>
  );
}
