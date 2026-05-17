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
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PageSkeleton } from "@/components/shared/Skeleton";

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
const Templates = React.lazy(() => import("@/pages/core/templates"));
const Review = React.lazy(() => import("@/pages/public/Review"));
const QuickGenerate = React.lazy(() => import("@/pages/core/quick"));
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
const PrivacyPolicy = React.lazy(() => import("@/pages/legal/PrivacyPolicy"));
const TermsAndConditions = React.lazy(() => import("@/pages/legal/TermsAndConditions"));
const RefundPolicy = React.lazy(() => import("@/pages/legal/RefundPolicy"));
const ContactUs = React.lazy(() => import("@/pages/legal/ContactUs"));
const NotFound = React.lazy(() => import("@/pages/legal/not-found"));
const ImproveCompetitorContent = React.lazy(() => import("@/pages/core/improve"));
const BioGenerator = React.lazy(() => import("@/pages/generators/bio"));
const CaptionEnhancer = React.lazy(() => import("@/pages/generators/caption"));
const DailyActionMode = React.lazy(() => import("@/pages/core/daily"));

const AdminDashboard = React.lazy(() => import("@/pages/settings/admin"));
const ReferralsPage = React.lazy(() => import("@/pages/settings/referrals"));
const ContentCoach = React.lazy(() => import("@/pages/core/coach"));
const ContentVault = React.lazy(() => import("@/pages/core/vault"));
const Ghostwriter = React.lazy(() => import("@/pages/generators/ghostwriter"));
const Predictor = React.lazy(() => import("@/pages/generators/predictor"));
const Hashtags = React.lazy(() => import("@/pages/generators/hashtags"));
const Repurpose = React.lazy(() => import("@/pages/generators/repurpose"));
const HookScorer = React.lazy(() => import("@/pages/generators/hook-scorer"));

const CreatorProfile = React.lazy(() => import("@/pages/public/CreatorProfile"));
const TeamPage = React.lazy(() => import("@/pages/core/team"));
const BrandVoice = React.lazy(() => import("@/pages/core/BrandVoice"));
const NicheLanding = React.lazy(() => import("@/pages/seo/NicheLanding"));
const ToolLanding = React.lazy(() => import("@/pages/seo/ToolLanding"));
const BlogPost = React.lazy(() => import("@/pages/seo/BlogPost"));
const Comparison = React.lazy(() => import("@/pages/seo/Comparison"));
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
  const [location, setLocation] = useLocation();
  const isAdminRequest = window.location.search.includes("admin");

  useEffect(() => {
    if (isAdminRequest) {
      setLocation("/admin");
    }
  }, [isAdminRequest, setLocation]);

  return (
    <>
      <SignedIn>
        <Redirect to={isAdminRequest ? "/admin" : "/generate"} />
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
          <React.Suspense fallback={<PageSkeleton />}>
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
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15, ease: "easeOut" }}
    className="w-full"
  >
    {children}
  </motion.div>
);

const SupportWithBoundary = () => (
  <ErrorBoundary
    fallback={
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <h3 className="font-bold text-white mb-2">Support page couldn't load</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Email us directly at: <a href="mailto:growflowhelp@gmail.com" 
            className="underline" style={{ color: '#8B91E3' }}>
            growflowhelp@gmail.com
          </a>
        </p>
        <button onClick={() => window.location.reload()} 
          className="px-4 py-2 rounded-xl text-white text-sm"
          style={{ background: '#5E6AD2' }}>
          Try again
        </button>
      </div>
    }
  >
    <Support />
  </ErrorBoundary>
);

