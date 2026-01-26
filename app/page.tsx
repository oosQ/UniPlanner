import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-4">
            <h1 className="text-4xl font-bold tracking-tight">UniPlanner</h1>
            <p className="text-muted-foreground text-lg">Milestone 0: Setup Complete</p>
            <div className="flex gap-4">
                <Link href="/catalog">
                    <Button>Browse Catalog</Button>
                </Link>
                <Button variant="outline">Learn More</Button>
            </div>
            <div className="p-4 border rounded bg-card text-card-foreground shadow-sm">
                Next.js + Tailwind + shadcn/ui configured manually (WSL workaround).
            </div>
        </div>
    );
}
