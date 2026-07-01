import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BrainCircuit, Mic, FileAudio, PlayCircle, RefreshCw, Upload, Loader2, Sparkles, MoveRight } from "lucide-react"
import { useGetWowMoment, getGetWowMomentQueryKey } from "@workspace/api-client-react"

import { Card, CardContent } from "@/components/ui/card"
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
    <div className="container mx-auto px-4 py-12 max-w-5xl space-y-16 relative z-10">
      
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-mono font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 inline-block">Learning_Cognition</h1>
        <p className="text-slate-400 font-mono max-w-2xl mx-auto">
          System ready to correlate new concepts with past structural failures. Awaiting query parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* TEXT QUERY */}
        <div className="space-y-6 relative">
          <div className="absolute -left-6 top-0 bottom-0 w-px bg-white/5 hidden md:block">
            <div className="h-4 w-1 bg-purple-500 absolute top-0 -left-[1.5px]" />
            <div className="h-4 w-1 bg-purple-500 absolute bottom-0 -left-[1.5px]" />
          </div>

          <div className="flex items-center gap-3 text-purple-400 mb-4">
            <BrainCircuit className="w-5 h-5" />
            <h2 className="font-mono text-sm tracking-widest uppercase font-bold">Text_Ingest</h2>
          </div>

          <Card className="galaxy-card border-t-[3px] border-t-purple-500 shadow-[0_0_30px_rgba(124,58,237,0.1)]">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="student-id" className="text-slate-300">Student Identifier</Label>
                <Input 
                  id="student-id" 
                  value={studentId} 
                  onChange={(e) => setStudentId(e.target.value)} 
                  className="font-mono bg-white/5 border-white/10 text-white focus-visible:ring-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-slate-300">Target Concept</Label>
                <Input 
                  id="topic" 
                  value={topic} 
                  onChange={(e) => setTopic(e.target.value)} 
                  className="font-mono bg-white/5 border-white/10 text-white focus-visible:ring-purple-500"
                />
              </div>
              <Button 
                onClick={handleTextAsk} 
                className="w-full relative overflow-hidden group bg-purple-600 hover:bg-purple-700 text-white font-mono"
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
                className="p-8 border border-purple-500/20 bg-purple-500/5 flex flex-col items-center justify-center gap-4 rounded-xl backdrop-blur"
              >
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-2 border-purple-500/20 rounded-full" />
                  <div className="absolute inset-0 border-2 border-purple-500 rounded-full border-t-transparent animate-spin" />
                  <BrainCircuit className="absolute inset-0 m-auto w-6 h-6 text-purple-400 animate-pulse" />
                </div>
                <div className="font-mono text-xs tracking-widest uppercase text-purple-400 animate-pulse">
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
          <div className="flex items-center gap-3 text-blue-400 mb-4">
            <Mic className="w-5 h-5" />
            <h2 className="font-mono text-sm tracking-widest uppercase font-bold">Audio_Ingest</h2>
          </div>

          <Card className="galaxy-card border-t-[3px] border-t-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <Label className="text-slate-300">Audio Payload</Label>
                <label 
                  htmlFor="audio-upload" 
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
                    audioFile ? 'border-blue-500 bg-blue-500/10' : 'border-white/20 hover:border-blue-500/50 hover:bg-white/5'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {audioFile ? (
                      <FileAudio className="w-8 h-8 mb-3 text-blue-400" />
                    ) : (
                      <Upload className="w-8 h-8 mb-3 text-slate-500" />
                    )}
                    <p className="mb-2 text-sm text-slate-400 font-mono">
                      {audioFile ? (
                        <span className="text-blue-300">{audioFile.name}</span>
                      ) : (
                        <span><span className="font-semibold text-white">Click to upload</span> or drag and drop</span>
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
                className="w-full bg-blue-600 text-white hover:bg-blue-700 font-mono"
                disabled={!studentId || !audioFile || isUploading}
              >
                {isUploading ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing...</span>
                ) : (
                  <span className="flex items-center gap-2"><Mic className="w-4 h-4" /> Transmit Audio</span>
                )}
              </Button>

              {voiceError && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-400 font-mono text-sm rounded">
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
                <div className="p-4 border border-blue-500/30 bg-blue-900/20 space-y-4 rounded-xl backdrop-blur">
                  <div>
                    <div className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-1">Transcribed Query</div>
                    <div className="font-mono text-sm text-slate-200 border-l-2 border-blue-500 pl-3 py-1">
                      "{voiceResult.transcribed_question}"
                    </div>
                  </div>
                  
                  {voiceResult.reply_audio_path && (
                    <div>
                      <div className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-2">Synthesized Response</div>
                      <audio ref={audioRef} src="/api/audio" className="hidden" />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-blue-500/50 text-blue-300 hover:bg-blue-500/20 hover:text-white font-mono"
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
  const isPrimary = variant === "primary";
  const glowColor = isPrimary ? 'rgba(124,58,237,0.4)' : 'rgba(59,130,246,0.4)';
  const borderColor = isPrimary ? 'border-purple-500' : 'border-blue-500';
  const textColor = isPrimary ? 'text-purple-400' : 'text-blue-400';
  const bgClass = isPrimary ? 'bg-purple-900/10' : 'bg-blue-900/10';
  const gradientClass = isPrimary ? 'from-purple-500 to-blue-500' : 'from-blue-500 to-cyan-500';
  
  return (
    <Card className={`galaxy-card overflow-hidden border border-white/10`} style={{ boxShadow: `0 0 30px ${glowColor}` }}>
      <div className={`absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r ${gradientClass}`} />
      
      <CardContent className="p-0">
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className={`flex items-center gap-2 ${textColor}`}>
              <Sparkles className="w-5 h-5" />
              <span className="font-mono text-sm font-bold tracking-widest uppercase">Connection_Found</span>
            </div>
            <div className="text-xs font-mono text-slate-400 uppercase border border-white/10 px-2 py-1 rounded bg-white/5">
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
                    className="flex flex-col gap-2 relative pl-4 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-purple-500 before:to-blue-500"
                  >
                    <div className="galaxy-card p-3 font-mono text-sm">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Concept</div>
                      <div className="text-white">{conn.newTopic}</div>
                    </div>
                    <div className="flex justify-center text-slate-600">
                      <MoveRight className="w-4 h-4 rotate-90" />
                    </div>
                    <div className={`galaxy-card p-3 font-mono text-sm border-l-2 ${borderColor} ${bgClass}`}>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Underlying Weakness</div>
                      <div className="text-white font-bold">{conn.connectedWeakness}</div>
                    </div>
                    <div className="flex justify-center text-slate-600">
                      <MoveRight className="w-4 h-4 rotate-90" />
                    </div>
                    <div className="galaxy-card p-3 font-mono text-sm border-red-500/30 bg-red-900/10">
                      <div className="text-[10px] text-red-400/70 uppercase tracking-widest mb-1">Past Failure</div>
                      <div className="text-red-300">{conn.pastMistake}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-white/10 rounded-lg text-center font-mono text-sm text-slate-500 uppercase bg-white/5">
                No past structural failures found for correlation.
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Synthesized Insight</div>
            <div className="font-serif text-lg leading-relaxed text-slate-200">
              {result.reply || result.reply_text}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
