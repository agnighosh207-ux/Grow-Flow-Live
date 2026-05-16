import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { ArrowLeft, Mail, MapPin, Send, MessageSquare, Clock, Globe } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

export default function ContactUs() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "General Inquiry",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.message) {
      toast({ variant: "destructive", title: "Error", description: "Please fill in all required fields." });
      return;
    }

    setLoading(true);
    try {
      await api.post("/support/message", {
        subject: `[Contact Form] ${formData.subject}`,
        message: `Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`,
        email: formData.email
      });
      
      toast({ title: "Message Sent", description: "We've received your inquiry and will get back to you soon." });
      setFormData({ name: "", email: "", subject: "General Inquiry", message: "" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Failed to send", description: "Something went wrong. Please try emailing us directly." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-foreground font-sans">
      <Helmet>
        <title>Contact Us | GrowFlow AI</title>
        <meta name="description" content="Get in touch with GrowFlow AI support team." />
      </Helmet>
      
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <Link href="/">
            <div className="cursor-pointer"><Logo size="md" /></div>
          </Link>
        </div>

        <Link href="/">
          <span className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8 cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-8">
          {/* Left Column: Info */}
          <div className="lg:col-span-5 space-y-10">
            <div>
              <h1 className="text-4xl font-bold text-white mb-4">Get in Touch</h1>
              <p className="text-white/60 leading-relaxed">
                Have questions about our plans, AI tools, or need technical assistance? Our team is here to help you grow your flow.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="w-10 h-10 rounded-full bg-[#5E6AD2]/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-[#8B91E3]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Email Support</h3>
                  <p className="text-sm text-white/40 mb-1">General & Billing Inquiries</p>
                  <a href="mailto:growflowhelp@gmail.com" className="text-[#8B91E3] hover:underline">growflowhelp@gmail.com</a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="w-10 h-10 rounded-full bg-indigo-600/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Response Time</h3>
                  <p className="text-sm text-white/40">We typically respond within 24 hours on business days (Mon-Fri).</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Registered Office</h3>
                  <p className="text-sm text-white/40 leading-relaxed">
                    GrowFlow AI Digital Solutions<br />
                    Salt Lake Sector V, Bidhannagar<br />
                    Kolkata, West Bengal 700091<br />
                    India
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#8B91E3]" /> Follow Our Journey
              </h3>
              <div className="flex gap-4">
                {['Twitter', 'Instagram', 'LinkedIn', 'YouTube'].map((social) => (
                  <span key={social} className="text-sm text-white/30 hover:text-[#8B91E3] cursor-pointer transition-colors">
                    {social}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-7">
            <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#5E6AD2]/5 blur-[100px] pointer-events-none" />
              
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-[#8B91E3]" /> Send a Message
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Your Name</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[rgba(94,106,210,0.4)]/50 transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Email Address *</label>
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[rgba(94,106,210,0.4)]/50 transition-colors"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Subject</label>
                  <select 
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[rgba(94,106,210,0.4)]/50 transition-colors appearance-none"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Billing & Payments">Billing & Payments</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Partnership">Partnership</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Message *</label>
                  <textarea 
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[rgba(94,106,210,0.4)]/50 transition-colors min-h-[150px] resize-none"
                    placeholder="How can we help you grow?"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-6 bg-[#5E6AD2] hover:bg-[#5E6AD2] text-white font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(8,145,178,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  {loading ? "Sending..." : (
                    <>
                      <Send className="w-5 h-5" /> Submit Ticket
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-white/30">
                  By clicking submit, you agree to our <Link href="/terms-and-conditions" className="hover:text-[#8B91E3] underline">Terms</Link> and <Link href="/privacy-policy" className="hover:text-[#8B91E3] underline">Privacy Policy</Link>.
                </p>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-20 pt-8 border-t border-white/10 text-center text-[13px] text-white/30">
          <span>© 2026 GrowFlow AI. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}