export function ClerkProviderWithRoutes() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    const handlePop = () => {
      setLocation(window.location.pathname);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [setLocation]);

  useEffect(() => {
    const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";
    if (key.startsWith('pk_test_')) {
      console.warn('[GrowFlow] Using TEST Clerk key. If on production, check Railway env vars.');
      if (key.includes('test')) {
        document.title = '[TEST] GrowFlow AI';
      }
    }
  }, []);

  useEffect(() => {
    const prefetch = setTimeout(() => {
      import("@/pages/core/generate");
      import("@/pages/generators/hooks");
      import("@/pages/core/history");
    }, 2000);
    return () => clearTimeout(prefetch);
  }, []);

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      afterSignOutUrl="/"
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      {...(clerkProxyUrl ? { proxyUrl: clerkProxyUrl } : {})}
      appearance={{
        baseTheme: dark,
        layout: {
          unsafe_disableDevelopmentModeWarnings: true,
          socialButtonsPlacement: "top",
        },
        variables: {
          colorPrimary: '#5E6AD2',
          colorBackground: '#0B1215',
          colorInputBackground: 'rgba(124, 58, 237, 0.05)',
          colorInputText: '#ffffff',
          colorText: '#ffffff',
          colorTextSecondary: '#CBD5E1',
          colorSuccess: '#5E6AD2',
          colorDanger: '#ef4444',
          colorWarning: '#f59e0b',
          colorNeutral: '#1a1a2e',
          fontSize: '14px',
          borderRadius: '12px',
        },
        elements: {
          card: 'bg-[var(--surface-1)]/80 !backdrop-blur-xl border border-[rgba(94,106,210,0.30)] shadow-2xl shadow-[rgba(94,106,210,0.40)] !w-full',
          navbar: 'hidden',
          headerTitle: 'text-white text-2xl font-black',
          headerSubtitle: 'text-white/50 font-medium',
          formButtonPrimary: 'bg-[#5E6AD2] hover:bg-[#5E6AD2] text-white font-black transition-all',
          formFieldInput: '!bg-white/5 !border !border-white/10 !text-white focus:!border-[rgba(94,106,210,0.4)] rounded-xl transition-colors',
          formFieldLabel: '!text-[#8B91E3] font-medium',
          socialButtonsBlockButton: '!bg-white/5 !border !border-white/10 hover:!bg-white/10 !text-white !font-bold transition-all !rounded-xl',
          socialButtonsIconButton: '!bg-white/10 !border !border-white/20 hover:!bg-white/20 transition-colors',
          socialButtonsProviderIcon: '!opacity-100 !visible !block !w-5 !h-5 !min-w-[20px] !min-h-[20px]',
          socialButtonsBlockButton__github: 'hidden',
          socialButtonsIconButton__github: 'hidden',
          footerActionLink: 'text-[#8B91E3] hover:text-[#8B91E3] font-bold',
          identityPreviewText: 'text-white',
          identityPreviewEditButtonIcon: 'text-[#8B91E3]',
          rootBox: '!w-full',
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
        <ErrorBoundary>
          <React.Suspense fallback={<PageSkeleton />}>
            <Switch>
              <Route path="/"><HomeRedirect /></Route>
              <Route path="/sign-in/*?"><SignInPage /></Route>
              <Route path="/sign-up/*?"><SignUpPage /></Route>
              
              <Route path="/generate"><ProtectedRoute component={Generate} /></Route>
              <Route path="/templates"><ProtectedRoute component={Templates} /></Route>
              <Route path="/quick"><ProtectedRoute component={QuickGenerate} /></Route>
              <Route path="/ideas"><ProtectedRoute component={IdeasGenerator} /></Route>
              <Route path="/trends"><ProtectedRoute component={TrendEngine} /></Route>
              <Route path="/strategy"><ProtectedRoute component={StrategyPlanner} /></Route>
              <Route path="/history"><ProtectedRoute component={History} /></Route>
              <Route path="/hooks"><ProtectedRoute component={HooksGenerator} /></Route>
              <Route path="/improve"><ProtectedRoute component={ImproveCompetitorContent} /></Route>
              <Route path="/bio"><ProtectedRoute component={BioGenerator} /></Route>
              <Route path="/caption"><ProtectedRoute component={CaptionEnhancer} /></Route>
              <Route path="/daily"><ProtectedRoute component={DailyActionMode} /></Route>

              <Route path="/calendar"><ProtectedRoute component={ContentCalendar} /></Route>
              <Route path="/insights"><ProtectedRoute component={Insights} /></Route>
              <Route path="/pricing"><Pricing /></Route>
              <Route path="/support"><ProtectedRoute component={SupportWithBoundary} /></Route>
              <Route path="/settings"><ProtectedRoute component={SettingsPage} /></Route>
              <Route path="/saved"><ProtectedRoute component={Saved} /></Route>
              <Route path="/referrals"><ProtectedRoute component={ReferralsPage} /></Route>
              <Route path="/privacy-policy"><PrivacyPolicy /></Route>
              <Route path="/terms-and-conditions"><TermsAndConditions /></Route>
              <Route path="/refund-policy"><RefundPolicy /></Route>
              <Route path="/contact"><ContactUs /></Route>
              <Route path="/admin"><ProtectedRoute component={AdminDashboard} /></Route>
              <Route path="/coach"><ProtectedRoute component={ContentCoach} /></Route>
              
              <Route path="/vault"><ProtectedRoute component={() => <ContentVault initialTab="my-content" />} /></Route>
              <Route path="/swipe-vault"><ProtectedRoute component={() => <ContentVault initialTab="inspiration" />} /></Route>
              <Route path="/brand-voice"><ProtectedRoute component={BrandVoice} /></Route>
              
              {/* SEO Niche Pages */}
              <Route path="/for/fitness-creators"><NicheLanding niche="fitness" /></Route>
              <Route path="/for/finance-creators"><NicheLanding niche="finance" /></Route>
              <Route path="/for/tech-creators"><NicheLanding niche="tech" /></Route>
              <Route path="/for/food-bloggers"><NicheLanding niche="food" /></Route>
  
              {/* SEO Tool Pages */}
              <Route path="/tools/:tool">{(params) => <ToolLanding tool={params.tool} />}</Route>
  
              {/* SEO Blog */}
              <Route path="/blog/:slug">{(params) => <BlogPost slug={params.slug} />}</Route>
  
              {/* SEO Comparison */}
              <Route path="/vs/:slug">{(params) => <Comparison slug={params.slug} />}</Route>
  
              <Route path="/ghostwriter"><ProtectedRoute component={Ghostwriter} /></Route>
              <Route path="/predictor"><ProtectedRoute component={Predictor} /></Route>
              <Route path="/hashtags"><ProtectedRoute component={Hashtags} /></Route>
              <Route path="/repurpose"><ProtectedRoute component={Repurpose} /></Route>
              <Route path="/hook-scorer"><ProtectedRoute component={HookScorer} /></Route>

              <Route path="/creator/:code"><CreatorProfile /></Route>
              <Route path="/team"><ProtectedRoute component={TeamPage} /></Route>
              <Route path="/review/:shareId"><Review /></Route>
              
              <Route><NotFound /></Route>
            </Switch>
          </React.Suspense>
        </ErrorBoundary>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
