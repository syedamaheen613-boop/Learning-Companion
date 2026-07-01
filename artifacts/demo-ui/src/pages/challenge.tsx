import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Loader2, Send, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function Challenge() {
  const [studentId, setStudentId] = useState("student_1");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [challengeData, setChallengeData] = useState<any>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<any>(null);

  const fetchChallenge = async () => {
    if (!studentId) return;
    setLoading(true);
    setResult(null);
    setAnswer("");
    try {
      const res = await fetch(`/api/challenge?student_id=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setChallengeData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!studentId || !challengeData || !answer.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/challenge/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          concept: challengeData.concept,
          answer: answer
        })
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8 relative z-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center gap-3">
            <Target className="w-8 h-8 text-emerald-500" />
            Challenge_Mode
          </h1>
          <p className="text-slate-400 font-mono text-sm">
            Test cognitive limits and reinforce knowledge structures.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Input 
            value={studentId} 
            onChange={(e) => setStudentId(e.target.value)} 
            className="font-mono bg-white/5 border-white/10 text-white w-48 focus-visible:ring-emerald-500"
            placeholder="Student ID"
          />
          <Button 
            onClick={fetchChallenge} 
            disabled={loading || !studentId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Challenge"}
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!challengeData && !loading && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-20 text-emerald-500/50 font-mono tracking-widest uppercase"
          >
            Awaiting target identifier to generate challenge...
          </motion.div>
        )}

        {loading && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-20"
          >
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          </motion.div>
        )}

        {challengeData && !loading && !result && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="inline-block px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-sm tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              Target Node: {challengeData.concept}
            </div>

            <Card className="galaxy-card border-t-[3px] border-t-emerald-500 bg-white/5 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <CardContent className="p-8 space-y-8">
                <div className="text-xl md:text-2xl text-white font-serif leading-relaxed">
                  {challengeData.question}
                </div>

                <div className="space-y-4">
                  <Textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Enter your solution..."
                    className="min-h-[150px] font-mono bg-[#050510]/50 border-white/10 text-white focus-visible:ring-emerald-500 text-base p-4 resize-none"
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={submitAnswer}
                      disabled={submitting || !answer.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono min-w-[150px]"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <span className="flex items-center gap-2">Submit Answer <Send className="w-4 h-4" /></span>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <Card className={`galaxy-card border-t-[3px] bg-white/5 shadow-[0_0_30px_rgba(16,185,129,0.1)] ${result.score >= 70 ? 'border-t-emerald-500' : result.score >= 40 ? 'border-t-yellow-500' : 'border-t-red-500'}`}>
              <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                    <motion.circle 
                      cx="50" cy="50" r="45" 
                      fill="none" 
                      stroke={result.score >= 70 ? '#10b981' : result.score >= 40 ? '#f59e0b' : '#ef4444'} 
                      strokeWidth="10" 
                      strokeDasharray="283" 
                      initial={{ strokeDashoffset: 283 }}
                      animate={{ strokeDashoffset: 283 - (283 * result.score) / 100 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      strokeLinecap="round" 
                    />
                  </svg>
                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-bold font-mono text-white">{result.score}</span>
                    <span className="text-[10px] uppercase font-mono text-slate-400">Score</span>
                  </div>
                </div>

                <div className="max-w-2xl text-lg text-slate-300 font-serif leading-relaxed">
                  {result.feedback}
                </div>

                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-mono text-sm tracking-wider font-bold ${result.score >= 70 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                  {result.score >= 70 ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  {result.score >= 70 ? 'CHALLENGE PASSED' : 'CHALLENGE FAILED'}
                </div>

                <Button 
                  onClick={fetchChallenge}
                  variant="outline"
                  className="mt-4 border-white/20 text-white hover:bg-white/10 font-mono"
                >
                  Next Challenge
                </Button>

              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
