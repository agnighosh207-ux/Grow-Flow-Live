export const APP_MODE: "beta" | "live" = (import.meta.env.VITE_APP_MODE as any) || "beta";
export const IS_BETA = APP_MODE === "beta";
