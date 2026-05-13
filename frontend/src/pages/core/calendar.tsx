import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, Loader2, Sparkles, AlertCircle, ChevronLeft, ChevronRight, 
  CheckCircle2, Plus, Filter, LayoutGrid, LayoutList, MoreHorizontal, Clock, Trash2, 
  ExternalLink, Edit3, Wand2, Instagram, Twitter, Linkedin, Youtube, Zap, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  format, startOfWeek, addDays, getMonth, endOfMonth, startOfMonth, 
  isSameDay, addMonths, subMonths, parseISO 
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { useQueryClient } from "@tanstack/react-query";
import { PageSkeleton } from "@/components/shared/Skeleton";

interface CalendarItem {
  id: number;
  date: string;
  idea: string;
  platform: string;
  contentType: string;
  status: string;
  scheduledTime?: string;
  notes?: string;
  color?: string;
  generationId?: string;
}

const platforms = ["Instagram", "Twitter", "LinkedIn", "YouTube"];
const contentTypes = ["Post", "Thread", "Reel", "Short", "Video", "Carousel"];
const colors = [
  { name: "Pink", value: "bg-pink-500", border: "border-pink-500/20", text: "text-pink-500" },
  { name: "Blue", value: "bg-blue-500", border: "border-blue-500/20", text: "text-blue-500" },
  { name: "Sky", value: "bg-sky-500", border: "border-sky-500/20", text: "text-sky-500" },
  { name: "Red", value: "bg-red-500", border: "border-red-500/20", text: "text-red-500" },
  { name: "Indigo", value: "bg-indigo-500", border: "border-indigo-500/20", text: "text-indigo-500" },
  { name: "Emerald", value: "bg-emerald-500", border: "border-emerald-500/20", text: "text-emerald-500" },
];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<Record<string, CalendarItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"month" | "week">("month");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAIScheduleOpen, setIsAIScheduleOpen] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Form State
  const [newItem, setNewItem] = useState({
    idea: "",
    platform: "Instagram",
    contentType: "Post",
    scheduledTime: "09:00 AM",
    notes: "",
    color: "bg-pink-500"
  });

  // AI Schedule State
  const [aiConfig, setAiConfig] = useState({
    niche: "",
    goal: "",
    daysAhead: 7
  });
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [currentDate]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const month = format(currentDate, "MM");
      const year = format(currentDate, "yyyy");
      const { data } = await api.get("/calendar/items", { params: { month, year } });
      setItems(data);
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load calendar" });
    } finally {
      setLoading(false);
    }
  };

  if (loading && Object.keys(items).length === 0) return <PageSkeleton />;

  const addItem = async () => {
    if (!selectedDay || !newItem.idea) return;
    try {
      await api.post("/calendar/items", {
        ...newItem,
        date: format(selectedDay, "yyyy-MM-dd")
      });
      setIsAddItemOpen(false);
      fetchItems();
      toast({ title: "Item added", description: "New content planned." });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed", description: "Could not add item." });
    }
  };

  const deleteItem = async (id: number) => {
    try {
      await api.delete(`/calendar/items/${id}`);
      fetchItems();
      toast({ title: "Deleted", description: "Item removed from calendar." });
    } catch (err) {}
  };

  const generateForItem = async (id: number) => {
    try {
      toast({ title: "Generating...", description: "AI is writing your content." });
      await api.post(`/calendar/items/${id}/generate`);
      fetchItems();
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
      toast({ title: "Generated!", description: "Content is ready in your history." });
    } catch (err) {
        toast({ variant: "destructive", title: "Generation failed" });
    }
  };

  const runAISchedule = async () => {
    setScheduling(true);
    try {
      const existingDates = Object.keys(items).map(d => ({ date: d }));
      await api.post("/calendar/ai-schedule", { ...aiConfig, existingItems: existingDates });
      setIsAIScheduleOpen(false);
      fetchItems();
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
      toast({ title: "Schedule Created!", description: "AI has filled your calendar." });
    } catch (err) {
      toast({ variant: "destructive", title: "AI Failed" });
    } finally {
      setScheduling(false);
    }
  };

  const getPlatformIcon = (p: string) => {
    switch (p) {
      case "Instagram": return <Instagram className="h-3 w-3" />;
      case "Twitter": return <Twitter className="h-3 w-3" />;
      case "LinkedIn": return <Linkedin className="h-3 w-3" />;
      case "YouTube": return <Youtube className="h-3 w-3" />;
      default: return null;
    }
  };

  const getPlatformColor = (p: string) => {
    switch (p) {
      case "Instagram": return "bg-pink-500";
      case "Twitter": return "bg-blue-500";
      case "LinkedIn": return "bg-sky-500";
      case "YouTube": return "bg-red-500";
      default: return "bg-indigo-500";
    }
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const days = [];
    let day = startDate;

    for (let i = 0; i < 35; i++) {
      const cloneDay = day;
      const dateKey = format(day, "yyyy-MM-dd");
      const dayItems = items[dateKey] || [];
      const isCurrentMonth = getMonth(day) === getMonth(currentDate);

      days.push(
        <div
          key={dateKey}
          onClick={() => { setSelectedDay(cloneDay); setIsAddItemOpen(true); }}
          className={`min-h-[140px] p-2 border border-border/50 group transition-all cursor-pointer ${isCurrentMonth ? 'bg-card/30 hover:bg-card/60' : 'bg-muted/10 opacity-40'}`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'bg-indigo-600 text-white h-6 w-6 rounded-full flex items-center justify-center' : ''}`}>
              {format(day, "d")}
            </span>
            {dayItems.length > 0 && <span className="text-[10px] font-bold text-muted-foreground">{dayItems.length} items</span>}
          </div>
          
          <div className="space-y-1">
            {dayItems.slice(0, 3).map(item => (
              <div 
                key={item.id}
                className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 text-white truncate ${getPlatformColor(item.platform)}`}
              >
                {getPlatformIcon(item.platform)}
                {item.idea}
              </div>
            ))}
            {dayItems.length > 3 && (
              <div className="text-[10px] font-bold text-center text-muted-foreground bg-muted/50 rounded py-0.5">
                + {dayItems.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    return days;
  };

  return (
    <PageWrapper maxWidth="xl" className="py-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <CalendarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Content Calendar</h1>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Sparkles className="h-4 w-4 text-amber-500" />
              AI-Powered Scheduling & Planning
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-muted rounded-xl p-1 border">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="px-4 font-bold text-sm min-w-[140px] text-center">{format(currentDate, "MMMM yyyy")}</span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          
          <Button variant="outline" className="gap-2 border-indigo-500/20" onClick={() => setIsAIScheduleOpen(true)}>
            <Wand2 className="h-4 w-4 text-indigo-500" />
            AI Auto-Schedule
          </Button>

          <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-lg shadow-indigo-600/20" onClick={() => { setSelectedDay(new Date()); setIsAddItemOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add Content
          </Button>
        </div>
      </header>

      <Card className="border-none shadow-2xl overflow-hidden bg-background">
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="py-3 text-center text-xs font-black uppercase tracking-widest text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {loading ? (
            Array(35).fill(0).map((_, i) => <Skeleton key={i} className="h-[140px] rounded-none border" />)
          ) : (
            renderCells()
          )}
        </div>
      </Card>

      {/* Sheets & Dialogs */}
      <Sheet open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedDay ? format(selectedDay, "MMMM d, yyyy") : "Plan Content"}</SheetTitle>
            <SheetDescription>Schedule a new piece of content or manage existing items for this day.</SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-8">
            {/* Existing Items */}
            {selectedDay && (items[format(selectedDay, "yyyy-MM-dd")] || []).length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Planned for today</h4>
                <div className="space-y-3">
                  {items[format(selectedDay, "yyyy-MM-dd")].map(item => (
                    <div key={item.id} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                           <Badge className={getPlatformColor(item.platform)}>{item.platform}</Badge>
                           <span className="text-xs font-bold text-muted-foreground">{item.scheduledTime}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <p className="font-bold text-sm leading-tight">{item.idea}</p>
                      <div className="flex gap-2">
                         {item.generationId ? (
                           <Button size="sm" variant="outline" className="w-full text-xs gap-2" onClick={() => setLocation(`/history?id=${item.generationId}`)}>
                             <ExternalLink className="h-3 w-3" /> View Content
                           </Button>
                         ) : (
                           <Button size="sm" className="w-full text-xs gap-2 bg-indigo-600" onClick={() => generateForItem(item.id)}>
                             <Zap className="h-3 w-3 fill-current" /> Generate Now
                           </Button>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Add New Item</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Content Idea / Topic</Label>
                  <Textarea placeholder="What's the post about?" value={newItem.idea} onChange={e => setNewItem({...newItem, idea: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select value={newItem.platform} onValueChange={val => setNewItem({...newItem, platform: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newItem.contentType} onValueChange={val => setNewItem({...newItem, contentType: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{contentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input value={newItem.scheduledTime} onChange={e => setNewItem({...newItem, scheduledTime: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-1.5 pt-1">
                      {colors.map(c => (
                        <button 
                          key={c.name} 
                          onClick={() => setNewItem({...newItem, color: c.value})}
                          className={`h-6 w-6 rounded-full ${c.value} ${newItem.color === c.value ? 'ring-2 ring-offset-2 ring-indigo-600' : ''}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Button onClick={addItem} className="w-full bg-indigo-600">Save to Calendar</Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isAIScheduleOpen} onOpenChange={setIsAIScheduleOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-indigo-600 fill-indigo-600" />
              AI Auto-Schedule
            </DialogTitle>
            <DialogDescription>Let AI build your content strategy for the next few weeks.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Your Niche</Label>
              <Input placeholder="e.g. SaaS Founder, Fitness Coach" value={aiConfig.niche} onChange={e => setAiConfig({...aiConfig, niche: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Main Goal</Label>
              <Input placeholder="e.g. Get more leads, brand awareness" value={aiConfig.goal} onChange={e => setAiConfig({...aiConfig, goal: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="flex gap-2">
                {[7, 14, 30].map(d => (
                  <Button key={d} variant={aiConfig.daysAhead === d ? 'default' : 'outline'} className="flex-1" onClick={() => setAiConfig({...aiConfig, daysAhead: d})}>{d} Days</Button>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-700 flex gap-3">
              <Info className="h-4 w-4 shrink-0" />
              <span>AI will respect your existing {Object.keys(items).length} items and fill in the gaps with optimal posting times.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAIScheduleOpen(false)}>Cancel</Button>
            <Button onClick={runAISchedule} disabled={scheduling} className="bg-indigo-600 min-w-[140px]">
              {scheduling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Generate Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
