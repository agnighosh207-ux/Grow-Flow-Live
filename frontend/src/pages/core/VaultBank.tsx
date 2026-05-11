import React, { useState } from "react";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { 
  Folder, FolderPlus, Search, Filter, Tag, 
  MoreVertical, Share2, Copy, Download, Star, 
  Trash2, RefreshCw, Layers, Calendar, ArrowUpRight, Plus, ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function VaultBankPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ["vault-folders"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/personal-vault/folders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    }
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["vault-items", activeFolder, search],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams();
      if (activeFolder) params.append("folderId", activeFolder);
      if (search) params.append("search", search);
      
      const res = await fetch(`/api/personal-vault/items?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    }
  });

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

  const handleCreateFolder = () => {
    const name = prompt("Enter folder name:");
    if (name) createFolderMutation.mutate(name);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  return (
    <PageWrapper maxWidth="full" className="py-8 px-6 space-y-8 min-h-screen">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white/[0.02] border border-white/5 p-8 rounded-[40px] backdrop-blur-xl">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-white italic flex items-center gap-3 tracking-tight">
            <Layers className="text-cyan-400 w-8 h-8" />
            CONTENT BANK
          </h1>
          <p className="text-sm text-white/40 font-medium italic">Your strategic repository of evergreen content</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input 
              placeholder="Search ideas or content..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 rounded-2xl bg-white/5 border-white/10 focus:border-cyan-500/50 transition-all font-medium"
            />
          </div>
          <Button variant="outline" className="h-12 w-12 p-0 rounded-2xl border-white/10">
            <Filter className="w-4 h-4" />
          </Button>
          <Button 
            onClick={() => window.location.href = "/generate"}
            className="h-12 px-6 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black shadow-glow"
          >
            <Plus className="w-4 h-4 mr-2" /> NEW GEN
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Folders */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Folders</h2>
            <button onClick={handleCreateFolder} className="text-cyan-400 hover:text-cyan-300 transition-colors">
              <FolderPlus size={18} />
            </button>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setActiveFolder(null)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-bold text-sm ${!activeFolder ? 'bg-cyan-500/10 text-cyan-400' : 'text-white/50 hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-3">
                <Layers size={18} />
                All Content
              </div>
              <span className="text-[10px] opacity-40">∞</span>
            </button>

            {foldersLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-11 bg-white/5 rounded-xl animate-pulse m-1" />)
            ) : folders?.map((f: any) => (
              <button
                key={f.id}
                onClick={() => setActiveFolder(f.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeFolder === f.id ? 'bg-cyan-500/10 text-cyan-400' : 'text-white/50 hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  <Folder size={18} style={{ color: f.color }} />
                  {f.name}
                </div>
                <span className="text-[10px] opacity-40">{f.itemCount}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content: Items Grid */}
        <div className="lg:col-span-9 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-white/30 uppercase tracking-[0.2em]">
              {activeFolder ? folders?.find((f: any) => f.id === activeFolder)?.name : "All Generations"}
            </h2>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{items?.length || 0} Assets Found</p>
          </div>

          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {itemsLoading ? (
                [1, 2, 3, 4].map(i => <div key={i} className="h-64 rounded-[32px] bg-white/5 animate-pulse" />)
              ) : items?.map((item: any, i: number) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative bg-white/[0.02] border border-white/5 rounded-[32px] p-8 hover:bg-white/[0.04] hover:border-cyan-500/30 transition-all overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-2">
                       <div className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-widest border border-cyan-500/20">
                         {item.platform || "MULTI"}
                       </div>
                       <div className="px-3 py-1 rounded-full bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest border border-white/5">
                         {item.contentType}
                       </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-2 text-white/20 hover:text-yellow-400 transition-colors">
                        <Star size={16} fill={item.isFavorited ? "currentColor" : "none"} className={item.isFavorited ? "text-yellow-400" : ""} />
                      </button>
                      <button className="p-2 text-white/20 hover:text-white/60 transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-white italic line-clamp-2 leading-tight tracking-tight group-hover:text-cyan-400 transition-colors">
                      {item.idea}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2">
                      {item.tags?.map((t: string) => (
                        <span key={t} className="flex items-center gap-1 text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-cyan-400 transition-colors cursor-pointer">
                          <Tag size={10} /> {t}
                        </span>
                      ))}
                      <button className="text-[10px] font-black text-cyan-400/50 uppercase tracking-widest hover:text-cyan-400 transition-colors">
                        + Add Tag
                      </button>
                    </div>

                    <div className="pt-6 flex items-center justify-between border-t border-white/5">
                      <div className="flex items-center gap-4 text-[10px] font-black text-white/20 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Calendar size={12} /> {format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
                        <span className="flex items-center gap-1.5"><RefreshCw size={12} /> {item.usedCount} Used</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCopy(item.content?.instagram || item.content?.twitter || JSON.stringify(item.content))}
                          className="h-9 w-9 p-0 rounded-xl hover:bg-white/5 text-white/40 hover:text-white"
                        >
                          <Copy size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.location.href = `/generate?idea=${encodeURIComponent(item.idea)}&auto=1`}
                          className="h-9 px-4 rounded-xl hover:bg-cyan-500/10 text-cyan-400 font-black text-[10px] uppercase tracking-widest"
                        >
                          REUSE <ArrowUpRight size={12} className="ml-1.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Glass Background Glow */}
                  <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-cyan-500/20 transition-all" />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  );
}
