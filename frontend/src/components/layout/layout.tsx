import { ReactNode, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBanner } from "@/components/banners/NotificationBanner";
import { NotificationPermissionModal } from "@/components/modals/NotificationPermissionModal";
import { ReferralPopup } from "@/components/modals/ReferralPopup";
import { FoundersBanner } from "@/components/banners/FoundersBanner";
import { TopBanner } from "@/components/banners/TopBanner";
import { BetaBanner } from "@/components/banners/BetaBanner";
import { FeedbackModal, checkShouldShowFeedback } from "@/components/modals/FeedbackModal";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/20">
        <Zap className="w-2.5 h-2.5" /> Trial
      </span>
    );
  if (plan === "active") {
    if (planType === "infinity")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-200 border border-violet-400/25">
          <Crown className="w-2.5 h-2.5" /> Infinity
        </span>
      );
    if (planType === "starter")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/20">
          <Zap className="w-2.5 h-2.5" /> Starter
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
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
            ? "bg-violet-600/20 text-white font-medium"
            : isLocked
            ? "text-white/25 hover:bg-white/3 hover:text-white/40"
            : "text-white/55 hover:bg-white/[0.06] hover:text-white/90"
          }
        `}
      >
        {isActive && (
          <span className="absolute left-0 inset-y-1 w-0.5 rounded-r-full bg-violet-500" />
        )}
        <Icon
          className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-violet-400" : ""}`}
        />
        <span className="text-sm flex-1 truncate">{label}</span>
        {badge}
        {isLocked && <Lock className="w-3 h-3 text-violet-500/40 flex-shrink-0" />}
        {pro && isPro && (
          <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-1.5 py-0.5 flex-shrink-0">
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
        <span className="text-[10px] font-semibold text-white/20 bg-white/5 border border-white/8 rounded px-1.5 py-0.5 ml-auto">
          v2.0
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest px-3 mb-1.5">
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
      </div>

      {sub && (sub.plan === "free" || sub.plan === "blocked") && (
        <Link href="/pricing">
          <div id="tour-upgrade" className="mx-3 mb-3 p-3 rounded-xl cursor-pointer group"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(168,85,247,0.1) 100%)",
              border: "1px solid rgba(124,58,237,0.25)",
            }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs font-semibold text-white/80">Unlock Full Power</span>
            </div>
            <p className="text-[11px] text-white/40 mb-2.5 leading-relaxed">
              50 generations/month · All tools · No limits
            </p>
            <div className="flex items-center gap-1 text-xs font-semibold text-violet-300 group-hover:text-violet-200 transition-colors">
              Get unlimited access <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>
      )}

      {sub && sub.plan === "trial" && (
        <div className="mx-3 mb-3 p-3 rounded-xl"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-violet-300">Trial Active</span>
            {sub.trialDaysLeft !== null && (
              <span className="text-[10px] text-white/40">{sub.trialDaysLeft}d left</span>
            )}
          </div>
          <Link href="/pricing">
            <span className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors cursor-pointer">
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
              <span className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold cursor-pointer">
                Upgrade
              </span>
            </Link>
          )}
        </div>
      )}

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

  const isPro = sub?.planType === "infinity" && sub?.plan === "active";

  return (
    <div
      className="min-h-screen text-foreground"
      style={{
        background:
          "radial-gradient(ellipse 100% 60% at 50% -10%, rgba(109,40,217,0.18) 0%, #06011a 55%, #020010 100%)",
      }}
    >
      <aside
        className="hidden md:flex flex-col fixed inset-y-0 left-0 z-50 w-64 xl:w-72 border-r border-white/[0.06]"
        style={{ background: "rgba(8,3,22,0.92)", backdropFilter: "blur(24px)" }}
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
        <BetaBanner />
        <div className="flex-1 w-full px-4 md:px-8 xl:px-12 py-6 md:py-10 pb-24 md:pb-12">
          <NotificationBanner />
          <FoundersBanner />
          <ReferralRewardNotifier />
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
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
                  ${isActive ? "text-violet-400" : "text-white/35"}
                `}
              >

                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium">{label}</span>
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
            className="fixed bottom-20 md:bottom-6 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-full border border-white/10 text-white/50 hover:text-white/80 hover:border-violet-500/40 hover:bg-violet-500/10 transition-all text-xs font-medium"
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
