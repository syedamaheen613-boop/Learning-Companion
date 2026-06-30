import { Link, useLocation } from "wouter"
import { Activity, GitMerge, Mic, FileText, Database } from "lucide-react"

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()

  const links = [
    { href: "/", label: "Demo Stage", icon: Activity },
    { href: "/graph", label: "Knowledge Graph", icon: GitMerge },
    { href: "/log", label: "Ingest Log", icon: Database },
  ]

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground dark selection:bg-primary selection:text-primary-foreground">
      <div className="scanline" />
      <header className="border-b border-border/50 bg-background/95 backdrop-blur z-40 sticky top-0">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-none bg-primary flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-black/20 radar-sweep" />
              <div className="w-2 h-2 bg-black rounded-full z-10" />
            </div>
            <span className="font-mono font-bold tracking-widest text-sm uppercase">Learning_Companion</span>
            <span className="px-2 py-0.5 ml-2 text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 tracking-wider">Sys.V1</span>
          </div>

          <nav className="flex items-center gap-6">
            {links.map((link) => {
              const Icon = link.icon
              const isActive = location === link.href
              return (
                <Link key={link.href} href={link.href}>
                  <div className={`flex items-center gap-2 text-xs font-mono tracking-widest uppercase transition-colors hover:text-primary cursor-pointer ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {link.label}
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1 relative z-10">
        {children}
      </main>
    </div>
  )
}
