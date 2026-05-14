import React, { useState, useEffect } from "react";
import { 
  Flame, Instagram, Twitter, Linkedin, Youtube, Filter, Search, 
  Copy, Save, Zap, Check, TrendingUp, RefreshCw, Layers, 
  Folder, FolderPlus, Star, MoreVertical, Plus, ArrowUpRight,
  Library, BookOpen, Heart, History, Tag, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useAuth } from "@clerk/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface InspirationItem {
  id: string;
  title: string;
  platform: string;
  niche: string;
  contentType: string;
  hookText: string;
  whyItWorks: string;
  estimatedReach: string;
  format: string;
  tags: string[];
}

const platforms = [
  { id: "All", icon: <Filter className="h-4 w-4" /> },
  { id: "Instagram", icon: <Instagram className="h-4 w-4" /> },
  { id: "Twitter", icon: <Twitter className="h-4 w-4" /> },
  { id: "LinkedIn", icon: <Linkedin className="h-4 w-4" /> },
  { id: "YouTube", icon: <Youtube className="h-4 w-4" /> },
];

const niches = ["All", "Fitness", "Finance", "Tech", "Business", "Motivation", "Lifestyle"];
const formats = ["All", "carousel", "reel", "thread", "short", "post"];

export default function UnifiedVaultPage({ initialTab = "my-content" }: { initialTab?: string }) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sub } = useSubscriptionStatus();
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  // --- Personal Bank States ---
  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ["vault-folders"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/personal-vault/folders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: activeTab === "my-content" || activeTab === "folders"
  });

  const { data: personalItems, isLoading: personalItemsLoading } = useQuery({
    queryKey: ["vault-personal-items", activeFolder, search],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams();
      if (activeFolder) params.append("folderId", activeFolder);
      if (search) params.append("search", search);
      
      const res = await fetch(`/api/personal-vault/items?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: activeTab === "my-content"
  });

  // --- Inspiration Vault States ---
  const [inspirationItems, setInspirationItems] = useState<InspirationItem[]>([]);
  const [inspirationLoading, setInspirationLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [selectedNiche, setSelectedNiche] = useState("All");
  const [selectedFormat, setSelectedFormat] = useState("All");
  const [remixingItem, setRemixingItem] = useState<InspirationItem | null>(null);
  const [remixData, setRemixData] = useState<any>(null);
  const [remixing, setRemixing] = useState(false);
  const [language, setLanguage] = useState(localStorage.getItem("preferred_language") || "English");

  useEffect(() => {
    if (activeTab === "inspiration") {
      fetchInspiration();
    }
  }, [activeTab, selectedPlatform, selectedNiche, selectedFormat]);

  const fetchInspiration = async () => {
    setInspirationLoading(true);
    try {
      const { data } = await api.get("/vault/items", {
        params: {
          platform: selectedPlatform,
          niche: selectedNiche,
          format: selectedFormat
        }
      });
      setInspirationItems(data.items);
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load inspiration items." });
    } finally {
      setInspirationLoading(false);
    }
  };

  const handleRemix = async () => {
    if (!remixingItem) return;
    setRemixing(true);
    try {
      const { data } = await api.post("/vault/remix", {
        vaultItemId: remixingItem.id,
        language
      });
      setRemixData(data);
    } catch (err) {
      toast({ variant: "destructive", title: "Remix failed", description: "Could not generate remix." });
    } finally {
      setRemixing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  const handleCreateFolder = () => {
    const name = prompt("Enter folder name:");
    if (name) createFolderMutation.mutate(name);
  };

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const token = await getToken();
      const res = await fetch("/api/personal-vault/folders", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name, color: "#06b6d4", icon: "Folder" })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
      toast({ title: "Folder created!" });
    }
  });

  return (
    <PageWrapper maxWidth="full" className="py-6 px-4 md:px-8 space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/[0.02] border border-white/5 p-6 rounded-[32px] backdrop-blur-xl">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white italic flex items-center gap-3 tracking-tight">
            <Layers className="text-cyan-400 w-6 h-6" />
            THE VAULT
          </h1>
          <p className="text-xs text-white/40 font-medium italic">Manage your content assets and find viral inspiration</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white/5 p-1 rounded-2xl">
            <TabsList className="bg-transparent border-0 gap-1">
              <TabsTrigger value="my-content" className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black transition-all">
                My Content
              </TabsTrigger>
              <TabsTrigger value="folders" className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black transition-all">
                Folders
              </TabsTrigger>
              <TabsTrigger value="inspiration" className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black transition-all">
                Inspiration
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="min-h-[60vh]">
        {/* --- MY CONTENT TAB --- */}
        {activeTab === "my-content" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input 
                  placeholder="Search your saved content..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 h-11 rounded-2xl bg-white/5 border-white/10 focus:border-cyan-500/50 transition-all text-sm"
                />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                 <Button
                    onClick={() => setActiveFolder(null)}
                    variant="ghost"
                    className={`h-9 px-4 rounded-xl text-xs font-bold transition-all ${!activeFolder ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-white/40 hover:text-white/60'}`}
                 >
                   All Content
                 </Button>
                 {folders?.map((f: any) => (
                   <Button
                      key={f.id}
                      onClick={() => setActiveFolder(f.id)}
                      variant="ghost"
                      className={`h-9 px-4 rounded-xl text-xs font-bold transition-all ${activeFolder === f.id ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-white/40 hover:text-white/60'}`}
                   >
                     <Folder size={14} className="mr-2" style={{ color: f.color }} />
                     {f.name}
                   </Button>
                 ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {personalItemsLoading ? (
                Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 bg-white/5 rounded-[32px] animate-pulse border border-white/5" />)
              ) : personalItems?.length === 0 ? (
                <div className="col-span-full py-20 text-center space-y-4">
                   <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                     <Library className="w-8 h-8 text-white/20" />
                   </div>
                   <h3 className="text-white/40 font-bold">No content found in this view</h3>
                   <Button variant="link" onClick={() => window.location.href = "/generate"} className="text-cyan-400">Go generate some content</Button>
                </div>
              ) : personalItems?.map((item: any) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative bg-white/[0.02] border border-white/5 rounded-[32px] p-6 hover:bg-white/[0.04] hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <div className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[9px] font-black uppercase tracking-widest border border-cyan-500/20">
                         {item.platform || "MULTI"}
                       </div>
                       <div className="px-3 py-1 rounded-full bg-white/5 text-white/40 text-[9px] font-black uppercase tracking-widest border border-white/5">
                         {item.contentType}
                       </div>
                    </div>
                    <button className="p-2 text-white/20 hover:text-yellow-400 transition-colors">
                      <Star size={16} fill={item.isFavorited ? "currentColor" : "none"} className={item.isFavorited ? "text-yellow-400" : ""} />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white mb-4 line-clamp-3 leading-snug">
                    {item.idea}
                  </h3>
                  
                  <div className="pt-4 flex items-center justify-between border-t border-white/5">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                      {format(new Date(item.createdAt), 'MMM d, yyyy')}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(item.idea)} className="h-8 w-8 p-0 rounded-lg hover:bg-white/5 text-white/30 hover:text-white">
                        <Copy size={12} />
                      </Button>
                      <Button onClick={() => window.location.href = `/generate?idea=${encodeURIComponent(item.idea)}`} className="h-8 px-3 rounded-lg bg-white/5 hover:bg-cyan-500/10 text-white/60 hover:text-cyan-400 font-bold text-[10px] uppercase tracking-widest border border-white/5 hover:border-cyan-500/20">
                        REUSE
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* --- FOLDERS TAB --- */}
        {activeTab === "folders" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-xl font-black text-white italic">Organize Content</h2>
               <Button onClick={handleCreateFolder} className="bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-2xl gap-2">
                 <FolderPlus size={18} /> NEW FOLDER
               </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               {foldersLoading ? (
                 Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-white/5 rounded-[32px] animate-pulse" />)
               ) : folders?.length === 0 ? (
                 <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[40px]">
                    <Folder className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-white/30 font-bold">No folders created yet</p>
                 </div>
               ) : folders?.map((f: any) => (
                 <motion.div
                    key={f.id}
                    whileHover={{ scale: 1.02 }}
                    className="group bg-white/[0.02] border border-white/5 rounded-[32px] p-6 hover:border-cyan-500/30 transition-all cursor-pointer"
                    onClick={() => { setActiveFolder(f.id); setActiveTab("my-content"); }}
                 >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-cyan-500/10 transition-all">
                      <Folder size={24} style={{ color: f.color }} fill={f.color + "20"} />
                    </div>
                    <h3 className="text-lg font-black text-white mb-1">{f.name}</h3>
                    <p className="text-xs text-white/30 font-bold uppercase tracking-widest">{f.itemCount || 0} Assets</p>
                 </motion.div>
               ))}
            </div>
          </div>
        )}

        {/* --- INSPIRATION TAB --- */}
        {activeTab === "inspiration" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Filters */}
            <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {platforms.map(p => (
                  <Button
                    key={p.id}
                    variant="ghost"
                    onClick={() => setSelectedPlatform(p.id)}
                    className={`rounded-full h-10 px-6 font-bold text-xs gap-2 transition-all ${selectedPlatform === p.id ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}
                  >
                    {p.icon}
                    {p.id}
                  </Button>
                ))}
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-6 border-t border-white/5 pt-6">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">NICHE</span>
                  <Select value={selectedNiche} onValueChange={setSelectedNiche}>
                    <SelectTrigger className="w-36 h-9 rounded-xl bg-white/5 border-white/10 text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10">
                      {niches.map(n => <SelectItem key={n} value={n} className="text-xs font-bold">{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">FORMAT</span>
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger className="w-36 h-9 rounded-xl bg-white/5 border-white/10 text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10">
                      {formats.map(f => <SelectItem key={f} value={f} className="text-xs font-bold">{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {inspirationLoading ? (
               <div className="flex justify-center py-20">
                 <RefreshCw className="w-10 h-10 animate-spin text-cyan-500" />
               </div>
            ) : inspirationItems.length === 0 ? (
               <div className="py-20 text-center opacity-30">
                 <Search className="w-12 h-12 mx-auto mb-4" />
                 <p className="font-bold">No viral patterns found for these filters</p>
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inspirationItems.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/[0.02] border border-white/5 rounded-[32px] p-6 hover:border-orange-500/30 transition-all group"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        {item.platform === "Instagram" && <Instagram size={14} className="text-pink-500" />}
                        {item.platform === "Twitter" && <Twitter size={14} className="text-sky-500" />}
                        {item.platform === "LinkedIn" && <Linkedin size={14} className="text-blue-700" />}
                        {item.platform === "YouTube" && <Youtube size={14} className="text-red-600" />}
                        <Badge variant="outline" className="text-[8px] font-black uppercase bg-white/5 border-white/10">{item.niche}</Badge>
                      </div>
                      <div className="text-[10px] font-black text-orange-400 flex items-center gap-1">
                        <TrendingUp size={12} /> {item.estimatedReach}
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-white italic mb-4 leading-tight">
                      "{item.hookText}"
                    </h3>

                    <p className="text-[11px] text-white/40 leading-relaxed mb-6 italic">
                      <span className="font-black text-white/60 uppercase text-[9px] mr-1">WHY IT WORKS:</span> 
                      {item.whyItWorks}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <Badge variant="outline" className="text-[9px] font-black tracking-widest text-white/30 uppercase p-0">#{item.format}</Badge>
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button size="sm" onClick={() => { setRemixingItem(item); setRemixData(null); }} className="h-9 px-6 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl text-[10px] uppercase tracking-widest">
                            REMIX <Zap size={12} className="ml-1" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="sm:max-w-md bg-[#050110] border-l border-white/10 overflow-y-auto">
                          <SheetHeader className="mb-8">
                            <SheetTitle className="text-2xl font-black text-white italic">AI REMIX</SheetTitle>
                            <SheetDescription className="text-white/40 font-medium">
                              Applying this viral pattern to your content topic.
                            </SheetDescription>
                          </SheetHeader>
                          
                          <div className="space-y-6">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                               <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Pattern Source</p>
                               <p className="text-sm font-bold text-white italic">"{item.hookText}"</p>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Language</label>
                              <LanguageSelector 
                                value={language} 
                                onChange={setLanguage} 
                                isFreeUser={!sub?.planType || sub.planType === 'free'}
                              />
                            </div>

                            <Button 
                              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black h-12 rounded-2xl shadow-glow" 
                              onClick={handleRemix}
                              disabled={remixing}
                            >
                              {remixing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                              GENERATE REMIX
                            </Button>

                            <AnimatePresence>
                              {remixData && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="space-y-6 pt-4"
                                >
                                  <div className="p-6 rounded-[32px] bg-white/5 border border-white/10 space-y-4">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-black text-cyan-400 tracking-[0.2em] uppercase">Remixed Result</span>
                                      <Button variant="ghost" size="icon" onClick={() => handleCopy(remixData.remixedHook)} className="h-8 w-8 hover:bg-white/5">
                                        <Copy size={14} className="text-white/40" />
                                      </Button>
                                    </div>
                                    <p className="text-lg font-black text-white leading-tight italic">{remixData.remixedHook}</p>
                                    {remixData.remixedCaption && (
                                       <p className="text-sm text-white/60 leading-relaxed border-t border-white/5 pt-4 whitespace-pre-wrap">{remixData.remixedCaption}</p>
                                    )}
                                  </div>

                                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                                    <p className="text-[11px] text-emerald-400 font-medium italic">
                                      <span className="font-black mr-1">STRATEGY:</span> {remixData.remixTip}
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
