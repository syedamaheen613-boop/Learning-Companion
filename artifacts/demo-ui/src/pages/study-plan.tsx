import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Loader2, GitMerge, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function StudyPlan() {
  const [studentId, setStudentId] = useState("student_1");
  const [loading, setLoading] = useState(false);
  const [planData, setPlanData] = useState<any>(null);

  const fetchPlan = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/study_plan?student_id=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setPlanData(data);
      } else {
        setPlanData({ study_plan: [] });
      }
    } catch (err) {
      console.error(err);
      setPlanData({ study_plan: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl space-y-8 relative z-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-cyan-500" />
            Study_Plan
          </h1>
          <p className="text-slate-400 font-mono text-sm">
            Prioritized concept remediation path based on structural failures.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Input 
            value={studentId} 
            onChange={(e) => setStudentId(e.target.value)} 
            className="font-mono bg-white/5 border-white/10 text-white w-48 focus-visible:ring-cyan-500"
            placeholder="Student ID"
            onKeyDown={(e) => e.key === 'Enter' && fetchPlan()}
          />
          <Button 
            onClick={fetchPlan} 
            disabled={loading || !studentId}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-mono"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load Plan"}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      )}

      {planData && !loading && (
        <div className="space-y-6">
          {(!planData.plan || planData.plan.length === 0) ? (
            <div className="text-center py-20 text-slate-500 font-mono uppercase tracking-widest border border-white/5 bg-white/5 rounded-xl">
              No recommended study plan available. Structural integrity optimal.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {planData.plan.map((item: any, idx: number) => {
                let effortColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
                if (item.effort === "MEDIUM") effortColor = "bg-amber-500/20 text-amber-400 border-amber-500/50";
                if (item.effort === "HIGH") effortColor = "bg-red-500/20 text-red-400 border-red-500/50";

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="galaxy-card border-l-[4px] border-l-cyan-500 bg-white/5 shadow-[0_0_20px_rgba(6,182,212,0.05)] hover:bg-white/10 transition-colors">
                      <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                        
                        <div className="flex flex-col items-center justify-center w-16 shrink-0 border-r border-white/10 pr-6">
                          <span className="text-sm font-mono text-cyan-500 uppercase tracking-widest mb-1">Rank</span>
                          <span className="text-4xl font-bold font-mono text-white bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
                            {idx + 1}
                          </span>
                        </div>

                        <div className="flex-1 space-y-3 min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-bold font-mono text-white truncate">{item.concept}</h3>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${effortColor}`}>
                              {item.effort} EFFORT
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 border border-white/10 text-slate-300 text-[10px] font-mono">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              {item.mistake_count} Mistakes
                            </div>
                          </div>
                          
                          {item.sample_mistake && (
                            <div className="text-sm text-slate-400 font-serif italic border-l-2 border-white/20 pl-3">
                              "{item.sample_mistake.length > 100 ? item.sample_mistake.substring(0,100) + '...' : item.sample_mistake}"
                            </div>
                          )}

                          {item.dependencies && item.dependencies.length > 0 && (
                            <div className="flex items-center gap-2 pt-2 flex-wrap">
                              <GitMerge className="w-3 h-3 text-slate-500" />
                              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Dependencies:</span>
                              {item.dependencies.map((dep: string, i: number) => (
                                <span key={i} className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                                  {dep}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
