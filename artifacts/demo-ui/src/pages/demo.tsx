import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BrainCircuit, Mic, FileAudio, Play, PlayCircle, StopCircle, RefreshCw, Upload, Loader2, Sparkles, MoveRight } from "lucide-react"
import { useGetWowMoment, getGetWowMomentQueryKey } from "@workspace/api-client-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function DemoStage() {
  const [studentId, setStudentId] = useState("student_1")
  const [topic, setTopic] = useState("Merge Sort")
  
  // For text query
  const [queryId, setQueryId] = useState("")
  const [queryTopic, setQueryTopic] = useState("")
  
  // Voice state
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [voiceResult, setVoiceResult] = useState<any>(null)
  const [voiceError, setVoiceError] = useState("")
  
  const audioRef = useRef<HTMLAudioElement>(null)

  const { data: wowResult, isLoading: isWowLoading, isError: isWowError } = useGetWowMoment(
    { student_id: queryId, topic: queryTopic },
    {
      query: {
        enabled: !!queryId && !!queryTopic,
        queryKey: getGetWowMomentQueryKey({ student_id: queryId, topic: queryTopic })
      }
    }
  )

  const handleTextAsk = () => {
    if (!studentId || !topic) return
    setQueryId(studentId)
    setQueryTopic(topic)
  }

  const handleVoiceAsk = async () => {
    if (!studentId || !audioFile) return
    
    setIsUploading(true)
    setVoiceError("")
    setVoiceResult(null)
    
    try {
      const form = new FormData()
      form.append("student_id", studentId)
      form.append("audio", audioFile)
      
      const res = await fetch("/api/ask_voice", { method: "POST", body: form })
      if (!res.ok) {
        throw new Error("Failed to process voice query")
      }
      
      const data = await res.json()
      setVoiceResult(data)
    } catch (err: any) {
      setVoiceError(err.message || "An unknown error occurred")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl space-y-16">
      
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-mono font-bold tracking-widest uppercase">Learning_Cognition</h1>
        <p className="text-muted-foreground font-mono max-w-2xl mx-auto">
          System ready to correlate new concepts with past structural failures. Awaiting query parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* TEXT QUERY */}
        <div className="space-y-6 relative">
          <div className="absolute -left-6 top-0 bottom-0 w-px bg-border hidden md:block">
            <div className="h-4 w-1 bg-primary absolute top-0 -left-[1.5px]" />
            <div className="h-4 w-1 bg-primary absolute bottom-0 -left-[1.5px]" />
          </div>

          <div className="flex items-center gap-3 text-primary mb-4">
            <BrainCircuit className="w-5 h-5" />
            <h2 className="font-mono text-sm tracking-widest uppercase font-bold">Text_Ingest</h2>
          </div>

          <Card className="border-primary/20 bg-black/40 backdrop-blur">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="student-id">Student Identifier</Label>
                <Input 
                  id="student-id" 
                  value={studentId} 
                  onChange={(e) => setStudentId(e.target.value)} 
                  className="font-mono border-primary/20 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic">Target Concept</Label>
                <Input 
                  id="topic" 
                  value={topic} 
                  onChange={(e) => setTopic(e.target.value)} 
                  className="font-mono border-primary/20 focus-visible:ring-primary"
                />
              </div>
              <Button 
                onClick={handleTextAsk} 
                className="w-full relative overflow-hidden group"
                disabled={!studentId || !topic || isWowLoading}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isWowLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Execute Query
                </span>
              </Button>
            </CardContent>
          </Card>

          <AnimatePresence mode="wait">
            {isWowLoading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-8 border border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-4"
              >
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-2 border-primary/20 rounded-full" />
                  <div className="absolute inset-0 border-2 border-primary rounded-full border-t-transparent animate-spin" />
                  <BrainCircuit className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
                </div>
                <div className="font-mono text-xs tracking-widest uppercase text-primary animate-pulse">
                  Correlating memory banks...
                </div>
              </motion.div>
            )}

            {wowResult && !isWowLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <WowMomentCard result={wowResult} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* VOICE QUERY */}
        <div className="space-y-6 relative">
          <div className="flex items-center gap-3 text-accent mb-4">
            <Mic className="w-5 h-5" />
            <h2 className="font-mono text-sm tracking-widest uppercase font-bold">Audio_Ingest</h2>
          </div>

          <Card className="border-border bg-black/40 backdrop-blur">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <Label>Audio Payload</Label>
                <label 
                  htmlFor="audio-upload" 
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed transition-colors cursor-pointer ${
                    audioFile ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-accent/5'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {audioFile ? (
                      <FileAudio className="w-8 h-8 mb-3 text-accent" />
                    ) : (
                      <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                    )}
                    <p className="mb-2 text-sm text-muted-foreground font-mono">
                      {audioFile ? (
                        <span className="text-accent">{audioFile.name}</span>
                      ) : (
                        <span><span className="font-semibold text-foreground">Click to upload</span> or drag and drop</span>
                      )}
                    </p>
                  </div>
                  <input 
                    id="audio-upload" 
                    type="file" 
                    accept="audio/*"
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setAudioFile(e.target.files[0])
                      }
                    }}
                  />
                </label>
              </div>

              <Button 
                onClick={handleVoiceAsk} 
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={!studentId || !audioFile || isUploading}
              >
                {isUploading ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing...</span>
                ) : (
                  <span className="flex items-center gap-2"><Mic className="w-4 h-4" /> Transmit Audio</span>
                )}
              </Button>

              {voiceError && (
                <div className="p-3 bg-destructive/10 border border-destructive text-destructive font-mono text-sm">
                  ERR: {voiceError}
                </div>
              )}
            </CardContent>
          </Card>

          <AnimatePresence>
            {voiceResult && !isUploading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-4 border border-accent/20 bg-accent/5 space-y-4">
                  <div>
                    <div className="text-[10px] font-mono text-accent uppercase tracking-widest mb-1">Transcribed Query</div>
                    <div className="font-mono text-sm border-l-2 border-accent pl-3 py-1">
                      "{voiceResult.transcribed_question}"
                    </div>
                  </div>
                  
                  {voiceResult.reply_audio_path && (
                    <div>
                      <div className="text-[10px] font-mono text-accent uppercase tracking-widest mb-2">Synthesized Response</div>
                      <audio ref={audioRef} src="/api/audio" className="hidden" />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-accent text-accent hover:bg-accent hover:text-black font-mono"
                        onClick={() => {
                          if (audioRef.current) {
                            audioRef.current.play()
                          }
                        }}
                      >
                        <PlayCircle className="w-4 h-4 mr-2" /> Play Audio
                      </Button>
                    </div>
                  )}
                </div>

                <WowMomentCard result={voiceResult} variant="accent" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  )
}

