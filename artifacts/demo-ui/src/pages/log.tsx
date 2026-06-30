import { useState } from "react"
import { useLogMistake } from "@workspace/api-client-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
    <div className="container mx-auto px-4 py-12 max-w-2xl space-y-12">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-mono font-bold tracking-widest uppercase text-foreground">Memory_Ingest</h1>
        <p className="text-muted-foreground font-mono">
          Manually input structural failures into the cognitive registry.
        </p>
      </div>

      <Card className="border-border bg-black/40 backdrop-blur relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-border" />
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center gap-3 text-muted-foreground mb-6 border-b border-border/50 pb-4">
              <Database className="w-5 h-5" />
              <h2 className="font-mono text-sm tracking-widest uppercase font-bold">Failure Log Protocol</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="student-id">Target Identifier</Label>
                <Input 
                  id="student-id" 
                  value={studentId} 
                  onChange={(e) => setStudentId(e.target.value)} 
                  className="font-mono bg-background/50 focus-visible:ring-primary"
                  placeholder="e.g. student_1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="concept">Concept Node</Label>
                <Input 
                  id="concept" 
                  value={concept} 
                  onChange={(e) => setConcept(e.target.value)} 
                  className="font-mono bg-background/50 focus-visible:ring-primary"
                  placeholder="e.g. Recursion"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Failure Description</Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="font-mono bg-background/50 focus-visible:ring-primary min-h-[120px]"
                  placeholder="Describe the exact point of structural failure..."
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full relative group"
              disabled={!studentId || !concept || !description || logMutation.isPending}
            >
              <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform" />
              <span className="relative z-10 flex items-center gap-2">
                {logMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
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
            className="p-4 border border-destructive bg-destructive/10 text-destructive font-mono text-sm flex items-center gap-3"
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
            className="p-6 border border-primary bg-primary/10 text-primary font-mono flex items-center gap-4 justify-center"
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
