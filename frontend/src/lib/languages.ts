export const SUPPORTED_LANGUAGES = [
  { value: "English", label: "English", native: "" },
  { value: "Hindi", label: "Hindi", native: "हिन्दी" },
  { value: "Hinglish", label: "Hinglish", native: "GenZ Hindi" },
  { value: "Bengali", label: "Bengali", native: "বাংলা" },
  { value: "Gujarati", label: "Gujarati", native: "ગુજરાતી" },
  { value: "Kannada", label: "Kannada", native: "ಕನ್ನಡ" },
  { value: "Malayalam", label: "Malayalam", native: "മലയാളം" },
  { value: "Marathi", label: "Marathi", native: "मराठी" },
  { value: "Punjabi", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { value: "Odia", label: "Odia", native: "ଓଡ଼ିଆ" },
  { value: "Assamese", label: "Assamese", native: "অসমীয়া" },
  { value: "Tamil", label: "Tamil", native: "தமிழ்" },
  { value: "Telugu", label: "Telugu", native: "తెలుగు" },
  { value: "Urdu", label: "Urdu (RTL)", native: "اردو" },
  { value: "Bhojpuri", label: "Bhojpuri", native: "भोजपुरी" },
  { value: "Spanish", label: "Spanish", native: "Español" },
  { value: "French", label: "French", native: "Français" },
  { value: "German", label: "German", native: "Deutsch" },
] as const;

export type LanguageValue = typeof SUPPORTED_LANGUAGES[number]["value"];

export const RTL_LANGUAGES = ["Urdu"];

export const PREMIUM_LANGUAGES = SUPPORTED_LANGUAGES
  .filter(l => l.value !== "English")
  .map(l => l.value);
