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

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const SuspenseFallback = () => (
  <div className="flex w-full h-[50vh] items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
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

export function ClerkProviderWithRoutes() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={{
        baseTheme: dark,
        layout: {
          unsafe_disableDevelopmentModeWarnings: true,
          socialButtonsPlacement: "top",
        },
        variables: {
          colorPrimary: '#8b5cf6',
          colorBackground: '#0b0416', // Darker to contrast
          colorInputBackground: 'rgba(255, 255, 255, 0.05)',
          colorInputText: '#ffffff',
          colorText: '#ffffff',
          colorTextSecondary: '#e9d5ff',
          colorSuccess: '#4ade80',
          colorDanger: '#f87171',
          colorWarning: '#fbbf24',
          colorTextOnPrimaryBackground: '#ffffff',
          colorNeutral: '#ffffff',
          borderRadius: '12px',
        },
        elements: {
          card: 'bg-[#100726]/80 backdrop-blur-xl border border-violet-500/30 shadow-2xl shadow-violet-950/60',
          headerTitle: '!text-white font-bold',
          headerSubtitle: '!text-purple-100',
          formButtonPrimary: '!bg-violet-600 hover:!bg-violet-500 !text-white font-semibold shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all ease-out hover:scale-[1.02]',
          formFieldInput: '!bg-white/5 !border !border-white/10 !text-white focus:!border-violet-500 rounded-xl transition-colors',
          formFieldLabel: '!text-purple-100 font-medium',
          dividerLine: '!bg-white/10',
          dividerText: '!text-white/40',
          formFieldErrorText: '!text-red-300 font-medium',
          formFieldSuccessText: '!text-emerald-400 font-medium',
          formFieldInfoText: '!text-violet-300 font-medium',
          alertText: '!text-red-200',
          socialButtonsBlockButton: '!bg-white/5 !border !border-white/10 !text-white hover:!bg-white/10 transition-colors',
          socialButtonsBlockButtonText: '!text-white',
          footerActionText: '!text-white/60',
          footerActionLink: '!text-violet-400 hover:!text-violet-300',
          identityPreviewText: '!text-white',
          identityPreviewEditButton: '!text-violet-400',
          otpCodeFieldInput: '!bg-violet-900/40 !border-2 !border-violet-500/50 !text-white !text-2xl !font-bold !rounded-xl focus:!border-violet-400 focus:!shadow-[0_0_0_3px_rgba(139,92,246,0.25)] !w-11 !h-12',
          otpCodeField: '!gap-2',
          formResendCodeLink: '!text-violet-400 hover:!text-violet-300',
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <LoginTracker />
        <ReferralCodeCapture />
        <React.Suspense fallback={<SuspenseFallback />}>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            <Route path="/generate"><ProtectedRoute component={Generate} /></Route>
            <Route path="/ideas"><ProtectedRoute component={IdeasGenerator} /></Route>
            <Route path="/trends"><ProtectedRoute component={TrendEngine} /></Route>
            <Route path="/strategy"><ProtectedRoute component={StrategyPlanner} /></Route>
            <Route path="/history"><ProtectedRoute component={History} /></Route>
            <Route path="/hooks"><ProtectedRoute component={HooksGenerator} /></Route>
            <Route path="/improve"><ProtectedRoute component={ImproveCompetitorContent} /></Route>
            <Route path="/bio"><ProtectedRoute component={BioGenerator} /></Route>
            <Route path="/caption"><ProtectedRoute component={CaptionEnhancer} /></Route>
            <Route path="/daily"><ProtectedRoute component={DailyActionMode} /></Route>
            <Route path="/pack"><ProtectedRoute component={ContentPack} /></Route>
            <Route path="/calendar"><ProtectedRoute component={ContentCalendar} /></Route>
            <Route path="/insights"><ProtectedRoute component={Insights} /></Route>
            <Route path="/pricing"><Pricing /></Route>
            <Route path="/support">
              <React.Suspense fallback={<SuspenseFallback />}>
                <Support />
              </React.Suspense>
            </Route>
            <Route path="/settings"><ProtectedRoute component={SettingsPage} /></Route>
            <Route path="/saved"><ProtectedRoute component={Saved} /></Route>
            <Route path="/referrals"><ProtectedRoute component={ReferralsPage} /></Route>
            <Route path="/privacy"><Privacy /></Route>
            <Route path="/terms"><Terms /></Route>
            <Route path="/admin"><AdminDashboard /></Route>
            
            <Route component={NotFound} />
          </Switch>
        </React.Suspense>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
