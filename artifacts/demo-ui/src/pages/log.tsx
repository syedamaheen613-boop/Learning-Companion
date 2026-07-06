import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { BookOpen, Loader2, CheckCircle2, AlertCircle, UserPlus, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")

export function LogMistake() {
  // Create student
  const [newName, setNewName]           = useState("")
  const [newStudentId, setNewStudentId] = useState("")
  const [creating, setCreating]         = useState(false)
  const [createMsg, setCreateMsg]       = useState("")
  const [createError, setCreateError]   = useState("")
  const [showCreate, setShowCreate]     = useState(false)

  // Log mistake
  const [studentId, setStudentId]   = useState(() => { try { return JSON.parse(localStorage.getItem("lc_user") || "{}").email || "student_1"; } catch { return "student_1"; } })
  const [students, setStudents]     = useState<{ id: string; name: string }[]>([])
  const [concept, setConcept]       = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitError, setSubmitError] = useState("")

  // Load students on mount
  useEffect(() => { loadStudents() }, [])

  const loadStudents = async () => {
    try {
      const res = await fetch(`${BASE}/api/students`)
      if (res.ok) { const data = await res.json(); setStudents(data.students || []) }
    } catch { /* ignore */ }
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true); setCreateMsg(""); setCreateError("")
    try {
      const res = await fetch(`${BASE}/api/create_student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), student_id: newStudentId.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error || "Could not create student."); return }
      setCreateMsg(`✓ Student "${data.name}" created! ID: ${data.student_id}`)
      setNewName(""); setNewStudentId("")
      setStudentId(data.student_id)
      await loadStudents()
    } catch { setCreateError("Network error — please try again.") }
    finally { setCreating(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId || !concept || !description) return
    setSubmitting(true); setSubmitError("")
    try {
      const res = await fetch(`${BASE}/api/log_mistake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, concept, description }),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error || "Could not save your mistake."); return }
      setShowSuccess(true); setConcept(""); setDescription("")
      setTimeout(() => setShowSuccess(false), 4000)
    } catch { setSubmitError("Network error — please try again.") }
    finally { setSubmitting(false) }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl space-y-8 relative z-10">

      {/* Header */}
      <div className="space-y-3 text-center border-b border-white/10 pb-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <BookOpen className="w-8 h-8" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
          Log a Mistake
        </h1>
        <p className="text-slate-400 font-mono text-sm max-w-md mx-auto">
          Record what confused you so the AI can remember it and help you improve.
        </p>
      </div>

      {/* Add New Student (collapsible) */}
      <div className="galaxy-card overflow-hidden">
        <button onClick={() => setShowCreate(v => !v)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-purple-400" />
            <span className="font-mono text-sm font-bold text-purple-300 uppercase tracking-wider">Add a New Student</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showCreate ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/10">
              <form onSubmit={handleCreateStudent} className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-slate-300 font-mono text-xs uppercase tracking-wider">Student's Full Name *</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Mahi Sharma"
                    className="font-mono bg-black/40 border-white/10 text-white focus-visible:ring-purple-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 font-mono text-xs uppercase tracking-wider">Custom ID (optional)</Label>
                  <Input value={newStudentId} onChange={e => setNewStudentId(e.target.value)} placeholder="e.g. mahi_s (auto-generated if blank)"
                    className="font-mono bg-black/40 border-white/10 text-white focus-visible:ring-purple-500" />
                </div>
                {createError && <p className="text-sm text-red-400 font-mono">{createError}</p>}
                {createMsg  && <p className="text-sm text-emerald-400 font-mono">{createMsg}</p>}
                <Button type="submit" disabled={creating || !newName.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-mono">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Create Student
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Log mistake form */}
      <Card className="galaxy-card border-t-[3px] border-t-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
        <CardContent className="p-8 relative z-10">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-2">
              <Label className="text-slate-300 font-mono text-xs uppercase tracking-wider">What topic did you struggle with? *</Label>
              <Input value={concept} onChange={e => setConcept(e.target.value)} placeholder="e.g. Recursion, Binary Search, SQL Joins…"
                className="font-mono bg-black/40 border-white/10 text-white focus-visible:ring-emerald-500" />
              <p className="text-[11px] text-slate-500 font-mono">This is the subject area where you got confused.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 font-mono text-xs uppercase tracking-wider">What exactly didn't you understand? *</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Be specific — e.g. 'I forgot that the base case needs to return a value, not just stop the function.'"
                className="font-mono bg-black/40 border-white/10 text-white focus-visible:ring-emerald-500 min-h-[120px] resize-none" />
              <p className="text-[11px] text-slate-500 font-mono">The more specific you are, the better the AI can help you later.</p>
            </div>

            {submitError && <p className="text-sm text-red-400 font-mono flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {submitError}</p>}

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-mono h-12"
              disabled={!studentId || !concept || !description || submitting}>
              <span className="flex items-center gap-2">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />}
                Save This Mistake
              </span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 border border-emerald-500/50 bg-emerald-900/20 text-emerald-400 font-mono flex items-center gap-4 justify-center rounded-xl backdrop-blur">
            <CheckCircle2 className="w-6 h-6" />
            <div className="space-y-0.5">
              <div className="uppercase tracking-widest text-sm font-bold">Mistake saved!</div>
              <div className="text-xs text-emerald-300/70">The AI will remember this when you ask questions.</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
