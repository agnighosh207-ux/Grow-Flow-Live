import { useState, useEffect } from "react";
import { PlanGate, useTrialAction } from "@/components/shared/PlanGate";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGenerateHooks } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Copy, MessageSquareQuote, Loader2, Zap, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { PageHeader } from "@/components/shared/PageHeader";

const HOOK_PATTERN_LABELS = [
  { type: "Curiosity Gap", color: "bg-violet-500/15 text-violet-300 border-violet-500/20" },
  { type: "Bold Claim", color: "bg-orange-500/15 text-orange-300 border-orange-500/20" },
  { type: "Relatable Pain", color: "bg-blue-500/15 text-blue-300 border-blue-500/20" },
  { type: "Controversial", color: "bg-red-500/15 text-red-300 border-red-500/20" },
  { type: "Pattern Interrupt", color: "bg-pink-500/15 text-pink-300 border-pink-500/20" },
  { type: "Specificity Hook", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" },
  { type: "Identity Signal", color: "bg-amber-500/15 text-amber-300 border-amber-500/20" },
  { type: "Story Opener", color: "bg-violet-500/15 text-violet-300 border-violet-500/20" },
  { type: "Fear / Urgency", color: "bg-rose-500/15 text-rose-300 border-rose-500/20" },
  { type: "Counterintuitive", color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20" },
];

const formSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters"),
  tone: z.enum(["Casual", "Professional", "Aggressive"]),
  language: z.string().default("English")
});

