import { Globe, Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_LANGUAGES, RTL_LANGUAGES } from "@/lib/languages";

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  isFreeUser: boolean;
  onUpgradeRequired?: () => void;
  className?: string;
  label?: string;
  planType?: string;
  regionalLanguageLock?: string | null;
}

export function LanguageSelector({
  value,
  onChange,
  isFreeUser,
  onUpgradeRequired,
  className = "",
  label = "Content Language",
  planType = "free",
  regionalLanguageLock = null,
}: Readonly<LanguageSelectorProps>) {
  const handleChange = (newValue: string) => {
    // Free users: block all non-English
    if (isFreeUser && newValue !== "English") {
      onUpgradeRequired?.();
      return;
    }

    // Starter users: block if they try to change their already-locked regional language
    if (planType === "starter" && regionalLanguageLock && newValue !== "English" && newValue !== regionalLanguageLock) {
      onUpgradeRequired?.();
      return;
    }

    onChange(newValue);
  };

  const selectedLang = SUPPORTED_LANGUAGES.find(l => l.value === value);
  const isRTL = RTL_LANGUAGES.includes(value);

  return (
    <div className={className}>
      <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
        <Globe className="w-3 h-3" />
        {label}
      </label>
      <style dangerouslySetInnerHTML={{ __html: `
        .language-select-content [data-radix-select-viewport] {
          scrollbar-width: thin !important;
          scrollbar-color: rgba(124, 58, 237, 0.2) transparent !important;
        }
        .language-select-content [data-radix-select-viewport]::-webkit-scrollbar {
          width: 4px !important;
          display: block !important;
        }
        .language-select-content [data-radix-select-viewport]::-webkit-scrollbar-track {
          background: transparent !important;
        }
        .language-select-content [data-radix-select-viewport]::-webkit-scrollbar-thumb {
          background-color: rgba(124, 58, 237, 0.3) !important;
          border-radius: 10px !important;
        }
        .language-select-item {
          transition: all 0.2s ease;
        }
        .language-select-item:focus, .language-select-item[data-highlighted] {
          background: rgba(124, 58, 237, 0.1) !important;
          color: #5E6AD2 !important;
          outline: none !important;
        }
      `}} />
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="bg-white/[0.03] backdrop-blur-md border border-white/10 text-white focus:ring-[rgba(94,106,210,0.40)] rounded-xl transition-all hover:bg-white/10 h-11">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent className="glass-panel-premium border-white/10 rounded-xl max-h-[330px] language-select-content shadow-2xl">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem
              key={lang.value}
              value={lang.value}
              className="text-white/80 language-select-item cursor-pointer py-2.5"
            >
              <span className="flex items-center gap-2">
                {(isFreeUser && lang.value !== "English") || (planType === "starter" && regionalLanguageLock && lang.value !== "English" && lang.value !== regionalLanguageLock) ? (
                  <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                ) : null}
                <span className="font-medium">
                  {lang.label}
                  {lang.native ? (
                    <span className="text-white/40 ml-1.5 text-[11px] font-normal group-focus:text-[rgba(139,145,227,0.60)]">
                      {lang.native}
                    </span>
                  ) : ""}
                </span>
                {RTL_LANGUAGES.includes(lang.value) && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600/20 text-indigo-400 font-medium ml-1">
                    RTL
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value !== "English" && (
        <p className="text-xs text-white/40 mt-1.5">
          Output will be in {selectedLang?.label || value}.
          {" "}Hashtags and keywords will also be in {selectedLang?.label || value}.
          {isRTL && (
            <span className="block text-indigo-400 mt-0.5">
              ⚡ Content will be right-to-left (RTL)
            </span>
          )}
        </p>
      )}
    </div>
  );
}
