import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Network, Loader2, AlertCircle, RefreshCw, BarChart2, PieChart, GitBranch } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")

// ── types ──────────────────────────────────────────────────────────────────

interface ApiNode {
  concept: string
  dependsOn: string | null
  mistake: string | null
  student: string | null
}
interface SimNode { id: string; label: string; type: "concept" | "mistake" | "student"; x: number; y: number; vx: number; vy: number; r: number }
interface SimEdge { source: string; target: string }

const COLORS: Record<SimNode["type"], { fill: string; stroke: string; text: string }> = {
  concept: { fill: "#7c9a3a", stroke: "#a3c44a", text: "#f0f4e0" },
  mistake: { fill: "#c96ba0", stroke: "#e87bbf", text: "#fce8f5" },
  student: { fill: "#6b5fa8", stroke: "#9b87e8", text: "#ede8ff" },
}

// ── force simulation ────────────────────────────────────────────────────────

function buildGraph(apiNodes: ApiNode[]): { nodes: SimNode[]; edges: SimEdge[] } {
  const nodes: SimNode[] = []; const edges: SimEdge[] = []; const seen = new Set<string>()
  const addNode = (id: string, label: string, type: SimNode["type"]) => {
    if (seen.has(id) || !id) return; seen.add(id)
    nodes.push({ id, label: label || id, type, x: 0, y: 0, vx: 0, vy: 0, r: type === "student" ? 36 : 44 })
  }
  const valid = apiNodes.filter(n => !!n.concept)
  const studentName = valid.find(n => n.student)?.student ?? "Student"
  addNode("__student__", studentName, "student")
  valid.forEach(n => { if (n.dependsOn) addNode(n.dependsOn, n.dependsOn, "concept") })
  valid.forEach(n => {
    addNode(n.concept, n.concept, "concept")
    if (n.mistake) {
      const mId = `mistake:${n.concept}`
      const words = n.mistake.split(" "); let shortLabel = ""
      for (const w of words) { if ((shortLabel + " " + w).trim().length > 22) break; shortLabel = (shortLabel + " " + w).trim() }
      addNode(mId, shortLabel || n.mistake.slice(0, 20), "mistake")
      edges.push({ source: n.concept, target: mId })
    }
    if (n.dependsOn) edges.push({ source: n.dependsOn, target: n.concept })
    else edges.push({ source: "__student__", target: n.concept })
  })
  return { nodes, edges }
}

function initPositions(nodes: SimNode[], W: number, H: number) {
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.35
  nodes.forEach((n, i) => {
    if (n.id === "__student__") { n.x = cx; n.y = cy }
    else { const a = (2 * Math.PI * i) / (nodes.length - 1); n.x = cx + R * Math.cos(a) + (Math.random() - .5) * 40; n.y = cy + R * Math.sin(a) + (Math.random() - .5) * 40 }
    n.vx = 0; n.vy = 0
  })
}

function tick(nodes: SimNode[], edges: SimEdge[], W: number, H: number) {
  const cx = W / 2, cy = H / 2, idMap = new Map(nodes.map(n => [n.id, n]))
  nodes.forEach(n => { n.vx = 0; n.vy = 0 })
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j], dx = b.x - a.x, dy = b.y - a.y
    const dist2 = dx * dx + dy * dy + .1, dist = Math.sqrt(dist2), minDist = a.r + b.r + 30
    if (dist < minDist) { const f = (minDist - dist) / dist * .5; a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f }
    else { const k = 8000 / dist2; a.vx -= dx / dist * k; a.vy -= dy / dist * k; b.vx += dx / dist * k; b.vy += dy / dist * k }
  }
  edges.forEach(e => {
    const s = idMap.get(e.source), t = idMap.get(e.target); if (!s || !t) return
    const dx = t.x - s.x, dy = t.y - s.y, dist = Math.sqrt(dx * dx + dy * dy) + .1
    const ideal = s.r + t.r + 60, force = (dist - ideal) / dist * .12
    s.vx += dx * force; s.vy += dy * force; t.vx -= dx * force; t.vy -= dy * force
  })
  nodes.forEach(n => { n.vx += (cx - n.x) * .008; n.vy += (cy - n.y) * .008 })
  const damp = .82
  nodes.forEach(n => {
    n.vx *= damp; n.vy *= damp; n.x += n.vx; n.y += n.vy
    n.x = Math.max(n.r + 4, Math.min(W - n.r - 4, n.x)); n.y = Math.max(n.r + 4, Math.min(H - n.r - 4, n.y))
  })
}

