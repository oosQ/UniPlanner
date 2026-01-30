import { Loader2 } from "lucide-react"

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
    )
}
