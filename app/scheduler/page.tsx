"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { 
    Calendar, 
    Clock, 
    MapPin, 
    Users, 
    CheckCircle2, 
    AlertTriangle, 
    Trash2, 
    Plus, 
    Loader2, 
    Sparkles, 
    BookOpen, 
    ArrowRight, 
    Search,
    AlertCircle,
    Info,
    CalendarCheck,
    BookmarkCheck
} from "lucide-react"

import { 
    readStoredSchedules, 
    writeStoredSchedules, 
    readStoredPlan, 
    readStoredTranscript,
    addSectionToSchedule,
    removeSectionFromSchedule,
    clearSchedule,
    addStoredSchedule,
    deleteStoredSchedule,
    SavedSchedule,
    ScheduledSection,
    PickedSection,
    readPickedSections,
    removePickedSection,
    clearPickedSections
} from "@/lib/storage"
import { FALLBACK_ELECTIVES } from "@/lib/fallback-electives"

import { 
    generateScheduleOptions, 
    checkTimeClash, 
    checkExamClash, 
    parseSectionSchedule,
    GeneratedScheduleOption,
    GenerationPreferences
} from "@/lib/schedule-utils"

import { searchCourses, Course } from "@/app/actions/uob-proxy"

const ELECTIVE_LISTS = {
    concentration: "List 1: ITIS Concentration Major Elective",
    generalMajor: "List 2: ITIS General Major Elective",
    business: "List 3: Business Elective Courses",
    generalStudies: "General Studies Elective Courses List"
} as const

const NORMAL_TERM_LIMIT = { maxCourses: 6, maxCredits: 18 }
const SUMMER_TERM_LIMIT = { maxCourses: 3, maxCredits: 9 }

