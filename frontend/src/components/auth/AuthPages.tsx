import React from "react";
import { SignIn, SignUp } from "@clerk/react";
import { AuthBackground, PasswordRequirements } from "./AuthComponents";

const envKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
export const clerkPubKey = (!envKey || envKey.startsWith('pk_test_') || envKey.includes('REPLACE_WITH_LIVE_KEY'))
  ? 'pk_live_Y2xlcmsuZ3Jvd2Zsb3dhaS5zcGFjZSQ'
  : envKey;
export const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL || undefined;
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
        routing="path"
        path="/sign-in"
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
        routing="path"
        path="/sign-up"
        fallbackRedirectUrl={`${basePath}/generate`}
        forceRedirectUrl={`${basePath}/generate`}
        signInUrl={`${basePath}/sign-in`}
      />
      <PasswordRequirements />
    </AuthBackground>
  );
}
