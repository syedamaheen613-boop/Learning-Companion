import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Flame,
  Brain,
  Activity as ActivityIcon,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Dashboard() {
  const storedUser = JSON.parse(localStorage.getItem("lc_user") || "{}");
  const [studentId, setStudentId] = useState(storedUser.email || "student_1");
  const [queryId, setQueryId] = useState(storedUser.email || "student_1");

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [badgesData, setBadgesData] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  const loadData = async (id: string) => {
    setLoading(true);
    try {
      const [dashRes, badgesRes] = await Promise.all([
        fetch(`/api/dashboard?student_id=${id}`),
        fetch(`/api/badges?student_id=${id}`),
      ]);

      const dash = await dashRes.json().catch(() => null);
      const badges = await badgesRes.json().catch(() => null);

      setDashboardData(dash);
      setBadgesData(badges);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(queryId);
  }, [queryId]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8 relative z-10">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
            Student_Dashboard
          </h1>
          <p className="text-slate-400 font-mono text-sm">
            Overview of learning progress and structural integrity.
          </p>
        </div>
      </div>

      {loading && !dashboardData && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      )}

      {dashboardData && (
        <div className="space-y-8">
          {/* Hero Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div whileHover={{ scale: 1.02 }} className="h-full">
              <Card className="h-full galaxy-card border-t-[3px] border-t-purple-500 shadow-[0_0_30px_rgba(124,58,237,0.15)] bg-white/5 hover:shadow-[0_0_30px_rgba(124,58,237,0.3)]">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg
                      className="absolute inset-0 w-full h-full transform -rotate-90"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth="8"
                        strokeDasharray="283"
                        strokeDashoffset={
                          283 - (283 * ((dashboardData.xp || 0) % 500)) / 500
                        }
                        className="transition-all duration-1000"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="text-2xl font-bold font-mono text-white">
                      {dashboardData.xp || 0}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-purple-400 tracking-widest uppercase font-bold">
                    Experience Points
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} className="h-full">
              <Card className="h-full galaxy-card border-t-[3px] border-t-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.15)] bg-white/5 hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Flame className="w-12 h-12" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold font-mono text-white">
                      {dashboardData.streak || 0}
                    </div>
                    <div className="font-mono text-xs text-amber-500 tracking-widest uppercase font-bold">
                      Day Streak
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} className="h-full">
              <Card className="h-full galaxy-card border-t-[3px] border-t-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.15)] bg-white/5 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Brain className="w-12 h-12" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold font-mono text-white">
                      {dashboardData.concept_count || 0}
                    </div>
                    <div className="font-mono text-xs text-blue-400 tracking-widest uppercase font-bold">
                      Concepts Encountered
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mastery Grid */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-mono font-bold tracking-widest text-slate-300 uppercase border-b border-white/10 pb-2">
                Concept_Mastery
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(dashboardData.mastery || []).map(
                  (concept: any, idx: number) => {
                    let statusColor = "border-white/10 text-slate-400";
                    let bg = "bg-white/5";
                    if (concept.status === "struggling") {
                      statusColor = "border-red-500/50 text-red-400";
                      bg = "bg-red-500/10";
                    } else if (concept.status === "needs_review") {
                      statusColor = "border-yellow-500/50 text-yellow-400";
                      bg = "bg-yellow-500/10";
                    } else if (concept.status === "mastered") {
                      statusColor = "border-emerald-500/50 text-emerald-400";
                      bg = "bg-emerald-500/10";
                    }

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border ${statusColor} ${bg} flex flex-col gap-2`}
                      >
                        <div className="font-mono text-sm font-bold truncate text-white">
                          {concept.concept}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-wider">
                          {concept.status.replace("_", " ")}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-4">
              <h2 className="text-lg font-mono font-bold tracking-widest text-slate-300 uppercase border-b border-white/10 pb-2">
                Activity_Feed
              </h2>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                {(dashboardData.recent_activity || [])
                  .slice(0, 5)
                  .map((activity: any, idx: number) => (
                    <div key={idx} className="relative flex items-start gap-4">
                      <div className="w-5 h-5 rounded-full bg-[#050510] border-2 border-purple-500 z-10 shrink-0 mt-1" />
                      <div className="galaxy-card p-3 flex-1">
                        <div className="text-[10px] font-mono text-purple-400 mb-1 inline-block px-2 py-0.5 bg-purple-500/10 rounded">
                          {activity.concept}
                        </div>
                        <div className="text-sm text-slate-300">
                          {activity.description}
                        </div>
                      </div>
                    </div>
                  ))}
                {(!dashboardData.recent_activity ||
                  dashboardData.recent_activity.length === 0) && (
                  <div className="text-slate-500 font-mono text-sm italic pl-8">
                    No recent activity detected.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Badge Preview */}
          {badgesData && badgesData.badges && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h2 className="text-lg font-mono font-bold tracking-widest text-slate-300 uppercase">
                Recent_Achievements
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {badgesData.badges
                  .slice(0, 4)
                  .map((badge: any, idx: number) => (
                    <div
                      key={idx}
                      className={`galaxy-card p-4 flex items-center gap-3 ${badge.unlocked ? "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : "opacity-50 grayscale"}`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${badge.unlocked ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white/40"}`}
                      >
                        {badge.unlocked ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold text-white truncate">
                          {badge.name}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 truncate">
                          {badge.unlocked ? "UNLOCKED" : "LOCKED"}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
