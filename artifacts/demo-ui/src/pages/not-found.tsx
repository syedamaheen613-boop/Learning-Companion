import { Link } from "wouter"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold font-mono tracking-widest uppercase">System 404</h1>
          <p className="text-muted-foreground font-mono">Module not found in cognitive registry.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Return to Core</Link>
        </Button>
      </div>
    </div>
  )
}