// ── bar chart ──────────────────────────────────────────────────────────────

function BarChart({ apiNodes }: { apiNodes: ApiNode[] }) {
  const conceptMistakes: Record<string, number> = {}
  apiNodes.forEach(n => { if (n.concept && n.mistake) conceptMistakes[n.concept] = (conceptMistakes[n.concept] || 0) + 1 })
  const items = Object.entries(conceptMistakes).sort((a, b) => b[1] - a[1])
  const max = Math.max(...items.map(i => i[1]), 1)
  const BAR_COLORS = ["#7c9a3a", "#6b5fa8", "#c96ba0", "#3b82f6", "#f59e0b", "#10b981"]

  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500 font-mono">
      <BarChart2 className="w-14 h-14 opacity-20" />
      <p className="text-sm uppercase tracking-widest">No mistake data yet — log some mistakes first</p>
    </div>
  )

  return (
    <div className="p-8 h-full flex flex-col">
      <h2 className="font-mono text-sm text-slate-400 uppercase tracking-widest mb-6">Mistakes per Concept</h2>
      <div className="flex-1 flex flex-col justify-end gap-3 overflow-auto">
        {items.map(([concept, count], i) => (
          <motion.div key={concept} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
            className="flex items-center gap-4">
            <div className="w-32 text-right font-mono text-sm text-slate-300 truncate shrink-0">{concept}</div>
            <div className="flex-1 h-8 bg-white/5 rounded overflow-hidden relative">
              <motion.div className="h-full rounded"
                initial={{ width: 0 }} animate={{ width: `${(count / max) * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.08 }}
                style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-xs text-white font-bold">{count}</span>
            </div>
            <div className="w-16 font-mono text-xs text-slate-400 shrink-0">{count} mistake{count !== 1 ? "s" : ""}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── pie chart ──────────────────────────────────────────────────────────────

function DonutChart({ apiNodes }: { apiNodes: ApiNode[] }) {
  const conceptMistakes: Record<string, number> = {}
  apiNodes.forEach(n => { if (n.concept && n.mistake) conceptMistakes[n.concept] = (conceptMistakes[n.concept] || 0) + 1 })
  const items = Object.entries(conceptMistakes).sort((a, b) => b[1] - a[1])
  const total = items.reduce((s, [, v]) => s + v, 0)
  const COLORS = ["#7c9a3a", "#6b5fa8", "#c96ba0", "#3b82f6", "#f59e0b", "#10b981", "#ef4444"]

  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500 font-mono">
      <PieChart className="w-14 h-14 opacity-20" />
      <p className="text-sm uppercase tracking-widest">No data yet</p>
    </div>
  )

  // Build SVG arcs
  const cx = 160, cy = 160, r = 120, innerR = 70
  let currentAngle = -Math.PI / 2
  const slices = items.map(([concept, count], i) => {
    const fraction = count / total
    const startAngle = currentAngle
    const endAngle = currentAngle + fraction * 2 * Math.PI
    currentAngle = endAngle
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle),   y2 = cy + r * Math.sin(endAngle)
    const ix1 = cx + innerR * Math.cos(startAngle), iy1 = cy + innerR * Math.sin(startAngle)
    const ix2 = cx + innerR * Math.cos(endAngle),   iy2 = cy + innerR * Math.sin(endAngle)
    const largeArc = fraction > 0.5 ? 1 : 0
    const d = `M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`
    return { concept, count, fraction, d, color: COLORS[i % COLORS.length] }
  })

  return (
    <div className="p-6 h-full flex flex-col md:flex-row items-center gap-8">
      <div className="shrink-0">
        <svg width="320" height="320" viewBox="0 0 320 320">
          {slices.map((s, i) => (
            <motion.path key={s.concept} d={s.d} fill={s.color} stroke="#050510" strokeWidth="2"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              style={{ transformOrigin: "160px 160px" }} />
          ))}
          <text x="160" y="155" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="monospace">{total}</text>
          <text x="160" y="178" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">MISTAKES</text>
        </svg>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        <h2 className="font-mono text-sm text-slate-400 uppercase tracking-widest mb-2">Concept Breakdown</h2>
        {slices.map(s => (
          <div key={s.concept} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
            <div className="flex-1 font-mono text-sm text-slate-200 truncate">{s.concept}</div>
            <div className="font-mono text-sm font-bold" style={{ color: s.color }}>{s.count}</div>
            <div className="font-mono text-xs text-slate-500 w-12 text-right">{Math.round(s.fraction * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── dependency graph ────────────────────────────────────────────────────────

function DependencyList({ apiNodes }: { apiNodes: ApiNode[] }) {
  const deps: Record<string, Set<string>> = {}
  apiNodes.forEach(n => {
    if (n.concept) { if (!deps[n.concept]) deps[n.concept] = new Set() }
    if (n.concept && n.dependsOn) {
      if (!deps[n.dependsOn]) deps[n.dependsOn] = new Set()
      deps[n.concept].add(n.dependsOn)
    }
  })
  const entries = Object.entries(deps).sort((a, b) => b[1].size - a[1].size)
  if (entries.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500 font-mono">
      <GitBranch className="w-14 h-14 opacity-20" />
      <p className="text-sm uppercase tracking-widest">No dependency data found</p>
    </div>
  )
  return (
    <div className="p-8 h-full overflow-auto">
      <h2 className="font-mono text-sm text-slate-400 uppercase tracking-widest mb-6">Concept Dependencies</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entries.map(([concept, depSet], i) => (
          <motion.div key={concept} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="galaxy-card p-4 space-y-3">
            <div className="font-mono text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              {concept}
            </div>
            {depSet.size > 0 ? (
              <div className="pl-4 space-y-1">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Depends on:</div>
                {[...depSet].map(dep => (
                  <div key={dep} className="flex items-center gap-2 text-sm text-blue-300 font-mono">
                    <span className="text-slate-600">→</span> {dep}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-500 italic pl-4">No prerequisites</div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── main component ──────────────────────────────────────────────────────────

type Tab = "network" | "bar" | "pie" | "deps"

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "network", label: "Network", icon: Network },
  { id: "bar",     label: "Mistakes", icon: BarChart2 },
  { id: "pie",     label: "Breakdown", icon: PieChart },
  { id: "deps",    label: "Dependencies", icon: GitBranch },
]

export function ConceptMap() {
  const [studentId, setStudentId] = useState(() => { try { return JSON.parse(localStorage.getItem("lc_user") || "{}").email || "student_1"; } catch { return "student_1"; } })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const [apiNodes, setApiNodes] = useState<ApiNode[]>([])
  const [tab, setTab]           = useState<Tab>("network")

  const svgRef  = useRef<SVGSVGElement>(null)
  const [dims, setDims] = useState({ w: 800, h: 500 })
  const nodesRef = useRef<SimNode[]>([])
  const edgesRef = useRef<SimEdge[]>([])
  const rafRef   = useRef<number>(0)
  const [, forceRender] = useState(0)
  const dragging = useRef<{ id: string; ox: number; oy: number } | null>(null)

  useEffect(() => {
    const el = svgRef.current?.parentElement; if (!el) return
    const ro = new ResizeObserver(e => { const { width, height } = e[0].contentRect; setDims({ w: Math.max(400, width), h: Math.max(300, height) }) })
    ro.observe(el); return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (apiNodes.length === 0) return
    cancelAnimationFrame(rafRef.current)
    const { nodes, edges } = buildGraph(apiNodes)
    initPositions(nodes, dims.w, dims.h)
    nodesRef.current = nodes; edgesRef.current = edges
    let iter = 0
    const loop = () => { tick(nodesRef.current, edgesRef.current, dims.w, dims.h); forceRender(x => x + 1); iter++; if (iter < 300) rafRef.current = requestAnimationFrame(loop) }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [apiNodes, dims])

  useEffect(() => { fetchGraph() }, []) // eslint-disable-line

  const fetchGraph = async () => {
    if (!studentId) return; setLoading(true); setError("")
    try {
      const res = await fetch(`${BASE}/api/graph?student_id=${encodeURIComponent(studentId)}`)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json(); setApiNodes(data.graph ?? [])
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const svgPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current; if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])
  const onPointerDown = useCallback((id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); const { x, y } = svgPoint(e)
    const node = nodesRef.current.find(n => n.id === id); if (!node) return
    dragging.current = { id, ox: x - node.x, oy: y - node.y }
  }, [svgPoint])
  const onPointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging.current) return; const { x, y } = svgPoint(e)
    const node = nodesRef.current.find(n => n.id === dragging.current!.id); if (!node) return
    node.x = x - dragging.current.ox; node.y = y - dragging.current.oy; node.vx = 0; node.vy = 0; forceRender(v => v + 1)
  }, [svgPoint])
  const onPointerUp = useCallback(() => { dragging.current = null }, [])

  const nodes = nodesRef.current; const edges = edgesRef.current; const idMap = new Map(nodes.map(n => [n.id, n]))

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] relative z-10">

      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative"><Network className="w-7 h-7 text-blue-400 relative z-10" /><div className="absolute inset-0 bg-blue-400/30 blur-md" /></div>
          <div>
            <h1 className="text-xl font-mono font-bold tracking-widest uppercase text-white">Knowledge_Graph</h1>
            <p className="text-slate-500 font-mono text-xs">4 views · drag nodes to explore</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <Input value={studentId} onChange={e => setStudentId(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchGraph()}
            placeholder="student_id" className="font-mono h-9 w-44 bg-white/5 border-white/10 text-white focus-visible:ring-blue-500" />
          <Button onClick={fetchGraph} disabled={loading || !studentId} className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-mono shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 mr-2" />Load</>}
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 px-6 py-2 flex gap-1 border-b border-white/5 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-t font-mono text-xs uppercase tracking-wider transition-colors shrink-0 ${tab === t.id ? "bg-blue-600/20 text-blue-300 border border-blue-500/40 border-b-transparent" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
              <Icon className="w-3.5 h-3.5" />{t.label}
            </button>
          )
        })}
        {apiNodes.length > 0 && tab === "network" && (
          <div className="ml-auto flex gap-4 items-center text-[11px] font-mono">
            {(["concept", "mistake", "student"] as const).map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLORS[t].fill }} />
                <span className="text-slate-400 uppercase tracking-wider">{t}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-red-900/60 border border-red-500/50 rounded text-red-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        {!loading && apiNodes.length === 0 && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-500 font-mono">
            <Network className="w-16 h-16 opacity-20" /><p className="text-sm uppercase tracking-widest">Enter a student ID and click Load</p>
          </div>
        )}
        {loading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-10 h-10 text-blue-400 animate-spin" /></div>}

        {/* Network tab */}
        {tab === "network" && (
          <svg ref={svgRef} width="100%" height="100%"
            onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
            onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
            style={{ cursor: dragging.current ? "grabbing" : "default" }}>
            <defs>
              <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="rgba(255,255,255,0.2)" />
              </marker>
            </defs>
            {edges.map((e, i) => {
              const s = idMap.get(e.source), t = idMap.get(e.target); if (!s || !t) return null
              const dx = t.x - s.x, dy = t.y - s.y, dist = Math.sqrt(dx * dx + dy * dy) || 1
              return <line key={i} x1={s.x} y1={s.y} x2={t.x - (dx / dist) * (t.r + 4)} y2={t.y - (dy / dist) * (t.r + 4)}
                stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} strokeDasharray={e.source === "__student__" ? "4 4" : undefined} markerEnd="url(#arrow)" />
            })}
            {nodes.map(n => {
              const c = COLORS[n.type], words = n.label.split(" ")
              return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`} style={{ cursor: "grab" }}
                  onMouseDown={e => onPointerDown(n.id, e)} onTouchStart={e => onPointerDown(n.id, e)}>
                  <circle r={n.r + 6} fill="none" stroke={c.stroke} strokeWidth={1} opacity={0.3} />
                  <circle r={n.r} fill={c.fill} stroke={c.stroke} strokeWidth={2} filter="url(#glow)" />
                  {words.map((w, wi) => <text key={wi} fill={c.text} fontSize={n.r > 40 ? 11 : 10} fontFamily="ui-monospace,monospace" fontWeight="600" textAnchor="middle" dominantBaseline="middle" y={(wi - (words.length - 1) / 2) * 13} style={{ pointerEvents: "none", userSelect: "none" }}>{w}</text>)}
                </g>
              )
            })}
          </svg>
        )}

        {tab === "bar"  && apiNodes.length > 0 && <BarChart apiNodes={apiNodes} />}
        {tab === "pie"  && apiNodes.length > 0 && <DonutChart apiNodes={apiNodes} />}
        {tab === "deps" && apiNodes.length > 0 && <DependencyList apiNodes={apiNodes} />}
      </div>
    </div>
  )
}
