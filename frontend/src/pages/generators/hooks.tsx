import { useState } from "react";
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
import { Loader2, Copy, Check, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const HOOK_PATTERN_LABELS = [
  { type: "Curiosity Gap", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20" },
  { type: "Bold Claim", color: "bg-orange-500/15 text-orange-300 border-orange-500/20" },
  { type: "Relatable Pain", color: "bg-blue-500/15 text-blue-300 border-blue-500/20" },
  { type: "Controversial", color: "bg-red-500/15 text-red-300 border-red-500/20" },
  { type: "Pattern Interrupt", color: "bg-pink-500/15 text-pink-300 border-pink-500/20" },
  { type: "Specificity Hook", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" },
  { type: "Identity Signal", color: "bg-amber-500/15 text-amber-300 border-amber-500/20" },
  { type: "Story Opener", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20" },
  { type: "Fear / Urgency", color: "bg-rose-500/15 text-rose-300 border-rose-500/20" },
  { type: "Counterintuitive", color: "bg-teal-500/15 text-teal-300 border-teal-500/20" },
];

const formSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters"),
  tone: z.enum(["Casual", "Professional", "Aggressive"])
});

function HooksGeneratorInner() {
  const [hooks, setHooks] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const { useOneTrial } = useTrialAction();

  const generateMutation = useGenerateHooks({
    mutation: {
      onSuccess: (data) => {
        setHooks(data.hooks);
        useOneTrial();
      },
      onError: () => toast({ variant: "destructive", title: "Failed to generate hooks" })
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema as any),
    defaultValues: { topic: "", tone: "Aggressive" }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    generateMutation.mutate({ data: values });
  }

  const handleCopy = (hook: string, index: number) => {
    navigator.clipboard.writeText(hook);
    setCopiedIndex(index);
    toast({ title: "Hook copied!" });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const isLoading = generateMutation.isPending;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-1.5 flex items-center gap-3">
          <Zap className="w-7 h-7 text-teal-400" />
          Viral Hook Generator
        </h1>
        <p className="text-white/50 text-sm">10 hooks, 10 different psychological triggers. The first line is everything.</p>
      </div>

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
                      className="bg-black/20 border-white/10 h-11 rounded-xl text-white placeholder:text-white/25 focus-visible:ring-teal-500/40"
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
                      <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-teal-500/40 rounded-xl h-11">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#0f0a1e] border-white/10">
                      <SelectItem value="Casual" className="text-white/80 focus:text-white focus:bg-teal-600/20">Casual</SelectItem>
                      <SelectItem value="Professional" className="text-white/80 focus:text-white focus:bg-teal-600/20">Professional</SelectItem>
                      <SelectItem value="Aggressive" className="text-white/80 focus:text-white focus:bg-teal-600/20">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto h-11 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-semibold shadow-lg shadow-teal-900/40 rounded-xl px-6"
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
                key={i}
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

            {hooks.map((hook, i) => {
              const pattern = HOOK_PATTERN_LABELS[i];
              const isCopied = copiedIndex === i;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group rounded-xl border border-white/8 p-4 flex items-start gap-3 hover:bg-white/3 transition-colors"
                  style={{ background: "rgba(255,255,255,0.015)" }}
                >
                  <div className="w-7 h-7 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center text-white/40 font-mono text-xs shrink-0 mt-0.5">
                    {i + 1}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    {pattern && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${pattern.color}`}>
                        {pattern.type}
                      </span>
                    )}
                    <p className="text-white/85 text-sm leading-relaxed">{hook}</p>
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
            className="text-center py-16 space-y-3"
          >
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/15 flex items-center justify-center mx-auto">
              <Zap className="w-7 h-7 text-teal-400/60" />
            </div>
            <p className="text-white/35 text-sm">Enter your topic and generate 10 psychologically-targeted hooks.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