// Color palette for courses on the calendar
const COURSE_COLORS = [
    { bg: "bg-blue-100 dark:bg-blue-950/40", text: "text-blue-800 dark:text-blue-300", border: "border-blue-200 dark:border-blue-900/60 font-semibold" },
    { bg: "bg-emerald-100 dark:bg-emerald-950/40", text: "text-emerald-800 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-900/60 font-semibold" },
    { bg: "bg-violet-100 dark:bg-violet-950/40", text: "text-violet-800 dark:text-violet-300", border: "border-violet-200 dark:border-violet-900/60 font-semibold" },
    { bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-800 dark:text-amber-300", border: "border-amber-200 dark:border-amber-900/60 font-semibold" },
    { bg: "bg-rose-100 dark:bg-rose-950/40", text: "text-rose-800 dark:text-rose-300", border: "border-rose-200 dark:border-rose-900/60 font-semibold" },
    { bg: "bg-cyan-100 dark:bg-cyan-950/40", text: "text-cyan-800 dark:text-cyan-300", border: "border-cyan-200 dark:border-cyan-900/60 font-semibold" },
    { bg: "bg-indigo-100 dark:bg-indigo-950/40", text: "text-indigo-800 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-900/60 font-semibold" },
    { bg: "bg-pink-100 dark:bg-pink-950/40", text: "text-pink-800 dark:text-pink-300", border: "border-pink-200 dark:border-pink-900/60 font-semibold" }
]

export default function SchedulerPage() {
    const searchParams = useSearchParams()
    // Page Tab: "generator" or "saved"
    const [activeTab, setActiveTab] = useState<"generator" | "picker" | "saved">("generator")
    
    // Remaining courses from study plan
    const [remainingCourses, setRemainingCourses] = useState<{ code: string; title: string; credits: number }[]>([])
    
    // User selected courses for schedule generation
    const [selectedCourses, setSelectedCourses] = useState<string[]>([])
    const [manualCourseInput, setManualCourseInput] = useState("")
    
    // Generation Preferences
    const [preferences, setPreferences] = useState<GenerationPreferences>({
        days: "ANY",
        time: "ANY",
        excludeClosed: false,
        avoidExamClashes: true
    })
    
    // Saved Schedules from local storage
    const [savedSchedules, setSavedSchedules] = useState<Record<string, SavedSchedule>>({})
    const [activeScheduleId, setActiveScheduleId] = useState("schedule-1")
    const [pickedSections, setPickedSections] = useState<PickedSection[]>([])
    
    // Generation States
    const [isGenerating, setIsGenerating] = useState(false)
    const [generationError, setGenerationError] = useState("")
    const [generatedOptions, setGeneratedOptions] = useState<GeneratedScheduleOption[]>([])
    const [previewOption, setPreviewOption] = useState<GeneratedScheduleOption | null>(null)
    
    // Notification Banner
    const [notification, setNotification] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null)
    const [plan, setPlan] = useState<any>(null)

    const cleanCourseCode = (code?: string | null) => (code || "").replace(/\s+/g, "").toUpperCase()

    const getTermLimit = (semester?: string) => semester === "3" ? SUMMER_TERM_LIMIT : NORMAL_TERM_LIMIT

    const normalizeElectiveListName = (listName?: string) => {
        const clean = (listName || "").toLowerCase().replace(/\s+/g, " ").trim()
        if (clean.includes("list1") || clean.includes("list 1") || clean.includes("concentration")) return ELECTIVE_LISTS.concentration
        if (clean.includes("list2") || clean.includes("list 2") || clean.includes("general major")) return ELECTIVE_LISTS.generalMajor
        if (clean.includes("list3") || clean.includes("list 3") || clean.includes("business elective")) return ELECTIVE_LISTS.business
        if (clean.includes("general studies") || clean.includes("humanities") || clean.includes("social science")) return ELECTIVE_LISTS.generalStudies
        return listName || ""
    }

    const isElectivePlaceholder = (course: any) => {
        const code = course?.code || ""
        const title = (course?.title || "").toLowerCase()
        return code.includes("XX") || code.includes("XXX") || title.includes("elective") || course?.type === "GSE"
    }

    const getElectiveListNameForCourse = (course: any) => {
        const codeClean = cleanCourseCode(course?.code)
        const titleClean = (course?.title || "").toLowerCase()
        const typeClean = (course?.type || "").toUpperCase()

        if (titleClean.includes("concentration")) return ELECTIVE_LISTS.concentration
        if (titleClean.includes("general major elective")) return ELECTIVE_LISTS.generalMajor
        if (titleClean.includes("business elective") || codeClean.startsWith("BUS")) return ELECTIVE_LISTS.business
        if (typeClean === "GSE" || codeClean.startsWith("GSE") || titleClean.includes("humanities") || titleClean.includes("social")) return ELECTIVE_LISTS.generalStudies
        return ""
    }

    const getAllElectives = (planData: any) => {
        const parsedElectives = Array.isArray(planData?.electives) ? planData.electives : []
        const merged = [...FALLBACK_ELECTIVES, ...parsedElectives]
        const seen = new Set<string>()

        return merged
            .filter((elective: any) => elective?.code && elective?.title)
            .map((elective: any) => ({
                ...elective,
                electiveListType: normalizeElectiveListName(elective.electiveListType)
            }))
            .filter((elective: any) => {
                const key = cleanCourseCode(elective.code)
                if (seen.has(key)) return false
                seen.add(key)
                return true
            })
    }

    const resolveSelectedElective = (
        course: any,
        key: string,
        selectedElectives: Record<string, string>,
        electivesList: any[],
        usedSelectedCodes: Set<string>
    ) => {
        const exactCode = selectedElectives[key]
        if (exactCode && !usedSelectedCodes.has(cleanCourseCode(exactCode))) return exactCode

        const targetList = getElectiveListNameForCourse(course)
        if (!targetList) return null

        for (const selectedCode of Object.values(selectedElectives)) {
            const selectedClean = cleanCourseCode(selectedCode)
            if (usedSelectedCodes.has(selectedClean)) continue

            const elective = electivesList.find((e: any) => cleanCourseCode(e.code) === selectedClean)
            if (elective && normalizeElectiveListName(elective.electiveListType) === targetList) {
                return selectedCode
            }
        }

        return null
    }

    // Load initial data
    useEffect(() => {
        const loadAll = () => {
            const storedSchedules = readStoredSchedules()
            const planData = readStoredPlan<any>()
            setPlan(planData)
            setPickedSections(readPickedSections())
            const transcript = readStoredTranscript<any>()
            
            const completedSet = new Set<string>()
            const inProgressSet = new Set<string>()
            
            if (transcript && transcript.semesters) {
                for (const sem of transcript.semesters) {
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
            
            const rem: { code: string; title: string; credits: number }[] = []
            if (planData && planData.semesters) {
                let selectedElectives: Record<string, string> = {}
                try {
                    const stored = localStorage.getItem("selectedElectives")
                    if (stored) {
                        selectedElectives = JSON.parse(stored)
                    }
                } catch (e) {
                    console.error(e)
                }
                
                const electivesList = getAllElectives(planData)
                const usedSelectedCodes = new Set<string>()
                const addedRemainingCodes = new Set<string>()

                planData.semesters.forEach((sem: any, sIdx: number) => {
                    if (!sem || !sem.courses) return
                    const semName = sem.semesterName || `Semester ${sIdx + 1}`
                    sem.courses.forEach((course: any, cIdx: number) => {
                        const isPlaceholder = isElectivePlaceholder(course)
                        const key = `${semName}_${course.code}_${cIdx}`
                        const selectedCode = isPlaceholder
                            ? resolveSelectedElective(course, key, selectedElectives, electivesList, usedSelectedCodes)
                            : null
                        
                        let resolvedCode = course.code
                        let resolvedTitle = course.title
                        
                        if (isPlaceholder && selectedCode) {
                            resolvedCode = selectedCode
                            const selectedClean = cleanCourseCode(selectedCode)
                            usedSelectedCodes.add(selectedClean)
                            const elec = electivesList.find((e: any) => cleanCourseCode(e.code) === selectedClean)
                            resolvedTitle = elec ? elec.title : course.title
                        } else if (isPlaceholder) {
                            return
                        }
                        
                        const cleanResolved = cleanCourseCode(resolvedCode)
                        const isSeniorProject = cleanResolved === "ITIS499" || cleanResolved === "IS499" || (resolvedTitle || "").toLowerCase().includes("senior project")
                        const shouldShowRemaining = !completedSet.has(cleanResolved) && (!inProgressSet.has(cleanResolved) || isSeniorProject)

                        if (shouldShowRemaining && !addedRemainingCodes.has(cleanResolved)) {
                            addedRemainingCodes.add(cleanResolved)
                            rem.push({
                                code: resolvedCode,
                                title: resolvedTitle,
                                credits: course.credits || 3
                            })
                        }
                    })
                })
            }
            
            setRemainingCourses(rem)
            setSavedSchedules(storedSchedules)
            if (!storedSchedules[activeScheduleId]) {
                setActiveScheduleId(Object.keys(storedSchedules)[0])
            }
        }

        loadAll()

        window.addEventListener("storage", loadAll)
        return () => window.removeEventListener("storage", loadAll)
    }, [])

    useEffect(() => {
        const tab = searchParams.get("tab")
        const schedule = searchParams.get("schedule")
        if (tab === "saved" || tab === "picker" || tab === "generator") {
            setActiveTab(tab)
        }
        if (schedule) {
            setActiveScheduleId(schedule)
        }
    }, [searchParams])

    const showNotification = (message: string, type: "success" | "warning" | "error") => {
        setNotification({ message, type })
        setTimeout(() => {
            setNotification(prev => prev?.message === message ? null : prev)
        }, 5000)
    }

    // Manual Course Add Handler
    const handleAddManualCourse = () => {
        const clean = manualCourseInput.trim().toUpperCase()
        if (!clean) return
        const limit = NORMAL_TERM_LIMIT
        
        if (selectedCourses.includes(clean)) {
            showNotification(`${clean} is already selected.`, "error")
            return
        }

        if (selectedCourses.length >= limit.maxCourses || (selectedCourses.length + 1) * 3 > limit.maxCredits) {
            showNotification(`Normal semester limit is ${limit.maxCourses} courses / ${limit.maxCredits} credits.`, "warning")
            return
        }
        
        setSelectedCourses(prev => [...prev, clean])
        setManualCourseInput("")
    }

    // Toggle selected courses
    const handleToggleCourse = (courseCode: string) => {
        const clean = courseCode.replace(/\s+/g, "").toUpperCase()
        setSelectedCourses(prev => {
            if (prev.includes(clean)) {
                return prev.filter(c => c !== clean)
            } else {
                const limit = NORMAL_TERM_LIMIT
                if (prev.length >= limit.maxCourses || (prev.length + 1) * 3 > limit.maxCredits) {
                    showNotification(`Normal semester limit is ${limit.maxCourses} courses / ${limit.maxCredits} credits.`, "warning")
                    return prev
                }
                return [...prev, clean]
            }
        })
    }

    // Generate Schedules Handler
    const handleGenerate = async () => {
        if (selectedCourses.length === 0) {
            setGenerationError("Please select or add at least one course to schedule.")
            return
        }
        
        setIsGenerating(true)
        setGenerationError("")
        setGeneratedOptions([])
        setPreviewOption(null)
        
        try {
            // Fetch live sections for each selected course in parallel
            const fetchPromises = selectedCourses.map(async (code) => {
                const formData = new FormData()
                formData.append("type", "CC")
                formData.append("code", code)
                formData.append("year", "2025") // Default Next Sem Year
                formData.append("sem", "2") // Default Next Sem
                
                try {
                    const results = await searchCourses(formData)
                    return { code, results }
                } catch (err) {
                    console.error(`Error fetching sections for ${code}:`, err)
                    return { code, results: [], error: true }
                }
            })
            
            const fetchResults = await Promise.all(fetchPromises)
            
            // Format course inputs for generator
            const courseInputs = fetchResults.map(res => {
                // Find course title from results, or use code
                const title = res.results?.[0]?.title || `Course ${res.code}`
                
                // Extract and format sections
                const sections = (res.results?.[0]?.sections || []).map((sec: any) => ({
                    section: sec.section,
                    instructor: sec.instructor || "TBA",
                    days: sec.days || "TBA",
                    time: sec.time || "TBA",
                    examDate: sec.examDate || "TBA",
                    examTime: sec.examTime || "",
                    examRoom: sec.examRoom || "TBA",
                    location: sec.location || "TBA",
                    availableSeats: sec.availableSeats || "0",
                    status: sec.status || "Unknown",
                    classType: sec.classType
                }))
                
                return {
                    code: res.code,
                    title,
                    credits: 3, // Default to 3, but can look up in plan later
                    sections
                }
            })
            
            // Check if any selected course returned zero sections
            const emptyCourses = courseInputs.filter(c => c.sections.length === 0)
            if (emptyCourses.length > 0) {
                const emptyCodes = emptyCourses.map(c => c.code).join(", ")
                setGenerationError(`No sections found for: ${emptyCodes}. The course might not be offered next semester or doesn't exist.`)
                setIsGenerating(false)
                return
            }
            
            // Generate combos
            const options = generateScheduleOptions(courseInputs, preferences)
            
            if (options.length === 0) {
                setGenerationError("No clash-free schedules could be built with the selected courses and preferences. Try allowing final exam clashes or unchecking 'Exclude Closed Sections'.")
            } else {
                setGeneratedOptions(options)
                showNotification(`Generated ${options.length} clash-free schedule options successfully!`, "success")
            }
            
        } catch (err) {
            setGenerationError(err instanceof Error ? err.message : "Failed to search and generate schedules. Please try again.")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleRemovePicked = (section: PickedSection) => {
        removePickedSection(section.courseCode, section.section, section.time)
        setPickedSections(readPickedSections())
        showNotification(`Removed ${section.courseCode} section ${section.section} from picker.`, "success")
    }

    const handleClearPicker = () => {
        clearPickedSections()
        setPickedSections([])
        showNotification("Picker cleared.", "success")
    }

    const handleAddPickedToSchedule = (section: PickedSection, targetId: string) => {
        const schedules = readStoredSchedules()
        const schedule = schedules[targetId]
        if (!schedule) return

        const limit = getTermLimit(section.semester)
        const targetCode = cleanCourseCode(section.courseCode)
        const replacing = schedule.sections.some(existing => cleanCourseCode(existing.courseCode) === targetCode)
        const nextCourseCount = schedule.sections.length + (replacing ? 0 : 1)
        const nextCredits = nextCourseCount * 3

        if (nextCourseCount > limit.maxCourses || nextCredits > limit.maxCredits) {
            showNotification(`Cannot add ${section.courseCode}: ${section.semester === "3" ? "summer" : "normal"} semester limit is ${limit.maxCourses} courses / ${limit.maxCredits} credits.`, "error")
            return
        }

        const result = addSectionToSchedule(targetId, section)
        setSavedSchedules(readStoredSchedules())
        showNotification(`${result.replaced ? "Replaced" : "Added"} ${section.courseCode} section ${section.section} in ${schedule.name}.`, "success")
    }

    // Save Option to Schedule ID
    const handleSaveOption = (option: GeneratedScheduleOption, targetId: string) => {
        const limit = NORMAL_TERM_LIMIT
        if (option.sections.length > limit.maxCourses || option.details.totalCredits > limit.maxCredits) {
            showNotification(`Cannot save: normal semester limit is ${limit.maxCourses} courses / ${limit.maxCredits} credits.`, "error")
            return
        }

        const schedules = readStoredSchedules()
        const schedule = schedules[targetId]
        if (!schedule) return
        
        schedule.sections = [...option.sections]
        schedules[targetId] = schedule
        writeStoredSchedules(schedules)
        setSavedSchedules(schedules)
        
        showNotification(`Saved to ${schedule.name}!`, "success")
    }

    // Remove Section manually
    const handleRemoveSection = (scheduleId: string, courseCode: string) => {
        removeSectionFromSchedule(scheduleId, courseCode)
        setSavedSchedules(readStoredSchedules())
        showNotification(`Removed ${courseCode} from schedule.`, "success")
    }

    // Clear Schedule
    const handleClearSchedule = (scheduleId: string) => {
        if (confirm("Are you sure you want to clear this schedule?")) {
            clearSchedule(scheduleId)
            setSavedSchedules(readStoredSchedules())
            showNotification("Schedule cleared.", "success")
        }
    }

    const handleAddSchedule = () => {
        const schedule = addStoredSchedule()
        setSavedSchedules(readStoredSchedules())
        setActiveScheduleId(schedule.id)
        setActiveTab("saved")
        showNotification(`Created ${schedule.name}.`, "success")
    }

    const handleDeleteSchedule = (scheduleId: string) => {
        if (Object.keys(savedSchedules).length <= 1) {
            showNotification("At least one schedule must remain.", "error")
            return
        }
        if (!confirm("Delete this schedule?")) return

        const deleted = deleteStoredSchedule(scheduleId)
        const nextSchedules = readStoredSchedules()
        setSavedSchedules(nextSchedules)
        if (deleted && activeScheduleId === scheduleId) {
            setActiveScheduleId(Object.keys(nextSchedules)[0])
        }
        showNotification(deleted ? "Schedule deleted." : "Could not delete schedule.", deleted ? "success" : "error")
    }

    // Get color theme for course rendering
    const getCourseTheme = (courseCode: string, index: number) => {
        const hash = courseCode.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
        return COURSE_COLORS[hash % COURSE_COLORS.length]
    }

    // Render Calendar Timeline Grid
    const renderCalendar = (sectionsList: ScheduledSection[]) => {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
        const baseTimeSlots = [
            { label: "08:00 AM - 09:00 AM", startMin: 8 * 60, endMin: 9 * 60 },
            { label: "09:00 AM - 10:00 AM", startMin: 9 * 60, endMin: 10 * 60 },
            { label: "10:00 AM - 11:00 AM", startMin: 10 * 60, endMin: 11 * 60 },
            { label: "11:00 AM - 12:00 PM", startMin: 11 * 60, endMin: 12 * 60 },
            { label: "12:00 PM - 01:00 PM", startMin: 12 * 60, endMin: 13 * 60 },
            { label: "01:00 PM - 02:00 PM", startMin: 13 * 60, endMin: 14 * 60 },
            { label: "02:00 PM - 03:00 PM", startMin: 14 * 60, endMin: 15 * 60 },
            { label: "03:00 PM - 04:00 PM", startMin: 15 * 60, endMin: 16 * 60 },
            { label: "04:00 PM - 05:00 PM", startMin: 16 * 60, endMin: 17 * 60 },
            { label: "05:00 PM - 06:00 PM", startMin: 17 * 60, endMin: 18 * 60 }
        ]
        const formatHourLabel = (hour: number) => {
            const suffix = hour >= 12 ? "PM" : "AM"
            const displayHour = hour % 12 === 0 ? 12 : hour % 12
            const nextHour = hour + 1
            const nextSuffix = nextHour >= 12 ? "PM" : "AM"
            const displayNextHour = nextHour % 12 === 0 ? 12 : nextHour % 12
            return `${String(displayHour).padStart(2, "0")}:00 ${suffix} - ${String(displayNextHour).padStart(2, "0")}:00 ${nextSuffix}`
        }
        
        // Parse schedules
        const gridItems: { section: ScheduledSection; slot: any; theme: any }[] = []
        
        sectionsList.forEach((sec, idx) => {
            const slots = parseSectionSchedule(sec.days, sec.time)
            const theme = getCourseTheme(sec.courseCode, idx)
            slots.forEach(slot => {
                gridItems.push({
                    section: sec,
                    slot,
                    theme
                })
            })
        })
        const slotHours = new Set(baseTimeSlots.map(slot => Math.floor(slot.startMin / 60)))
        gridItems.forEach(item => {
            if (item.slot.day >= 0 && item.slot.day < days.length) {
                slotHours.add(Math.floor(item.slot.start / 60))
            }
        })
        const unplacedSections = sectionsList.filter(sec => parseSectionSchedule(sec.days, sec.time).length === 0)
        const timeSlots = Array.from(slotHours)
            .sort((a, b) => a - b)
            .map(hour => ({
                label: formatHourLabel(hour),
                startMin: hour * 60,
                endMin: (hour + 1) * 60
            }))

        return (
            <div className="bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[800px] table-fixed">
                        <thead>
                            <tr className="border-b bg-slate-50 dark:bg-slate-800/40 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <th className="py-3 px-4 text-right border-r w-32">Time</th>
                                <th className="py-3 px-4 border-r">Sunday</th>
                                <th className="py-3 px-4 border-r">Monday</th>
                                <th className="py-3 px-4 border-r">Tuesday</th>
                                <th className="py-3 px-4 border-r">Wednesday</th>
                                <th className="py-3 px-4">Thursday</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {timeSlots.map((slotInfo, slotIdx) => (
                                <tr key={slotIdx} className="hover:bg-slate-50/10 transition-colors">
                                    <td className="py-4 px-4 text-xs font-semibold text-slate-400 dark:text-slate-500 text-right border-r bg-slate-50/20 dark:bg-slate-950/10 w-32 tabular-nums align-top">
                                        {slotInfo.label}
                                    </td>
                                    {days.map((_, dayIdx) => {
                                        // Match courses starting in this hour slot
                                        const classesInCell = gridItems.filter(item => 
                                            item.slot.day === dayIdx &&
                                            item.slot.start >= slotInfo.startMin &&
                                            item.slot.start < slotInfo.endMin
                                        )
                                        return (
                                            <td key={dayIdx} className="p-2 border-r last:border-r-0 align-top bg-slate-50/5 dark:bg-slate-950/5 min-h-[90px]">
                                                <div className="flex flex-col gap-2">
                                                    {classesInCell.map((item, key) => {
                                                        const start = item.slot.start
                                                        const end = item.slot.end
                                                        const startStr = `${Math.floor(start / 60)}:${String(start % 60).padStart(2, "0")}`
                                                        const endStr = `${Math.floor(end / 60)}:${String(end % 60).padStart(2, "0")}`
                                                        return (
                                                            <div
                                                                key={key}
                                                                className={`p-2.5 rounded-xl border text-left shadow-sm flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-md ${item.theme.bg} ${item.theme.text} ${item.theme.border}`}
                                                            >
                                                                <div>
                                                                    <div className="text-xs font-black tracking-wide truncate">{item.section.courseCode}</div>
                                                                    <div className="text-[10px] opacity-95 truncate leading-tight mt-0.5">{item.section.courseTitle}</div>
                                                                    {item.section.instructor && item.section.instructor !== "To be announced" && (
                                                                        <div className="text-[9px] opacity-80 mt-1 truncate">
                                                                            👨‍🏫 {item.section.instructor}
                                                                        </div>
                                                                    )}
                                                                    {item.section.location && item.section.location !== "TBA" && (
                                                                        <div className="text-[9px] opacity-80 mt-0.5 truncate">
                                                                            📍 {item.section.location}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="mt-2 pt-1.5 border-t border-current/10 flex items-center justify-between text-[9px] opacity-85 font-medium whitespace-nowrap">
                                                                    <span className="flex items-center gap-0.5">
                                                                        <Clock className="w-2.5 h-2.5 shrink-0" />
                                                                        {startStr}-{endStr}
                                                                    </span>
                                                                    <span className="font-extrabold bg-current/10 px-1 rounded-sm">Sec {item.section.section}</span>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                            {unplacedSections.length > 0 && (
                                <tr className="border-t bg-amber-50/40 dark:bg-amber-950/10">
                                    <td className="py-4 px-4 text-xs font-semibold text-amber-700 dark:text-amber-300 text-right border-r w-32 align-top">
                                        TBA / Online
                                    </td>
                                    <td colSpan={days.length} className="p-2 align-top">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                                            {unplacedSections.map((sec, idx) => {
                                                const theme = getCourseTheme(sec.courseCode, idx)
                                                return (
                                                    <div
                                                        key={`${sec.courseCode}-${sec.section}`}
                                                        className={`p-2.5 rounded-xl border text-left shadow-sm ${theme.bg} ${theme.text} ${theme.border}`}
                                                    >
                                                        <div className="text-xs font-black tracking-wide truncate">{sec.courseCode}</div>
                                                        <div className="text-[10px] opacity-95 truncate leading-tight mt-0.5">{sec.courseTitle}</div>
                                                        <div className="mt-2 pt-1.5 border-t border-current/10 flex items-center justify-between text-[9px] opacity-85 font-medium">
                                                            <span>{sec.days || "TBA"} {sec.time || "TBA"}</span>
                                                            <span className="font-extrabold bg-current/10 px-1 rounded-sm">Sec {sec.section}</span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    // Active schedule sections list helper
    const activeSchedule = savedSchedules[activeScheduleId]
    const activeSections = activeSchedule?.sections || []

    // Check saved schedule for time & exam clashes
    const savedTimeClashes: string[] = []
    const savedExamClashes: string[] = []

    for (let i = 0; i < activeSections.length; i++) {
        for (let j = i + 1; j < activeSections.length; j++) {
            if (checkTimeClash(activeSections[i], activeSections[j])) {
                savedTimeClashes.push(`${activeSections[i].courseCode} and ${activeSections[j].courseCode} have overlapping lecture times!`)
            }
            if (checkExamClash(activeSections[i], activeSections[j])) {
                savedExamClashes.push(`${activeSections[i].courseCode} and ${activeSections[j].courseCode} have the same final exam date!`)
            }
        }
    }

    const getElectiveLabel = (courseCode: string) => {
        const cleanCode = cleanCourseCode(courseCode)
        const matched = getAllElectives(plan).find((e: any) => cleanCourseCode(e.code) === cleanCode)
        if (matched && matched.electiveListType) {
            let label = matched.electiveListType
            if (label.includes("List 1:")) label = "IS Concentration (L1)"
            if (label.includes("List 2:")) label = "General Major (L2)"
            if (label.includes("List 3:")) label = "Business (L3)"
            if (label.includes("General Studies")) label = "General Studies"
            return label
        }
        return null
    }

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950/40 p-4 sm:p-6 pb-20">
            {/* Header */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-6 border-slate-200 dark:border-slate-800">
                <div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">
                        Intelligent Course Scheduling
                    </span>
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        Schedule Builder
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm max-w-2xl leading-relaxed">
                        Design your perfect, conflict-free semester timeline. Input your preferences to generate automatic schedules, or search sections and add them manually.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Navigation Tabs */}
                <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex sm:overflow-x-auto sm:rounded-none sm:border-x-0 sm:border-t-0 sm:bg-transparent sm:p-0 sm:shadow-none">
                    <button
                        onClick={() => {
                            setActiveTab("generator")
                            setPreviewOption(null)
                        }}
                        className={`min-w-0 rounded-lg px-2 py-2.5 text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-1 sm:flex-row sm:rounded-none sm:border-b-2 sm:px-5 sm:py-3.5 sm:text-sm sm:whitespace-nowrap ${
                            activeTab === "generator"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-400 sm:bg-transparent sm:border-emerald-600 sm:text-emerald-600"
                                : "text-muted-foreground hover:text-foreground sm:border-transparent"
                        }`}
                    >
                        <Sparkles className="h-4 w-4 shrink-0" />
                        <span className="block max-w-full truncate sm:hidden">Generator</span>
                        <span className="hidden sm:block">Intelligent Schedule Generator</span>
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab("picker")
                            setPreviewOption(null)
                        }}
                        className={`min-w-0 rounded-lg px-2 py-2.5 text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-1 sm:flex-row sm:rounded-none sm:border-b-2 sm:px-5 sm:py-3.5 sm:text-sm sm:whitespace-nowrap ${
                            activeTab === "picker"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/25 dark:text-blue-400 sm:bg-transparent sm:border-blue-600 sm:text-blue-600"
                                : "text-muted-foreground hover:text-foreground sm:border-transparent"
                        }`}
                    >
                        <CalendarCheck className="h-4 w-4 shrink-0" />
                        <span className="block max-w-full truncate sm:hidden">Picker ({pickedSections.length})</span>
                        <span className="hidden sm:block">Manual Picker ({pickedSections.length})</span>
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab("saved")
                            setPreviewOption(null)
                        }}
                        className={`min-w-0 rounded-lg px-2 py-2.5 text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-1 sm:flex-row sm:rounded-none sm:border-b-2 sm:px-5 sm:py-3.5 sm:text-sm sm:whitespace-nowrap ${
                            activeTab === "saved"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-400 sm:bg-transparent sm:border-emerald-600 sm:text-emerald-600"
                                : "text-muted-foreground hover:text-foreground sm:border-transparent"
                        }`}
                    >
                        <BookmarkCheck className="h-4 w-4 shrink-0" />
                        <span className="block max-w-full truncate sm:hidden">Saved ({Object.keys(savedSchedules).length})</span>
                        <span className="hidden sm:block">My Saved Schedules ({Object.keys(savedSchedules).length})</span>
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === "generator" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* Left Column: Preferences & Courses Selection */}
                        <div className="lg:col-span-5 space-y-6">
                            
                            {/* Course Selector Card */}
                            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-emerald-600" />
                                        1. Select Courses
                                    </CardTitle>
                                    <CardDescription>
                                        Choose courses to schedule. You can select remaining study plan courses or add manual codes.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    
                                    {/* Manual Course Input */}
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="e.g. ITCS113, ITIS351"
                                                value={manualCourseInput}
                                                onChange={(e) => setManualCourseInput(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleAddManualCourse()}
                                                className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                            />
                                        </div>
                                        <Button onClick={handleAddManualCourse} variant="secondary" className="px-4">
                                            <Plus className="w-4 h-4 mr-1" />
                                            Add
                                        </Button>
                                    </div>

                                    {/* Selected Courses Chips */}
                                    {selectedCourses.length > 0 && (
                                        <div className="space-y-2 pt-2 border-t">
                                            <Label className="text-xs font-semibold text-slate-500">Selected ({selectedCourses.length})</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedCourses.map(code => (
                                                    <span 
                                                        key={code} 
                                                        onClick={() => handleToggleCourse(code)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 cursor-pointer transition-all dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
                                                    >
                                                        {code}
                                                        <span className="text-[10px] opacity-65 font-bold">×</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Remaining Courses from Plan */}
                                    <div className="space-y-2 pt-3 border-t">
                                        <Label className="text-xs font-semibold text-slate-500 block">Remaining Plan Courses</Label>
                                        
                                        {remainingCourses.length === 0 ? (
                                            <div className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                                                <span>No remaining courses detected. Upload your study plan in settings to see untaken courses automatically.</span>
                                            </div>
                                        ) : (
                                            <div className="max-h-[200px] overflow-y-auto border rounded-xl divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
                                                {remainingCourses.map((c) => {
                                                    const cleanCode = c.code.replace(/\s+/g, "").toUpperCase()
                                                    const isChecked = selectedCourses.includes(cleanCode)
                                                    return (
                                                        <div 
                                                            key={c.code} 
                                                            onClick={() => handleToggleCourse(c.code)}
                                                            className={`flex items-center justify-between p-2 px-3 text-xs font-medium cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                                                                isChecked ? "bg-emerald-50/40 dark:bg-emerald-950/10" : ""
                                                            }`}
                                                        >
                                                            <div className="space-y-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-slate-900 dark:text-white">{c.code}</span>
                                                                    {(() => {
                                                                        const label = getElectiveLabel(c.code)
                                                                        if (!label) return null
                                                                        return (
                                                                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
                                                                                {label}
                                                                            </span>
                                                                        )
                                                                    })()}
                                                                </div>
                                                                <span className="text-muted-foreground block text-[10px] max-w-[240px] truncate">{c.title}</span>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => {}} // Controlled via row click
                                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                            />
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>

                                </CardContent>
                            </Card>

                            {/* Preferences Card */}
                            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-emerald-600" />
                                        2. Set Scheduling Preferences
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    
                                    {/* Days Preference */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Lecture Days</Label>
                                        <RadioGroup 
                                            value={preferences.days} 
                                            onValueChange={(val: any) => setPreferences(prev => ({ ...prev, days: val }))}
                                            className="grid grid-cols-3 gap-2"
                                        >
                                            <div>
                                                <RadioGroupItem value="ANY" id="days-any" className="sr-only" />
                                                <Label 
                                                    htmlFor="days-any"
                                                    className={`flex items-center justify-center p-2 rounded-lg border text-xs font-bold cursor-pointer text-center transition-all ${
                                                        preferences.days === "ANY" 
                                                            ? "bg-emerald-600 text-white border-emerald-600" 
                                                            : "bg-white hover:bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                    }`}
                                                >
                                                    Any Days
                                                </Label>
                                            </div>
                                            <div>
                                                <RadioGroupItem value="MW" id="days-mw" className="sr-only" />
                                                <Label 
                                                    htmlFor="days-mw"
                                                    className={`flex items-center justify-center p-2 rounded-lg border text-xs font-bold cursor-pointer text-center transition-all ${
                                                        preferences.days === "MW" 
                                                            ? "bg-emerald-600 text-white border-emerald-600" 
                                                            : "bg-white hover:bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                    }`}
                                                >
                                                    Mon / Wed
                                                </Label>
                                            </div>
                                            <div>
                                                <RadioGroupItem value="UTH" id="days-uth" className="sr-only" />
                                                <Label 
                                                    htmlFor="days-uth"
                                                    className={`flex items-center justify-center p-2 rounded-lg border text-xs font-bold cursor-pointer text-center transition-all ${
                                                        preferences.days === "UTH" 
                                                            ? "bg-emerald-600 text-white border-emerald-600" 
                                                            : "bg-white hover:bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                    }`}
                                                >
                                                    Sun / Tue / Thu
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {/* Time Preference */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Lecture Time of Day</Label>
                                        <RadioGroup 
                                            value={preferences.time} 
                                            onValueChange={(val: any) => setPreferences(prev => ({ ...prev, time: val }))}
                                            className="grid grid-cols-3 gap-2"
                                        >
                                            <div>
                                                <RadioGroupItem value="ANY" id="time-any" className="sr-only" />
                                                <Label 
                                                    htmlFor="time-any"
                                                    className={`flex items-center justify-center p-2 rounded-lg border text-xs font-bold cursor-pointer text-center transition-all ${
                                                        preferences.time === "ANY" 
                                                            ? "bg-emerald-600 text-white border-emerald-600" 
                                                            : "bg-white hover:bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                    }`}
                                                >
                                                    Any Time
                                                </Label>
                                            </div>
                                            <div>
                                                <RadioGroupItem value="MORNING" id="time-morning" className="sr-only" />
                                                <Label 
                                                    htmlFor="time-morning"
                                                    className={`flex items-center justify-center p-2 rounded-lg border text-xs font-bold cursor-pointer text-center transition-all ${
                                                        preferences.time === "MORNING" 
                                                            ? "bg-emerald-600 text-white border-emerald-600" 
                                                            : "bg-white hover:bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                    }`}
                                                >
                                                    Morning
                                                </Label>
                                            </div>
                                            <div>
                                                <RadioGroupItem value="AFTERNOON" id="time-afternoon" className="sr-only" />
                                                <Label 
                                                    htmlFor="time-afternoon"
                                                    className={`flex items-center justify-center p-2 rounded-lg border text-xs font-bold cursor-pointer text-center transition-all ${
                                                        preferences.time === "AFTERNOON" 
                                                            ? "bg-emerald-600 text-white border-emerald-600" 
                                                            : "bg-white hover:bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                    }`}
                                                >
                                                    Afternoon
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {/* Toggles */}
                                    <div className="space-y-4 pt-2 border-t">
                                        
                                        {/* Avoid Exam Clashes */}
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="avoid-exams" className="text-sm font-semibold cursor-pointer">Avoid Final Exam Clashes</Label>
                                                <span className="text-[10px] text-muted-foreground block">Exclude schedules where final exams occur at the same time.</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                id="avoid-exams"
                                                checked={preferences.avoidExamClashes}
                                                onChange={(e) => setPreferences(prev => ({ ...prev, avoidExamClashes: e.target.checked }))}
                                                className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                        </div>

                                        {/* Exclude Closed Sections */}
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="exclude-closed" className="text-sm font-semibold cursor-pointer">Exclude Closed Sections</Label>
                                                <span className="text-[10px] text-muted-foreground block">Only show schedule combinations with currently open sections.</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                id="exclude-closed"
                                                checked={preferences.excludeClosed}
                                                onChange={(e) => setPreferences(prev => ({ ...prev, excludeClosed: e.target.checked }))}
                                                className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                        </div>

                                    </div>

                                </CardContent>
                                <CardFooter className="pt-2">
                                    <Button 
                                        onClick={handleGenerate}
                                        disabled={isGenerating || selectedCourses.length === 0}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                Searching UOB & Scheduling...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Generate Schedules
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>

                            {generationError && (
                                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-xs font-semibold flex gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                                    <span>{generationError}</span>
                                </div>
                            )}

                        </div>

                        {/* Right Column: Generation Results & Preview */}
                        <div className="lg:col-span-7 space-y-6">
                            
                            {/* Generator Results */}
                            {generatedOptions.length > 0 ? (
                                <div className="space-y-6">
                                    
                                    {/* Options List */}
                                    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg font-bold flex items-center justify-between">
                                                <span>Schedule Suggestions</span>
                                                <span className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full font-bold text-slate-500 dark:text-slate-400">
                                                    {generatedOptions.length} combinations found
                                                </span>
                                            </CardTitle>
                                            <CardDescription>
                                                Ranked by how well they match your day and time preferences. Click Preview to view on the timeline.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
                                                {generatedOptions.slice(0, 10).map((opt, idx) => (
                                                    <div 
                                                        key={opt.id}
                                                        className={`p-4 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/20 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                                            previewOption?.id === opt.id ? "bg-emerald-50/30 dark:bg-emerald-950/5" : ""
                                                        }`}
                                                    >
                                                        <div className="space-y-1.5 flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-sm text-slate-900 dark:text-white">Option {idx + 1}</span>
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                    opt.score >= 80 
                                                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" 
                                                                        : opt.score >= 50
                                                                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                                                                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
                                                                }`}>
                                                                    {opt.score}% Pref Match
                                                                </span>
                                                                {opt.examClashesCount > 0 && (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 flex items-center gap-1">
                                                                        <AlertTriangle className="w-2.5 h-2.5" />
                                                                        {opt.examClashesCount} Exam Clash
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Sections Summary */}
                                                            <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                                                                {opt.sections.map(s => (
                                                                    <span key={s.courseCode} className="font-medium">
                                                                        {s.courseCode} ({s.section})
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-2">
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                onClick={() => setPreviewOption(opt)}
                                                                className={previewOption?.id === opt.id ? "border-emerald-600 text-emerald-600" : ""}
                                                            >
                                                                Preview
                                                            </Button>
                                                            
                                                            <div className="flex gap-1 border rounded-lg overflow-hidden shrink-0">
                                                                {Object.values(savedSchedules).map((schedule, index, list) => (
                                                                    <button
                                                                        key={schedule.id}
                                                                        onClick={() => handleSaveOption(opt, schedule.id)}
                                                                        className={`px-2 py-1.5 text-[10px] font-extrabold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors ${index < list.length - 1 ? "border-r" : ""}`}
                                                                        title={`Save to ${schedule.name}`}
                                                                    >
                                                                        {schedule.name.replace("Schedule ", "S")}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Timeline Preview (If Option Selected) */}
                                    {previewOption && (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                    <CalendarCheck className="w-5 h-5 text-emerald-600" />
                                                    Timeline Preview: Option Details
                                                </h3>
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    onClick={() => setPreviewOption(null)}
                                                    className="text-slate-400 hover:text-slate-600"
                                                >
                                                    Clear Preview
                                                </Button>
                                            </div>
                                            {renderCalendar(previewOption.sections)}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm py-16 text-center bg-white dark:bg-slate-900 rounded-2xl">
                                    <div className="mx-auto bg-slate-100 dark:bg-slate-800 p-4 rounded-full w-fit mb-4">
                                        <Sparkles className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Generator Ready</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">
                                        Select courses and click **Generate Schedules** to automatically build combinations of sections that don't clash.
                                    </p>
                                </Card>
                            )}

                        </div>

                    </div>
                )}

                {activeTab === "picker" && (
                    <div className="space-y-6">
                        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                                            <CalendarCheck className="w-5 h-5 text-blue-600" />
                                            Manual Section Picker
                                        </CardTitle>
                                        <CardDescription>
                                            Review picked sections from Courses and manually add each section to Schedule 1, 2, or 3.
                                        </CardDescription>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearPicker}
                                        disabled={pickedSections.length === 0}
                                        className="shrink-0"
                                    >
                                        Clear Picker
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300">
                                    Multiple sections of the same course can stay in the picker as alternatives. Adding one to a saved schedule will replace any existing section for that same course in that schedule.
                                    Limits are normal semester {NORMAL_TERM_LIMIT.maxCourses} courses / {NORMAL_TERM_LIMIT.maxCredits} credits and summer {SUMMER_TERM_LIMIT.maxCourses} courses / {SUMMER_TERM_LIMIT.maxCredits} credits.
                                </div>

                                {pickedSections.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed p-10 text-center">
                                        <Calendar className="mx-auto h-10 w-10 text-slate-400" />
                                        <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">No picked sections</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Open Courses and use Add to Picker on section rows.
                                        </p>
                                        <Link href="/courses">
                                            <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                                                Open Courses
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {pickedSections.map((section) => (
                                            <Card key={`${section.courseCode}-${section.section}-${section.time}`} className="border border-slate-200 dark:border-slate-800 shadow-sm">
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-mono text-sm font-black text-slate-900 dark:text-white">{section.courseCode}</span>
                                                                <Badge variant="secondary" className="text-[10px]">Sec {section.section}</Badge>
                                                                {section.semester === "3" && (
                                                                    <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                                                                        Summer
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <CardTitle className="mt-1 text-base leading-snug">{section.courseTitle}</CardTitle>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-rose-600"
                                                            onClick={() => handleRemovePicked(section)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
                                                            <span className="block text-muted-foreground">Time</span>
                                                            <strong>{section.days || "TBA"} {section.time || "TBA"}</strong>
                                                        </div>
                                                        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
                                                            <span className="block text-muted-foreground">Location</span>
                                                            <strong>{section.location || "TBA"}</strong>
                                                        </div>
                                                        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
                                                            <span className="block text-muted-foreground">Instructor</span>
                                                            <strong>{section.instructor || "TBA"}</strong>
                                                        </div>
                                                        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
                                                            <span className="block text-muted-foreground">Final Exam</span>
                                                            <strong>{section.examDate || "TBA"}</strong>
                                                            {section.examTime && (
                                                                <span className="mt-1 block text-[10px] text-slate-500">Time: {section.examTime}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        {Object.values(savedSchedules).map(schedule => (
                                                            <Button
                                                                key={schedule.id}
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 text-xs"
                                                                onClick={() => handleAddPickedToSchedule(section, schedule.id)}
                                                            >
                                                                Add to {schedule.name}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === "saved" && (
                    <div className="space-y-6">
                        
                        {/* Saved Schedules Controls */}
                        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm">
                            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:w-auto lg:flex-wrap">
                                {Object.values(savedSchedules).map(sch => (
                                    <Button
                                        key={sch.id}
                                        onClick={() => setActiveScheduleId(sch.id)}
                                        variant={activeScheduleId === sch.id ? "default" : "outline"}
                                        className={`min-w-0 justify-center px-2 text-xs font-semibold h-9 sm:px-4 ${
                                            activeScheduleId === sch.id 
                                                ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                                                : ""
                                        }`}
                                    >
                                        <span className="truncate">{sch.name}</span>
                                    </Button>
                                ))}
                            </div>
                            
                            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:w-auto">
                                <Button onClick={handleAddSchedule} variant="outline" className="text-xs h-9 px-3">
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    <span className="truncate">New</span>
                                </Button>
                                <Link href="/courses" className="min-w-0">
                                    <Button variant="outline" className="w-full text-xs h-9">
                                        <Plus className="w-3.5 h-3.5 mr-1" />
                                        <span className="truncate sm:hidden">Catalog</span>
                                        <span className="hidden truncate sm:inline">Add from Catalog</span>
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    onClick={() => handleDeleteSchedule(activeScheduleId)}
                                    disabled={Object.keys(savedSchedules).length <= 1}
                                    className="text-xs h-9 px-3 text-rose-600 hover:text-rose-700"
                                >
                                    Delete
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    onClick={() => handleClearSchedule(activeScheduleId)}
                                    disabled={activeSections.length === 0}
                                    className="text-xs h-9 px-3"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="ml-1 sm:hidden">Clear</span>
                                </Button>
                            </div>
                        </div>

                        {/* Clashes Warnings */}
                        {(savedTimeClashes.length > 0 || savedExamClashes.length > 0) && (
                            <div className="space-y-2">
                                {savedTimeClashes.map((clash, cIdx) => (
                                    <div key={`tc-${cIdx}`} className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold flex items-start gap-2.5">
                                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                                        <span>{clash}</span>
                                    </div>
                                ))}
                                {savedExamClashes.map((clash, cIdx) => (
                                    <div key={`ec-${cIdx}`} className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 text-xs font-semibold flex items-start gap-2.5">
                                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                                        <span>{clash}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeSections.length === 0 ? (
                            <Card className="border border-dashed py-16 text-center max-w-lg mx-auto">
                                <CardHeader>
                                    <div className="mx-auto bg-slate-100 dark:bg-slate-900 p-4 rounded-full w-fit mb-2">
                                        <Calendar className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <CardTitle>Schedule is Empty</CardTitle>
                                    <CardDescription>
                                        You haven't added any course sections to this schedule yet.
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter className="justify-center gap-3">
                                    <Button onClick={() => setActiveTab("generator")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Generate Automatically
                                    </Button>
                                    <Link href="/courses">
                                        <Button variant="outline">
                                            Search Course Catalog
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                                
                                {/* Calendar Timeline */}
                                <div className="xl:col-span-8 space-y-4">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <CalendarCheck className="w-5 h-5 text-emerald-600" />
                                        Visualized Week Timeline
                                    </h3>
                                    {renderCalendar(activeSections)}
                                </div>

                                {/* Details & Exams Column */}
                                <div className="xl:col-span-4 space-y-6">
                                    
                                    {/* Courses List */}
                                    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                                                Schedule List
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {activeSections.map((sec, key) => {
                                                    const theme = getCourseTheme(sec.courseCode, key)
                                                    return (
                                                        <div key={sec.courseCode} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                                            <div className="flex gap-2.5 items-start">
                                                                <span className={`w-3.5 h-3.5 rounded-full shrink-0 mt-1 border ${theme.bg} ${theme.border}`} />
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-none">{sec.courseCode}</span>
                                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">Sec {sec.section}</span>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground leading-tight max-w-[200px] truncate">{sec.courseTitle}</p>
                                                                    
                                                                    <div className="pt-1 text-[10px] space-y-0.5 text-slate-500">
                                                                        <div className="flex items-center gap-1">
                                                                            <Users className="w-3 h-3 shrink-0" />
                                                                            <span className="truncate max-w-[160px]">{sec.instructor}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <MapPin className="w-3 h-3 shrink-0" />
                                                                            <span>{sec.location || "TBA"}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                onClick={() => handleRemoveSection(activeScheduleId, sec.courseCode)}
                                                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 shrink-0"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Final Exam Schedule Planner */}
                                    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                                                Final Exam Planner
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {activeSections
                                                    .map(sec => ({
                                                        code: sec.courseCode,
                                                        examDate: sec.examDate,
                                                        examTime: sec.examTime,
                                                        examRoom: sec.examRoom
                                                    }))
                                                    // Sort chronologically if dates are well formed
                                                    .sort((a, b) => {
                                                        const dateA = new Date(a.examDate)
                                                        const dateB = new Date(b.examDate)
                                                        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0
                                                        return dateA.getTime() - dateB.getTime()
                                                    })
                                                    .map((exam, key) => {
                                                        const isTba = !exam.examDate || exam.examDate === "TBA" || exam.examDate.includes("ANNOUNCED") || exam.examDate === "------"
                                                        return (
                                                            <div key={exam.code} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                                                <div className="flex items-start justify-between">
                                                                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">{exam.code}</span>
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                                        isTba 
                                                                            ? "bg-slate-100 text-slate-500" 
                                                                            : "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                                                                    }`}>
                                                                        {isTba ? "Date TBA" : "Final Exam"}
                                                                    </span>
                                                                </div>
                                                                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                                                                    {exam.examDate}
                                                                </div>
                                                                {exam.examTime && (
                                                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                                        Time: {exam.examTime}
                                                                    </div>
                                                                )}
                                                                {exam.examRoom && exam.examRoom !== "To be announced" && exam.examRoom !== "------" && (
                                                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                                                        Room: {exam.examRoom}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                            </div>
                                        </CardContent>
                                    </Card>

                                </div>

                            </div>
                        )}

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
        </main>
    )
}
