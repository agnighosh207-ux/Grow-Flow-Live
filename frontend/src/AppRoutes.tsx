import React, { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { ClerkProvider } from "@clerk/react";
import { dark } from "@clerk/themes";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { clerkPubKey, clerkProxyUrl, basePath, stripBase } from "@/components/auth/AuthPages";
import { SignInPage, SignUpPage } from "@/components/auth/AuthPages";
import { 
  ClerkQueryClientCacheInvalidator, 
  LoginTracker, 
  ReferralCodeCapture,
  SignedIn,
  SignedOut
} from "@/components/auth/AuthComponents";
import { useAuth } from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

function ApiAuthBridge() {
  const { getToken } = useAuth();
  
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  return null;
}

import { Layout } from "@/components/layout/layout";
const Home = React.lazy(() => import("@/pages/core/home"));
const Generate = React.lazy(() => import("@/pages/core/generate"));
const History = React.lazy(() => import("@/pages/core/history"));
const HooksGenerator = React.lazy(() => import("@/pages/generators/hooks"));
const Pricing = React.lazy(() => import("@/pages/settings/pricing"));
const IdeasGenerator = React.lazy(() => import("@/pages/generators/ideas"));
const StrategyPlanner = React.lazy(() => import("@/pages/generators/strategy"));
const Support = React.lazy(() => import("@/pages/settings/support"));
const SettingsPage = React.lazy(() => import("@/pages/settings/settings"));
const Saved = React.lazy(() => import("@/pages/core/saved"));
const ContentCalendar = React.lazy(() => import("@/pages/core/calendar"));
const Insights = React.lazy(() => import("@/pages/core/insights"));
const TrendEngine = React.lazy(() => import("@/pages/core/trends"));
const Privacy = React.lazy(() => import("@/pages/legal/privacy"));
const Terms = React.lazy(() => import("@/pages/legal/terms"));
const NotFound = React.lazy(() => import("@/pages/legal/not-found"));
const ImproveCompetitorContent = React.lazy(() => import("@/pages/core/improve"));
const BioGenerator = React.lazy(() => import("@/pages/generators/bio"));
const CaptionEnhancer = React.lazy(() => import("@/pages/generators/caption"));
const DailyActionMode = React.lazy(() => import("@/pages/core/daily"));
const ContentPack = React.lazy(() => import("@/pages/generators/pack"));
const AdminDashboard = React.lazy(() => import("@/pages/settings/admin"));
const ReferralsPage = React.lazy(() => import("@/pages/settings/referrals"));
const ContentCoach = React.lazy(() => import("@/pages/core/coach"));
const SwipeVault = React.lazy(() => import("@/pages/core/vault"));
const Ghostwriter = React.lazy(() => import("@/pages/generators/ghostwriter"));
const Predictor = React.lazy(() => import("@/pages/generators/predictor"));
const Hashtags = React.lazy(() => import("@/pages/generators/hashtags"));
const Repurpose = React.lazy(() => import("@/pages/generators/repurpose"));
const ABTest = React.lazy(() => import("@/pages/generators/ab-test"));
const HookScorer = React.lazy(() => import("@/pages/generators/hook-scorer"));
const CreatorProfile = React.lazy(() => import("@/pages/public/CreatorProfile"));
import { OnboardingModal } from "@/components/modals/OnboardingModal";

const SuspenseFallback = () => (
  <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
    <div className="flex flex-col gap-2">
      <div className="h-10 w-64 bg-white/5 rounded-lg" />
      <div className="h-4 w-96 bg-white/5 rounded-lg" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-48 bg-white/5 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
        </div>
      ))}
    </div>
    <div className="h-64 bg-white/5 rounded-2xl border border-white/10 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
    </div>
  </div>
);


function HomeRedirect() {
  return (
    <>
      <SignedIn>
        <Redirect to="/generate" />
      </SignedIn>
      <SignedOut>
        <Home />
      </SignedOut>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  return (
    <>
      <SignedIn>
        <Layout>
          <React.Suspense fallback={<SuspenseFallback />}>
            <Component />
          </React.Suspense>
        </Layout>
      </SignedIn>
      <SignedOut>
        <Redirect to="/" />
      </SignedOut>
    </>
  );
}

import { motion, AnimatePresence } from "framer-motion";

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    className="w-full"
  >
    {children}
  </motion.div>
);

