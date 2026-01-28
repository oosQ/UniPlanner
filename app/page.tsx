
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Users, GraduationCap } from "lucide-react";

export default function Home() {
    return (
        <main className="flex flex-col min-h-[calc(100vh-4rem)]">
            {/* Hero Section */}
            <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-gradient-to-b from-transparent to-background">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-2xl mb-8 animate-in fade-in zoom-in duration-500">
                    <GraduationCap className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                </div>

                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl mb-6 bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Master Your University Schedule
                </h1>

                <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
                    The ultimate course planning tool for UOB students.
                    Search courses, find instructor details, and build your perfect semester path.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto">
                    <Link href="/catalog" className="flex-1">
                        <Button size="lg" className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                            <BookOpen className="mr-2 h-5 w-5" />
                            Browse Courses
                        </Button>
                    </Link>
                    <Link href="/instructor" className="flex-1">
                        <Button size="lg" variant="outline" className="w-full h-14 text-lg border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950">
                            <Users className="mr-2 h-5 w-5" />
                            Find Instructors
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Features Grid */}
            <section className="container mx-auto px-4 py-16 border-t bg-slate-50/50 dark:bg-slate-950/20">
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <div className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                            <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Smart Course Catalog</h3>
                        <p className="text-muted-foreground">
                            Filter by college, department, and availability. Get real-time seat counts and exam schedules instantly.
                        </p>
                    </div>

                    <div className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                            <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Instructor Profiles</h3>
                        <p className="text-muted-foreground">
                            View detailed profiles including office hours, contact info, and biography to choose the right mentor for you.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