function HooksGeneratorInner() {
  const [prefLang, setPrefLang] = useState(() => {
    const SUPPORTED_LANGUAGES = ["English", "Hindi", "Marathi", "Gujarati", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Punjabi"];
    const raw = localStorage.getItem("preferred_language") || "English";
    return SUPPORTED_LANGUAGES.includes(raw) ? raw : "English";
  });

  useEffect(() => {
    localStorage.setItem("preferred_language", prefLang);
  }, [prefLang]);

  const [hooks, setHooks] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const { useOneTrial } = useTrialAction();
  const { data: sub } = useSubscriptionStatus();
  const isFreeUser = !sub?.planType || sub.planType === "free";

  useEffect(() => {
    document.title = "Viral Hooks Generator — GrowFlow AI";
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { topic: "", tone: "Aggressive", language: prefLang }
  });

  const currentLanguage = form.watch("language");

  const generateMutation = useGenerateHooks({
    mutation: {
      onSuccess: (data) => {
        setHooks(data.hooks);
        useOneTrial();
      },
      onError: () => toast({ variant: "destructive", title: "Failed to generate hooks" })
    }
  });

  const isLoading = generateMutation.isPending;

  function onSubmit(values: z.infer<typeof formSchema>) {
    generateMutation.mutate({ 
      data: { 
        topic: values.topic,
        tone: values.tone,
        language: values.language
      } as any
    });
  }

  const handleCopy = (hook: string, index: number) => {
    navigator.clipboard.writeText(hook);
    setCopiedIndex(index);
    toast({ title: "Hook copied!" });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const [showGuide, setShowGuide] = useState(false);

  return (
    <PageWrapper maxWidth="md" className="pb-24 md:pb-8">
      <FeatureGuideBanner 
        toolKey="hooks" 
        title="Viral Hooks Generator" 
        icon={<MessageSquareQuote className="w-5 h-5" />}
        tagline="Generate scroll-stopping opening lines that make people stop and read your full post."
        whatYouGet={["10 hook variations", "Pattern labels (curiosity/fear/data)", "One-click copy"]}
        whenToUse="Use this before writing any post — a great hook is the difference between 100 and 100,000 views."
        proTip="Generate hooks first, pick your favourite, then use it as the idea in the main Generate page."
        forceOpen={showGuide}
      />
      <PageHeader 
        icon={<MessageSquareQuote/>} 
        iconBg="bg-violet-500/10" 
        iconColor="text-violet-400" 
        title="Viral Hooks Generator" 
        subtitle="Scroll-stopping opening lines that triple your reach"
        onInfoClick={() => setShowGuide(prev => !prev)}
      />

      <div
        className="rounded-2xl border border-white/8 p-5 md:p-6"
        style={{
          background: "linear-gradient(135deg, rgba(168,85,247,0.07) 0%, rgba(255,255,255,0.02) 100%)",
          backdropFilter: "blur(20px)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-4 items-end">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem className="flex-1 w-full">
                  <FormLabel className="text-white/70 text-sm font-medium">Topic</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Why most diets fail in the first 2 weeks..."
                      className="bg-black/20 border-white/10 h-11 md:h-12 rounded-xl text-white text-base placeholder:text-white/25 focus-visible:ring-violet-500/40"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tone"
              render={({ field }) => (
                <FormItem className="w-full sm:w-44">
                  <FormLabel className="text-white/70 text-sm font-medium">Tone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-violet-500/40 rounded-xl h-11 md:h-12 text-base">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#0f0a1e] border-white/10">
                      <SelectItem value="Casual" className="text-white/80 focus:text-white focus:bg-violet-600/20">Casual</SelectItem>
                      <SelectItem value="Professional" className="text-white/80 focus:text-white focus:bg-violet-600/20">Professional</SelectItem>
                      <SelectItem value="Aggressive" className="text-white/80 focus:text-white focus:bg-violet-600/20">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="w-full sm:w-52">
              <LanguageSelector
                value={currentLanguage}
                onChange={(v) => {
                  form.setValue("language", v);
                  setPrefLang(v);
                }}
                isFreeUser={isFreeUser}
                onUpgradeRequired={() => toast({ title: "🔒 Premium Languages", description: "Upgrade to use regional languages!", variant: "destructive" })}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto h-12 bg-violet-600 hover:bg-violet-500 text-white text-base font-semibold shadow-lg shadow-violet-900/40 rounded-xl px-6"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4 mr-1.5" /> Generate</>}
            </Button>
          </form>
        </Form>
      </div>

      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`hook-skeleton-${i}`}
                className="h-20 rounded-xl bg-white/3 border border-white/5 animate-pulse"
                style={{ animationDelay: `${i * 0.06}s` }}
              />
            ))}
          </motion.div>
        )}

        {!isLoading && hooks.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <p className="text-white/35 text-xs font-medium uppercase tracking-wider mb-4">
              10 Hooks — Each with a different psychological trigger
            </p>

            {Array.isArray(hooks) && hooks.map((hook, i) => {
              const pattern = HOOK_PATTERN_LABELS[i];
              const isCopied = copiedIndex === i;

              return (
                <motion.div
                  key={`hook-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group rounded-xl border border-white/8 p-4 flex items-start gap-3 hover:bg-white/3 transition-colors"
                  style={{ background: "rgba(255,255,255,0.015)" }}
                >
                  <div className="w-8 h-8 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center text-white/40 font-mono text-xs shrink-0 mt-0.5">
                    {(i + 1).toString().padStart(2, '0')}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    {pattern && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${pattern.color}`}>
                        {pattern.type}
                      </span>
                    )}
                    <p className="text-white/90 text-base md:text-lg font-medium leading-relaxed">{hook}</p>
                  </div>

                  <button
                    onClick={() => handleCopy(hook, i)}
                    className={`shrink-0 p-2 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100
                      ${isCopied
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70"
                      }`}
                  >
                    {isCopied
                      ? <Check className="w-3.5 h-3.5" />
                      : <Copy className="w-3.5 h-3.5" />
                    }
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {!isLoading && hooks.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center py-12 px-6 text-center min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-white/20" />
            </div>
            <p className="text-white/25 text-sm font-medium">Your generated content will appear here</p>
            <p className="text-white/15 text-xs mt-1">Fill in the details above and hit Generate</p>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}

export default function HooksGenerator() {
  return (
    <PlanGate
      requiredPlan="starter"
      featureName="Viral Hooks Generator"
      toolKey="hooks"
      freeTrials={3}
      description="Generate 10 hooks using 10 different psychological triggers."
    >
      <HooksGeneratorInner />
    </PlanGate>
  );
}
