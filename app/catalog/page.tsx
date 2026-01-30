
"use client"

import { useState, useEffect } from "react"
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

    // Result Filtering State
    const [resultFilter, setResultFilter] = useState("")

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
        setResultFilter("") // Reset local filter on new search

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

    // Filtered courses based on local search input
    const filteredCourses = courses.filter(course =>
        course.code.toLowerCase().includes(resultFilter.toLowerCase()) ||
        course.title.toLowerCase().includes(resultFilter.toLowerCase())
    )

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
                <div className="space-y-6">

                    {/* Filter Input for Results */}
                    {courses.length > 0 && (
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                                <Filter className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex-1">
                                <Input
                                    placeholder="Filter results by course code (e.g. ITAAI, ITIS)..."
                                    value={resultFilter}
                                    onChange={(e) => setResultFilter(e.target.value)}
                                    className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-lg placeholder:text-slate-400"
                                />
                            </div>
                            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                {filteredCourses.length} results
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 flex items-center justify-center">
                            {error}
                        </div>
                    )}

                    {courses.length > 0 && filteredCourses.length === 0 && (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                            No courses match your filter "{resultFilter}".
                        </div>
                    )}

                    {filteredCourses.map((course, idx) => (
                        <div key={`${course.code}-${idx}`} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${idx * 50}ms` }}>
                            {/* Course Header */}
                            <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-sm font-bold tracking-wide">
                                            {course.code}
                                        </span>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{course.title}</h3>
                                    </div>
                                    {course.prereqs && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex items-start gap-1">
                                            <BookOpen className="w-4 h-4 mt-0.5 shrink-0" />
                                            <span>Prereqs: {course.prereqs}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Sections */}
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {course.sections.map((section, sIdx) => (
                                    <div key={sIdx} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {/* Logic/Meta */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Section</span>
                                                    <span className="text-lg font-bold text-slate-900 dark:text-white">{section.section}</span>
                                                </div>
                                                <div className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase ${section.status?.includes("OPEN")
                                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                    }`}>
                                                    {section.status || "Unknown"}
                                                </div>
                                                {section.classType && (
                                                    <div className="mt-1 text-xs text-slate-500 font-medium">
                                                        {section.classType}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Instructor */}
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                    <Users className="w-4 h-4" />
                                                    <span>Instructor</span>
                                                </div>
                                                <p className="font-medium text-slate-900 dark:text-slate-200 line-clamp-1" title={section.instructor}>
                                                    {section.instructor}
                                                </p>
                                            </div>

                                            {/* Schedule */}
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                    <Clock className="w-4 h-4" />
                                                    <span>Schedule</span>
                                                </div>
                                                <p className="font-medium text-slate-900 dark:text-slate-200">
                                                    {section.days} <br />
                                                    <span className="text-sm text-slate-500">{section.time}</span>
                                                </p>
                                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {section.location}
                                                </div>
                                            </div>

                                            {/* Exam */}
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>Exam</span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                                                    {section.examDate || "TBA"}
                                                </p>
                                                {section.examRoom && (
                                                    <p className="text-xs text-slate-500">Room: {section.examRoom}</p>
                                                )}
                                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2">
                                                    {section.availableSeats} Seats Available
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    )
}
