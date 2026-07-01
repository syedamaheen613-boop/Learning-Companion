import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2, User, Bot, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function VoiceChat() {
  const [studentId, setStudentId] = useState("student_1");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  
  const [messages, setMessages] = useState<any[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = handleAudioSubmit;
      
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setError("Microphone access denied or unavailable.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAudioSubmit = async () => {
    if (!studentId || audioChunksRef.current.length === 0) return;
    
    setIsProcessing(true);
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    
    try {
      const form = new FormData();
      form.append("student_id", studentId);
      form.append("audio", audioBlob, "recording.webm");

      const res = await fetch("/api/ask_voice", { method: "POST", body: form });
      if (!res.ok) throw new Error("Voice processing failed.");
      
      const data = await res.json();
      
      setMessages(prev => [
        ...prev,
        { role: 'user', text: data.transcribed_question },
        { role: 'ai', text: data.reply_text || data.reply, topic: data.matched_topic || data.topic }
      ]);

      // Play audio response if returned
      if (audioRef.current && data.reply_audio_path) {
        // Force reload audio source using a cache-busting query param if needed, but path is static /api/audio
        audioRef.current.src = `/api/audio?t=${Date.now()}`;
        audioRef.current.play().catch(console.error);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl h-[calc(100dvh-64px)] flex flex-col relative z-10">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Mic className="w-8 h-8 text-cyan-400 relative z-10" />
            <div className="absolute inset-0 bg-cyan-400 blur-lg opacity-40 z-0" />
          </div>
          <div>
            <h1 className="text-2xl font-mono font-bold tracking-widest uppercase text-white shadow-cyan-500/50">
              Voice_Tutor
            </h1>
            <p className="text-slate-400 font-mono text-xs uppercase tracking-wider">
              Continuous Vocal Interface
            </p>
          </div>
        </div>

        <Input 
          value={studentId} 
          onChange={(e) => setStudentId(e.target.value)} 
          className="font-mono bg-white/5 border-white/10 text-white w-48 focus-visible:ring-cyan-500 h-8 text-sm"
          placeholder="Student ID"
        />
      </div>

      <div className="flex-1 overflow-y-auto py-6 space-y-6 scrollbar-thin">
        {messages.length === 0 && !isProcessing && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 font-mono text-sm uppercase tracking-widest space-y-4">
            <Activity className="w-12 h-12 opacity-20" />
            <p>System listening. Hold microphone to transmit query.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'user' ? 'bg-blue-900/30 border-blue-500/30 text-blue-400' : 'bg-purple-900/30 border-purple-500/30 text-purple-400'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              <div className={`galaxy-card p-4 flex flex-col gap-2 ${msg.role === 'user' ? 'bg-blue-900/10 border-blue-500/20' : 'bg-purple-900/10 border-purple-500/20 shadow-[0_0_20px_rgba(124,58,237,0.1)]'}`}>
                {msg.role === 'ai' && msg.topic && (
                  <div className="self-start px-2 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-[10px] font-mono text-purple-300 uppercase tracking-wider mb-1">
                    Match: {msg.topic}
                  </div>
                )}
                <p className="text-slate-200 font-serif leading-relaxed">
                  {msg.text}
                </p>
              </div>

            </div>
          </motion.div>
        ))}

        {isProcessing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="flex gap-4 max-w-[85%]">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border bg-purple-900/30 border-purple-500/30 text-purple-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div className="galaxy-card p-4 bg-purple-900/10 border-purple-500/20 flex items-center h-12">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="shrink-0 pt-4 pb-6 flex flex-col items-center gap-4 relative">
        <audio ref={audioRef} className="hidden" />

        {error && (
          <div className="absolute -top-12 px-4 py-2 bg-red-900/40 border border-red-500/50 text-red-300 text-xs font-mono uppercase rounded shadow-lg backdrop-blur">
            {error}
          </div>
        )}

        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isProcessing}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 group ${isRecording ? 'bg-red-500 text-white' : 'bg-white/5 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRecording && <div className="absolute inset-0 rounded-full animate-[pulse-ring_1.5s_infinite]" />}
          {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
        </button>

        <div className="font-mono text-xs uppercase tracking-widest text-slate-400">
          {isRecording ? <span className="text-red-400 animate-pulse">Recording... Release to send</span> : 'Hold to speak'}
        </div>
      </div>

    </div>
  );
}
