import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2, User, Bot, AlertCircle, Volume2, Send, Type } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Message {
  role: "user" | "ai";
  text: string;
  topic?: string;
  isVoice?: boolean;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function VoiceChat() {
  const [studentId, setStudentId] = useState(() => { try { return JSON.parse(localStorage.getItem("lc_user") || "{}").email || "student_1"; } catch { return "student_1"; } });
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [textInput, setTextInput] = useState("");

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
      return;
    }
    navigator.permissions?.query({ name: "microphone" as PermissionName })
      .then(r => {
        if (r.state === "denied") { setMicAllowed(false); }
        else if (r.state === "granted") { setMicAllowed(true); }
        r.onchange = () => { if (r.state === "denied") setMicAllowed(false); else if (r.state === "granted") setMicAllowed(true); };
      })
      .catch(() => {}); // API not available in some browsers
  }, []);

  // ── Text-based ask ─────────────────────────────────────────────────────────
  const submitText = useCallback(async () => {
    const text = textInput.trim();
    if (!text || !studentId || isProcessing) return;
    setIsProcessing(true);
    setError("");
    setMessages(prev => [...prev, { role: "user", text, isVoice: false }]);
    setTextInput("");
    try {
      const res = await fetch(`${BASE}/api/ask?student_id=${encodeURIComponent(studentId)}&topic=${encodeURIComponent(text)}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      const aiText = data.reply || "(no reply)";
      setMessages(prev => [...prev, { role: "ai", text: aiText, topic: data.topic }]);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsProcessing(false);
    }
  }, [textInput, studentId, isProcessing]);

  // ── Audio submission ───────────────────────────────────────────────────────
  const submitAudio = useCallback(async (chunks: Blob[], mimeType: string) => {
    if (!studentId || chunks.length === 0) return;
    setIsProcessing(true);
    setError("");

    const audioBlob = new Blob(chunks, { type: mimeType });
    const ext = mimeType.includes("ogg") ? ".ogg" : mimeType.includes("mp4") ? ".mp4" : ".webm";
    const form = new FormData();
    form.append("student_id", studentId);
    form.append("audio", audioBlob, `recording${ext}`);

    try {
      const res = await fetch(`${BASE}/api/ask_voice`, { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }
      const data = await res.json();

      const userText = data.transcribed_question || "(no transcription)";
      const aiText   = data.reply_text || data.reply || "(no reply)";

      setMessages(prev => [
        ...prev,
        { role: "user", text: userText, isVoice: true },
        { role: "ai",   text: aiText, topic: data.matched_topic || undefined },
      ]);

      // play audio reply if available
      if (data.reply_audio_path && audioRef.current) {
        audioRef.current.src = `${BASE}/api/audio?t=${Date.now()}`;
        audioRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || "Voice processing failed. Try the text mode instead.");
    } finally {
      setIsProcessing(false);
    }
  }, [studentId]);

  // ── Recording ──────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (isProcessing) return;
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      setMicAllowed(true);

      // Pick best supported MIME type
      const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg", "audio/mp4"];
      const mimeType = MIME_TYPES.find(m => MediaRecorder.isTypeSupported(m)) || "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        submitAudio(audioChunksRef.current, recorder.mimeType || mimeType || "audio/webm");
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicAllowed(false);
        setError("Microphone blocked. Use text mode below, or allow microphone in your browser settings.");
        setInputMode("text");
      } else if (err.name === "NotFoundError") {
        setMicAllowed(false);
        setError("No microphone found. Switched to text mode.");
        setInputMode("text");
      } else {
        setError(`Could not start recording: ${err.message}. Try text mode.`);
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
            <h1 className="text-xl font-mono font-bold tracking-widest uppercase text-white">AI_Tutor</h1>
            <p className="text-slate-500 font-mono text-xs">Ask anything — by voice or text</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-mono shrink-0">Student</Label>
          <Input value={studentId} onChange={e => setStudentId(e.target.value)}
            className="font-mono h-8 w-36 bg-white/5 border-white/10 text-white text-sm focus-visible:ring-cyan-500" />
          {/* Mode toggle */}
          <div className="flex rounded overflow-hidden border border-white/10">
            <button onClick={() => setInputMode("voice")}
              className={`px-3 py-1 font-mono text-xs flex items-center gap-1 transition-colors ${inputMode === "voice" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
              <Mic className="w-3 h-3" />Voice
            </button>
            <button onClick={() => setInputMode("text")}
              className={`px-3 py-1 font-mono text-xs flex items-center gap-1 transition-colors ${inputMode === "text" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
              <Type className="w-3 h-3" />Text
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {messages.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
            <Bot className="w-12 h-12 opacity-20" />
            <p className="font-mono text-sm uppercase tracking-widest text-center px-4">
              {inputMode === "voice" ? "Hold the mic button and ask a question" : "Type your question below and press Send"}
            </p>
            <p className="font-mono text-xs text-slate-600 text-center px-8">
              Ask about any topic — Recursion, Arrays, SQL Joins, Binary Search…
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
                  <div className="text-[10px] font-mono text-purple-400 uppercase tracking-widest mb-1">
                    {msg.topic} {msg.isVoice !== undefined && !msg.isVoice ? "" : ""}
                  </div>
                )}
                {msg.role === "user" && msg.isVoice && (
                  <div className="text-[10px] font-mono text-cyan-500 mb-1 flex items-center gap-1">
                    <Mic className="w-2.5 h-2.5" /> Voice transcript
                  </div>
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
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="w-full flex items-start gap-2 px-4 py-3 bg-red-900/40 border border-red-500/50 text-red-300 text-xs font-mono rounded">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
              <button onClick={() => setError("")} className="shrink-0 text-red-400 hover:text-white">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice mode */}
        {inputMode === "voice" && (
          <>
            {micAllowed === false ? (
              <Card className="galaxy-card border-amber-500/30 w-full">
                <CardContent className="p-4 text-center space-y-2">
                  <p className="text-sm text-amber-300 font-mono">Microphone not available in this context.</p>
                  <p className="text-xs text-slate-400 font-mono">Switch to <button onClick={() => setInputMode("text")} className="text-cyan-400 underline">Text Mode</button> to ask questions.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <button
                  onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording}
                  onTouchStart={e => { e.preventDefault(); startRecording(); }} onTouchEnd={e => { e.preventDefault(); stopRecording(); }}
                  disabled={isProcessing}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-150 select-none
                    ${isRecording
                      ? "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] scale-110"
                      : "bg-white/5 border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"}
                    disabled:opacity-40 disabled:cursor-not-allowed`}>
                  {isRecording && <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-60" />}
                  {isRecording ? <Square className="w-8 h-8 fill-white text-white" /> : <Mic className="w-8 h-8" />}
                </button>
                <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
                  {isRecording
                    ? <span className="text-red-400 animate-pulse">● Recording — release to send</span>
                    : isProcessing ? "Processing your question…" : "Hold to speak · release to send"}
                </p>
                {messages.length > 0 && !isProcessing && (
                  <button onClick={() => audioRef.current?.play()}
                    className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 hover:text-cyan-400 transition-colors">
                    <Volume2 className="w-3 h-3" /> replay last audio response
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* Text mode */}
        {inputMode === "text" && (
          <div className="w-full flex gap-3 items-end">
            <Textarea value={textInput} onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitText(); } }}
              placeholder="Ask anything — e.g. 'How does recursion work?' or 'Explain Merge Sort'"
              className="flex-1 font-mono bg-white/5 border-white/10 text-white text-sm focus-visible:ring-cyan-500 resize-none min-h-[52px] max-h-[120px]" rows={2} />
            <Button onClick={submitText} disabled={isProcessing || !textInput.trim()}
              className="h-12 bg-cyan-600 hover:bg-cyan-700 text-white font-mono shrink-0">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
