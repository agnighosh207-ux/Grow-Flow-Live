export const SUPPORTED_LANGUAGES = [
  "English", "Hindi", "Hinglish", "Bengali", "Gujarati", "Kannada",
  "Malayalam", "Marathi", "Punjabi", "Odia", "Assamese", "Tamil",
  "Telugu", "Urdu", "Bhojpuri", "Spanish", "French", "German"
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  English: "",
  Hindi: "LANGUAGE — You MUST write the complete content deeply and fluently in raw Hindi using the Devanagari script (हिन्दी). Do NOT use English letters to write Hindi. The tone should be highly emotional and storytelling-driven.",
  Hinglish: "LANGUAGE — You MUST write the complete content in Hinglish (Hindi written entirely in the Roman/English alphabet, mixed with casual English words). This needs to read incredibly casual, GenZ style, and highly relatable to young desis. Keep the energy viral and raw. Avoid formal Hindi words.",
  Bengali: "LANGUAGE — You MUST write the complete content natively and fluently in Bengali using the Bengali script (বাংলা). Do NOT use English letters to write Bengali. Keep the tone very engaging, culturally grounded, and natural sounding.",
  Gujarati: "LANGUAGE — You MUST write the complete content natively and fluently in Gujarati using the Gujarati script (ગુજરાતી). Do NOT use English letters. Keep the tone engaging, warm, and culturally grounded for Gujarati-speaking audiences.",
  Kannada: "LANGUAGE — You MUST write the complete content natively and fluently in Kannada using the Kannada script (ಕನ್ನಡ). Do NOT use English letters. Keep the tone natural and culturally resonant.",
  Malayalam: "LANGUAGE — You MUST write the complete content natively and fluently in Malayalam using the Malayalam script (മലയാളം). Do NOT use English letters. Keep the tone engaging and natural.",
  Marathi: "LANGUAGE — You MUST write the complete content fluently in Marathi using the Devanagari script (मराठी). Do NOT use English letters to write Marathi.",
  Punjabi: "LANGUAGE — You MUST write the complete content natively and fluently in Punjabi using the Gurmukhi script (ਪੰਜਾਬੀ). Do NOT use English letters to write Punjabi. Keep the energy vibrant and culturally authentic.",
  Odia: "LANGUAGE — You MUST write the complete content natively and fluently in Odia using the Odia script (ଓଡ଼ିଆ). Do NOT use English letters. Keep the tone warm and culturally grounded.",
  Assamese: "LANGUAGE — You MUST write the complete content natively and fluently in Assamese using the Assamese-Bengali script (অসমীয়া). Do NOT use English letters. Keep the tone natural and culturally resonant for Assamese audiences.",
  Tamil: "LANGUAGE — You MUST write the complete content fluently in Tamil using the Tamil script (தமிழ்). Do NOT use English letters to write Tamil.",
  Telugu: "LANGUAGE — You MUST write the complete content fluently in Telugu using the Telugu script (తెలుగు). Do NOT use English letters to write Telugu.",
  Urdu: "LANGUAGE — You MUST write the complete content natively and fluently in Urdu using the Nastaliq script (اردو). This is a RIGHT-TO-LEFT language — structure sentences accordingly. Do NOT use English or Devanagari letters. Keep the tone poetic, emotional, and literary in style.",
  Bhojpuri: "LANGUAGE — You MUST write the complete content in Bhojpuri using the Devanagari script (भोजपुरी). Bhojpuri is highly emotional, storytelling-driven, and deeply colloquial. Use authentic Bhojpuri words, expressions, and sentence rhythm — NOT formal Hindi. The tone should feel raw, relatable, and rooted in Bhojpuri culture.",
  Spanish: "LANGUAGE — You MUST write the complete content fluently in Spanish (Español). Keep the tone culturally appropriate and natural sounding.",
  French: "LANGUAGE — You MUST write the complete content fluently in French (Français). Keep the tone culturally appropriate and natural sounding.",
  German: "LANGUAGE — You MUST write the complete content fluently in German (Deutsch). Keep the tone culturally appropriate and natural sounding.",
};