export function ClerkProviderWithRoutes() {
  const [location] = useLocation();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      {...(clerkProxyUrl ? { proxyUrl: clerkProxyUrl } : {})}
      appearance={{
        baseTheme: dark,
        layout: {
          unsafe_disableDevelopmentModeWarnings: true,
          socialButtonsPlacement: "top",
        },
        variables: {
          colorPrimary: '#00F2FF',
          colorBackground: '#0B1215',
          colorInputBackground: 'rgba(0, 242, 255, 0.05)',
          colorInputText: '#ffffff',
          colorText: '#ffffff',
          colorTextSecondary: '#94A3B8',
          colorSuccess: '#00F2FF',
          borderRadius: '12px',
        },
        elements: {
          card: 'bg-[#101C20]/80 backdrop-blur-xl border border-cyan-500/30 shadow-2xl shadow-cyan-950/60',
          headerTitle: '!text-white font-bold',
          headerSubtitle: '!text-cyan-100',
          formButtonPrimary: '!bg-cyan-600 hover:!bg-cyan-500 !text-white font-semibold shadow-[0_0_15px_rgba(0,242,255,0.4)] transition-all ease-out hover:scale-[1.02]',
          formFieldInput: '!bg-white/5 !border !border-white/10 !text-white focus:!border-cyan-500 rounded-xl transition-colors',
          formFieldLabel: '!text-cyan-100 font-medium',
          socialButtonsBlockButton: '!bg-white/5 !border !border-white/10 !text-white hover:!bg-white/10 transition-colors',
          footerActionLink: '!text-cyan-400 hover:!text-cyan-300',
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ApiAuthBridge />
        <ClerkQueryClientCacheInvalidator />
        <LoginTracker />
        <ReferralCodeCapture />
        <SignedIn>
          <OnboardingModal />
        </SignedIn>
        <React.Suspense fallback={<SuspenseFallback />}>
          <AnimatePresence mode="wait">
            <Switch key={location}>
              <Route path="/">
                <PageTransition><HomeRedirect /></PageTransition>
              </Route>
              <Route path="/sign-in/*?">
                <PageTransition><SignInPage /></PageTransition>
              </Route>
              <Route path="/sign-up/*?">
                <PageTransition><SignUpPage /></PageTransition>
              </Route>
              
              <Route path="/generate">
                <PageTransition><ProtectedRoute component={Generate} /></PageTransition>
              </Route>
              <Route path="/ideas">
                <PageTransition><ProtectedRoute component={IdeasGenerator} /></PageTransition>
              </Route>
              <Route path="/trends">
                <PageTransition><ProtectedRoute component={TrendEngine} /></PageTransition>
              </Route>
              <Route path="/strategy">
                <PageTransition><ProtectedRoute component={StrategyPlanner} /></PageTransition>
              </Route>
              <Route path="/history">
                <PageTransition><ProtectedRoute component={History} /></PageTransition>
              </Route>
              <Route path="/hooks">
                <PageTransition><ProtectedRoute component={HooksGenerator} /></PageTransition>
              </Route>
              <Route path="/improve">
                <PageTransition><ProtectedRoute component={ImproveCompetitorContent} /></PageTransition>
              </Route>
              <Route path="/bio">
                <PageTransition><ProtectedRoute component={BioGenerator} /></PageTransition>
              </Route>
              <Route path="/caption">
                <PageTransition><ProtectedRoute component={CaptionEnhancer} /></PageTransition>
              </Route>
              <Route path="/daily">
                <PageTransition><ProtectedRoute component={DailyActionMode} /></PageTransition>
              </Route>
              <Route path="/pack">
                <PageTransition><ProtectedRoute component={ContentPack} /></PageTransition>
              </Route>
              <Route path="/calendar">
                <PageTransition><ProtectedRoute component={ContentCalendar} /></PageTransition>
              </Route>
              <Route path="/insights">
                <PageTransition><ProtectedRoute component={Insights} /></PageTransition>
              </Route>
              <Route path="/pricing">
                <PageTransition><Pricing /></PageTransition>
              </Route>
              <Route path="/support">
                <PageTransition><Support /></PageTransition>
              </Route>
              <Route path="/settings">
                <PageTransition><ProtectedRoute component={SettingsPage} /></PageTransition>
              </Route>
              <Route path="/saved">
                <PageTransition><ProtectedRoute component={Saved} /></PageTransition>
              </Route>
              <Route path="/referrals">
                <PageTransition><ProtectedRoute component={ReferralsPage} /></PageTransition>
              </Route>
              <Route path="/privacy">
                <PageTransition><Privacy /></PageTransition>
              </Route>
              <Route path="/terms">
                <PageTransition><Terms /></PageTransition>
              </Route>
              <Route path="/admin">
                <PageTransition><ProtectedRoute component={AdminDashboard} /></PageTransition>
              </Route>
              
              <Route path="/coach">
                <PageTransition><ProtectedRoute component={ContentCoach} /></PageTransition>
              </Route>
              <Route path="/vault">
                <PageTransition><ProtectedRoute component={SwipeVault} /></PageTransition>
              </Route>
              <Route path="/ghostwriter">
                <PageTransition><ProtectedRoute component={Ghostwriter} /></PageTransition>
              </Route>
              <Route path="/predictor">
                <PageTransition><ProtectedRoute component={Predictor} /></PageTransition>
              </Route>
              <Route path="/hashtags">
                <PageTransition><ProtectedRoute component={Hashtags} /></PageTransition>
              </Route>
              <Route path="/repurpose">
                <PageTransition><ProtectedRoute component={Repurpose} /></PageTransition>
              </Route>
              <Route path="/ab-test">
                <PageTransition><ProtectedRoute component={ABTest} /></PageTransition>
              </Route>
              <Route path="/hook-scorer">
                <PageTransition><ProtectedRoute component={HookScorer} /></PageTransition>
              </Route>
              <Route path="/creator/:code">
                <PageTransition><CreatorProfile /></PageTransition>
              </Route>
              
              <Route>
                <PageTransition><NotFound /></PageTransition>
              </Route>
            </Switch>
          </AnimatePresence>
        </React.Suspense>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