function WowMomentCard({ result, variant = "primary" }: { result: any, variant?: "primary" | "accent" }) {
  const colorClass = variant === "primary" ? "text-primary border-primary" : "text-accent border-accent"
  const bgClass = variant === "primary" ? "bg-primary/5" : "bg-accent/5"
  
  return (
    <Card className={`border-${variant} overflow-hidden bg-black`}>
      <div className={`absolute top-0 left-0 w-full h-1 ${variant === "primary" ? "bg-primary" : "bg-accent"}`} />
      
      <CardContent className="p-0">
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className={`flex items-center gap-2 ${variant === "primary" ? "text-primary" : "text-accent"}`}>
              <Sparkles className="w-5 h-5" />
              <span className="font-mono text-sm font-bold tracking-widest uppercase">Connection_Found</span>
            </div>
            <div className="text-xs font-mono text-muted-foreground uppercase border border-border px-2 py-1">
              Match: {result.topic || result.matched_topic}
            </div>
          </div>

          <div className="space-y-4">
            {result.connections && result.connections.length > 0 ? (
              <div className="space-y-3">
                {result.connections.map((conn: any, idx: number) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + (idx * 0.1) }}
                    className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-2 items-center text-sm font-mono"
                  >
                    <div className="p-3 border border-border bg-muted/50 text-center">
                      <span className="text-muted-foreground text-[10px] block mb-1 uppercase tracking-wider">New</span>
                      {conn.newTopic}
                    </div>
                    <MoveRight className="w-4 h-4 text-muted-foreground" />
                    <div className={`p-3 border ${colorClass} ${bgClass} text-center font-bold`}>
                      <span className="text-foreground/50 text-[10px] block mb-1 uppercase tracking-wider">Weakness</span>
                      {conn.connectedWeakness}
                    </div>
                    <MoveRight className="w-4 h-4 text-muted-foreground" />
                    <div className="p-3 border border-destructive/50 bg-destructive/5 text-center text-destructive">
                      <span className="text-destructive/50 text-[10px] block mb-1 uppercase tracking-wider">Past Mistake</span>
                      {conn.pastMistake}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-border text-center font-mono text-sm text-muted-foreground uppercase">
                No past structural failures found for correlation.
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Synthesized Insight</div>
            <div className="font-serif text-lg leading-relaxed text-foreground">
              {result.reply || result.reply_text}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
