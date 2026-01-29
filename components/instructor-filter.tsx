
"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Search, X, BookOpen, Calculator, CircleDollarSign, Cog, Cpu, FlaskConical, Gavel, Scale, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InstructorFilterProps {
    departments: string[]
    colleges: string[]
}

const COLLEGE_ICONS: Record<string, React.ReactNode> = {
    'CAS': <BookOpen className="w-4 h-4 mr-2 text-indigo-500" />,
    'Arts': <BookOpen className="w-4 h-4 mr-2 text-pink-500" />,
    'Business': <CircleDollarSign className="w-4 h-4 mr-2 text-emerald-500" />,
    'Engineering': <Cog className="w-4 h-4 mr-2 text-orange-500" />,
    'IT': <Cpu className="w-4 h-4 mr-2 text-blue-500" />,
    'Law': <Scale className="w-4 h-4 mr-2 text-red-500" />,
    'Science': <FlaskConical className="w-4 h-4 mr-2 text-purple-500" />
}

export function InstructorFilter({ departments, colleges }: InstructorFilterProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [search, setSearch] = useState(searchParams.get("search") || "")
    const [department, setDepartment] = useState(searchParams.get("department") || "all")
    const [college, setCollege] = useState(searchParams.get("college") || "all")

    // Debounce search update
    useEffect(() => {
        const timer = setTimeout(() => {
            updateParams(search, department, college)
        }, 300)

        return () => clearTimeout(timer)
    }, [search])

    const updateParams = (newSearch: string, newDept: string, newCollege: string) => {
        const params = new URLSearchParams(searchParams.toString())

        if (newSearch) params.set("search", newSearch)
        else params.delete("search")

        if (newCollege && newCollege !== "all") params.set("college", newCollege)
        else params.delete("college")

        if (newDept && newDept !== "all") params.set("department", newDept)
        else params.delete("department")

        router.push(`/instructor?${params.toString()}`)
    }

    const handleCollegeChange = (val: string) => {
        setCollege(val)
        // Reset department when college changes
        setDepartment("all")
        updateParams(search, "all", val)
    }

    const handleDepartmentChange = (val: string) => {
        setDepartment(val)
        updateParams(search, val, college)
    }

    const clearFilters = () => {
        setSearch("")
        setDepartment("all")
        setCollege("all")
        router.push("/instructor")
    }

    return (
        <div className="flex flex-col gap-4 mb-8 p-1">
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search Input */}
                <div className="relative w-full md:w-1/3 group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-emerald-600 transition-colors" />
                    </div>
                    <Input
                        placeholder="Search by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-gray-200 dark:border-gray-800 focus:ring-emerald-500 focus:border-emerald-500 transition-all h-11 rounded-xl shadow-sm hover:shadow-md"
                    />
                </div>

                {/* College Filter */}
                <div className="w-full md:w-1/4">
                    <Select value={college} onValueChange={handleCollegeChange}>
                        <SelectTrigger className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-gray-200 dark:border-gray-800 h-11 rounded-xl shadow-sm hover:shadow-md transition-all">
                            <SelectValue placeholder="Select College" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Colleges</SelectItem>
                            {colleges.map((col) => (
                                <SelectItem key={col} value={col}>
                                    <div className="flex items-center">
                                        {COLLEGE_ICONS[col] || <GraduationCap className="w-4 h-4 mr-2" />}
                                        {col}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Department Filter - Only shown if college is selected */}
                {college !== "all" && (
                    <div className="w-full md:w-1/4 animate-in fade-in slide-in-from-left-4 duration-300">
                        <Select value={department} onValueChange={handleDepartmentChange}>
                            <SelectTrigger className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-gray-200 dark:border-gray-800 h-11 rounded-xl shadow-sm hover:shadow-md transition-all">
                                <SelectValue placeholder="All Departments" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                {departments.map((dept) => (
                                    <SelectItem key={dept} value={dept}>
                                        {dept}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {(search || department !== "all" || college !== "all") && (
                <div className="flex justify-start">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-4 h-9 rounded-lg"
                    >
                        <X className="w-3.5 h-3.5 mr-2" />
                        Clear Filters
                    </Button>
                </div>
            )}
        </div>
    )
}
