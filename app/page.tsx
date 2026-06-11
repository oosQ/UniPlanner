
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarDays, GraduationCap, LayoutDashboard, Search } from "lucide-react";

export default function Home() {
    return (
        <main className="flex flex-col min-h-[calc(100vh-4rem)]">
            <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-gradient-to-b from-transparent to-background">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl mb-8 animate-in fade-in zoom-in duration-500">
                    <GraduationCap className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                </div>

                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl mb-6 bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Build Your UOB Plan and Schedule
                </h1>

                <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
                    Upload your study plan and transcript, track completed and remaining courses, search real sections, and build multiple schedules from the courses you choose.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl mx-auto">
                    <Link href="/get-started" className="flex-1">
                        <Button size="lg" className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                            <LayoutDashboard className="mr-2 h-5 w-5" />
                            Open Dashboard
                        </Button>
                    </Link>
                    <Link href="/scheduler" className="flex-1">
                        <Button size="lg" variant="outline" className="w-full h-14 text-lg border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950">
                            <CalendarDays className="mr-2 h-5 w-5" />
                            Build Schedule
                        </Button>
                    </Link>
                </div>
            </section>

            <section className="container mx-auto px-4 py-16 border-t bg-slate-50/50 dark:bg-slate-950/20">
                <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    <div className="bg-card p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-4">
                            <LayoutDashboard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Progress Dashboard</h3>
                        <p className="text-muted-foreground">
                            Compare your transcript with the study plan, review completed courses, and pick the exact remaining electives by type.
                        </p>
                    </div>

                    <div className="bg-card p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
                            <CalendarDays className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Schedule Builder</h3>
                        <p className="text-muted-foreground">
                            Generate smart schedules or build manually from picked sections, with normal semester and summer credit limits respected.
                        </p>
                    </div>

                    <div className="bg-card p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center mb-4">
                            <Search className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Course Search & Picker</h3>
                        <p className="text-muted-foreground">
                            Search one course or all remaining courses together, inspect sections and final exams, then add sections to your picker.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
