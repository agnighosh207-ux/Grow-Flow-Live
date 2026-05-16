import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/layout";
import { Search, Sparkles, BookOpen, MessageSquare, Rocket, Zap, ChevronRight, Filter, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";

interface Template {
  id: string;
  name: string;
  category: string;
  structure: string;
  exampleIdea: string;
  useCount: number;
  fills?: string[];
}

const CATEGORIES = [
  { id: "all", label: "All Templates", icon: Filter },
  { id: "Viral", label: "Viral Growth", icon: Rocket },
  { id: "Educational", label: "Educational", icon: BookOpen },
  { id: "Story", label: "Storytelling", icon: MessageSquare },
  { id: "Promotional", label: "Promotional", icon: Zap },
];

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/templates?category=${selectedCategory}`);
      setTemplates(res.data);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to load templates." });
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template: Template) => {
    try {
      await api.post(`/templates/${template.id}/use`);
      // Navigate to generate page with pre-filled idea
      const ideaValue = template.exampleIdea || template.structure;
      localStorage.setItem("gf_template_fill", ideaValue);
      setLocation("/generate");
    } catch (err) {
      console.error("Failed to use template:", err);
      setLocation("/generate");
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [showGuide, setShowGuide] = useState(false);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <FeatureGuideBanner
          toolKey="templates"
          title="Viral Frameworks"
          icon={<Rocket className="w-5 h-5 text-[#8B91E3]" />}
          tagline="Stop staring at a blank screen. Use proven psychological frameworks to structure your next viral post."
          whatYouGet={["Viral Growth structures", "Educational frameworks", "Storytelling patterns", "Promotional templates"]}
          whenToUse="Use this when you have an idea but don't know how to structure it for maximum engagement."
          proTip="Try the 'Viral' category if you want to maximize reach, or 'Story' if you want to build deep authority."
          planRequired="Starter"
          forceOpen={showGuide}
        />
        <div className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(94,106,210,0.10)] border border-[rgba(94,106,210,0.20)] mb-4">
                <Sparkles className="w-3.5 h-3.5 text-[#8B91E3]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#8B91E3]">Content Frameworks</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black text-white mb-3">Viral Templates</h1>
                <button 
                  onClick={() => setShowGuide(prev => !prev)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all group mt-[-8px]"
                >
                  <Sparkles className="w-4 h-4 text-white/40 group-hover:text-[#8B91E3]" />
                </button>
              </div>
              <p className="text-white/40 max-w-xl text-lg font-medium leading-relaxed">
                Stop staring at a blank screen. Use these proven frameworks to structure your next viral post.
              </p>
            </div>

            <div className="relative group w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[#8B91E3] transition-colors" />
              <input
                type="text"
                placeholder="Search frameworks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[rgba(94,106,210,0.50)] focus:bg-white/[0.05] transition-all"
              />
            </div>
          </motion.div>
        </div>

        <div className="flex gap-2 mb-10 overflow-x-auto pb-4 hide-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl border text-sm font-bold transition-all whitespace-nowrap
                  ${isActive 
                    ? "bg-[rgba(94,106,210,0.10)] border-[rgba(94,106,210,0.40)] text-[#8B91E3] shadow-[0_0_20px_rgba(94,106,210,0.1)]" 
                    : "bg-white/[0.02] border-white/5 text-white/40 hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#8B91E3]" : "text-white/20"}`} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template, idx) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-[rgba(94,106,210,0.40)] transition-all hover:bg-white/[0.04] flex flex-col"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 group-hover:text-[#8B91E3] group-hover:border-[rgba(94,106,210,0.20)] transition-colors">
                    {template.category}
                  </div>
                  <div className="flex items-center gap-1.5 text-white/20 text-[10px] font-bold">
                    <Users className="w-3 h-3" />
                    {template.useCount} uses
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-[#8B91E3] transition-colors">
                  {template.name}
                </h3>

                <div className="relative mb-8 flex-1">
                  <div className="bg-black/40 rounded-2xl p-4 border border-white/5 text-sm text-white/60 font-medium italic line-clamp-3">
                    "{template.structure}"
                  </div>
                </div>

                <Button
                  onClick={() => handleUseTemplate(template)}
                  className="w-full h-12 rounded-2xl bg-white/5 hover:bg-[#5E6AD2] border border-white/10 hover:border-[rgba(94,106,210,0.4)] text-white font-bold transition-all flex items-center justify-center gap-2"
                >
                  Use Template <ChevronRight className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/[0.02] rounded-[40px] border border-dashed border-white/10">
            <Search className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No templates found</h3>
            <p className="text-white/40">Try a different category or search term.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
