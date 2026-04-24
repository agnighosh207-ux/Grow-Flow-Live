import { ReactNode, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBanner } from "@/components/banners/NotificationBanner";
import { NotificationPermissionModal } from "@/components/modals/NotificationPermissionModal";
import { ReferralPopup } from "@/components/modals/ReferralPopup";
import { FoundersBanner } from "@/components/banners/FoundersBanner";
import { TopBanner } from "@/components/banners/TopBanner";
import { FeedbackModal, checkShouldShowFeedback } from "@/components/modals/FeedbackModal";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import Lenis from "lenis";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useReferralInfo } from "@/hooks/useReferral";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/layout/Logo";
import { CustomCursor } from "@/components/shared/Cursor";
import { useMotionValue, useSpring as useFramerSpring } from "framer-motion";

function ImpersonationBanner() {
  const [impersonatedUser, setImpersonatedUser] = useState<string | null>(null);
  
  useEffect(() => {
    setImpersonatedUser(localStorage.getItem("impersonated_user_id"));
  }, []);

  if (!impersonatedUser) return null;

  return (
    <div className="bg-red-500/20 border-b border-red-500/30 text-red-200 text-xs font-semibold py-2 px-4 flex justify-between items-center z-50 relative">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
        Viewing as: {impersonatedUser}
      </div>
      <button 
        onClick={() => {
          localStorage.removeItem("impersonated_user_id");
          window.location.reload();
        }}
        className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded border border-white/10 transition-colors"
      >
        Stop Impersonating
      </button>
    </div>
  );
}

