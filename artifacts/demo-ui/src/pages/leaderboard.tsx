import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Loader2, Crown, Medal, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function Leaderboard() {
  const [yourId, setYourId] = useState("");
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        // Fallback mock data if empty
        const rows = data.leaderboard ?? [];
        if (rows.length === 0) {
          setLeaderboard([
            { rank: 1, student_id: "student_4", name: "Alex R.", xp: 1250, streak: 14, concept_count: 45, mistake_count: 2 },
            { rank: 2, student_id: "student_1", name: "J. Doe", xp: 980, streak: 5, concept_count: 30, mistake_count: 8 },
            { rank: 3, student_id: "student_9", name: "Sam K.", xp: 820, streak: 3, concept_count: 22, mistake_count: 12 },
            { rank: 4, student_id: "student_2", name: "Emma W.", xp: 600, streak: 1, concept_count: 15, mistake_count: 5 },
          ]);
        } else {
          setLeaderboard(rows);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const maxXP = Math.max(...leaderboard.map(u => u.xp || 0), 1);
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl space-y-12 relative z-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-rose-500 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-pink-500" />
            Global_Rankings
          </h1>
          <p className="text-slate-400 font-mono text-sm">
            Top performing cognitive structures across the network.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">Highlight ID:</span>
          <Input 
            value={yourId} 
            onChange={(e) => setYourId(e.target.value)} 
            className="font-mono bg-white/5 border-white/10 text-white w-48 focus-visible:ring-pink-500 h-8"
            placeholder="e.g. student_1"
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        </div>
      )}

      {!loading && leaderboard.length > 0 && (
        <div className="space-y-16">
          
          {/* Podium */}
          <div className="flex items-end justify-center gap-2 sm:gap-6 h-64 mt-8">
            
            {/* 2nd Place */}
            {top3[1] && (
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center w-28 sm:w-40 relative">
                <div className="mb-4 text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-400/20 flex items-center justify-center border-2 border-slate-300 text-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.3)] mb-2">
                    <Medal className="w-6 h-6" />
                  </div>
                  <div className="font-mono font-bold text-white text-sm truncate w-full px-2">{top3[1].name || top3[1].student_id}</div>
                  <div className="font-mono text-xs text-pink-400 font-bold">{top3[1].xp} XP</div>
                </div>
                <div className="w-full h-32 bg-gradient-to-t from-slate-400/20 to-slate-400/5 border-t-2 border-slate-400/50 rounded-t-lg backdrop-blur flex justify-center pt-4 text-3xl font-bold font-mono text-slate-500">2</div>
              </motion.div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-col items-center w-32 sm:w-48 relative z-10">
                <div className="mb-4 text-center relative -top-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-400/20 flex items-center justify-center border-2 border-amber-400 text-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.4)] mb-2">
                    <Crown className="w-8 h-8" />
                  </div>
                  <div className="font-mono font-bold text-white text-base truncate w-full px-2">{top3[0].name || top3[0].student_id}</div>
                  <div className="font-mono text-sm text-pink-400 font-bold">{top3[0].xp} XP</div>
                </div>
                <div className="w-full h-44 bg-gradient-to-t from-amber-500/20 to-amber-500/5 border-t-2 border-amber-500/50 rounded-t-lg backdrop-blur flex justify-center pt-4 text-4xl font-bold font-mono text-amber-600/50">1</div>
              </motion.div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="flex flex-col items-center w-28 sm:w-40 relative">
                <div className="mb-4 text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-orange-700/20 flex items-center justify-center border-2 border-orange-700 text-orange-500 shadow-[0_0_15px_rgba(194,65,12,0.3)] mb-2">
                    <Medal className="w-6 h-6" />
                  </div>
                  <div className="font-mono font-bold text-white text-sm truncate w-full px-2">{top3[2].name || top3[2].student_id}</div>
                  <div className="font-mono text-xs text-pink-400 font-bold">{top3[2].xp} XP</div>
                </div>
                <div className="w-full h-24 bg-gradient-to-t from-orange-800/20 to-orange-800/5 border-t-2 border-orange-800/50 rounded-t-lg backdrop-blur flex justify-center pt-2 text-2xl font-bold font-mono text-orange-800/50">3</div>
              </motion.div>
            )}

          </div>

          {/* Table */}
          <Card className="galaxy-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-slate-400 font-normal uppercase tracking-wider w-16">Rank</th>
                    <th className="px-6 py-4 text-slate-400 font-normal uppercase tracking-wider">Identifier</th>
                    <th className="px-6 py-4 text-slate-400 font-normal uppercase tracking-wider w-64">Experience</th>
                    <th className="px-6 py-4 text-slate-400 font-normal uppercase tracking-wider text-right">Streak</th>
                    <th className="px-6 py-4 text-slate-400 font-normal uppercase tracking-wider text-right">Concepts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboard.map((user, idx) => {
                    const isYou = yourId && user.student_id === yourId;
                    return (
                      <tr key={idx} className={`transition-colors hover:bg-white/5 ${isYou ? 'bg-pink-500/10' : ''}`}>
                        <td className={`px-6 py-4 font-bold ${idx < 3 ? 'text-pink-400' : 'text-slate-500'}`}>
                          #{user.rank || idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">{user.name || user.student_id}</span>
                            {isYou && <span className="text-[10px] bg-pink-500 text-white px-1.5 py-0.5 rounded ml-2 uppercase tracking-wider">You</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden shrink-0">
                              <div className="h-full bg-gradient-to-r from-pink-500 to-rose-400" style={{ width: `${(user.xp / maxXP) * 100}%` }} />
                            </div>
                            <span className="text-pink-300 font-bold">{user.xp}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-300">
                          {user.streak} <Flame className="w-3 h-3 inline text-amber-500 mb-0.5" />
                        </td>
                        <td className="px-6 py-4 text-right text-slate-300">
                          {user.concept_count ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      )}
    </div>
  );
}
