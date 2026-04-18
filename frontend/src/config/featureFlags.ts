export const FEATURE_FLAGS = {
  // Master switch for the Simulation Beta Mode
  IS_GHOST_BETA: import.meta.env.VITE_APP_STATUS === "BETA" || true, // Default to true based on user directive
  
  // Specific UI flags
  SHOW_BUY_NOW_BUTTON: false, // In Ghost Beta, we show "Beta Access Active" instead
  SHOW_BETA_BADGE: true,
  
  // Pricing/Features
  UNLIMITED_ACCESS: true,
};
