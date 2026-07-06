import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Loader2, Send, CheckCircle2, XCircle, Lightbulb, Eye, ChevronRight, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Question {
  id: number;
  concept: string;
  question: string;
  correct_answer?: string;
}

interface QuestionResult {
  score: number;
  passed: boolean;
  feedback: string;
  correct_answer: string;
  concept: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Challenge() {
  const [studentId, setStudentId] = useState(() => { try { return JSON.parse(localStorage.getItem("lc_user") || "{}").email || "student_1"; } catch { return "student_1"; } });
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);

  // Session state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [sessionDone, setSessionDone] = useState(false);

  const startSession = async () => {
    if (!studentId) return;
    setLoading(true);
    setResults([]);
    setSessionDone(false);
    setCurrentIdx(0);
    setAnswer("");
    setHint("");
    setResult(null);
    setShowAnswer(false);
    try {
      const res = await fetch(`${BASE}/api/challenge?student_id=${encodeURIComponent(studentId)}&count=${questionCount}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to load questions.");
        return;
      }
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHint = async () => {
    if (!questions[currentIdx]) return;
    setHintLoading(true);
    try {
      const res = await fetch(`${BASE}/api/challenge/hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questions[currentIdx].question, concept: questions[currentIdx].concept }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHint("Think about the core definition and a concrete example.");
        return;
      }
      setHint(data.hint || "Think about the core definition and a concrete example.");
    } catch {
      setHint("Think step by step: start with the definition, then a concrete example, then the edge cases.");
    } finally {
      setHintLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || !questions[currentIdx]) return;
    setSubmitting(true);
    try {
      const q = questions[currentIdx];
      const res = await fetch(`${BASE}/api/challenge/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, concept: q.concept, question: q.question, answer }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Submit error:", data.error || res.status);
        return;
      }
      const result = data as QuestionResult;
      setResult(result);
      setResults(prev => [...prev, result]);
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuestion = () => {
    const next = currentIdx + 1;
    if (next >= questions.length) {
      setSessionDone(true);
    } else {
      setCurrentIdx(next);
      setAnswer("");
      setHint("");
      setResult(null);
      setShowAnswer(false);
    }
  };

  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  const passCount = results.filter(r => r.passed).length;

  // ── Session summary ────────────────────────────────────────────────────────
  if (sessionDone) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-8 relative z-10">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
          <Trophy className="w-16 h-16 text-amber-400 mx-auto" />
          <h1 className="text-3xl font-mono font-bold tracking-widest uppercase text-white">Session Complete!</h1>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            {[
              { label: "Avg Score", value: `${avgScore}%`, color: avgScore >= 70 ? "text-emerald-400" : "text-amber-400" },
              { label: "Passed", value: `${passCount}/${results.length}`, color: "text-blue-400" },
              { label: "Grade", value: avgScore >= 90 ? "A" : avgScore >= 70 ? "B" : avgScore >= 50 ? "C" : "F", color: avgScore >= 70 ? "text-emerald-400" : "text-red-400" },
            ].map(s => (
              <div key={s.label} className="galaxy-card p-4 text-center">
                <div className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}</div>
                <div className="text-xs font-mono text-slate-400 uppercase tracking-widest mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3 text-left">
            {results.map((r, i) => (
              <div key={i} className={`galaxy-card p-4 flex items-center gap-4 border-l-[3px] ${r.passed ? "border-l-emerald-500" : "border-l-red-500"}`}>
                <div className={`text-2xl font-bold font-mono w-12 text-center ${r.passed ? "text-emerald-400" : "text-red-400"}`}>{r.score}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">{r.concept}</div>
                  <div className="text-sm text-slate-300 truncate">{r.feedback.split(".")[0]}.</div>
                </div>
                {r.passed ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
              </div>
            ))}
          </div>

          <Button onClick={() => { setQuestions([]); setSessionDone(false); setResults([]); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono">
            New Challenge Session
          </Button>
        </motion.div>
      </div>
    );
  }

  const q = questions[currentIdx];

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8 relative z-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center gap-3">
            <Target className="w-8 h-8 text-emerald-500" />
            Challenge_Mode
          </h1>
          <p className="text-slate-400 font-mono text-sm">AI-generated questions on your weakest topics.</p>
        </div>

        {questions.length === 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Input value={studentId} onChange={e => setStudentId(e.target.value)}
              className="font-mono bg-white/5 border-white/10 text-white w-40 focus-visible:ring-emerald-500" placeholder="Student ID" />
            <select value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))}
              className="font-mono bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
              {[3, 5, 7, 10].map(n => <option key={n} value={n}>{n} Questions</option>)}
            </select>
            <Button onClick={startSession} disabled={loading || !studentId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Challenge"}
            </Button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {questions.length === 0 && !loading && (
        <div className="flex items-center justify-center py-20 text-emerald-500/50 font-mono tracking-widest uppercase">
          Enter your student ID and start a challenge session
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="font-mono text-sm text-slate-400 uppercase tracking-widest">Generating questions with AI…</p>
        </div>
      )}

      {/* Active question */}
      {q && !sessionDone && (
        <div className="space-y-6">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${((currentIdx) / questions.length) * 100}%` }} />
            </div>
            <span className="font-mono text-xs text-slate-400 shrink-0">Q {currentIdx + 1} / {questions.length}</span>
          </div>

          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div key={`q-${currentIdx}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-4">

                <div className="inline-block px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-sm tracking-wider">
                  Topic: {q.concept}
                </div>

                <Card className="galaxy-card border-t-[3px] border-t-emerald-500 bg-white/5">
                  <CardContent className="p-8 space-y-6">
                    <p className="text-xl md:text-2xl text-white font-serif leading-relaxed">{q.question}</p>

                    {/* Hint */}
                    <AnimatePresence>
                      {hint && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex gap-3 items-start">
                          <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-200 font-serif leading-relaxed">{hint}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Textarea value={answer} onChange={e => setAnswer(e.target.value)}
                      placeholder="Type your answer here… Be as detailed as you can."
                      className="min-h-[140px] font-mono bg-[#050510]/50 border-white/10 text-white focus-visible:ring-emerald-500 text-base p-4 resize-none" />

                    <div className="flex flex-wrap gap-3 justify-between">
                      <Button variant="outline" onClick={fetchHint} disabled={hintLoading || !!hint}
                        className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-mono">
                        {hintLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lightbulb className="w-4 h-4 mr-2" />}
                        {hint ? "Hint shown" : "Get a Hint"}
                      </Button>
                      <Button onClick={submitAnswer} disabled={submitting || !answer.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono min-w-[150px]">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" />Submit Answer</>}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div key={`r-${currentIdx}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">

                {/* Score card */}
                <Card className={`galaxy-card border-t-[3px] bg-white/5 ${result.score >= 70 ? "border-t-emerald-500" : result.score >= 40 ? "border-t-amber-500" : "border-t-red-500"}`}>
                  <CardContent className="p-8 space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
                          <motion.circle cx="50" cy="50" r="42" fill="none"
                            stroke={result.score >= 70 ? "#10b981" : result.score >= 40 ? "#f59e0b" : "#ef4444"}
                            strokeWidth="10" strokeDasharray="264"
                            initial={{ strokeDashoffset: 264 }}
                            animate={{ strokeDashoffset: 264 - (264 * result.score) / 100 }}
                            transition={{ duration: 1.2, ease: "easeOut" }} strokeLinecap="round" />
                        </svg>
                        <span className="text-3xl font-bold font-mono text-white">{result.score}</span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-xs tracking-wider font-bold ${result.score >= 70 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" : "bg-red-500/20 text-red-400 border border-red-500/50"}`}>
                          {result.score >= 70 ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {result.score >= 70 ? "PASSED" : "NEEDS REVIEW"}
                        </div>
                        <p className="text-slate-300 font-serif leading-relaxed">{result.feedback}</p>
                      </div>
                    </div>

                    {/* Verify Answer */}
                    <div>
                      <Button variant="outline" onClick={() => setShowAnswer(v => !v)}
                        className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10 font-mono text-sm">
                        <Eye className="w-4 h-4 mr-2" />
                        {showAnswer ? "Hide Correct Answer" : "Verify Answer"}
                      </Button>
                      <AnimatePresence>
                        {showAnswer && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                            className="mt-4 p-5 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                            <div className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-2">Correct Answer</div>
                            <p className="text-slate-200 font-serif leading-relaxed">{result.correct_answer}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={nextQuestion} className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono">
                        {currentIdx + 1 >= questions.length ? <><Trophy className="w-4 h-4 mr-2" />View Results</> : <><ChevronRight className="w-4 h-4 mr-2" />Next Question</>}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
