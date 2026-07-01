import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, Loader2, Rocket, FileText, Brain, Map, GraduationCap, Flame, Shield, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Map names to Lucide icons
const iconMap: Record<string, any> = {
  "First Steps": Rocket,
  "Steady Learner": Flame,
  "Graph Explorer": Map,
  "Bug Hunter": Shield,
  "Master Mind": Brain,
  "Scholar": GraduationCap,
  "Documentation": FileText,
  "Default": Star
};

export function Badges() {
  const [studentId, setStudentId] = useState("student_1");
  const [loading, setLoading] = useState(false);
  const [badgesData, setBadgesData] = useState<any>(null);

  const fetchBadges = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/badges?student_id=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setBadgesData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, []);

  const unlockedCount = badgesData?.badges?.filter((b: any) => b.unlocked).length || 0;
  const totalCount = badgesData?.badges?.length || 0;

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl space-y-8 relative z-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500 flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-500" />
            Achievements
          </h1>
          <p className="text-slate-400 font-mono text-sm">
            Milestones reached across the cognitive registry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Input 
            value={studentId} 
            onChange={(e) => setStudentId(e.target.value)} 
            className="font-mono bg-white/5 border-white/10 text-white w-48 focus-visible:ring-amber-500"
            placeholder="Student ID"
            onKeyDown={(e) => e.key === 'Enter' && fetchBadges()}
          />
          <Button 
            onClick={fetchBadges} 
            disabled={loading || !studentId}
            className="bg-amber-600 hover:bg-amber-700 text-white font-mono"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      )}

      {badgesData && !loading && (
        <div className="space-y-8">
          
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)] font-mono text-amber-400">
              <span className="text-2xl font-bold text-white">{unlockedCount} / {totalCount}</span>
              <span className="uppercase tracking-widest text-sm">Achievements Unlocked</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {badgesData.badges.map((badge: any, idx: number) => {
              const Icon = iconMap[badge.name] || iconMap["Default"];
              const isUnlocked = badge.unlocked;

              return (
                <motion.div
                  key={idx}
                  initial={isUnlocked ? { opacity: 0, scale: 0.9, y: 20 } : { opacity: 0 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="h-full"
                >
                  <Card className={`h-full galaxy-card relative overflow-hidden group ${isUnlocked ? 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] bg-amber-900/10' : 'border-white/5 bg-white/5 grayscale opacity-50'}`}>
                    
                    {/* Shimmer Effect */}
                    {isUnlocked && (
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_2s_infinite]" />
                    )}

                    {!isUnlocked && (
                      <div className="absolute top-4 right-4 px-2 py-1 bg-black/80 border border-white/20 rounded text-[10px] font-mono text-white/50 tracking-wider z-10 uppercase">
                        Locked
                      </div>
                    )}

                    <CardContent className="p-8 flex flex-col items-center text-center space-y-4 relative z-10">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isUnlocked ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'bg-white/10 text-white/30'}`}>
                        <Icon className="w-10 h-10" />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className={`text-lg font-mono font-bold uppercase tracking-wider ${isUnlocked ? 'text-amber-400' : 'text-slate-300'}`}>
                          {badge.name}
                        </h3>
                        <p className="text-sm text-slate-400 font-serif">
                          {badge.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}
