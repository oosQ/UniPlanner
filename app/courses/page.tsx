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
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getDepartments, searchCourses, Course, checkWebsiteAvailability } from "@/app/actions/uob-proxy"
import { Search, Loader2, Calendar, MapPin, Users, Clock, BookOpen, Settings2, Filter, AlertCircle, Plus, AlertTriangle, CheckCircle2, Trash2, ArrowRight } from "lucide-react"
import { readStoredSchedules, addSectionToSchedule, removeSectionFromSchedule, readStoredPlan, readStoredTranscript, addPickedSection, readPickedSections } from "@/lib/storage"
import { authService } from "@/lib/auth-service"
import { FALLBACK_ELECTIVES } from "@/lib/fallback-electives"
import { checkTimeClash, checkExamClash } from "@/lib/schedule-utils"

import { COLLEGES } from "@/lib/config"

const NORMAL_TERM_LIMIT = { maxCourses: 6, maxCredits: 18 }
const SUMMER_TERM_LIMIT = { maxCourses: 3, maxCredits: 9 }

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
    const [hideFull, setHideFull] = useState(false)
    const [resultFilter, setResultFilter] = useState("") // Text search

    const [departments, setDepartments] = useState<{ value: string; label: string }[]>([])
    const [courses, setCourses] = useState<Course[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    
    // Website availability check
    const [checkingAvailability, setCheckingAvailability] = useState(true)
    const [websiteAvailable, setWebsiteAvailable] = useState(true)
    const [availabilityMessage, setAvailabilityMessage] = useState("")

    // Notification state for schedule actions
    const [notification, setNotification] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null)
    const [savedSchedules, setSavedSchedules] = useState<Record<string, any>>({})
    const [pickedSectionsCount, setPickedSectionsCount] = useState(0)

    const [user, setUser] = useState<any>(null)
    const [hasPlanAndTranscript, setHasPlanAndTranscript] = useState(false)
    const [showRemainingOnly, setShowRemainingOnly] = useState(false)
    const [remainingCourses, setRemainingCourses] = useState<Set<string>>(new Set())
    const [remainingCourseOptions, setRemainingCourseOptions] = useState<{ code: string; title: string }[]>([])
    const [selectedRemainingCodes, setSelectedRemainingCodes] = useState<Set<string>>(new Set())
    const [activeScheduleId, setActiveScheduleId] = useState("schedule-1")
    const [plan, setPlan] = useState<any>(null)

    useEffect(() => {
        setSavedSchedules(readStoredSchedules())
        setPickedSectionsCount(readPickedSections().length)
        
        const currentUser = authService.getCurrentUser()
        setUser(currentUser)
        
        const planData = readStoredPlan<any>()
        setPlan(planData)
        const transcript = readStoredTranscript<any>()
        setHasPlanAndTranscript(!!(planData && transcript))

        const calculateRemaining = (p: any, t: any) => {
            const completedSet = new Set<string>()
            const inProgressSet = new Set<string>()
            
            if (t && t.semesters) {
                for (const sem of t.semesters) {
                    if (!sem || !sem.courses) continue
                    for (const course of sem.courses) {
                        if (course.courseCode && course.status !== "W") {
                            const clean = course.courseCode.replace(/\s+/g, "").toUpperCase()
                            if (course.grade && !["F", "FX", "U", "I", "IP"].includes(course.grade.toUpperCase())) {
                                completedSet.add(clean)
                            } else if (["I", "IP"].includes(course.grade.toUpperCase()) || !course.grade || course.grade === "N/A" || course.grade === "Enrolled") {
                                inProgressSet.add(clean)
                            }
                        }
                    }
                }
            }

            const remaining = new Set<string>()
            const remainingOptions: { code: string; title: string }[] = []
            const addedOptions = new Set<string>()
            if (p && p.semesters) {
                let selectedElectives: Record<string, string> = {}
                try {
                    const stored = localStorage.getItem("selectedElectives")
                    if (stored) {
                        selectedElectives = JSON.parse(stored)
                    }
                } catch (e) {
                    console.error(e)
                }

                p.semesters.forEach((sem: any, sIdx: number) => {
                    if (!sem || !sem.courses) return
                    const semName = sem.semesterName || `Semester ${sIdx + 1}`
                    sem.courses.forEach((course: any, cIdx: number) => {
                        const isPlaceholder = course.code.includes("XX") || course.code.includes("XXX") || (course.title || "").toLowerCase().includes("elective")
                        const key = `${semName}_${course.code}_cIdx` // wait, key in dashboard has index: `${semName}_${course.code}_${cIdx}`
                        // Let's make sure the key format is identical: `${semName}_${course.code}_${cIdx}`
                        const keyFormat = `${semName}_${course.code}_${cIdx}`
                        const selectedCode = selectedElectives[keyFormat]
                        
                        let resolvedCode = course.code
                        if (isPlaceholder && selectedCode) {
                            resolvedCode = selectedCode
                        }
                        
                        const cleanResolved = resolvedCode.replace(/\s+/g, "").toUpperCase()
                        if (!completedSet.has(cleanResolved) && !inProgressSet.has(cleanResolved)) {
                            remaining.add(cleanResolved)
                            if (!addedOptions.has(cleanResolved) && !cleanResolved.includes("XX") && !cleanResolved.includes("XXX")) {
                                addedOptions.add(cleanResolved)
                                remainingOptions.push({
                                    code: resolvedCode,
                                    title: course.title || resolvedCode
                                })
                            }
                        }
                    })
                })
            }
            return { remaining, remainingOptions }
        }

        const remainingData = calculateRemaining(planData, transcript)
        setRemainingCourses(remainingData.remaining)
        setRemainingCourseOptions(remainingData.remainingOptions)

        const handleStorageChange = () => {
            setSavedSchedules(readStoredSchedules())
            setPickedSectionsCount(readPickedSections().length)
            setUser(authService.getCurrentUser())
            
            const p = readStoredPlan<any>()
            setPlan(p)
            const t = readStoredTranscript<any>()
            setHasPlanAndTranscript(!!(p && t))
            const nextRemainingData = calculateRemaining(p, t)
            setRemainingCourses(nextRemainingData.remaining)
            setRemainingCourseOptions(nextRemainingData.remainingOptions)
            setSelectedRemainingCodes(prev => {
                const next = new Set<string>()
                prev.forEach(code => {
                    if (nextRemainingData.remaining.has(code)) next.add(code)
                })
                return next
            })
        }
        window.addEventListener("storage", handleStorageChange)
        return () => window.removeEventListener("storage", handleStorageChange)
    }, [])

    const handleRemoveSection = (scheduleId: string, courseCode: string) => {
        removeSectionFromSchedule(scheduleId, courseCode)
        setSavedSchedules(readStoredSchedules())
        setNotification({
            message: `Removed ${courseCode} from ${savedSchedules[scheduleId]?.name || "schedule"}.`,
            type: "success"
        })
        setTimeout(() => {
            setNotification(null)
        }, 4000)
    }

    const getSchedulesWithSection = (courseCode: string, sectionNum: string) => {
        const matchingSchedules: string[] = []
        const cleanCode = (c: string) => c.replace(/\s+/g, "").toUpperCase()
        const targetCode = cleanCode(courseCode)
        
        Object.entries(savedSchedules).forEach(([id, schedule]) => {
            const hasSection = schedule.sections?.some(
                (s: any) => cleanCode(s.courseCode) === targetCode && s.section === sectionNum
            )
            if (hasSection) {
                matchingSchedules.push(schedule.name)
            }
        })
        return matchingSchedules
    }

    const getSchedulesWithCourse = (courseCode: string) => {
        const matchingSchedules: string[] = []
        const cleanCode = (c: string) => c.replace(/\s+/g, "").toUpperCase()
        const targetCode = cleanCode(courseCode)
        
        Object.entries(savedSchedules).forEach(([id, schedule]) => {
            const hasCourse = schedule.sections?.some(
                (s: any) => cleanCode(s.courseCode) === targetCode
            )
            if (hasCourse) {
                matchingSchedules.push(schedule.name)
            }
        })
        return matchingSchedules
    }

    const handleAddSection = (scheduleId: string, scheduleName: string, section: any, courseCode: string, courseTitle: string) => {
        const termLimit = sem === "3" ? SUMMER_TERM_LIMIT : NORMAL_TERM_LIMIT
        const schedulesBeforeAdd = readStoredSchedules()
        const scheduleBeforeAdd = schedulesBeforeAdd[scheduleId]
        const cleanCode = (c: string) => c.replace(/\s+/g, "").toUpperCase()
        const isReplacingExistingCourse = scheduleBeforeAdd?.sections?.some((existing: any) => cleanCode(existing.courseCode) === cleanCode(courseCode))
        const nextCourseCount = (scheduleBeforeAdd?.sections?.length || 0) + (isReplacingExistingCourse ? 0 : 1)
        const nextCredits = nextCourseCount * 3

        if (nextCourseCount > termLimit.maxCourses || nextCredits > termLimit.maxCredits) {
            setNotification({
                message: `${sem === "3" ? "Summer" : "Normal"} semester limit is ${termLimit.maxCourses} courses / ${termLimit.maxCredits} credits.`,
                type: "error"
            })
            setTimeout(() => setNotification(null), 5000)
            return
        }

        const scheduledSec = {
            courseCode,
            courseTitle,
            section: section.section,
            instructor: section.instructor,
            days: section.days,
            time: section.time,
            examDate: section.examDate,
            examRoom: section.examRoom,
            location: section.location,
            classType: section.classType
        }

        const schedules = schedulesBeforeAdd
        const schedule = schedules[scheduleId]
        const clashes: string[] = []

        if (schedule) {
            const cleanTarget = cleanCode(courseCode)

            for (const existing of schedule.sections) {
                // Skip if it's the same course (which will be replaced)
                if (cleanCode(existing.courseCode) === cleanTarget) {
                    continue
                }
                if (checkTimeClash(scheduledSec, existing)) {
                    clashes.push(`Time overlap with ${existing.courseCode} (Sec ${existing.section})`)
                }
                if (checkExamClash(scheduledSec, existing)) {
                    clashes.push(`Exam clash with ${existing.courseCode} (Sec ${existing.section})`)
                }
            }
        }

        addSectionToSchedule(scheduleId, scheduledSec)
        setSavedSchedules(readStoredSchedules())

        if (clashes.length > 0) {
            setNotification({
                message: `Added ${courseCode} section ${section.section} to ${scheduleName}, but warning:\n• ${clashes.join("\n• ")}`,
                type: "warning"
            })
        } else {
            setNotification({
                message: `Successfully added ${courseCode} section ${section.section} to ${scheduleName}!`,
                type: "success"
            })
        }

        setTimeout(() => {
            setNotification(prev => prev && prev.message.includes(section.section) && prev.message.includes(courseCode) ? null : prev)
        }, 6000)
    }

    const handleAddToPicker = (section: any, courseCode: string, courseTitle: string) => {
        const result = addPickedSection({
            courseCode,
            courseTitle,
            section: section.section,
            instructor: section.instructor,
            days: section.days,
            time: section.time,
            examDate: section.examDate,
            examRoom: section.examRoom,
            location: section.location,
            classType: section.classType,
            year,
            semester: sem,
            credits: 3
        })

        setPickedSectionsCount(readPickedSections().length)
        setNotification({
            message: result.added
                ? `Added ${courseCode} section ${section.section} to the schedule picker.`
                : `${courseCode} section ${section.section} is already in the picker.`,
            type: result.added ? "success" : "warning"
        })
        setTimeout(() => {
            setNotification(null)
        }, 4000)
    }

    // Check website availability on mount
    useEffect(() => {
        const checkAvailability = async () => {
            setCheckingAvailability(true)
            const result = await checkWebsiteAvailability()
            setWebsiteAvailable(result.available)
            if (!result.available && result.message) {
                setAvailabilityMessage(result.message)
            }
            setCheckingAvailability(false)
        }
        checkAvailability()
    }, [])

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
            setError(err instanceof Error ? err.message : "Failed to fetch departments")
        }
    }

    const toggleRemainingSearchCode = (courseCode: string) => {
        const clean = courseCode.replace(/\s+/g, "").toUpperCase()
        setSelectedRemainingCodes(prev => {
            const next = new Set(prev)
            if (next.has(clean)) {
                next.delete(clean)
            } else {
                next.add(clean)
            }
            return next
        })
    }

    const setAllRemainingSearchCodes = (selected: boolean) => {
        setSelectedRemainingCodes(selected
            ? new Set(remainingCourseOptions.map(course => course.code.replace(/\s+/g, "").toUpperCase()))
            : new Set()
        )
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
        setHideFull(false)
        setSortBy("level-asc")

        try {
            let results: Course[] = []

            if (selectedRemainingCodes.size > 0) {
                const selectedCodes = Array.from(selectedRemainingCodes)
                const searches = selectedCodes.map(async (courseCode) => {
                    const formData = new FormData()
                    formData.append("year", year)
                    formData.append("sem", sem)
                    formData.append("type", "CC")
                    formData.append("code", courseCode)
                    return searchCourses(formData)
                })
                const groupedResults = await Promise.all(searches)
                const seen = new Set<string>()
                results = groupedResults.flat().filter(course => {
                    const clean = course.code.replace(/\s+/g, "").toUpperCase()
                    if (seen.has(clean)) return false
                    seen.add(clean)
                    return true
                })
            } else {
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

                results = await searchCourses(formData)
            }

            setCourses(results)
            if (results.length === 0) {
                setError("No courses found matching your criteria.")
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred while searching. Please try again.")
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
        .map(course => {
            const parsed = parseCourseCode(course.code)

            // If hiding full courses, filter out sections with 0 seats
            let sections = course.sections
            if (hideFull) {
                sections = sections.filter(s => (parseInt(s.availableSeats) || 0) > 0)
            }

            return {
                ...course,
                parsed,
                sections
            }
        })
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

            // Hide Full Filter (Hide if no sections left)
            if (hideFull && course.sections.length === 0) return false

            // Show Remaining Only Filter
            if (showRemainingOnly) {
                const cleanC = course.code.replace(/\s+/g, "").toUpperCase()
                if (!remainingCourses.has(cleanC)) return false
            }

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
    const getElectiveLabel = (courseCode: string) => {
        if (!plan || !plan.electives) return null
        const cleanCode = courseCode.toUpperCase().replace(/\s+/g, "")
        const matched = plan.electives.find((e: any) => e.code.toUpperCase().replace(/\s+/g, "") === cleanCode)
        if (matched && matched.electiveListType) {
            let label = matched.electiveListType
            if (label.includes("List 1:")) label = "IS Concentration Elective (List 1)"
            if (label.includes("List 2:")) label = "General Major Elective (List 2)"
            if (label.includes("List 3:")) label = "Business Elective (List 3)"
            if (label.includes("General Studies")) label = "General Studies Elective"
            return label
        }
        return null
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Website Availability Check */}
                {checkingAvailability && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-12">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Checking UOB Website Availability</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Please wait while we connect to the course system...</p>
                        </div>
                    </div>
                )}

                {/* Website Unavailable Message */}
                {!checkingAvailability && !websiteAvailable && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-red-200 dark:border-red-900 p-8">
                        <div className="flex flex-col items-center justify-center space-y-4 text-center">
                            <div className="p-4 rounded-full bg-red-50 dark:bg-red-900/20">
                                <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Website Unavailable</h3>
                            <p className="text-red-600 dark:text-red-400 max-w-md">{availabilityMessage}</p>
                            <Button 
                                onClick={() => window.location.reload()} 
                                variant="outline"
                                className="mt-4"
                            >
                                Try Again
                            </Button>
                        </div>
                    </div>
                )}

                {/* Main Content - Only show if website is available */}
                {!checkingAvailability && websiteAvailable && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left Column: Search & Results */}
                        <div className="lg:col-span-8 space-y-8">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Course Catalog</h1>
                                <p className="text-slate-500 dark:text-slate-400">Search for courses, sections, and build yourschedules</p>
                            </div>

                            {/* Settings Popover */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <Settings2 className="w-4 h-4" />
                                        <span className="hidden sm:inline">Filter</span>
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

                                {user && hasPlanAndTranscript && remainingCourseOptions.length > 0 && (
                                    <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/10">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <Label className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                                    Search remaining courses together
                                                </Label>
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                    Select remaining plan courses, then search them in one combined result.
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    onClick={() => setAllRemainingSearchCodes(true)}
                                                >
                                                    Select all
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    onClick={() => setAllRemainingSearchCodes(false)}
                                                    disabled={selectedRemainingCodes.size === 0}
                                                >
                                                    Clear
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="mt-3 max-h-44 overflow-y-auto rounded-lg border border-emerald-100 bg-white dark:border-emerald-900/50 dark:bg-slate-950/40">
                                            {remainingCourseOptions.map((course) => {
                                                const clean = course.code.replace(/\s+/g, "").toUpperCase()
                                                const checked = selectedRemainingCodes.has(clean)
                                                return (
                                                    <button
                                                        key={clean}
                                                        type="button"
                                                        onClick={() => toggleRemainingSearchCode(clean)}
                                                        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/20 ${checked ? "bg-emerald-50/80 dark:bg-emerald-950/30" : ""}`}
                                                    >
                                                        <span className="min-w-0">
                                                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{course.code}</span>
                                                            <span className="ml-2 text-slate-500 dark:text-slate-400">{course.title}</span>
                                                        </span>
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => {}}
                                                            className="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                                                        />
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        {selectedRemainingCodes.size > 0 && (
                                            <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                                {selectedRemainingCodes.size} remaining course{selectedRemainingCodes.size === 1 ? "" : "s"} selected. Search will use these course codes.
                                            </p>
                                        )}
                                    </div>
                                )}

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
                                                {selectedRemainingCodes.size > 0 ? `Search ${selectedRemainingCodes.size} Courses` : "Search Courses"}
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

                                            {/* Hide Full Toggle */}
                                            <div className="flex items-center space-x-2 pt-2">
                                                <input
                                                    type="checkbox"
                                                    id="hideFull"
                                                    checked={hideFull}
                                                    onChange={(e) => setHideFull(e.target.checked)}
                                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-800"
                                                />
                                                <Label htmlFor="hideFull" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-600 dark:text-slate-300">
                                                    Hide 0 seats courses
                                                </Label>
                                            </div>

                                            {/* Remaining Courses Filter */}
                                            {user && hasPlanAndTranscript ? (
                                                <div className="flex items-center space-x-2 pt-2">
                                                    <input
                                                        type="checkbox"
                                                        id="showRemainingOnly"
                                                        checked={showRemainingOnly}
                                                        onChange={(e) => setShowRemainingOnly(e.target.checked)}
                                                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-800"
                                                    />
                                                    <Label htmlFor="showRemainingOnly" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                                        <span>Show remaining courses only</span>
                                                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 rounded-full font-bold">Plan Active</span>
                                                    </Label>
                                                </div>
                                            ) : (
                                                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
                                                    <span className="text-sm">💡</span>
                                                    <span>
                                                        Upload your Study Plan & Transcript in the{" "}
                                                        <Link href="/dashboard" className="text-emerald-600 dark:text-emerald-400 font-semibold underline hover:text-emerald-700">
                                                            Dashboard
                                                        </Link>{" "}
                                                        to filter out completed/in-progress courses automatically.
                                                    </span>
                                                </div>
                                            )}

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
                                                            {(() => {
                                                                const label = getElectiveLabel(course.code)
                                                                if (!label) return null
                                                                return (
                                                                    <Badge variant="outline" className="text-[10px] font-semibold border-emerald-350 text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 py-0.5 px-2 rounded-full">
                                                                        {label}
                                                                    </Badge>
                                                                )
                                                            })()}
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
                                                        const activeSchedulesWithThisSec = getSchedulesWithSection(course.code, section.section);
                                                        const activeSchedulesWithOtherSec = getSchedulesWithCourse(course.code).filter(
                                                            (schName: string) => !activeSchedulesWithThisSec.includes(schName)
                                                        );
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
                                                            {activeSchedulesWithThisSec.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-1.5 justify-end md:justify-start">
                                                                    {activeSchedulesWithThisSec.map(name => (
                                                                        <span key={name} className="inline-flex items-center gap-1 rounded bg-emerald-100 dark:bg-emerald-950/50 text-[10px] font-bold text-emerald-800 dark:text-emerald-400 px-1.5 py-0.5 border border-emerald-200 dark:border-emerald-800/40">
                                                                            <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                                            {name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {activeSchedulesWithOtherSec.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-1.5 justify-end md:justify-start">
                                                                    {activeSchedulesWithOtherSec.map(name => (
                                                                        <span key={name} className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1.5 py-0.5 border border-slate-200 dark:border-slate-800/40">
                                                                            Other Sec in {name}
                                                                        </span>
                                                                    ))}
                                                                </div>
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
                                                                    style={{ width: isOpen ? '60%' : '105%' }} // Static width for visual flair
                                                                />
                                                            </div>
                                                            <div className={`text-xs font-bold whitespace-nowrap ${getSeatColor(section.availableSeats, section.status)}`}>
                                                                {section.availableSeats} Seats
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap justify-end gap-2 pt-1">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 px-2 text-xs gap-1 border-blue-600/30 text-blue-600 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-950/20"
                                                                onClick={() => handleAddToPicker(section, course.code, course.title)}
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                                <span>Add to Picker</span>
                                                            </Button>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs gap-1 border-emerald-600/30 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-950/20">
                                                                        <Plus className="w-3.5 h-3.5" />
                                                                        <span>Add to Schedule</span>
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-48 p-2" align="end">
                                                                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 py-1 border-b mb-1">
                                                                        Choose Schedule
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleAddSection("schedule-1", "Schedule 1", section, course.code, course.title)}
                                                                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                                                                    >
                                                                        Schedule 1
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleAddSection("schedule-2", "Schedule 2", section, course.code, course.title)}
                                                                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                                                                    >
                                                                        Schedule 2
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleAddSection("schedule-3", "Schedule 3", section, course.code, course.title)}
                                                                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                                                                    >
                                                                        Schedule 3
                                                                    </button>
                                                                </PopoverContent>
                                                            </Popover>
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
                            </div> {/* End of left column */}

                            {/* Right Column: My Schedule Sidebar */}
                            <div className="lg:col-span-4 space-y-6">
                                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 sticky top-20">
                                    <CardHeader className="pb-3 border-b">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                                <Calendar className="w-5 h-5 text-emerald-600" />
                                                My Schedule Selection
                                            </CardTitle>
                                        </div>
                                        {/* Schedule ID Selector Buttons */}
                                        <div className="flex gap-1.5 mt-3 pt-2">
                                            {Object.values(savedSchedules).map((sch: any) => (
                                                <button
                                                    key={sch.id}
                                                    type="button"
                                                    onClick={() => setActiveScheduleId(sch.id)}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                                        activeScheduleId === sch.id
                                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                                            : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                                    }`}
                                                >
                                                    {sch.name.split(" ")[1] || sch.name} ({sch.sections?.length || 0})
                                                </button>
                                            ))}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {!savedSchedules[activeScheduleId]?.sections || savedSchedules[activeScheduleId].sections.length === 0 ? (
                                            <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
                                                <div className="inline-flex p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                                                    <Calendar className="w-6 h-6" />
                                                </div>
                                                <h4 className="text-sm font-semibold">Schedule is empty</h4>
                                                <p className="text-xs max-w-[200px] mx-auto text-slate-400">
                                                    Select a course section on the left and add it to your schedule.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto scrollbar-thin">
                                                {savedSchedules[activeScheduleId].sections.map((sec: any) => (
                                                    <div key={sec.courseCode} className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-extrabold text-xs text-slate-900 dark:text-white leading-none">
                                                                    {sec.courseCode}
                                                                </span>
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
                                                                    Sec {sec.section}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight max-w-[200px] truncate mt-1">
                                                                {sec.courseTitle}
                                                            </p>
                                                            <div className="pt-2 text-[10px] space-y-1 text-slate-500 dark:text-slate-400 font-medium">
                                                                <div className="flex items-center gap-1">
                                                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                    <span>{sec.days} ({sec.time})</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                    <span className="truncate">{sec.location || "TBA"}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleRemoveSection(activeScheduleId, sec.courseCode)}
                                                            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 shrink-0"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50">
                                        <Link href="/scheduler" className="w-full">
                                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 gap-1.5">
                                                <span>Open Week Timeline{pickedSectionsCount > 0 ? ` (${pickedSectionsCount} picked)` : ""}</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Button>
                                        </Link>
                                    </CardFooter>
                                </Card>
                            </div> {/* End of right column */}
                        </div>
                    )}

                    </div>
                    
                    {/* Floating Toast Notification */}
                    {notification && (
                        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border shadow-lg max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-300 flex items-start gap-3 ${
                            notification.type === "success" 
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-200" 
                                : notification.type === "warning"
                                ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/90 dark:border-amber-800 dark:text-amber-200"
                                : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/90 dark:border-red-800 dark:text-red-200"
                        }`}>
                            <div className="mt-0.5">
                                {notification.type === "success" ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                ) : notification.type === "warning" ? (
                                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold">{notification.type === "success" ? "Success" : notification.type === "warning" ? "Schedule Warning" : "Error"}</p>
                                <p className="text-xs mt-0.5 leading-relaxed whitespace-pre-line">{notification.message}</p>
                            </div>
                            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold px-1.5 py-0.5 rounded">
                                ×
                            </button>
                        </div>
                    )}
                </div>
            )
        }
