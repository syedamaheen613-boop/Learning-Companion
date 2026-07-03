import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Network, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

// ── types ──────────────────────────────────────────────────────────────────

interface ApiNode {
  concept: string
  dependsOn: string | null
  mistake: string | null
  student: string | null
}

interface SimNode {
  id: string
  label: string
  type: "concept" | "mistake" | "student"
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

interface SimEdge {
  source: string
  target: string
}

// ── colours ────────────────────────────────────────────────────────────────

const COLORS: Record<SimNode["type"], { fill: string; stroke: string; text: string }> = {
  concept: { fill: "#7c9a3a", stroke: "#a3c44a", text: "#f0f4e0" },
  mistake: { fill: "#c96ba0", stroke: "#e87bbf", text: "#fce8f5" },
  student: { fill: "#6b5fa8", stroke: "#9b87e8", text: "#ede8ff" },
}

// ── force simulation (pure JS, no library) ─────────────────────────────────

function buildGraph(apiNodes: ApiNode[]): { nodes: SimNode[]; edges: SimEdge[] } {
  const nodes: SimNode[] = []
  const edges: SimEdge[] = []
  const seen = new Set<string>()

  const addNode = (id: string, label: string, type: SimNode["type"]) => {
    if (seen.has(id) || !id) return
    seen.add(id)
    const safeLabel = label || id
    nodes.push({ id, label: safeLabel, type, x: 0, y: 0, vx: 0, vy: 0, r: type === "student" ? 36 : 44 })
  }

  // Filter out rows with null concept first
  const valid = apiNodes.filter(n => !!n.concept)

  // Student node
  const studentName = valid.find(n => n.student)?.student ?? "Student"
  addNode("__student__", studentName, "student")

  // First pass: ensure dependsOn targets exist as nodes even if not in results
  valid.forEach(n => {
    if (n.dependsOn) addNode(n.dependsOn, n.dependsOn, "concept")
  })

  // Second pass: main concept + mistake nodes
  valid.forEach(n => {
    addNode(n.concept, n.concept, "concept")

    if (n.mistake) {
      const mId = `mistake:${n.concept}`
      // Shorten to fit in bubble, break at word boundary
      const words = n.mistake.split(" ")
      let shortLabel = ""
      for (const w of words) {
        if ((shortLabel + " " + w).trim().length > 22) break
        shortLabel = (shortLabel + " " + w).trim()
      }
      addNode(mId, shortLabel || n.mistake.slice(0, 20), "mistake")
      edges.push({ source: n.concept, target: mId })
    }

    if (n.dependsOn) {
      edges.push({ source: n.dependsOn, target: n.concept })
    } else {
      edges.push({ source: "__student__", target: n.concept })
    }
  })

  return { nodes, edges }
}

function initPositions(nodes: SimNode[], W: number, H: number) {
  const cx = W / 2
  const cy = H / 2
  const R = Math.min(W, H) * 0.35

  nodes.forEach((n, i) => {
    if (n.id === "__student__") {
      n.x = cx
      n.y = cy
    } else {
      const angle = (2 * Math.PI * i) / (nodes.length - 1)
      n.x = cx + R * Math.cos(angle) + (Math.random() - 0.5) * 40
      n.y = cy + R * Math.sin(angle) + (Math.random() - 0.5) * 40
    }
    n.vx = 0
    n.vy = 0
  })
}

function tick(nodes: SimNode[], edges: SimEdge[], W: number, H: number) {
  const cx = W / 2
  const cy = H / 2
  const idMap = new Map(nodes.map(n => [n.id, n]))

  // Reset forces
  nodes.forEach(n => { n.vx = 0; n.vy = 0 })

  // Repulsion
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist2 = dx * dx + dy * dy + 0.1
      const dist = Math.sqrt(dist2)
      const minDist = a.r + b.r + 30
      if (dist < minDist) {
        const force = (minDist - dist) / dist * 0.5
        a.vx -= dx * force
        a.vy -= dy * force
        b.vx += dx * force
        b.vy += dy * force
      } else {
        const k = 8000 / dist2
        a.vx -= dx / dist * k
        a.vy -= dy / dist * k
        b.vx += dx / dist * k
        b.vy += dy / dist * k
      }
    }
  }

  // Spring attraction along edges
  edges.forEach(e => {
    const s = idMap.get(e.source)
    const t = idMap.get(e.target)
    if (!s || !t) return
    const dx = t.x - s.x
    const dy = t.y - s.y
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.1
    const ideal = s.r + t.r + 60
    const force = (dist - ideal) / dist * 0.12
    s.vx += dx * force
    s.vy += dy * force
    t.vx -= dx * force
    t.vy -= dy * force
  })

  // Gravity toward centre
  nodes.forEach(n => {
    n.vx += (cx - n.x) * 0.008
    n.vy += (cy - n.y) * 0.008
  })

  // Integrate + dampen
  const damp = 0.82
  nodes.forEach(n => {
    n.vx *= damp
    n.vy *= damp
    n.x += n.vx
    n.y += n.vy
    // clamp to canvas
    n.x = Math.max(n.r + 4, Math.min(W - n.r - 4, n.x))
    n.y = Math.max(n.r + 4, Math.min(H - n.r - 4, n.y))
  })
}

// ── component ──────────────────────────────────────────────────────────────

