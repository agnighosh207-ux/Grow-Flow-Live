import React from "react";
import { SignIn, SignUp } from "@clerk/react";
import { AuthBackground, PasswordRequirements } from "./AuthComponents";

function sanitizeClerkPublishableKey(key: string | undefined): string | undefined {
  if (!key || typeof key !== 'string') return key;
  if (!key.startsWith('pk_test_') && !key.startsWith('pk_live_')) return key;
  try {
    const prefix = key.startsWith('pk_test_') ? 'pk_test_' : 'pk_live_';
    const parts = key.split('_');
    const encodedPart = parts[2];
    if (!encodedPart) return key;

    // Decode base64 browser-safe
    const decoded = atob(encodedPart);

    if (decoded.includes('$')) {
      const decodedParts = decoded.split('$');
      const frontendApi = decodedParts[0];
      if (frontendApi && frontendApi.includes('.')) {
        // Re-encode to the classic format: frontendApi + "$"
        const cleanDecoded = `${frontendApi}$`;
        const cleanEncoded = btoa(cleanDecoded).replace(/=+$/, '');
        return `${prefix}${cleanEncoded}`;
      }
    }
  } catch (err) {
    // ignore
  }
  return key;
}

const rawEnvKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const rawKey = (!rawEnvKey || rawEnvKey.startsWith('pk_test_') || rawEnvKey.includes('REPLACE_WITH_LIVE_KEY'))
  ? 'pk_live_Y2xlcmsuZ3Jvd2Zsb3dhaS5zcGFjZSRpbnNfM0RpZ3ZTVGFMT09jMHVVV0RaZGM4MXc4M3o='
  : rawEnvKey;

export const clerkPubKey = sanitizeClerkPublishableKey(rawKey) || rawKey;
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
