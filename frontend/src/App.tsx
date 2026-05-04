import React from "react";
import { Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MaintenanceOverlay } from "@/components/layout/MaintenanceOverlay";
import { AppErrorBoundary } from "@/components/errors/AppErrorBoundary";
import { ClerkProviderWithRoutes } from "./AppRoutes";
import { basePath } from "@/components/auth/AuthPages";

function App() {
  return (
    <TooltipProvider>
      <AppErrorBoundary>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <MaintenanceOverlay />
      </AppErrorBoundary>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
