import React from "react";
import { SignIn, SignUp } from "@clerk/react";
import { AuthBackground, PasswordRequirements } from "./AuthComponents";

export const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
export const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

export function SignInPage() {
  return (
    <AuthBackground>
      <SignIn 
        fallbackRedirectUrl={`${basePath}/generate`}
        forceRedirectUrl={`${basePath}/generate`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </AuthBackground>
  );
}

export function SignUpPage() {
  return (
    <AuthBackground>
      <SignUp 
        fallbackRedirectUrl={`${basePath}/generate`}
        forceRedirectUrl={`${basePath}/generate`}
        signInUrl={`${basePath}/sign-in`}
      />
      <PasswordRequirements />
    </AuthBackground>
  );
}
