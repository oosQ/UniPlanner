"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getDepartments, searchCourses, Course } from "@/app/actions/uob-proxy"
import { Search, Loader2, Calendar, MapPin, Users, Clock, BookOpen, Settings2, Filter } from "lucide-react"

const COLLEGES = [
    { value: "7", label: "College of Information Technology" },
    { value: "1", label: "College of Arts" },
    { value: "10", label: "College of Law" },
    { value: "3", label: "College of Engineering" },
    { value: "30", label: "College of Physical Education" },
    { value: "15", label: "College of Health And Sport Sciences" },
    { value: "35", label: "Languages Institute" },
    { value: "9", label: "College of Applied Studies" },
    { value: "4", label: "College of Science" },
    { value: "2", label: "College of Business Administration" },
]

export default function CatalogPage() {
    // State
    const [year, setYear] = useState("2025")
    const [sem, setSem] = useState("2")
    const [searchType, setSearchType] = useState("CD") // CC or CD
    const [code, setCode] = useState("")
    const [college, setCollege] = useState("7")
    const [dept, setDept] = useState("51")

    // Filter & Sort State
    const [sortBy, setSortBy] = useState("level-asc") // level-asc, level-desc, code
    const [filterDept, setFilterDept] = useState("ALL")
    const [filterLevel, setFilterLevel] = useState("ALL")
    const [resultFilter, setResultFilter] = useState("") // Text search

    const [departments, setDepartments] = useState<{ value: string; label: string }[]>([])
    const [courses, setCourses] = useState<Course[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // Initial Dept Fetch
    useEffect(() => {
        if (college) {
            handleCollegeChange(college)
        }
    }, []) // Run once on mount to load default college's departments

    const handleCollegeChange = async (val: string) => {
        setCollege(val)
        // Reset Dept
        setDept("")
        try {
            const depts = await getDepartments(val)
            setDepartments(depts)
            // If default college (7) is selected, and we have default dept (51), set it
            if (val === "7") {
                setDept("51")
            }
        } catch (err) {
            console.error("Failed to fetch departments", err)
        }
    }

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        setCourses([])

        // Reset filters on new search
        setResultFilter("")
        setFilterDept("ALL")
        setFilterLevel("ALL")
        setSortBy("level-asc")

        const formData = new FormData()
        formData.append("year", year)
        formData.append("sem", sem)
        formData.append("type", searchType)

        if (searchType === "CC") {
            formData.append("code", code)
        } else {
            formData.append("college", college)
            formData.append("dept", dept)
        }

        try {
            const results = await searchCourses(formData)
            setCourses(results)
            if (results.length === 0) {
                setError("No courses found matching your criteria.")
            }
        } catch (err) {
            setError("An error occurred while searching. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    // --- Helpers for Parsing & Logic ---

    const parseCourseCode = (code: string) => {
        // Remove spaces
        const cleanCode = code.replace(/\s+/g, "").toUpperCase()
        // Match letters at start, then numbers
        const match = cleanCode.match(/^([A-Z]+)(\d+)/)

        if (!match) return { dept: "Other", level: 999, levelLabel: "Other", num: 9999 }

        const deptStr = match[1]
        const numStr = match[2]
        const num = parseInt(numStr, 10)

        // Level logic: hundreds place (1xx -> 1, 2xx -> 2)
        // If > 499 or < 100, treat as "Other" (or specifically > 4 as user requested)
        let level = Math.floor(num / 100)

        let levelLabel = level.toString()
        if (level > 4 || level < 1) {
            levelLabel = "Other"
            level = 999 // Push to end if sorting by level
        }

        return { dept: deptStr, level, levelLabel, num }
    }

    // --- Derived State Calculation ---

    // 1. Extract unique departments from the current search results for the dropdown
    const availableDepts = Array.from(new Set(courses.map(c => parseCourseCode(c.code).dept))).sort()

    // 2. Filter and Sort
    const processedCourses = courses
        .map(course => ({
            ...course,
            parsed: parseCourseCode(course.code)
        }))
        .filter(course => {
            // Text Filter
            const textMatch =
                course.code.toLowerCase().includes(resultFilter.toLowerCase()) ||
                course.title.toLowerCase().includes(resultFilter.toLowerCase())
            if (!textMatch) return false

            // Dept Filter
            if (filterDept !== "ALL" && course.parsed.dept !== filterDept) return false

            // Level Filter
            if (filterLevel !== "ALL" && course.parsed.levelLabel !== filterLevel) return false

            return true
        })
        .sort((a, b) => {
            if (sortBy === "code") {
                return a.code.localeCompare(b.code)
            }
            if (sortBy === "level-asc") {
                // Primary: Level
                if (a.parsed.level !== b.parsed.level) return a.parsed.level - b.parsed.level
                // Secondary: Dept
                const deptCompare = a.parsed.dept.localeCompare(b.parsed.dept)
                if (deptCompare !== 0) return deptCompare
                // Tertiary: Number
                return a.parsed.num - b.parsed.num
            }
            if (sortBy === "level-desc") {
                if (a.parsed.level !== b.parsed.level) return b.parsed.level - a.parsed.level
                const deptCompare = a.parsed.dept.localeCompare(b.parsed.dept)
                if (deptCompare !== 0) return deptCompare
                return b.parsed.num - a.parsed.num
            }
            return 0
        })

    // Helper for seats color
    const getSeatColor = (seatsStr: string, status: string | undefined) => {
        const isOpen = status?.includes("OPEN")
        const seats = parseInt(seatsStr) || 0

        if (!isOpen || seats === 0) return "text-red-600 dark:text-red-400"
        if (seats < 10) return "text-amber-600 dark:text-amber-400"
        return "text-emerald-600 dark:text-emerald-400"
    }

    // Helper for progress bar color
    const getProgressBarColor = (seatsStr: string, status: string | undefined) => {
        const isOpen = status?.includes("OPEN")
        const seats = parseInt(seatsStr) || 0

        if (!isOpen || seats === 0) return "bg-red-500"
        if (seats < 10) return "bg-amber-500"
        return "bg-emerald-500"
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Course Catalog</h1>
                        <p className="text-slate-500 dark:text-slate-400">Search for courses, sections, and schedules</p>
                    </div>

                    {/* Settings Popover */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Settings2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Settings</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                            <div className="space-y-4">
                                <h4 className="font-medium leading-none">Catalog Settings</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Adjust academic year and semester</p>

                                <div className="space-y-2">
                                    <Label htmlFor="year">Academic Year</Label>
                                    <Select value={year} onValueChange={setYear}>
                                        <SelectTrigger id="year">
                                            <SelectValue placeholder="Select Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2025">2025/2026</SelectItem>
                                            <SelectItem value="2024">2024/2025</SelectItem>
                                            <SelectItem value="2023">2023/2024</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sem">Semester</Label>
                                    <Select value={sem} onValueChange={setSem}>
                                        <SelectTrigger id="sem">
                                            <SelectValue placeholder="Select Semester" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">First Semester</SelectItem>
                                            <SelectItem value="2">Second Semester</SelectItem>
                                            <SelectItem value="3">Summer Semester</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Search Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                    <form onSubmit={handleSearch} className="space-y-6">

                        {/* Search Type Radio */}
                        <div className="space-y-3">
                            <Label>Search By</Label>
                            <RadioGroup value={searchType} onValueChange={setSearchType} className="flex gap-6">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="CD" id="CD" />
                                    <Label htmlFor="CD" className="font-normal cursor-pointer">College & Department</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="CC" id="CC" />
                                    <Label htmlFor="CC" className="font-normal cursor-pointer">Course Code</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Dynamic Inputs */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800 transition-all">
                            {searchType === "CC" ? (
                                <div className="space-y-2">
                                    <Label htmlFor="code">Course Code</Label>
                                    <Input
                                        id="code"
                                        placeholder="e.g. ITIS460"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        className="max-w-md bg-white dark:bg-slate-900"
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="college">College</Label>
                                        <Select value={college} onValueChange={handleCollegeChange}>
                                            <SelectTrigger id="college" className="bg-white dark:bg-slate-900">
                                                <SelectValue placeholder="Select College" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COLLEGES.map(c => (
                                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="dept">Department</Label>
                                        <Select value={dept} onValueChange={setDept} disabled={departments.length === 0}>
                                            <SelectTrigger id="dept" className="bg-white dark:bg-slate-900">
                                                <SelectValue placeholder={departments.length === 0 ? "Select a college first" : "Select Department"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departments.map(d => (
                                                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end">
                            <Button type="submit" size="lg" className="px-8 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Searching...
                                    </>
                                ) : (
                                    <>
                                        <Search className="mr-2 h-4 w-4" />
                                        Search Courses
                                    </>
                                )}
                            </Button>
                        </div>

                    </form>
                </div>

                {/* Results Section */}
                <div className="space-y-8">

                    {/* Toolbar: Filters & Sort */}
                    {courses.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-2 space-y-4">

                            {/* Top Row: Text Search & Counts */}
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg text-blue-600 dark:text-blue-400">
                                    <Filter className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <Input
                                        placeholder="Quickly filter by text..."
                                        value={resultFilter}
                                        onChange={(e) => setResultFilter(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm focus-visible:ring-emerald-500/20 text-base"
                                    />
                                </div>
                                <div className="text-sm font-medium px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
                                    {processedCourses.length} results
                                </div>
                            </div>

                            <hr className="border-slate-100 dark:border-slate-800" />

                            {/* Bottom Row: Dropdowns */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                                {/* 1. Sort By */}
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">Sort By</Label>
                                    <Select value={sortBy} onValueChange={setSortBy}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="level-asc">Level (Low to High)</SelectItem>
                                            <SelectItem value="level-desc">Level (High to Low)</SelectItem>
                                            <SelectItem value="code">Course Code</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 2. Department Filter */}
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">Department</Label>
                                    <Select value={filterDept} onValueChange={(val) => {
                                        setFilterDept(val)
                                        // Reset level when dept changes if strict behavior desired, but keeping it is flexible
                                    }}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="All Departments" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Departments</SelectItem>
                                            {availableDepts.map(d => (
                                                <SelectItem key={d} value={d}>{d}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 3. Level Filter */}
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">Level</Label>
                                    <Select value={filterLevel} onValueChange={setFilterLevel}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="All Levels" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Levels</SelectItem>
                                            <SelectItem value="1">Level 1</SelectItem>
                                            <SelectItem value="2">Level 2</SelectItem>
                                            <SelectItem value="3">Level 3</SelectItem>
                                            <SelectItem value="4">Level 4</SelectItem>
                                            <SelectItem value="Other">Other (&gt;400)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-6 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900 text-center font-medium">
                            {error}
                        </div>
                    )}

                    {courses.length > 0 && processedCourses.length === 0 && (
                        <div className="text-center py-20">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                                <Search className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No matching courses</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                No courses found matching "{resultFilter}".
                            </p>
                        </div>
                    )}

                    <div className="grid gap-6">
                        {processedCourses.map((course, idx) => (
                            <div
                                key={`${course.code}-${idx}`}
                                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                {/* Course Header */}
                                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/20">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-sm font-bold bg-blue-600 text-white shadow-sm tracking-wide">
                                                {course.code}
                                            </span>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                                {course.title}
                                            </h3>
                                        </div>
                                        {course.prereqs && (
                                            <div className="flex items-start gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-2">
                                                <BookOpen className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
                                                <span className="leading-snug">Prereqs: <span className="font-medium text-slate-700 dark:text-slate-300">{course.prereqs}</span></span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider shrink-0">
                                        {course.sections.length} Section{course.sections.length !== 1 ? 's' : ''}
                                    </div>
                                </div>

                                {/* Sections */}
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {course.sections.map((section, sIdx) => {
                                        const isOpen = section.status?.includes("OPEN");
                                        return (
                                            <div key={sIdx} className="p-5 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                                                    {/* Section Info */}
                                                    <div className="md:col-span-2 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start gap-2">
                                                        <div className="text-center md:text-left">
                                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Section</div>
                                                            <div className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                                                                {section.section}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-end md:items-start gap-2">
                                                            <div className={`px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset ${isOpen
                                                                ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-500/20"
                                                                : "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-500/20"
                                                                }`}>
                                                                {section.status || "Unknown"}
                                                            </div>
                                                            {section.classType && (
                                                                <span className="inline-flex items-center rounded-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                                                                    {section.classType}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Instructor & Location */}
                                                    <div className="md:col-span-4 space-y-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">
                                                                <Users className="w-3.5 h-3.5" />
                                                                Instructor
                                                            </div>
                                                            <Link
                                                                href={`/instructor?search=${encodeURIComponent(section.instructor)}`}
                                                                className="font-medium text-slate-900 dark:text-slate-100 text-sm leading-snug hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors block line-clamp-1"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                title={section.instructor}
                                                            >
                                                                {section.instructor}
                                                            </Link>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-1">
                                                                <MapPin className="w-3.5 h-3.5" />
                                                                Location
                                                            </div>
                                                            <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                                                {section.location || "TBA"}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Schedule */}
                                                    <div className="md:col-span-3 space-y-1">
                                                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            Schedule
                                                        </div>
                                                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                            {section.days || "TBA"}
                                                        </div>
                                                        <div className="text-sm text-slate-500 dark:text-slate-400">
                                                            {section.time || "TBA"}
                                                        </div>
                                                    </div>

                                                    {/* Exam & Seats */}
                                                    <div className="md:col-span-3 flex flex-col justify-between gap-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                Exam
                                                            </div>
                                                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                                                {section.examDate || "TBA"}
                                                            </div>
                                                            {section.examRoom && section.examRoom !== "To be announced" && (
                                                                <div className="text-xs text-slate-500">
                                                                    Room: {section.examRoom}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2 pt-2 md:pt-0">
                                                            <div className={`flex-1 h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800`}>
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(section.availableSeats, section.status)}`}
                                                                    style={{ width: isOpen ? '60%' : '100%' }} // Static width for visual flair
                                                                />
                                                            </div>
                                                            <div className={`text-xs font-bold whitespace-nowrap ${getSeatColor(section.availableSeats, section.status)}`}>
                                                                {section.availableSeats} Seats
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}
