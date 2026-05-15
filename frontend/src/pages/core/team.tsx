import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, UserPlus, Shield, UserMinus, 
  ExternalLink, Copy, Check, Loader2,
  Brain, Zap, Crown, BarChart3, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/react";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { PageSkeleton } from "@/components/shared/Skeleton";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "member";
  generationsUsed: number;
  joinedAt: string;
}

export default function TeamPage() {
  const { getToken } = useAuth();
  const { data: sub } = useSubscriptionStatus();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [teamCode, setTeamCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/team/members", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.members) setMembers(data.members);
      if (data.teamCode) setTeamCode(data.teamCode);
    } catch (e) {
      console.error("Failed to fetch team data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/team/create", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchTeamData();
        toast({ title: "Team Created!", description: "You are now the team owner." });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.error || "Failed to create team" });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to create team" });
    } finally {
      setLoading(false);
    }
  };

  const copyInvite = () => {
    const link = `${window.location.origin}/join-team?code=${teamCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "Link Copied!", description: "Send this link to your team members." });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-400" />
             </div>
             <h1 className="text-3xl font-black text-white tracking-tight">Team Management</h1>
          </div>
          <p className="text-white/40 text-sm font-medium">Manage your agency members and monitor their content output in real-time.</p>
        </div>
        
        {teamCode && (
          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 font-mono text-xs text-white/50 flex items-center justify-between gap-4">
                <span>{teamCode}</span>
                <button onClick={copyInvite} className="hover:text-violet-400 transition-colors">
                   {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
             </div>
             <Button 
                onClick={copyInvite}
                className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-violet-900/20 transition-all hover:scale-[1.02]"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite
              </Button>
          </div>
        )}
      </div>

      {!teamCode ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[40px] border border-white/5 bg-white/[0.02] p-12 md:p-20 text-center space-y-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.03] to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-8 shadow-glow-sm">
               <Brain className="w-10 h-10 text-violet-400" />
            </div>
            <div className="space-y-3 max-w-md mx-auto">
              <h2 className="text-2xl font-black text-white">Create Your Agency Team</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                Unlock collaborative content creation. Add up to 5 members, pool generations, and scale your content output as a unified force.
              </p>
            </div>
            <div className="pt-8">
              <Button 
                onClick={handleCreateTeam}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-black px-12 h-14 rounded-2xl shadow-2xl shadow-violet-900/40 transition-all hover:scale-105 active:scale-95"
              >
                Create Team Ecosystem →
              </Button>
              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] mt-6">Requires Agency or Infinity Tier</p>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-transparent p-8 space-y-4 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                 <Users className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Active Seats</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{members.length}</span>
                  <span className="text-white/20 text-sm font-bold">/ 5</span>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-transparent p-8 space-y-4 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                 <Zap className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Team Generations</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-violet-400">
                    {members.reduce((acc, m) => acc + (m.generationsUsed || 0), 0)}
                  </span>
                  <span className="text-white/20 text-sm font-bold">/ 1,000</span>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-transparent p-8 space-y-4 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                 <Crown className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Infrastructure Tier</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-white uppercase tracking-tight">Agency Tier</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/5 bg-white/[0.02] overflow-hidden shadow-2xl">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div>
                <h3 className="font-black text-white tracking-tight">Ecosystem Members</h3>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Authorized Access Control</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{members.length} Synced</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-white/5 bg-black/20">
                    <th className="px-8 py-5 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Identity</th>
                    <th className="px-8 py-5 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Authority Level</th>
                    <th className="px-8 py-5 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] text-center">Output Load</th>
                    <th className="px-8 py-5 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {members.map((member) => (
                    <tr key={member.id} className="group hover:bg-white/[0.02] transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center font-black text-white/40 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            {member.name[0]}
                          </div>
                          <div>
                            <p className="font-black text-white tracking-tight">{member.name}</p>
                            <p className="text-xs text-white/20 font-medium">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] ${
                          member.role === 'owner' 
                            ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                            : 'bg-white/5 text-white/40 border border-white/10'
                        }`}>
                          {member.role === 'owner' ? <Shield className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                          {member.role}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-baseline gap-1">
                             <span className="text-lg font-black text-white">{member.generationsUsed || 0}</span>
                             <span className="text-[10px] text-white/20 font-bold uppercase">Gens</span>
                          </div>
                          <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, ((member.generationsUsed || 0) / 200) * 100)}%` }} 
                              transition={{ duration: 1.5, ease: "circOut" }}
                              className={`h-full ${member.role === 'owner' ? 'bg-violet-500' : 'bg-violet-400/60'}`}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {member.role !== 'owner' ? (
                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-red-400/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        ) : (
                          <div className="h-10 w-10 flex items-center justify-center opacity-20">
                             <Lock className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {members.length === 0 && (
              <div className="py-20 text-center space-y-4">
                 <p className="text-white/20 font-black uppercase tracking-[0.4em] text-xs">No synchronization detected</p>
                 <Button onClick={copyInvite} variant="ghost" className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/5">
                    Generate Invitation Protocol
                 </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
