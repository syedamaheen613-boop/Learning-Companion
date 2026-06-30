import { useState, useMemo } from "react"
import { useGetStudentGraph, getGetStudentGraphQueryKey } from "@workspace/api-client-react"
import { motion, AnimatePresence } from "framer-motion"
import { GitMerge, Loader2, Database, AlertCircle, Waypoints, Network, CornerDownRight } from "lucide-react"

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

    // Roots: no dependsOn OR dependsOn is not in the graph
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
    
    // Cycle stragglers
    const stragglers = nodes.filter(n => n.concept && !placed.has(n.concept))
    if (stragglers.length > 0) {
      levelsArr.push(stragglers)
    }

    return levelsArr
  }, [data])

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl space-y-12 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-mono font-bold tracking-widest uppercase flex items-center gap-3">
            <Network className="w-8 h-8 text-primary" />
            Concept_Topology
          </h1>
          <p className="text-muted-foreground font-mono max-w-xl">
            Visualizing the cognitive graph and known structural failures for a given target identifier.
          </p>
        </div>

        <Card className="border-border bg-black/40 backdrop-blur w-full md:w-auto min-w-[300px]">
          <CardContent className="p-4 flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="student-id" className="text-[10px]">Target Identifier</Label>
              <Input 
                id="student-id" 
                value={studentId} 
                onChange={(e) => setStudentId(e.target.value)} 
                className="font-mono h-9 bg-background focus-visible:ring-primary"
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              />
            </div>
            <Button onClick={handleFetch} disabled={!studentId || isLoading} className="h-9 shrink-0">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4 mr-2" />}
              Extract
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 relative min-h-[400px] border border-border/50 bg-black/20 overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {isError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-4 border border-destructive bg-destructive/10 text-destructive font-mono text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>ERR_TOPOLOGY_FETCH: Could not map cognitive nodes.</span>
            </div>
          </div>
        )}

        {!queryId && !isLoading && !isError && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-muted-foreground tracking-widest uppercase">
            Awaiting target identifier...
          </div>
        )}

        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/50 backdrop-blur-sm z-10"
            >
              <div className="w-16 h-16 border border-primary/30 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-primary/10 animate-ping" />
                <Waypoints className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="font-mono text-xs tracking-widest uppercase text-primary">
                Scanning Topology...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {data && !isLoading && (
          <div className="absolute inset-0 overflow-auto p-8">
            {levels.length === 0 ? (
              <div className="h-full flex items-center justify-center font-mono text-muted-foreground tracking-widest uppercase">
                No topology found for target.
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-12 items-start w-max min-w-full">
                {levels.map((level, i) => (
                  <div key={i} className="flex flex-col gap-6 w-72 shrink-0 relative">
                    {/* Level Indicator */}
                    <div className="absolute -top-6 left-0 text-[10px] font-mono text-primary/50 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary/50" />
                      Tier 0{i + 1}
                    </div>

                    {level.map((node, j) => (
                      <motion.div
                        key={node.concept || j}
                        initial={{ opacity: 0, x: -20, y: 10 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ delay: i * 0.15 + j * 0.05, duration: 0.4 }}
                      >
                        <Card className={`border-l-4 ${node.mistake ? 'border-l-destructive border-y-destructive/20 border-r-destructive/20 bg-destructive/5' : 'border-l-primary border-y-primary/20 border-r-primary/20 bg-primary/5'} overflow-visible relative group`}>
                          
                          {/* Connection line indicator if has dependsOn */}
                          {node.dependsOn && (
                            <div className="absolute top-1/2 -left-8 w-8 border-t border-dashed border-muted-foreground/50 flex items-center">
                              <CornerDownRight className="w-3 h-3 text-muted-foreground/50 absolute -right-1 -bottom-[7px]" />
                            </div>
                          )}

                          <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start gap-2">
                              <div className="font-mono font-bold tracking-wider text-sm uppercase text-foreground">
                                {node.concept || "Unknown Node"}
                              </div>
                            </div>
                            
                            {node.dependsOn && (
                              <div className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-1.5">
                                <GitMerge className="w-3 h-3" />
                                Depends on: <span className="text-foreground">{node.dependsOn}</span>
                              </div>
                            )}

                            {node.mistake && (
                              <div className="mt-2 pt-3 border-t border-destructive/20">
                                <div className="text-[10px] font-mono text-destructive font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Structural Failure
                                </div>
                                <div className="text-xs font-serif text-destructive/90 leading-snug">
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