const NAV_GROUPS = [
  {
    label: "Create",
    items: [
      { path: "/generate", label: "Generate", icon: Wand2 },
      { path: "/ideas", label: "Idea Generator", icon: Lightbulb },
      { path: "/trends", label: "Trend Engine", icon: TrendingUp },
      { path: "/hooks", label: "Viral Hooks", icon: MessageSquareQuote },
      { path: "/improve", label: "Improve Competitor", icon: Swords },
      { path: "/bio", label: "Bio Generator", icon: User },
      { path: "/caption", label: "Caption Enhancer", icon: Wand2 },
      { path: "/pack", label: "Content Pack", icon: Package2 },
    ],
  },
  {
    label: "Plan",
    items: [
      { path: "/daily", label: "Daily Growth Plan", icon: Flame },
      { path: "/strategy", label: "7-Day Strategy", icon: CalendarDays },
      { path: "/calendar", label: "Content Calendar", icon: Calendar, pro: true },
      { path: "/insights", label: "Analytics", icon: BarChart3, pro: true },
    ],
  },
  {
    label: "Library",
    items: [
      { path: "/saved", label: "Saved", icon: Heart },
      { path: "/history", label: "History", icon: History },
    ],
  },
  {
    label: "Account",
    items: [
      { path: "/referrals", label: "Refer & Earn", icon: Zap },
      { path: "/pricing", label: "Plans & Billing", icon: CreditCard },
      { path: "/support", label: "Support", icon: HelpCircle },
      { path: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const SIDEBAR_NAV = NAV_GROUPS.flatMap((g) => g.items);

const BOTTOM_NAV = [
  { path: "/generate", label: "Generate", icon: Wand2 },
  { path: "/ideas", label: "Ideas", icon: Lightbulb },
  { path: "/saved", label: "Saved", icon: Heart },
  { path: "/history", label: "History", icon: History },
];

function PlanPill({ plan, planType }: { plan?: string; planType?: string }) {
  if (!plan || plan === "free")
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
  if (plan === "active") {
    if (planType === "infinity")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-[#00F2FF]/20 to-sky-500/20 text-[#00F2FF] border border-[#00F2FF]/25 shadow-[0_0_10px_rgba(0,242,255,0.2)]">
          <Crown className="w-2.5 h-2.5" /> Infinity
        </span>
      );
    if (planType === "starter")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00F2FF]/5 text-[#00F2FF]/70 border border-[#00F2FF]/20">
          <Zap className="w-2.5 h-2.5" /> Starter
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00F2FF]/10 text-[#00F2FF]/90 border border-[#00F2FF]/40">
        <Zap className="w-2.5 h-2.5" /> Creator
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
  const remaining = typeof sub.creditsRemaining === "number" ? sub.creditsRemaining : (sub.generationLimit ? Math.max(0, sub.generationLimit - (sub.monthlyGenerationsUsed || 0)) : (sub.plan === "free" ? 5 : 0));
  const total = sub.generationLimit || (sub.planType === 'starter' ? 20 : (sub.planType === 'creator' ? 100 : 5));
  
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
}) {
  const isLocked = pro && !isPro;

  return (
    <Link key={path} href={path}>
      <span
        onClick={onClick}
        className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer relative
          ${isActive
            ? "bg-cyan-600/20 text-white font-medium"
            : isLocked
            ? "text-white/25 hover:bg-white/3 hover:text-white/40"
            : "text-white/55 hover:bg-white/[0.06] hover:text-white/90"
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
  const [streak, setStreak] = useState<number>(0);
  useEffect(() => {
    if (!user) return;
    fetch("/api/daily/streak")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.streak) setStreak(d.streak); })
      .catch(() => {});
  }, [user]);

  return (
    <>
      <div className="px-5 py-4 flex items-center gap-2">
        <Logo size="sm" />
        <span className="text-[10px] font-semibold text-white/40 bg-white/10 border border-white/10 rounded px-1.5 py-0.5 ml-auto shadow-sm">
          v2.0
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
              <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
              <motion.div 
                className="space-y-0.5"
                variants={{
                  show: {
                    transition: {
                      staggerChildren: 0.05
                    }
                  }
                }}
                initial="hidden"
                animate="show"
              >
                {group.items.map(({ path, label, icon, pro }) => (
                  <motion.div
                    key={path}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      show: { opacity: 1, x: 0 }
                    }}
                  >
                    <NavItem
                      path={path}
                      label={label}
                      icon={icon}
                      pro={pro}
                      isPro={isPro}
                      isActive={location === path}
                      onClick={onClick}
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
                  </motion.div>
                ))}
              </motion.div>
          </div>
        ))}
      </div>

      {sub && (sub.plan === "free" || sub.plan === "blocked") && (
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
              50 generations/month · All tools · No limits
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

      {sub && sub.plan === "active" && (
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

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: sub } = useSubscriptionStatus();
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [feedbackTrigger, setFeedbackTrigger] = useState("manual");
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

  // Liquid Motion logic: Smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  const isPro = sub?.planType === "infinity" && sub?.plan === "active";

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden">
      {/* God-Tier Global Graphics */}
      <div className="bg-grid-pattern fixed inset-0 z-0 pointer-events-none opacity-40" />
      <div className="bg-scanlines" />
      <div className="animate-scan" />
      <CustomCursor />
      <aside
        className="hidden md:flex flex-col fixed inset-y-0 left-0 z-50 w-64 xl:w-72 border-r border-white/[0.06]"
        style={{ background: "rgba(8,3,22,0.6)", backdropFilter: "blur(24px)" }}
      >
        <SidebarContent
          isPro={isPro}
          sub={sub}
          user={user}
          signOut={signOut}
          location={location}
        />
      </aside>

      <header
        className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06] sticky top-0 z-50"
        style={{ background: "rgba(10,4,28,0.92)", backdropFilter: "blur(20px)" }}
      >
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          {sub && <PlanPill plan={sub.plan} planType={sub.planType} />}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60">
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-72 p-0 flex flex-col border-l-white/[0.06]"
              style={{ background: "rgba(8,3,22,0.98)", backdropFilter: "blur(24px)" }}
            >
              <SidebarContent
                isPro={isPro}
                sub={sub}
                user={user}
                signOut={signOut}
                location={location}
                onClick={() => setIsSheetOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="md:pl-64 xl:pl-72 min-h-screen flex flex-col">
        <TopBanner />
        <ImpersonationBanner />
        <div className="flex-1 w-full px-4 md:px-8 xl:px-12 py-6 md:py-10 pb-24 md:pb-12">
          <NotificationBanner />
          <FoundersBanner />
          <ReferralRewardNotifier />
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.02, filter: "blur(10px)" }}
              transition={{ type: "spring", stiffness: 200, damping: 30, mass: 1 }}
              className="w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
        <footer className="w-full px-4 md:px-8 xl:px-12 pb-6 md:pb-8">
          <div className="border-t border-white/[0.04] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Logo size="sm" showText={false} />
            <div className="flex items-center gap-4 text-[11px] text-white/25">
              <Link href="/privacy">
                <span className="hover:text-white/50 transition-colors cursor-pointer">Privacy</span>
              </Link>
              <span>·</span>
              <Link href="/terms">
                <span className="hover:text-white/50 transition-colors cursor-pointer">Terms</span>
              </Link>
              <span>·</span>
              <Link href="/support">
                <span className="hover:text-white/50 transition-colors cursor-pointer">Support</span>
              </Link>
            </div>
            <span className="text-[11px] text-white/20">© 2026 GrowFlow AI</span>
          </div>
        </footer>
      </main>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 border-t border-white/[0.06] flex justify-around p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] z-50"
        style={{ background: "rgba(10,4,28,0.96)", backdropFilter: "blur(20px)" }}
      >
        {BOTTOM_NAV.map(({ path, label, icon: Icon }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <span
                className={`flex flex-col items-center gap-0.5 p-2 rounded-lg min-w-[3.5rem] relative
                  ${isActive ? "text-cyan-400" : "text-white/35"}
                `}
              >

                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                <span className="text-[9px] font-medium">{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="mobileNavIndicator"
                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_#00F2FF]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </span>
            </Link>
          );
        })}
      </nav>
      <NotificationPermissionModal />
      <ReferralPopup />

      {user && (
        <>
          <button
            onClick={() => { setFeedbackTrigger("manual"); setShowFeedback(true); }}
            className="fixed bottom-20 md:bottom-6 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-full border border-white/10 text-white/50 hover:text-white/80 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all text-xs font-medium"
            style={{ background: "rgba(10,4,28,0.85)", backdropFilter: "blur(12px)" }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Share Feedback
          </button>
          <FeedbackModal
            open={showFeedback}
            onClose={() => setShowFeedback(false)}
            trigger={feedbackTrigger}
          />
        </>
      )}
    </div>
  );
}
