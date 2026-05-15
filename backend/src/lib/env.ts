export const IS_PRODUCTION = 
  process.env.NODE_ENV === "production" ||
  (process.env.APP_STATUS || "") === "PRODUCTION" ||
  (process.env.APP_STATUS || "") === "LIVE" ||
  (process.env.APP_STATUS || "") === "BETA" ||
  !!process.env.RAILWAY_ENVIRONMENT;
