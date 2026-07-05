import { useState } from "react";
import { useUser } from "../lib/userContext";
import StarField from "../components/StarField";

export function Login() {
  const { login } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) {
      setError("Please fill in both fields.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    login(name.trim(), email.trim().toLowerCase());
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#050510] text-foreground dark relative">
      <StarField />
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.6)] mb-4">
            <span className="font-mono font-bold text-white text-xl">LC</span>
          </div>
          <h1 className="font-mono font-bold tracking-widest text-xl uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
            Learning Companion
          </h1>
          <p className="text-slate-400 text-sm mt-2 text-center">
            Your AI tutor that remembers why you struggled
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
          <h2 className="font-mono text-2xl font-bold text-white mb-2">Welcome</h2>
          <p className="text-slate-400 text-sm mb-6">Enter your details to get started</p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1 block">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Mahi"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1 block">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. mahi@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs font-mono">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              className="w-full mt-2 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-mono font-bold tracking-widest uppercase text-sm hover:from-purple-500 hover:to-blue-500 transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)]"
            >
              Get Started →
            </button>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs font-mono mt-6">
          Your data stays private — only you can see your learning history
        </p>
      </div>
    </div>
  );
}