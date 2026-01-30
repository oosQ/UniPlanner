
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import Image from "next/image"
import { InstructorFilter } from "@/components/instructor-filter"
import { Prisma } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: Promise<{
        search?: string
        department?: string
        college?: string
    }>
}

export default async function InstructorListPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const { search, department, college } = searchParams;

    // Build filter
    const where: Prisma.InstructorWhereInput = {}

    if (search) {
        where.OR = [
            { name: { contains: search } },
        ]
    }

    if (college && college !== "all") {
        where.college = college
    }

    if (department && department !== "all") {
        where.department = department
    }

    // Fetch data
    const instructors = await prisma.instructor.findMany({
        where,
        orderBy: { name: 'asc' }
    })

    // Fetch unique colleges
    const distinctColleges = await prisma.instructor.findMany({
        where: { college: { not: null } },
        select: { college: true },
        distinct: ['college'],
        orderBy: { college: 'asc' }
    })

    const colleges = distinctColleges
        .map(c => c.college)
        .filter((c): c is string => !!c);

    // Fetch unique departments (scoped to selected college if present)
    const distinctDepts = await prisma.instructor.findMany({
        where: {
            department: { not: null },
            ...(college && college !== "all" ? { college } : {})
        },
        select: { department: true },
        distinct: ['department'],
        orderBy: { department: 'asc' }
    })

    const departments = distinctDepts
        .map(d => d.department)
        .filter((d): d is string => !!d);

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Instructors</h1>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {instructors.length} results
                    </div>
                </div>

                <InstructorFilter departments={departments} colleges={colleges} />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
                    {instructors.map((instructor, index) => (
                        <Link
                            key={instructor.id}
                            href={`/instructor/${instructor.id}`}
                            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border-2 border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-300 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 group relative overflow-hidden"
                            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative w-28 h-28 mb-5 rounded-full p-1 bg-gradient-to-br from-gray-100 to-white dark:from-slate-700 dark:to-slate-800 shadow-inner group-hover:scale-105 transition-transform duration-300 ring-1 ring-gray-100 dark:ring-slate-700 group-hover:ring-emerald-200 dark:group-hover:ring-emerald-800">
                                <div className="relative w-full h-full rounded-full overflow-hidden bg-gray-50 dark:bg-slate-800">
                                    <Image
                                        src={instructor.photoUrl || "/placeholder-avatar.png"}
                                        alt={instructor.name}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                </div>
                            </div>

                            <div className="relative z-10 w-full">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 line-clamp-1 mb-1 group-hover:text-emerald-700 transition-colors">
                                    {instructor.name}
                                </h3>

                                {instructor.degree && (
                                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 uppercase tracking-wide">
                                        {instructor.degree}
                                    </p>
                                )}

                                <div className="space-y-1">
                                    {(instructor.college || instructor.department) && (
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                                            {[instructor.college, instructor.department].filter(Boolean).join(" - ")}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}

                    {instructors.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">No instructors found</h3>
                            <p className="text-gray-500 max-w-sm mt-2">
                                We couldn't find any instructors matching your search. Try adjusting your filters.
                            </p>
                            <Link
                                href="/instructor"
                                className="mt-6 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                            >
                                Clear all filters
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