export function ConceptMap() {
  const [studentId, setStudentId] = useState("student_1")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [apiNodes, setApiNodes] = useState<ApiNode[]>([])

  // SVG canvas dimensions
  const svgRef = useRef<SVGSVGElement>(null)
  const [dims, setDims] = useState({ w: 800, h: 500 })

  // Simulation state
  const nodesRef = useRef<SimNode[]>([])
  const edgesRef = useRef<SimEdge[]>([])
  const rafRef   = useRef<number>(0)
  const [, forceRender] = useState(0)

  // Drag state
  const dragging = useRef<{ id: string; ox: number; oy: number } | null>(null)

  // Resize observer
  useEffect(() => {
    const el = svgRef.current?.parentElement
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDims({ w: Math.max(400, width), h: Math.max(300, height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Rebuild graph when data or dims change
  useEffect(() => {
    if (apiNodes.length === 0) return
    cancelAnimationFrame(rafRef.current)
    const { nodes, edges } = buildGraph(apiNodes)
    initPositions(nodes, dims.w, dims.h)
    nodesRef.current = nodes
    edgesRef.current = edges

    let iter = 0
    const loop = () => {
      tick(nodesRef.current, edgesRef.current, dims.w, dims.h)
      forceRender(x => x + 1)
      iter++
      if (iter < 300) rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [apiNodes, dims])

  // Auto-load on mount
  useEffect(() => { fetchGraph() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchGraph = async () => {
    if (!studentId) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/graph?student_id=${encodeURIComponent(studentId)}`)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setApiNodes(data.graph ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Drag handlers
  const svgPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const onPointerDown = useCallback((id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const { x, y } = svgPoint(e)
    const node = nodesRef.current.find(n => n.id === id)
    if (!node) return
    dragging.current = { id, ox: x - node.x, oy: y - node.y }
  }, [svgPoint])

  const onPointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging.current) return
    const { x, y } = svgPoint(e)
    const node = nodesRef.current.find(n => n.id === dragging.current!.id)
    if (!node) return
    node.x = x - dragging.current.ox
    node.y = y - dragging.current.oy
    node.vx = 0
    node.vy = 0
    forceRender(v => v + 1)
  }, [svgPoint])

  const onPointerUp = useCallback(() => {
    dragging.current = null
  }, [])

  const nodes = nodesRef.current
  const edges = edgesRef.current
  const idMap = new Map(nodes.map(n => [n.id, n]))

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] relative z-10">

      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Network className="w-7 h-7 text-blue-400 relative z-10" />
            <div className="absolute inset-0 bg-blue-400/30 blur-md" />
          </div>
          <div>
            <h1 className="text-xl font-mono font-bold tracking-widest uppercase text-white">
              Knowledge_Graph
            </h1>
            <p className="text-slate-500 font-mono text-xs">
              Concept topology · drag nodes to explore
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <Input
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchGraph()}
            placeholder="student_id"
            className="font-mono h-9 w-44 bg-white/5 border-white/10 text-white focus-visible:ring-blue-500"
          />
          <Button
            onClick={fetchGraph}
            disabled={loading || !studentId}
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-mono shrink-0"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><RefreshCw className="w-4 h-4 mr-2" />Load</>}
          </Button>
        </div>
      </div>

      {/* Legend */}
      {nodes.length > 0 && (
        <div className="shrink-0 px-6 py-2 flex gap-6 text-[11px] font-mono border-b border-white/5">
          {(["concept", "mistake", "student"] as const).map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: COLORS[t].fill }} />
              <span className="text-slate-400 uppercase tracking-wider">{t}</span>
            </span>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-red-900/60 border border-red-500/50 rounded text-red-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {!loading && nodes.length === 0 && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-500 font-mono">
            <Network className="w-16 h-16 opacity-20" />
            <p className="text-sm uppercase tracking-widest">Enter a student ID and click Load</p>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
          </div>
        )}

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
          style={{ cursor: dragging.current ? "grabbing" : "default" }}
        >
          <defs>
            <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="rgba(255,255,255,0.2)" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((e, i) => {
            const s = idMap.get(e.source)
            const t = idMap.get(e.target)
            if (!s || !t) return null
            const dx = t.x - s.x
            const dy = t.y - s.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const ex = t.x - (dx / dist) * (t.r + 4)
            const ey = t.y - (dy / dist) * (t.r + 4)
            return (
              <line
                key={i}
                x1={s.x} y1={s.y} x2={ex} y2={ey}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1.5}
                strokeDasharray={e.source === "__student__" ? "4 4" : undefined}
                markerEnd="url(#arrow)"
              />
            )
          })}

          {/* Nodes */}
          {nodes.map(n => {
            const c = COLORS[n.type]
            const words = n.label.split(" ")
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                style={{ cursor: "grab" }}
                onMouseDown={e => onPointerDown(n.id, e)}
                onTouchStart={e => onPointerDown(n.id, e)}
              >
                {/* Glow ring */}
                <circle r={n.r + 6} fill="none" stroke={c.stroke} strokeWidth={1} opacity={0.3} />
                {/* Main circle */}
                <circle
                  r={n.r}
                  fill={c.fill}
                  stroke={c.stroke}
                  strokeWidth={2}
                  filter="url(#glow)"
                />
                {/* Label — wrap at spaces */}
                {words.map((word, wi) => (
                  <text
                    key={wi}
                    fill={c.text}
                    fontSize={n.r > 40 ? 11 : 10}
                    fontFamily="ui-monospace, monospace"
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    y={(wi - (words.length - 1) / 2) * 13}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {word}
                  </text>
                ))}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
