import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, Loader2, CheckCircle2, MessageSquare, Mail, Clock, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

const FAQ_ITEMS = [
  {
    q: "What platforms does GrowFlow AI generate content for?",
    a: "GrowFlow AI automatically generates perfectly structured, platform-native content for Instagram, YouTube Shorts, Twitter/X threads, and LinkedIn — all optimized from a single idea.",
  },
  {
    q: "How many generations do I get on the free plan?",
    a: "The free Explorer plan grants you 5 free monthly generations across the platform so you can experience our AI capabilities. To unlock more power, upgrade to the Starter tier (₹109/mo) for 20 generations, Creator tier (₹249/mo) for 60 generations, or the Infinity tier (₹499/mo) for unlimited access.",
  },
  {
    q: "What is the 'Content Pack' Pro feature?",
    a: "Available on higher tiers, the Content Pack acts as your ultimate 360-degree creative kit. Instead of just scripts, it generates AI image prompts, estimates a Virality Score, and recommends strategic posting times to maximize reach.",
  },
  {
    q: "How does the '7-Day Strategy' work?",
    a: "The Strategy Planner takes your core niche and builds a comprehensive, psychologically-sequenced content calendar spanning Monday to Sunday, mixing value posts, engagement questions, and promotional hooks.",
  },
  {
    q: "Are my payments and data secure?",
    a: "Absolutely. All transactions are securely processed and encrypted via Razorpay (PCI-DSS compliant). Furthermore, your personal ideas and generated prompts are strictly passed to the AI models for generation and are never used to train their models.",
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes. You can cancel your subscription with a single click from the Settings → Subscription panel. You will retain full access to premium features until the end of your current billing cycle.",
  },
  {
    q: "Can I edit the AI-generated content before posting?",
    a: "Of course! AI is a powerful starting point, but we highly recommend that you review, tweak, and personalize the generated text so it perfectly matches your authentic creator voice before publishing.",
  },
  {
    q: "What does realistic 'System Busy' mean?",
    a: "Because we route millions of tokens through powerful AI infrastructures (Groq, OpenAI, Cerebras), we occasionally hit temporary rate limits during peak traffic. If you see 'System Busy', simply wait a few seconds and try again. Our system will automatically attempt to cycle through backup providers for you.",
  },
  {
    q: "How do I find past generations?",
    a: "Every single piece of content you generate is safely archived in the 'History' tab. From there, you can view past results, copy them, or 'Reuse' an idea to instantly jump back into the generator with your previous settings.",
  }
];

export default function Support() {
  const { user } = useUser();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema as any),
    defaultValues: { email: "", subject: "", message: "" },
  });

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      form.setValue("email", user.primaryEmailAddress.emailAddress);
    }
  }, [user, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const res = await fetch("/api/support/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: values.subject,
          message: values.message,
          email: values.email,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch {
      toast({ variant: "destructive", title: "Failed to send message", description: "Please check your network and try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060312] text-foreground font-sans pt-12 px-4 selection:bg-cyan-500/30">
      <div className="max-w-3xl mx-auto mb-8">
        <Link href="/">
          <span className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </span>
        </Link>
      </div>

      <div className="space-y-8 pb-16 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-1.5 flex items-center gap-3">
            <HelpCircle className="w-7 h-7 text-blue-400" />
            Support
          </h1>
          <p className="text-white/50 text-sm">We usually respond within 24 hours on business days.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: MessageSquare, label: "Message Us", desc: "Use the form below", color: "text-blue-400", bg: "bg-blue-500/8 border-blue-500/15" },
            { icon: Mail, label: "Email", desc: "growflowhelp@gmail.com", color: "text-cyan-400", bg: "bg-cyan-500/8 border-cyan-500/15" },
            { icon: Clock, label: "Response Time", desc: "Within 24 hours", color: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/15" },
          ].map(({ icon: Icon, label, desc, color, bg }) => (
            <div key={label} className={`rounded-xl border ${bg} p-4 flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-lg bg-black/20 border border-white/8 flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-white/80 text-sm font-semibold">{label}</p>
                <p className="text-white/40 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-8 text-center space-y-4 shadow-xl"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Message sent!</h3>
                <p className="text-white/55 text-sm mt-1.5 max-w-sm mx-auto">
                  We've received your message and will get back to you at{" "}
                  <span className="text-white/80 font-medium">{form.getValues().email}</span>{" "}
                  within 24 hours.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSubmitted(false); form.reset({ email: form.getValues().email, subject: "", message: "" }); }}
                className="text-emerald-400/70 hover:text-emerald-400 text-xs mt-4"
              >
                Send another message
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-white/8 p-5 md:p-6"
              style={{
                background: "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                backdropFilter: "blur(20px)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <h2 className="text-white font-semibold text-base mb-5">Send us a message</h2>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  
                  {user?.primaryEmailAddress?.emailAddress ? (
                    <div className="rounded-lg bg-black/20 border border-white/5 px-4 py-3 flex items-center gap-2.5">
                      {user?.imageUrl && (
                        <img src={user.imageUrl} alt="" className="w-6 h-6 rounded-full border border-white/10" />
                      )}
                      <div className="min-w-0">
                        <p className="text-white/60 text-xs">Sending as</p>
                        <p className="text-white/85 text-xs font-medium truncate">{user.primaryEmailAddress.emailAddress}</p>
                      </div>
                    </div>
                  ) : (
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/70 text-sm font-medium">Your Email Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. you@example.com"
                              className="bg-black/20 border-white/10 text-white placeholder:text-white/25 focus-visible:ring-blue-500/40 rounded-xl h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/70 text-sm font-medium">Subject</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Question about billing, Feature request..."
                            className="bg-black/20 border-white/10 text-white placeholder:text-white/25 focus-visible:ring-blue-500/40 rounded-xl h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/70 text-sm font-medium">Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your issue or question in detail..."
                            className="resize-none h-32 bg-black/20 border-white/10 text-white placeholder:text-white/25 focus-visible:ring-blue-500/40 rounded-xl text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold shadow-lg shadow-blue-900/30 rounded-xl px-8 h-11"
                    >
                      {loading ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending...</>
                      ) : (
                        <><MessageSquare className="w-4 h-4 mr-2" /> Send Message</>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3 pt-6">
          <h2 className="text-white font-semibold text-xl mb-4">Frequently Asked Questions</h2>
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/8 overflow-hidden cursor-pointer hover:bg-white/5 transition-colors"
              style={{ background: "rgba(255,255,255,0.015)" }}
              onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
            >
              <div className="flex items-center justify-between px-5 py-4 gap-4">
                <span className="text-white/80 text-[15px] font-medium">{item.q}</span>
                <span className={`text-white/30 shrink-0 text-xl transition-transform duration-200 ${expandedFaq === i ? "rotate-45 text-white/70" : ""}`}>+</span>
              </div>
              <AnimatePresence>
                {expandedFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-white/55 text-sm leading-relaxed border-t border-white/5 pt-4">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
