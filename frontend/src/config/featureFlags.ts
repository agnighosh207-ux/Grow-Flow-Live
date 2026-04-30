export const FEATURE_FLAGS = {
  // Master switch for the Simulation Beta Mode
  IS_GHOST_BETA: import.meta.env.VITE_APP_STATUS === "BETA",
  
  // Specific UI flags
  SHOW_BUY_NOW_BUTTON: import.meta.env.VITE_APP_STATUS !== "BETA",
  SHOW_BETA_BADGE: import.meta.env.VITE_APP_STATUS === "BETA",
  
  // Pricing/Features
  UNLIMITED_ACCESS: true,
};
