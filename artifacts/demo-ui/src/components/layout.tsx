import { Link, useLocation } from "wouter"
import { Activity, GitMerge, Mic, FileText, Database, LayoutDashboard, Target, BookOpen, Award, Trophy, Menu } from "lucide-react"
import { useState } from "react"
import StarField from "./StarField"
import { Button } from "./ui/button"

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/demo", label: "Demo", icon: Activity },
    { href: "/graph", label: "Graph", icon: GitMerge },
    { href: "/challenge", label: "Challenge", icon: Target },
    { href: "/study-plan", label: "Study Plan", icon: BookOpen },
    { href: "/badges", label: "Badges", icon: Award },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/voice-chat", label: "Voice Chat", icon: Mic },
    { href: "/log", label: "Log", icon: Database },
  ]

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#050510] text-foreground dark selection:bg-primary selection:text-primary-foreground relative">
      <StarField />
      
      <header className="border-b border-white/5 bg-[#050510]/80 backdrop-blur z-40 sticky top-0">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.5)]">
              <span className="font-mono font-bold text-white text-xs">LC</span>
            </div>
            <span className="font-mono font-bold tracking-widest text-sm uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              Learning Companion
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-6">
            {links.map((link) => {
              const Icon = link.icon
              const isActive = location === link.href
              return (
                <Link key={link.href} href={link.href}>
                  <div className={`flex items-center gap-2 text-xs font-mono tracking-widest uppercase transition-colors hover:text-purple-400 cursor-pointer ${isActive ? "text-blue-400 font-bold" : "text-slate-400"}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {link.label}
                  </div>
                </Link>
              )
            })}
          </nav>

          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden text-slate-300 hover:text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-30 bg-[#050510]/95 backdrop-blur-xl border-b border-white/5 p-4 flex flex-col gap-4">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = location === link.href
            return (
              <Link key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)}>
                <div className={`flex items-center gap-3 p-3 rounded-lg text-sm font-mono tracking-widest uppercase transition-colors ${isActive ? "bg-white/10 text-blue-400 font-bold" : "text-slate-400 hover:bg-white/5 hover:text-purple-400"}`}>
                  <Icon className="w-5 h-5" />
                  {link.label}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <main className="flex-1 relative z-10 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
