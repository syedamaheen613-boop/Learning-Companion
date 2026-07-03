import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2, User, Bot, AlertCircle, Volume2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Message {
  role: "user" | "ai";
  text: string;
  topic?: string;
}

export function VoiceChat() {
  const [studentId, setStudentId] = useState("student_1");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const streamRef        = useRef<MediaStream | null>(null);
  const chatEndRef       = useRef<HTMLDivElement>(null);
  const audioRef         = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  // Check mic permission on mount
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicAllowed(false);
      setError("Microphone not supported in this browser.");
      return;
    }
    navigator.permissions?.query({ name: "microphone" as PermissionName })
      .then(r => { if (r.state === "denied") { setMicAllowed(false); setError("Microphone access denied — please allow it in browser settings."); } })
      .catch(() => {}); // ignore if permissions API unavailable
  }, []);

  const submitAudio = useCallback(async (chunks: Blob[]) => {
    if (!studentId || chunks.length === 0) return;
    setIsProcessing(true);
    setError("");

    const audioBlob = new Blob(chunks, { type: "audio/webm" });
    const form = new FormData();
    form.append("student_id", studentId);
    form.append("audio", audioBlob, "recording.webm");

    try {
      const res = await fetch("/api/ask_voice", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }
      const data = await res.json();

      const userText = data.transcribed_question || "(no transcription)";
      const aiText   = data.reply_text || data.reply || "(no reply)";

      setMessages(prev => [
        ...prev,
        { role: "user", text: userText },
        { role: "ai",   text: aiText, topic: data.matched_topic || undefined },
      ]);

      // play audio reply
      if (audioRef.current) {
        audioRef.current.src = `/api/audio?t=${Date.now()}`;
        audioRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsProcessing(false);
    }
  }, [studentId]);

  const startRecording = useCallback(async () => {
    if (isProcessing) return;
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicAllowed(true);

      // Pick a supported MIME type
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", ""]
        .find(m => !m || MediaRecorder.isTypeSupported(m)) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // stop all tracks
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        submitAudio(audioChunksRef.current);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100); // collect data every 100 ms
      setIsRecording(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicAllowed(false);
        setError("Microphone access denied. Please allow microphone in your browser.");
      } else {
        setError(`Could not start recording: ${err.message}`);
      }
    }
  }, [isProcessing, submitAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl h-[calc(100dvh-64px)] flex flex-col relative z-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Mic className="w-7 h-7 text-cyan-400 relative z-10" />
            <div className="absolute inset-0 bg-cyan-400/30 blur-md" />
          </div>
          <div>
            <h1 className="text-xl font-mono font-bold tracking-widest uppercase text-white">Voice_Tutor</h1>
            <p className="text-slate-500 font-mono text-xs">Hold mic · speak · release</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-mono shrink-0">Student ID</Label>
          <Input
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            className="font-mono h-8 w-36 bg-white/5 border-white/10 text-white text-sm focus-visible:ring-cyan-500"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {messages.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
            <Mic className="w-12 h-12 opacity-20" />
            <p className="font-mono text-sm uppercase tracking-widest text-center">
              Hold the button below and ask a question
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "ai" && (
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-purple-900/40 border border-purple-500/30 text-purple-400">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-cyan-600/20 border border-cyan-500/30 text-cyan-100 rounded-tr-sm"
                  : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm"
              }`}>
                {msg.role === "ai" && msg.topic && (
                  <div className="text-[10px] font-mono text-purple-400 uppercase tracking-widest mb-1">{msg.topic}</div>
                )}
                <p className={msg.role === "ai" ? "font-serif" : "font-mono text-xs"}>{msg.text}</p>
              </div>
              {msg.role === "user" && (
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-cyan-900/40 border border-cyan-500/30 text-cyan-400">
                  <User className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isProcessing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-purple-900/40 border border-purple-500/30 text-purple-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="galaxy-card px-5 py-3 bg-purple-900/10 border-purple-500/20 flex items-center gap-2">
              {[0, 150, 300].map(d => (
                <div key={d} className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Controls */}
      <div className="shrink-0 pt-4 pb-2 flex flex-col items-center gap-3">
        <audio ref={audioRef} className="hidden" />

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-4 py-2 bg-red-900/40 border border-red-500/50 text-red-300 text-xs font-mono rounded"
            >
              <AlertCircle className="w-3 h-3 shrink-0" /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {micAllowed === false ? (
          <Card className="galaxy-card border-red-500/30">
            <CardContent className="p-4 text-center text-sm text-red-300 font-mono">
              Microphone blocked. Open browser settings and allow microphone, then reload.
            </CardContent>
          </Card>
        ) : (
          <>
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={e => { e.preventDefault(); startRecording(); }}
              onTouchEnd={e => { e.preventDefault(); stopRecording(); }}
              disabled={isProcessing}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-150 select-none
                ${isRecording
                  ? "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] scale-110"
                  : "bg-white/5 border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"}
                disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isRecording && (
                <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-60" />
              )}
              {isRecording
                ? <Square className="w-8 h-8 fill-white text-white" />
                : <Mic className="w-8 h-8" />}
            </button>

            <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
              {isRecording
                ? <span className="text-red-400 animate-pulse">● Recording — release to send</span>
                : isProcessing ? "Processing…" : "Hold to speak"}
            </p>

            {messages.length > 0 && (
              <button
                onClick={() => audioRef.current?.play()}
                className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 hover:text-cyan-400 transition-colors"
              >
                <Volume2 className="w-3 h-3" /> replay last response
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
