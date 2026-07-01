import { useState } from "react"
import { useLogMistake } from "@workspace/api-client-react"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Database, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function LogMistake() {
  const [studentId, setStudentId] = useState("student_1")
  const [concept, setConcept] = useState("")
  const [description, setDescription] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  const logMutation = useLogMistake()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId || !concept || !description) return

    logMutation.mutate({
      data: { student_id: studentId, concept, description }
    }, {
      onSuccess: () => {
        setShowSuccess(true)
        setConcept("")
        setDescription("")
        setTimeout(() => setShowSuccess(false), 3000)
      }
    })
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl space-y-12 relative z-10">
      
      <div className="space-y-4 text-center border-b border-white/10 pb-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <Database className="w-8 h-8" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">Memory_Ingest</h1>
        <p className="text-slate-400 font-mono text-sm max-w-md mx-auto">
          Manually input structural failures into the cognitive registry for future correlation.
        </p>
      </div>

      <Card className="galaxy-card border-t-[3px] border-t-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
        <CardContent className="p-8 relative z-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="student-id" className="text-slate-300 font-mono text-xs uppercase tracking-wider">Target Identifier</Label>
                <Input 
                  id="student-id" 
                  value={studentId} 
                  onChange={(e) => setStudentId(e.target.value)} 
                  className="font-mono bg-black/40 border-white/10 text-white focus-visible:ring-emerald-500"
                  placeholder="e.g. student_1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="concept" className="text-slate-300 font-mono text-xs uppercase tracking-wider">Concept Node</Label>
                <Input 
                  id="concept" 
                  value={concept} 
                  onChange={(e) => setConcept(e.target.value)} 
                  className="font-mono bg-black/40 border-white/10 text-white focus-visible:ring-emerald-500"
                  placeholder="e.g. Recursion"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-300 font-mono text-xs uppercase tracking-wider">Failure Description</Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="font-mono bg-black/40 border-white/10 text-white focus-visible:ring-emerald-500 min-h-[120px] resize-none"
                  placeholder="Describe the exact point of structural failure..."
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full relative group bg-emerald-600 hover:bg-emerald-700 text-white font-mono h-12"
              disabled={!studentId || !concept || !description || logMutation.isPending}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
              <span className="relative z-10 flex items-center gap-2">
                {logMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                Commit to Registry
              </span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <AnimatePresence>
        {logMutation.isError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 border border-red-500/50 bg-red-900/20 text-red-400 font-mono text-sm flex items-center gap-3 rounded-xl backdrop-blur"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>ERR_COMMIT_FAILED: The system rejected the ingest payload.</span>
          </motion.div>
        )}

        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 border border-emerald-500/50 bg-emerald-900/20 text-emerald-400 font-mono flex items-center gap-4 justify-center rounded-xl backdrop-blur"
          >
            <CheckCircle2 className="w-6 h-6" />
            <div className="uppercase tracking-widest text-sm font-bold">
              Payload ingested successfully
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
