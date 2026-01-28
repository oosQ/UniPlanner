
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
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InstructorFilterProps {
    departments: string[]
}

export function InstructorFilter({ departments }: InstructorFilterProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [search, setSearch] = useState(searchParams.get("search") || "")
    const [department, setDepartment] = useState(searchParams.get("department") || "all")

    // Debounce search update
    useEffect(() => {
        const timer = setTimeout(() => {
            updateParams(search, department)
        }, 300)

        return () => clearTimeout(timer)
    }, [search])

    const updateParams = (newSearch: string, newDept: string) => {
        const params = new URLSearchParams(searchParams.toString())

        if (newSearch) params.set("search", newSearch)
        else params.delete("search")

        if (newDept && newDept !== "all") params.set("department", newDept)
        else params.delete("department")

        router.push(`/instructor?${params.toString()}`)
    }

    const handleDepartmentChange = (val: string) => {
        setDepartment(val)
        updateParams(search, val)
    }

    const clearFilters = () => {
        setSearch("")
        setDepartment("all")
        router.push("/instructor")
    }

    return (
        <div className="flex flex-col md:flex-row gap-4 mb-8 p-1">
            <div className="relative w-full md:w-1/2 lg:w-1/3 group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-emerald-600 transition-colors" />
                </div>
                <Input
                    placeholder="Search instructors by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-gray-200 dark:border-gray-800 focus:ring-emerald-500 focus:border-emerald-500 transition-all h-11 rounded-xl shadow-sm hover:shadow-md"
                />
            </div>

            <div className="w-full md:w-1/3 lg:w-1/4">
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

            {(search || department !== "all") && (
                <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-11 px-6 rounded-xl"
                >
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                </Button>
            )}
        </div>
    )
}
