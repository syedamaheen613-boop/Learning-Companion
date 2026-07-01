import { useState, useMemo } from "react"
import { useGetStudentGraph, getGetStudentGraphQueryKey } from "@workspace/api-client-react"
import { motion, AnimatePresence } from "framer-motion"
import { GitMerge, Loader2, AlertCircle, Waypoints, Network, CornerDownRight } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function ConceptMap() {
  const [studentId, setStudentId] = useState("student_1")
  const [queryId, setQueryId] = useState("")

  const { data, isLoading, isError } = useGetStudentGraph(
    { student_id: queryId },
    {
      query: {
        enabled: !!queryId,
        queryKey: getGetStudentGraphQueryKey({ student_id: queryId })
      }
    }
  )

  const handleFetch = () => {
    if (studentId) {
      setQueryId(studentId)
    }
  }

  // Calculate layout levels
  const levels = useMemo(() => {
    if (!data?.graph) return []

    const nodes = data.graph
    const levelsArr: typeof nodes[] = []
    const placed = new Set<string>()
    const nodeMap = new Map<string, typeof nodes[0]>()
    
    nodes.forEach(n => {
      if (n.concept) nodeMap.set(n.concept, n)
    })

    let currentLevel = nodes.filter(n => !n.dependsOn || !nodeMap.has(n.dependsOn))
    
    while (currentLevel.length > 0) {
      levelsArr.push(currentLevel)
      currentLevel.forEach(n => {
        if (n.concept) placed.add(n.concept)
      })
      
      const nextLevel = nodes.filter(n => 
        n.dependsOn && 
        currentLevel.some(c => c.concept === n.dependsOn) && 
        n.concept && !placed.has(n.concept)
      )
      currentLevel = nextLevel
    }
    
    const stragglers = nodes.filter(n => n.concept && !placed.has(n.concept))
    if (stragglers.length > 0) {
      levelsArr.push(stragglers)
    }

    return levelsArr
  }, [data])

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl space-y-12 h-[calc(100dvh-64px)] flex flex-col relative z-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-widest uppercase flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
            <Network className="w-8 h-8 text-blue-500" />
            Concept_Topology
          </h1>
          <p className="text-slate-400 font-mono text-sm max-w-xl">
            Visualizing the cognitive graph and known structural failures for a given target identifier.
          </p>
        </div>

        <Card className="galaxy-card w-full md:w-auto min-w-[300px] border-t-2 border-t-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
          <CardContent className="p-4 flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="student-id" className="text-[10px] text-slate-400 uppercase tracking-widest">Target Identifier</Label>
              <Input 
                id="student-id" 
                value={studentId} 
                onChange={(e) => setStudentId(e.target.value)} 
                className="font-mono h-9 bg-white/5 border-white/10 text-white focus-visible:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              />
            </div>
            <Button onClick={handleFetch} disabled={!studentId || isLoading} className="h-9 shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-mono">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4 mr-2" />}
              Extract
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 relative min-h-[400px] galaxy-card overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.5) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {isError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-4 border border-red-500/50 bg-red-900/20 text-red-400 font-mono text-sm flex items-center gap-3 rounded-lg backdrop-blur">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>ERR_TOPOLOGY_FETCH: Could not map cognitive nodes.</span>
            </div>
          </div>
        )}

        {!queryId && !isLoading && !isError && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-slate-500 tracking-widest uppercase">
            Awaiting target identifier...
          </div>
        )}

        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#050510]/50 backdrop-blur-sm z-10"
            >
              <div className="w-16 h-16 border border-blue-500/30 rounded-full flex items-center justify-center relative">
                <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping" />
                <Waypoints className="w-8 h-8 text-blue-400 animate-pulse" />
              </div>
              <div className="font-mono text-xs tracking-widest uppercase text-blue-400">
                Scanning Topology...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {data && !isLoading && (
          <div className="absolute inset-0 overflow-auto p-8 scrollbar-thin">
            {levels.length === 0 ? (
              <div className="h-full flex items-center justify-center font-mono text-slate-500 tracking-widest uppercase">
                No topology found for target.
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-12 items-start w-max min-w-full relative z-10">
                {levels.map((level, i) => (
                  <div key={i} className="flex flex-col gap-6 w-72 shrink-0 relative">
                    <div className="absolute -top-6 left-0 text-[10px] font-mono text-blue-500/50 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500/50 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                      Tier 0{i + 1}
                    </div>

                    {level.map((node, j) => (
                      <motion.div
                        key={node.concept || j}
                        initial={{ opacity: 0, x: -20, y: 10 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ delay: i * 0.15 + j * 0.05, duration: 0.4 }}
                      >
                        <Card className={`galaxy-card border-l-[4px] ${node.mistake ? 'border-l-red-500 bg-red-900/10 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'border-l-blue-500 bg-blue-900/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]'} overflow-visible relative group hover:-translate-y-1 transition-transform`}>
                          
                          {node.dependsOn && (
                            <div className="absolute top-1/2 -left-8 w-8 border-t border-dashed border-slate-500/50 flex items-center">
                              <CornerDownRight className="w-3 h-3 text-slate-500/50 absolute -right-1 -bottom-[7px]" />
                            </div>
                          )}

                          <CardContent className="p-4 space-y-3">
                            <div className="font-mono font-bold tracking-wider text-sm uppercase text-white">
                              {node.concept || "Unknown Node"}
                            </div>
                            
                            {node.dependsOn && (
                              <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1.5">
                                <GitMerge className="w-3 h-3 text-slate-500" />
                                Depends: <span className="text-slate-300">{node.dependsOn}</span>
                              </div>
                            )}

                            {node.mistake && (
                              <div className="mt-2 pt-3 border-t border-red-500/20">
                                <div className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Structural Failure
                                </div>
                                <div className="text-xs font-serif text-red-200 leading-snug">
                                  {node.mistake}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
