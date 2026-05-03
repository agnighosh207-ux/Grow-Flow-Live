import React, { useState, useEffect } from "react";
import { Flame, Instagram, Twitter, Linkedin, Youtube, Filter, Search, Copy, Save, Zap, Check, TrendingUp, RefreshCw } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

interface VaultItem {
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

export default function SwipeVaultPage() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [savedItems, setSavedItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [selectedNiche, setSelectedNiche] = useState("All");
  const [selectedFormat, setSelectedFormat] = useState("All");
  const [remixingItem, setRemixingItem] = useState<VaultItem | null>(null);
  const [remixData, setRemixData] = useState<any>(null);
  const [remixing, setRemixing] = useState(false);
  const { toast } = useToast();

  const [userTopic, setUserTopic] = useState("");
  const [userNiche, setUserNiche] = useState("");
  const [userTone, setUserTone] = useState("Professional");

  useEffect(() => {
    fetchItems();
    const saved = localStorage.getItem("savedVaultItems");
    if (saved) setSavedItems(JSON.parse(saved));
  }, [selectedPlatform, selectedNiche, selectedFormat]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/vault/items", {
        params: {
          platform: selectedPlatform,
          niche: selectedNiche,
          format: selectedFormat
        }
      });
      setItems(data.items);
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load vault items." });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (item: VaultItem) => {
    const isSaved = savedItems.find(i => i.id === item.id);
    let newSaved;
    if (isSaved) {
      newSaved = savedItems.filter(i => i.id !== item.id);
      toast({ title: "Removed from saves", description: "Item removed from your vault." });
    } else {
      newSaved = [...savedItems, item];
      toast({ title: "Saved to vault!", description: "You can find this in the Saved tab." });
    }
    setSavedItems(newSaved);
    localStorage.setItem("savedVaultItems", JSON.stringify(newSaved));
  };

  const handleRemix = async () => {
    if (!remixingItem || !userTopic) return;
    setRemixing(true);
    try {
      const { data } = await api.post("/vault/remix", {
        vaultItemId: remixingItem.id,
        userTopic,
        userNiche,
        tone: userTone
      });
      setRemixData(data);
    } catch (err) {
      toast({ variant: "destructive", title: "Remix failed", description: "Could not generate remix." });
    } finally {
      setRemixing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const renderItemCard = (item: VaultItem) => (
    <motion.div
      layout
      key={item.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="break-inside-avoid mb-6"
    >
      <Card className="overflow-hidden border-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-xl group">
        <CardContent className="p-0">
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {item.platform === "Instagram" && <Instagram className="h-4 w-4 text-pink-500" />}
                {item.platform === "Twitter" && <Twitter className="h-4 w-4 text-sky-500" />}
                {item.platform === "LinkedIn" && <Linkedin className="h-4 w-4 text-blue-700" />}
                {item.platform === "YouTube" && <Youtube className="h-4 w-4 text-red-600" />}
                <Badge variant="secondary" className="text-[10px] uppercase font-bold">{item.niche}</Badge>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/5 text-emerald-600 border-emerald-500/20">
                📈 {item.estimatedReach}
              </Badge>
            </div>

            <h3 className="text-xl font-bold leading-tight group-hover:text-indigo-600 transition-colors">
              "{item.hookText}"
            </h3>

            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground border border-dashed">
              <span className="font-bold text-foreground">WHY IT WORKS:</span> {item.whyItWorks}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px]">{item.format}</Badge>
              {item.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px]">#{tag}</Badge>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSave(item)}
                className={savedItems.find(i => i.id === item.id) ? "bg-indigo-50 text-indigo-600 border-indigo-200" : ""}
              >
                <Save className="mr-2 h-3 w-3" />
                {savedItems.find(i => i.id === item.id) ? "Saved" : "Save"}
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="sm" onClick={() => { setRemixingItem(item); setRemixData(null); }} className="bg-indigo-600 hover:bg-indigo-700">
                    <Zap className="mr-2 h-3 w-3" />
                    Remix
                  </Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-md overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Remix with AI</SheetTitle>
                    <SheetDescription>
                      We'll use this high-performing pattern for your own topic.
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="space-y-6 py-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Your Topic</label>
                      <Input 
                        placeholder="What are you writing about?" 
                        value={userTopic} 
                        onChange={(e) => setUserTopic(e.target.value)} 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Niche</label>
                        <Select value={userNiche} onValueChange={setUserNiche}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Niche" />
                          </SelectTrigger>
                          <SelectContent>
                            {niches.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tone</label>
                        <Select value={userTone} onValueChange={setUserTone}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Tone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Casual">Casual</SelectItem>
                            <SelectItem value="Professional">Professional</SelectItem>
                            <SelectItem value="Aggressive">Aggressive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 h-12" 
                      onClick={handleRemix}
                      disabled={remixing || !userTopic}
                    >
                      {remixing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                      Generate Remix
                    </Button>

                    <AnimatePresence>
                      {remixData && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4 pt-4"
                        >
                          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-indigo-600 tracking-widest uppercase">Remixed Hook</span>
                              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(remixData.remixedHook, "Hook")}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="font-bold text-indigo-900 leading-tight">{remixData.remixedHook}</p>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-600 tracking-widest uppercase">Remixed Caption</span>
                              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(remixData.remixedCaption, "Caption")}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{remixData.remixedCaption}</p>
                          </div>

                          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                            <p className="text-xs text-emerald-700 italic">💡 <span className="font-bold">Strategy:</span> {remixData.remixTip}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="container mx-auto py-10 px-4 space-y-8 max-w-7xl">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tight flex items-center justify-center gap-3">
          <Flame className="h-10 w-10 text-orange-500 fill-orange-500" />
          Swipe Vault
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Real content patterns that went viral. Remix any proven structure for your own niche with AI.
        </p>
      </div>

      <Tabs defaultValue="explore" className="space-y-6">
        <div className="flex justify-center">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="explore" className="rounded-lg px-8">Explore Vault</TabsTrigger>
            <TabsTrigger value="saved" className="rounded-lg px-8">My Saves ({savedItems.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="explore" className="space-y-8">
          {/* Filters */}
          <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {platforms.map(p => (
                <Button
                  key={p.id}
                  variant={selectedPlatform === p.id ? "default" : "ghost"}
                  onClick={() => setSelectedPlatform(p.id)}
                  className="rounded-full gap-2"
                >
                  {p.icon}
                  {p.id}
                </Button>
              ))}
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">NICHE:</span>
                <Select value={selectedNiche} onValueChange={setSelectedNiche}>
                  <SelectTrigger className="w-32 h-8 rounded-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {niches.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">FORMAT:</span>
                <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                  <SelectTrigger className="w-32 h-8 rounded-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formats.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {items.map(renderItemCard)}
            </div>
          )}

          {items.length === 0 && !loading && (
            <div className="py-20 text-center space-y-4 opacity-50">
              <TrendingUp className="h-20 w-20 mx-auto" />
              <h2 className="text-xl font-bold">No items found matching filters</h2>
              <Button variant="link" onClick={() => { setSelectedPlatform("All"); setSelectedNiche("All"); setSelectedFormat("All"); }}>Reset Filters</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved">
          {savedItems.length === 0 ? (
            <div className="py-20 text-center space-y-4 opacity-50">
              <Save className="h-20 w-20 mx-auto" />
              <h2 className="text-xl font-bold">No saved patterns yet</h2>
              <p>Items you save from the vault will appear here.</p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {savedItems.map(renderItemCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
