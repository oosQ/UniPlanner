"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authService, UserSession } from "@/lib/auth-service"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { readStoredPlan, readStoredTranscript, writeStoredPlan, writeStoredTranscript } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ParsedTranscript, Semester as TranscriptSemester } from "@/lib/types"
import { 
    GraduationCap, 
    BookOpen, 
    CheckCircle2, 
    Clock, 
    Lock, 
    Unlock,
    Calculator, 
    TrendingUp, 
    RefreshCw, 
    FileText, 
    AlertCircle,
    BarChart3,
    Upload
} from "lucide-react"

// Study Plan interfaces
interface PlanCourse {
    code: string
    title: string
    credits: number
    type: string
    prerequisites: string
    isMajorGpa: boolean
    status?: "Completed" | "In Progress" | "Available" | "Locked"
    grade?: string
    matchedCode?: string
    matchedTitle?: string
    missingPrereqs?: string[]
}

interface PlanSemester {
    semesterName: string
    courses: PlanCourse[]
}

interface ParsedStudyPlan {
    degreeName: string
    totalCredits: number
    semesters: PlanSemester[]
}

interface SimulatorCourse extends PlanCourse {
    simulatorId: string
    semesterName: string
}

const GRADE_POINTS: Record<string, number> = {
    "A": 4.00, "A-": 3.66, "B+": 3.33, "B": 3.00, "B-": 2.66,
    "C+": 2.33, "C": 2.00, "C-": 1.66, "D+": 1.33, "D": 1.00, "F": 0.00
}

const GRADE_OPTIONS = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"] as const

export default function DashboardPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    // States
    const [user, setUser] = useState<UserSession | null>(null)
    const [plan, setPlan] = useState<ParsedStudyPlan | null>(null)
    const [transcript, setTranscript] = useState<ParsedTranscript | null>(null)
    const [activeTab, setActiveTab] = useState<"plan" | "remaining" | "simulator" | "history" | "settings" | "profile">("plan")
    
    // GPA Simulator States
    const [simulatedGrades, setSimulatedGrades] = useState<Record<string, string>>({})
    const [simulatorSearch, setSimulatorSearch] = useState("")
    const [simulatorFilter, setSimulatorFilter] = useState<"all" | "completed" | "repeatable" | "available">("all")
    
    // Re-upload States
    const [uploadLoading, setUploadLoading] = useState(false)
    const [uploadError, setUploadError] = useState("")
    const [planFile, setPlanFile] = useState<File | null>(null)
    const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
    const [profileFullName, setProfileFullName] = useState("")
    const [profileUsername, setProfileUsername] = useState("")
    const [profileSaving, setProfileSaving] = useState(false)
    const [profileError, setProfileError] = useState("")
    const [profileSuccess, setProfileSuccess] = useState("")
    const [historySearch, setHistorySearch] = useState("")
    const [historyFilter, setHistoryFilter] = useState<"all" | "repeatable" | "withdrawn">("all")

    useEffect(() => {
        // Auth check
        const currentUser = authService.getCurrentUser()
        if (!currentUser) {
            router.push("/get-started")
            return
        }
        setUser(currentUser)

        // Load persisted dashboard data
        const storedPlan = readStoredPlan<ParsedStudyPlan>()
        const storedTranscript = readStoredTranscript<ParsedTranscript>()

        if (storedPlan) setPlan(storedPlan)
        if (storedTranscript) setTranscript(storedTranscript)

        // If logged in via Supabase, fetch cloud data to sync/override
        if (currentUser && !currentUser.isGuest && currentUser.id && isSupabaseConfigured && supabase) {
            const client = supabase
            const fetchCloudData = async () => {
                try {
                    const { data: profile, error } = await client
                        .from('profiles')
                        .select('plan_data, transcript_data')
                        .eq('id', currentUser.id)
                        .single()
                    
                    if (profile && !error) {
                        if (profile.plan_data) {
                            setPlan(profile.plan_data)
                            writeStoredPlan(profile.plan_data)
                        }
                        if (profile.transcript_data) {
                            setTranscript(profile.transcript_data)
                            writeStoredTranscript(profile.transcript_data)
                        }
                    }
                } catch (err) {
                    console.error("Failed to sync cloud data:", err)
                }
            }
            fetchCloudData()
        }
    }, [router])

    useEffect(() => {
        if (!user) return
        setProfileFullName(user.fullName)
        setProfileUsername(user.username)
    }, [user])

    useEffect(() => {
        const tab = searchParams.get("tab")
        if (tab === "profile" || tab === "settings" || tab === "history" || tab === "simulator" || tab === "remaining" || tab === "plan") {
            setActiveTab(tab)
        }
    }, [searchParams])

    const handleSignOut = async () => {
        await authService.signOut()
        router.push("/get-started")
    }

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setProfileError("")
        setProfileSuccess("")
        setProfileSaving(true)

        try {
            const result = await authService.updateProfile(profileFullName, profileUsername)
            if (!result.success || !result.user) {
                setProfileError(result.error || "Failed to update profile")
                return
            }

            setUser(result.user)
            setProfileSuccess("Account information updated.")
        } finally {
            setProfileSaving(false)
        }
    }

    // Helper: clean code for matching (remove spaces, uppercase)
    const cleanCode = (code?: string | null) => (code || "").replace(/\s+/g, "").toUpperCase()

    // 1. Process comparison between Plan and Transcript
    const getEnrichedPlanSemesters = (): PlanSemester[] => {
        if (!plan) return []

        // Extract completed/in progress maps from transcript
        const completedMap = new Map<string, { grade: string; title: string; code: string }>()
        const inProgressSet = new Set<string>()

        // Helper to check if a course is an orientation course
        const isOrientation = (courseCode: string, courseTitle: string) => {
            const code = courseCode.toUpperCase().replace(/\s+/g, "")
            const title = courseTitle.toUpperCase()
            return code.startsWith("ENGLRL") || code.startsWith("MATHS00") || code.includes("001") || code.includes("002") || title.includes("ORIENTATION")
        }

        if (transcript && transcript.semesters) {
            for (const sem of transcript.semesters) {
                if (!sem || !sem.courses) continue
                for (const course of sem.courses) {
                    if (!course || !course.courseCode) continue
                    const cleanC = cleanCode(course.courseCode)
                    if (course.status === "W") continue
                    if (isOrientation(course.courseCode, course.courseName || "")) continue

                    if (course.grade && course.grade !== "N/A" && course.grade !== "Enrolled") {
                        const isPassing = !["F", "FX", "U", "I", "IP", "W"].includes(course.grade.toUpperCase())
                        if (isPassing) {
                            completedMap.set(cleanC, {
                                grade: course.grade,
                                title: course.courseName || "",
                                code: course.courseCode
                            })
                            inProgressSet.delete(cleanC)
                        } else if (["I", "IP"].includes(course.grade.toUpperCase())) {
                            inProgressSet.add(cleanC)
                        }
                    } else {
                        if (!completedMap.has(cleanC)) {
                            inProgressSet.add(cleanC)
                        }
                    }
                }
            }
        }

        // We also want to keep track of unmatched completed transcript courses to fill in study plan electives
        const unmatchedCompleted = new Map(completedMap)

        // Step 1: Match Exact Courses First
        const semestersCopy: PlanSemester[] = JSON.parse(JSON.stringify(plan.semesters))
        
        // Find completed and in progress for exact match courses
        for (const sem of semestersCopy) {
            if (!sem || !sem.courses) continue
            for (const course of sem.courses) {
                if (!course || !course.code) continue
                const cCodeClean = cleanCode(course.code)
                
                // If it is a placeholder elective (ends with XX or XXX or contains Elective)
                const isPlaceholder = course.code.includes("XX") || course.code.includes("XXX") || (course.title || "").toLowerCase().includes("elective")

                if (!isPlaceholder && completedMap.has(cCodeClean)) {
                    const match = completedMap.get(cCodeClean)!
                    course.status = "Completed"
                    course.grade = match.grade
                    course.matchedCode = match.code
                    course.matchedTitle = match.title
                    unmatchedCompleted.delete(cCodeClean)
                } else if (!isPlaceholder && inProgressSet.has(cCodeClean)) {
                    course.status = "In Progress"
                    inProgressSet.delete(cCodeClean)
                }
            }
        }

        // Step 2: Match Placeholder Electives with Leftover Transcript Courses
        for (const sem of semestersCopy) {
            if (!sem || !sem.courses) continue
            for (const course of sem.courses) {
                if (!course || course.status) continue // Already matched

                const isPlaceholder = (course.code || "").includes("XX") || (course.code || "").includes("XXX") || (course.title || "").toLowerCase().includes("elective")
                if (isPlaceholder) {
                    // Try to find a completed course in unmatchedCompleted that fits
                    let matchedKey: string | null = null
                    
                    for (const [key, details] of unmatchedCompleted.entries()) {
                        const coursePrefix = (course.code || "").replace(/[^A-Z]/g, "").replace(/X+$/, "") // E.g. "GSE" or "BUS" or "ITIS"
                        const matchPrefix = (details.code || "").replace(/[^A-Z]/g, "") // E.g. "FREN" or "ACC" or "ITIS"

                        let prefixMatch = false
                        if (coursePrefix === "ITIS" && matchPrefix === "ITIS") {
                            prefixMatch = true
                        } else if ((coursePrefix === "BUS" || course.type === "ME") && ["ACC", "MGT", "MKT", "ECON", "FIN", "BUS"].includes(matchPrefix)) {
                            prefixMatch = true
                        } else if ((coursePrefix === "GSE" || coursePrefix === "UR" || course.type === "GSE" || course.type === "UR") && 
                                   ["ARAB", "HIST", "ISLM", "HRLC", "ENGL", "FREN", "SOCIO", "LAW", "TLM", "PHYCS", "CHMY"].includes(matchPrefix)) {
                            // General studies or university requirements
                            prefixMatch = true
                        }

                        if (prefixMatch) {
                            matchedKey = key
                            course.status = "Completed"
                            course.grade = details.grade
                            course.matchedCode = details.code
                            course.matchedTitle = details.title
                            break
                        }
                    }

                    if (matchedKey) {
                        unmatchedCompleted.delete(matchedKey)
                    }
                }
            }
        }

        // Step 3: Determine Prerequisites and Unlock status for Remaining Courses
        const completedCodesSet = new Set(Array.from(completedMap.keys()))
        const completedCredits = transcript?.cumulative?.creditsPassed || 0

        for (const sem of semestersCopy) {
            if (!sem || !sem.courses) continue
            for (const course of sem.courses) {
                if (!course || course.status) continue // Already completed or in progress

                const normalizedCode = cleanCode(course.code)
                const isSeniorProject = normalizedCode === "ITIS499" || normalizedCode === "IS499" || (course.title || "").toLowerCase().includes("senior project")
                if (isSeniorProject) {
                    course.status = "Available"
                    course.missingPrereqs = []
                    continue
                }

                const result = evaluatePrerequisites(course.prerequisites || "", completedCodesSet, completedCredits)
                if (result.met) {
                    course.status = "Available"
                } else {
                    course.status = "Locked"
                    course.missingPrereqs = result.missing
                }
            }
        }

        return semestersCopy
    }

    // Prerequisite evaluation helper
    const evaluatePrerequisites = (prereqs: string, completedCodes: Set<string>, completedCredits: number): { met: boolean; missing: string[] } => {
        const clean = (c: string) => c.replace(/\s+/g, "").toUpperCase()
        const prereqClean = prereqs.toLowerCase().trim()
        
        if (prereqClean === "------" || prereqClean === "" || prereqClean === "none") {
            return { met: true, missing: [] }
        }

        // Credit hours check
        const creditMatch = prereqClean.match(/pass\s+(\d+)\s+credits/i)
        if (creditMatch) {
            const reqCredits = parseInt(creditMatch[1], 10)
            if (completedCredits < reqCredits) {
                return { met: false, missing: [`Requires ${reqCredits} completed credits`] }
            }
        }

        // Check for course codes
        const codeRegex = /\b[A-Z]{3,5}\s?(?:\d{3}|\dXX|XXX)\b/g
        const codes = prereqs.match(codeRegex) || []
        if (codes.length === 0) {
            return { met: true, missing: [] }
        }

        const missing: string[] = []

        if (prereqClean.includes("&") || prereqClean.includes("and")) {
            for (const code of codes) {
                if (!completedCodes.has(clean(code))) {
                    missing.push(code)
                }
            }
            return { met: missing.length === 0, missing }
        } else if (prereqClean.includes("/") || prereqClean.includes("or")) {
            const hasAny = codes.some(code => completedCodes.has(clean(code)))
            return { met: hasAny, missing: hasAny ? [] : [codes.join(" or ")] }
        } else {
            for (const code of codes) {
                if (!completedCodes.has(clean(code))) {
                    missing.push(code)
                }
            }
            return { met: missing.length === 0, missing }
        }
    }

    const enrichedSemesters = getEnrichedPlanSemesters()

    // 2. Calculations for Metrics
    const totalPlanCredits = plan?.totalCredits || 132
    
    // Count status metrics
    let completedCreditsCount = 0
    let completedCoursesCount = 0
    let inProgressCreditsCount = 0
    let inProgressCoursesCount = 0
    let remainingCoursesCount = 0
    let remainingCreditsCount = 0

    enrichedSemesters.forEach(sem => {
        sem.courses.forEach(c => {
            const isSeniorProject = c.code === "ITIS 499" || (c.title || "").toLowerCase().includes("senior project")
            if (c.status === "Completed") {
                completedCreditsCount += c.credits
                completedCoursesCount++
            } else if (c.status === "In Progress") {
                inProgressCreditsCount += c.credits
                inProgressCoursesCount++
                if (isSeniorProject) {
                    remainingCreditsCount += c.credits
                    remainingCoursesCount++
                }
            } else {
                remainingCreditsCount += c.credits
                remainingCoursesCount++
            }
        })
    })

    // GPA and honors check
    const currentGPA = transcript?.cumulative?.cgpa || 0.00
    const passedCredits = transcript?.cumulative?.creditsPassed || completedCreditsCount
    
    const getHonorsLabel = (gpa: number): { label: string; color: string } => {
        if (gpa >= 3.90) return { label: "First Honors", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" }
        if (gpa >= 3.50) return { label: "Second Honors", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" }
        if (gpa >= 3.00) return { label: "Very Good GPA", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" }
        if (gpa >= 2.00) return { label: "Good GPA", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" }
        return { label: "Pass status", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400" }
    }
    const honors = getHonorsLabel(currentGPA)

    // 3. GPA Simulator Logic
    const allSimulatorCourses: SimulatorCourse[] = enrichedSemesters.flatMap((sem, semesterIndex) =>
        sem.courses.map((course, courseIndex) => ({
            ...course,
            semesterName: sem.semesterName,
            simulatorId: `${semesterIndex}-${courseIndex}-${course.code}-${course.title}`
        }))
    )

    const remainingPlanCourses = allSimulatorCourses.filter(course => course.status !== "Completed")

    const handleSimGradeChange = (simulatorId: string, grade: string) => {
        setSimulatedGrades(prev => ({
            ...prev,
            [simulatorId]: grade
        }))
    }

    const isRepeatableGrade = (grade?: string) => {
        if (!grade) return false
        const points = GRADE_POINTS[grade.toUpperCase()]
        return points !== undefined && points <= GRADE_POINTS["C-"]
    }

    const gradeOrder = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"]
    const historyQuery = historySearch.trim().toLowerCase()

    const historyGradeDistribution = transcript
        ? Object.entries(
            transcript.semesters.flatMap(sem => sem.courses).reduce<Record<string, number>>((acc, course) => {
                const grade = course.grade?.toUpperCase()
                if (grade && GRADE_POINTS[grade] !== undefined) {
                    acc[grade] = (acc[grade] || 0) + 1
                }
                return acc
            }, {})
        ).sort((a, b) => gradeOrder.indexOf(a[0]) - gradeOrder.indexOf(b[0]))
        : []

    const historyRepeatableCourses = transcript
        ? transcript.semesters.flatMap(sem =>
            sem.courses
                .filter(course => isRepeatableGrade(course.grade))
                .map(course => ({ ...course, semesterName: sem.semesterName }))
        )
        : []

    const historyTrendPoints = transcript
        ? transcript.semesters
            .map((sem, index) => ({ x: index, y: sem.sgpa ?? null, label: sem.semesterName }))
            .filter(point => point.y !== null)
        : []

    const filteredHistorySemesters = transcript
        ? transcript.semesters
            .map(sem => ({
                ...sem,
                courses: sem.courses.filter(course => {
                    const matchesQuery = !historyQuery ||
                        course.courseCode.toLowerCase().includes(historyQuery) ||
                        course.courseName.toLowerCase().includes(historyQuery) ||
                        sem.semesterName.toLowerCase().includes(historyQuery)

                    if (!matchesQuery) return false
                    if (historyFilter === "repeatable") return isRepeatableGrade(course.grade)
                    if (historyFilter === "withdrawn") return course.status === "W"
                    return true
                })
            }))
            .filter(sem => sem.courses.length > 0)
        : []

    const normalizedSimulatorSearch = simulatorSearch.trim().toLowerCase()

    const matchesSimulatorSearch = (course: SimulatorCourse) => {
        if (!normalizedSimulatorSearch) return true
        return course.code.toLowerCase().includes(normalizedSimulatorSearch) ||
            course.title.toLowerCase().includes(normalizedSimulatorSearch) ||
            course.semesterName.toLowerCase().includes(normalizedSimulatorSearch) ||
            (course.matchedCode || "").toLowerCase().includes(normalizedSimulatorSearch) ||
            (course.matchedTitle || "").toLowerCase().includes(normalizedSimulatorSearch)
    }

    const visibleSimulatorCourses = allSimulatorCourses.filter(matchesSimulatorSearch)
        .filter(course => {
            if (simulatorFilter === "completed") return course.status === "Completed"
            if (simulatorFilter === "repeatable") return course.status === "Completed" && isRepeatableGrade(course.grade)
            if (simulatorFilter === "available") return course.status === "Available" || course.status === "In Progress"
            return true
        })

    const getSimulatedGPA = (): string => {
        const baseCredits = transcript?.cumulative?.creditsPassed || 0
        const baseGpa = transcript?.cumulative?.cgpa || 0

        let totalPoints = baseGpa * baseCredits
        let totalGpaHours = baseCredits

        allSimulatorCourses.forEach(course => {
            if (course.status !== "Completed" || course.credits <= 0) return

            const simGrade = simulatedGrades[course.simulatorId]
            if (!simGrade || simGrade === "N/A" || simGrade === course.grade) return

            const originalPoints = GRADE_POINTS[course.grade || ""]
            const simulatedPoints = GRADE_POINTS[simGrade]

            if (originalPoints === undefined || simulatedPoints === undefined) return

            totalPoints -= originalPoints * course.credits
            totalPoints += simulatedPoints * course.credits
        })

        remainingPlanCourses.forEach(course => {
            const simGrade = simulatedGrades[course.simulatorId]
            if (!simGrade || simGrade === "N/A" || course.credits <= 0) return

            const points = GRADE_POINTS[simGrade]
            if (points === undefined) return

            totalPoints += points * course.credits
            totalGpaHours += course.credits
        })

        if (totalGpaHours === 0) return "0.00"
        return (totalPoints / totalGpaHours).toFixed(2)
    }



    // 4. File Re-upload Handler
    const handleReupload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!planFile && !transcriptFile) {
            setUploadError("Please select at least one file to upload.")
            return
        }
        setUploadLoading(true)
        setUploadError("")

        try {
            if (planFile) {
                const formData = new FormData()
                formData.append("plan", planFile)
                const res = await fetch("/api/plan", { method: "POST", body: formData })
                if (!res.ok) throw new Error("Study plan analysis failed.")
                const json = await res.json()
                if (json.success) {
                    writeStoredPlan(json.data)
                    setPlan(json.data)
                    if (user && !user.isGuest && user.id && isSupabaseConfigured && supabase) {
                        await supabase.from('profiles').update({ plan_data: json.data }).eq('id', user.id)
                    }
                }
            }

            if (transcriptFile) {
                const formData = new FormData()
                formData.append("transcript", transcriptFile)
                const res = await fetch("/api/transcript", { method: "POST", body: formData })
                if (!res.ok) throw new Error("Transcript analysis failed.")
                const json = await res.json()
                if (json.success) {
                    writeStoredTranscript(json.data)
                    setTranscript(json.data)
                    if (user && !user.isGuest && user.id && isSupabaseConfigured && supabase) {
                        await supabase.from('profiles').update({ transcript_data: json.data }).eq('id', user.id)
                    }
                }
            }

            setPlanFile(null)
            setTranscriptFile(null)
            alert("Files updated and analyzed successfully!")
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Upload failed.")
        } finally {
            setUploadLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950/40 p-4 sm:p-6 pb-20">
            {/* Top Bar Header */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-6 border-slate-200 dark:border-slate-800">
                <div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">
                        Academic Planner Dashboard
                    </span>
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        Hello, {user?.fullName || "Student"}!
                    </h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                        <GraduationCap className="h-4 w-4 text-emerald-600 shrink-0" />
                        Degree: <span className="font-semibold text-foreground">{plan?.degreeName || transcript?.program || "Not uploaded yet"}</span>
                    </p>
                </div>
                
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <Button
                        variant="outline"
                        onClick={() => setActiveTab("settings")}
                        className="w-full bg-card hover:bg-slate-100 dark:hover:bg-slate-800 sm:w-auto"
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload / Update Info
                    </Button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-6">
                {/* 1. Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* GPA Metric */}
                    <Card className="shadow-sm border border-slate-200 dark:border-slate-800/80 bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                        <CardHeader className="pb-2 pt-5">
                            <CardDescription className="text-xs uppercase font-bold tracking-wider flex justify-between items-center">
                                Degree GPA
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                            </CardDescription>
                            <CardTitle className="text-3xl font-black mt-1">
                                {currentGPA.toFixed(2)} <span className="text-xs text-muted-foreground font-normal">/ 4.00</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-5">
                            <Badge className={`font-semibold text-xs ${honors.color}`}>
                                {honors.label}
                            </Badge>
                        </CardContent>
                    </Card>

                    {/* Progress Metric */}
                    <Card className="shadow-sm border border-slate-200 dark:border-slate-800/80 bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                        <CardHeader className="pb-2 pt-5">
                            <CardDescription className="text-xs uppercase font-bold tracking-wider flex justify-between items-center">
                                Credits Progress
                                <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                            </CardDescription>
                            <CardTitle className="text-3xl font-black mt-1">
                                {passedCredits} <span className="text-xs text-muted-foreground font-normal">/ {totalPlanCredits} CR</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-5">
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div 
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, (passedCredits / totalPlanCredits) * 100)}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1.5 block font-medium">
                                {((passedCredits / totalPlanCredits) * 100).toFixed(1)}% Degree Credits completed
                            </span>
                        </CardContent>
                    </Card>

                    {/* Remaining Credits */}
                    <Card className="shadow-sm border border-slate-200 dark:border-slate-800/80 bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500" />
                        <CardHeader className="pb-2 pt-5">
                            <CardDescription className="text-xs uppercase font-bold tracking-wider flex justify-between items-center">
                                Remaining Credits
                                <Clock className="h-4 w-4 text-cyan-600" />
                            </CardDescription>
                            <CardTitle className="text-3xl font-black mt-1">
                                {Math.max(0, totalPlanCredits - passedCredits)} <span className="text-xs text-muted-foreground font-normal">Credits left</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-5">
                            <span className="text-xs text-muted-foreground font-medium block">
                                Approx. {Math.ceil(Math.max(0, totalPlanCredits - passedCredits) / 15)} Semesters at full-time load (15 CR)
                            </span>
                        </CardContent>
                    </Card>

                    {/* Courses Count */}
                    <Card className="shadow-sm border border-slate-200 dark:border-slate-800/80 bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                        <CardHeader className="pb-2 pt-5">
                            <CardDescription className="text-xs uppercase font-bold tracking-wider flex justify-between items-center">
                                Course Summary
                                <BookOpen className="h-4 w-4 text-amber-600" />
                            </CardDescription>
                            <CardTitle className="text-3xl font-black mt-1">
                                {completedCoursesCount} <span className="text-xs text-muted-foreground font-normal">Completed</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-5 space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>In Progress:</span>
                                <span className="font-semibold text-foreground">{inProgressCoursesCount}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Remaining:</span>
                                <span className="font-semibold text-foreground">{remainingCoursesCount}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 2. Navigation Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-1">
                    <button
                        onClick={() => setActiveTab("plan")}
                        className={`py-3.5 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
                            activeTab === "plan"
                                ? "border-emerald-600 text-emerald-600"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <GraduationCap className="h-4 w-4" />
                        Study Plan Progress
                    </button>
                    <button
                        onClick={() => setActiveTab("remaining")}
                        className={`py-3.5 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
                            activeTab === "remaining"
                                ? "border-emerald-600 text-emerald-600"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <BookOpen className="h-4 w-4" />
                        Remaining Courses ({remainingCoursesCount})
                    </button>
                    <button
                        onClick={() => setActiveTab("simulator")}
                        className={`py-3.5 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
                            activeTab === "simulator"
                                ? "border-emerald-600 text-emerald-600"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Calculator className="h-4 w-4" />
                        GPA Simulator
                    </button>
                    {transcript && (
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`py-3.5 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
                                activeTab === "history"
                                    ? "border-emerald-600 text-emerald-600"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <BarChart3 className="h-4 w-4" />
                            Academic History
                        </button>
                    )}
                </div>

                {/* 3. Tab Contents */}
                {activeTab === "plan" && (
                    <div className="space-y-6">
                        {!plan ? (
                            <Card className="border-2 border-dashed py-12 text-center max-w-lg mx-auto">
                                <CardHeader>
                                    <div className="mx-auto bg-slate-100 p-4 rounded-full w-fit dark:bg-slate-900 mb-2">
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <CardTitle>No Study Plan Uploaded</CardTitle>
                                    <CardDescription>
                                        Upload your university degree plan PDF to show the structured course path.
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter className="justify-center">
                                    <Button onClick={() => setActiveTab("settings")} className="bg-emerald-600 hover:bg-emerald-700">
                                        Upload Plan Now
                                    </Button>
                                </CardFooter>
                            </Card>
                        ) : (
                            enrichedSemesters.map((sem, sIdx) => (
                                <Card key={sIdx} className="shadow-sm border border-slate-200 dark:border-slate-800/80">
                                    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 border-b py-4">
                                        <CardTitle className="text-lg font-bold flex justify-between items-center flex-wrap gap-2">
                                            <span>{sem.semesterName}</span>
                                            <span className="text-xs text-muted-foreground font-normal">
                                                Total Credits: <span className="font-semibold text-foreground">{sem.courses.reduce((s, c) => s + c.credits, 0)} CR</span>
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-slate-100 dark:divide-slate-900">
                                            {sem.courses.map((course, cIdx) => (
                                                <div 
                                                    key={cIdx} 
                                                    className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-mono text-sm font-bold bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded text-slate-700 dark:text-slate-350">
                                                                {course.matchedCode || course.code}
                                                            </span>
                                                            <span className="text-sm font-semibold text-foreground">
                                                                {course.matchedTitle || course.title}
                                                            </span>
                                                            <Badge variant="outline" className="text-[10px] font-semibold py-0 scale-95 border-slate-300">
                                                                {course.type}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                                            <span>Credits: <strong className="text-foreground">{course.credits}</strong></span>
                                                            <span>Prerequisites: <strong className="text-foreground">{course.prerequisites}</strong></span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {course.status === "Completed" && (
                                                            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 font-bold px-2.5 py-1">
                                                                Completed ({course.grade})
                                                            </Badge>
                                                        )}
                                                        {course.status === "In Progress" && (
                                                            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 font-bold px-2.5 py-1 flex items-center gap-1">
                                                                <Clock className="h-3 w-3 animate-spin" />
                                                                Enrolled
                                                            </Badge>
                                                        )}
                                                        {course.status === "Available" && (
                                                            <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-900 font-semibold px-2.5 py-1 flex items-center gap-1">
                                                                <Unlock className="h-3 w-3" />
                                                                Available
                                                            </Badge>
                                                        )}
                                                        {course.status === "Locked" && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-900 font-semibold px-2.5 py-1 flex items-center gap-1">
                                                                    <Lock className="h-3 w-3" />
                                                                    Locked
                                                                </Badge>
                                                                {course.missingPrereqs && (
                                                                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                                                                        Needs: {course.missingPrereqs.join(", ")}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {activeTab === "remaining" && (
                    <Card className="shadow-sm border border-slate-200 dark:border-slate-800/80">
                        <CardHeader>
                            <CardTitle>Remaining Degree Courses</CardTitle>
                            <CardDescription>
                                The following courses are missing from your transcript and are required to fulfill your graduation plan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {remainingPlanCourses.length === 0 ? (
                                <div className="text-center py-12">
                                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2 animate-bounce" />
                                    <h3 className="text-lg font-bold">Congratulations!</h3>
                                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                                        You have met all study plan requirements and are ready to graduate!
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-900">
                                    {remainingPlanCourses.map((course, idx) => (
                                        <div 
                                            key={idx} 
                                            className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-bold bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded text-slate-700 dark:text-slate-350">
                                                        {course.code}
                                                    </span>
                                                    <span className="text-sm font-semibold text-foreground">
                                                        {course.title}
                                                    </span>
                                                    <Badge variant="secondary" className="text-[10px] scale-90">
                                                        {course.type}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                                    <span>Credits: <strong className="text-foreground">{course.credits} CR</strong></span>
                                                    <span>Prerequisites: <strong className="text-foreground">{course.prerequisites}</strong></span>
                                                </div>
                                            </div>

                                            <div>
                                                {course.status === "Available" ? (
                                                    <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-900 font-semibold px-2.5 py-1 flex items-center gap-1">
                                                        <Unlock className="h-3 w-3" />
                                                        Ready to Take
                                                    </Badge>
                                                ) : course.status === "In Progress" ? (
                                                    <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-900 font-semibold px-2.5 py-1 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        In Progress
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-900 font-semibold px-2.5 py-1 flex items-center gap-1">
                                                        <Lock className="h-3 w-3" />
                                                        Locked
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === "simulator" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Simulation controls */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="shadow-sm border border-slate-200 dark:border-slate-800/80">
                                <CardHeader className="space-y-4 pb-4">
                                    <div>
                                        <CardTitle>Select Simulated Grades</CardTitle>
                                        <CardDescription>
                                            Select the hypothetical grades you expect to get in your courses to simulate your final degree GPA.
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { key: "all", label: "All Courses" },
                                            { key: "completed", label: "Completed" },
                                            { key: "repeatable", label: "Can Be Repeated" },
                                            { key: "available", label: "Available" }
                                        ].map((filter) => (
                                            <Button
                                                key={filter.key}
                                                type="button"
                                                variant={simulatorFilter === filter.key ? "default" : "outline"}
                                                onClick={() => setSimulatorFilter(filter.key as typeof simulatorFilter)}
                                                className={simulatorFilter === filter.key ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                                            >
                                                {filter.label}
                                            </Button>
                                        ))}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Input
                                        value={simulatorSearch}
                                        onChange={(e) => setSimulatorSearch(e.target.value)}
                                        placeholder="Search by course code or title"
                                        className="h-10"
                                    />
                                    <div className="simulator-scrollbar max-h-[500px] overflow-y-auto divide-y dark:divide-slate-900 pr-1">
                                        {visibleSimulatorCourses.length === 0 ? (
                                            <p className="text-sm text-muted-foreground py-4 text-center">No courses match your search.</p>
                                        ) : (
                                            visibleSimulatorCourses.map((course) => (
                                            <div key={course.simulatorId} className="flex flex-col items-stretch sm:flex-row sm:justify-between sm:items-center py-3 gap-3 sm:gap-4">
                                                    <div className="min-w-0">
                                                        <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2">
                                                            {course.code}
                                                            <span className="text-[10px] font-semibold text-muted-foreground">({course.credits} CR)</span>
                                                            {course.status === "Completed" ? (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                    Completed ({course.grade})
                                                                </span>
                                                            ) : course.status === "In Progress" ? (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                                    In Progress
                                                                </span>
                                                            ) : (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                                                    Remaining
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate max-w-[280px]">{course.title}</p>
                                                        {course.status === "Completed" && isRepeatableGrade(course.grade) && (
                                                            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1">
                                                                Can be repeated
                                                            </p>
                                                        )}
                                                        <p className="text-[11px] text-muted-foreground mt-1">{course.semesterName}</p>
                                                    </div>
                                                    
                                                    <select
                                                        value={simulatedGrades[course.simulatorId] || (course.status === "Completed" ? course.grade : "N/A")}
                                                        onChange={(e) => handleSimGradeChange(course.simulatorId, e.target.value)}
                                                        className="w-full sm:w-24 px-2 py-2 sm:py-1 text-sm border rounded bg-card dark:border-slate-850"
                                                    >
                                                        {course.status !== "Completed" && <option value="N/A">- Select -</option>}
                                                        {GRADE_OPTIONS.map(g => (
                                                            <option key={g} value={g}>{g}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Simulation results summary */}
                        <div className="space-y-6">
                            {/* Result GPA Card */}
                            <Card className="shadow-sm border border-slate-200 dark:border-slate-800/80 bg-gradient-to-br from-emerald-500 to-teal-600 text-white relative overflow-hidden">
                                <div className="absolute -right-4 -bottom-4 opacity-10">
                                    <Calculator className="h-44 w-44" />
                                </div>
                                <CardHeader>
                                    <CardTitle className="text-lg">Simulated Output</CardTitle>
                                    <CardDescription className="text-emerald-100 text-xs">Based on current GPA and selected inputs</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-[10px] uppercase font-bold text-emerald-150 tracking-wider">Simulated Final GPA</p>
                                    <h2 className="text-5xl font-black tracking-tight">{getSimulatedGPA()}</h2>
                                    
                                    <div className="pt-2 flex justify-between text-xs text-emerald-100 border-t border-white/20">
                                        <span>Current GPA: <strong>{currentGPA.toFixed(2)}</strong></span>
                                        <span>Simulated Courses: <strong>{Object.values(simulatedGrades).filter(v => v !== "N/A").length}</strong></span>
                                    </div>
                                </CardContent>
                            </Card>


                        </div>
                    </div>
                )}

                {activeTab === "history" && transcript && (
                    <Card className="shadow-sm border border-slate-200 dark:border-slate-800/80">
                        <CardHeader>
                            <CardTitle>Academic Transcript History</CardTitle>
                            <CardDescription>
                                Semesters completed and course attempts extracted from your academic transcript.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Card className="border border-slate-200 dark:border-slate-800/80">
                                    <CardContent className="p-4">
                                        <p className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Recorded Semesters</p>
                                        <p className="text-3xl font-black mt-2">{transcript.semesters.length}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border border-slate-200 dark:border-slate-800/80">
                                    <CardContent className="p-4">
                                        <p className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Repeatable Courses</p>
                                        <p className="text-3xl font-black mt-2">{historyRepeatableCourses.length}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border border-slate-200 dark:border-slate-800/80">
                                    <CardContent className="p-4">
                                        <p className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Grades Counted</p>
                                        <p className="text-3xl font-black mt-2">{historyGradeDistribution.reduce((sum, [, count]) => sum + count, 0)}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                <Card className="xl:col-span-2 border border-slate-200 dark:border-slate-800/80">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Grade Distribution</CardTitle>
                                        <CardDescription>How often each recorded grade appears in your transcript.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {historyGradeDistribution.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No final grades available yet.</p>
                                        ) : (
                                            <svg viewBox={`0 0 520 ${historyGradeDistribution.length * 44 + 20}`} className="w-full h-auto">
                                                {historyGradeDistribution.map(([grade, count], index) => {
                                                    const maxCount = Math.max(...historyGradeDistribution.map(([, currentCount]) => currentCount))
                                                    const barWidth = maxCount > 0 ? (count / maxCount) * 320 : 0
                                                    const y = index * 44 + 10
                                                    return (
                                                        <g key={grade} transform={`translate(0, ${y})`}>
                                                            <text x="0" y="18" className="fill-current text-[13px] font-bold text-slate-700 dark:text-slate-300">
                                                                {grade}
                                                            </text>
                                                            <rect x="56" y="2" rx="10" ry="10" width="340" height="22" className="fill-slate-200 dark:fill-slate-800" />
                                                            <rect x="56" y="2" rx="10" ry="10" width={barWidth} height="22" fill="url(#gradeBar)" />
                                                            <text x="410" y="18" className="fill-current text-[12px] font-semibold text-slate-600 dark:text-slate-400">
                                                                {count} courses
                                                            </text>
                                                        </g>
                                                    )
                                                })}
                                                <defs>
                                                    <linearGradient id="gradeBar" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#10b981" />
                                                        <stop offset="100%" stopColor="#2563eb" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="border border-slate-200 dark:border-slate-800/80">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Repeatable Courses</CardTitle>
                                        <CardDescription>Courses with grades of `C-` or below.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {historyRepeatableCourses.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No repeatable courses found.</p>
                                        ) : (
                                            historyRepeatableCourses.slice(0, 6).map((course, index) => (
                                                <div key={`${course.courseCode}-${index}`} className="rounded-lg border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/10 p-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="font-mono text-xs font-bold text-amber-700 dark:text-amber-300">{course.courseCode}</p>
                                                            <p className="text-sm font-medium">{course.courseName}</p>
                                                            <p className="text-[11px] text-muted-foreground mt-1">{course.semesterName}</p>
                                                        </div>
                                                        <Badge className="bg-amber-500 text-white font-bold">{course.grade}</Badge>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="border border-slate-200 dark:border-slate-800/80">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Semester SGPA Trend</CardTitle>
                                    <CardDescription>Recorded semester GPA changes across your transcript.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {historyTrendPoints.length < 2 ? (
                                        <p className="text-sm text-muted-foreground">Not enough SGPA values to draw a trend yet.</p>
                                    ) : (
                                        <svg viewBox="0 0 640 220" className="w-full h-auto">
                                            <line x1="44" y1="180" x2="612" y2="180" stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="1.5" />
                                            <line x1="44" y1="20" x2="44" y2="180" stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="1.5" />
                                            {Array.from({ length: 5 }).map((_, index) => {
                                                const y = 180 - index * 40
                                                const label = (index).toFixed(0)
                                                return (
                                                    <g key={index}>
                                                        <line x1="44" y1={y} x2="612" y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="4 4" />
                                                        <text x="16" y={y + 4} className="fill-current text-[11px] text-slate-500 dark:text-slate-400">{label}</text>
                                                    </g>
                                                )
                                            })}
                                            <polyline
                                                fill="none"
                                                stroke="#10b981"
                                                strokeWidth="4"
                                                strokeLinejoin="round"
                                                strokeLinecap="round"
                                                points={historyTrendPoints.map((point, index) => {
                                                    const x = 44 + (index / Math.max(1, historyTrendPoints.length - 1)) * 568
                                                    const y = 180 - ((point.y as number) / 4) * 160
                                                    return `${x},${y}`
                                                }).join(" ")}
                                            />
                                            {historyTrendPoints.map((point, index) => {
                                                const x = 44 + (index / Math.max(1, historyTrendPoints.length - 1)) * 568
                                                const y = 180 - ((point.y as number) / 4) * 160
                                                return (
                                                    <g key={point.label}>
                                                        <circle cx={x} cy={y} r="5" fill="#2563eb" />
                                                        <text x={x} y="202" textAnchor="middle" className="fill-current text-[10px] text-slate-500 dark:text-slate-400">
                                                            {index + 1}
                                                        </text>
                                                        <text x={x} y={y - 12} textAnchor="middle" className="fill-current text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                                            {(point.y as number).toFixed(2)}
                                                        </text>
                                                    </g>
                                                )
                                            })}
                                        </svg>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="flex flex-col gap-3 md:flex-row">
                                <Input
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    placeholder="Search by semester, course code, or title"
                                    className="md:max-w-sm"
                                />
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { key: "all", label: "All Courses" },
                                        { key: "repeatable", label: "Repeatable" },
                                        { key: "withdrawn", label: "Withdrawn" }
                                    ].map((filter) => (
                                        <Button
                                            key={filter.key}
                                            type="button"
                                            variant={historyFilter === filter.key ? "default" : "outline"}
                                            onClick={() => setHistoryFilter(filter.key as typeof historyFilter)}
                                            className={historyFilter === filter.key ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                                        >
                                            {filter.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {filteredHistorySemesters.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No academic history matches your current filters.</p>
                            ) : filteredHistorySemesters.map((sem, sIdx) => (
                                <div key={sIdx} className="space-y-3">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center border-b pb-1">
                                        <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{sem.semesterName}</h3>
                                        <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50/20 w-fit">
                                            GPA: {sem.sgpa?.toFixed(2) || "N/A"} | Attended Credits: {sem.semesterCreditsAttended || 0}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {sem.courses.map((course, cIdx) => (
                                            <div key={cIdx} className="flex justify-between items-center p-2.5 bg-slate-50/50 dark:bg-slate-900/30 border rounded-lg hover:border-indigo-400/30 transition-colors">
                                                <div className="min-w-0 pr-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-mono text-xs font-bold text-slate-700 dark:text-slate-350">{course.courseCode}</p>
                                                        {isRepeatableGrade(course.grade) && (
                                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                                                Repeatable
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">{course.courseName}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs text-muted-foreground font-semibold">{course.creditHours} CR</span>
                                                    <Badge className={`${isRepeatableGrade(course.grade) ? "bg-amber-500" : "bg-indigo-600"} text-white font-bold scale-90`}>
                                                        {course.grade}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {activeTab === "profile" && (
                    <Card className="shadow-sm border border-slate-200 dark:border-slate-800/80 max-w-xl mx-auto">
                        <CardHeader>
                            <CardTitle>Edit Account Info</CardTitle>
                            <CardDescription>
                                Update your displayed full name and username.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleProfileUpdate} className="space-y-5">
                                {profileError && (
                                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-sm">
                                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                        <span>{profileError}</span>
                                    </div>
                                )}
                                {profileSuccess && (
                                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-900/50 text-sm">
                                        {profileSuccess}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="profile-full-name" className="text-sm font-semibold">
                                        Full Name
                                    </Label>
                                    <Input
                                        id="profile-full-name"
                                        value={profileFullName}
                                        onChange={(e) => setProfileFullName(e.target.value)}
                                        disabled={profileSaving}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="profile-username" className="text-sm font-semibold">
                                        Username
                                    </Label>
                                    <Input
                                        id="profile-username"
                                        value={profileUsername}
                                        onChange={(e) => setProfileUsername(e.target.value)}
                                        disabled={profileSaving}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 font-semibold"
                                    disabled={profileSaving}
                                >
                                    {profileSaving ? (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                            Saving profile...
                                        </>
                                    ) : (
                                        "Save Account Changes"
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {activeTab === "settings" && (
                    <div className="mx-auto max-w-xl">
                        <Card className="shadow-sm border border-slate-200 dark:border-slate-800/80">
                            <CardHeader>
                                <CardTitle>Update Academic Data Files</CardTitle>
                                <CardDescription>
                                    Re-upload or replace your study plan or academic transcript PDF. Your new files will be parsed and the dashboard will update automatically.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleReupload} className="space-y-5">
                                {uploadError && (
                                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-sm">
                                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                        <span>{uploadError}</span>
                                    </div>
                                )}

                                {/* Study Plan Upload */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold flex items-center gap-1.5 text-emerald-600">
                                        <Upload className="h-4 w-4" />
                                        Study Plan PDF
                                    </Label>
                                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                                        <Input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setPlanFile(e.target.files?.[0] || null)}
                                            className="cursor-pointer"
                                            disabled={uploadLoading}
                                        />
                                        {plan && (
                                            <Badge variant="outline" className="border-emerald-600 text-emerald-600 font-semibold shrink-0">
                                                Active
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Transcript Upload */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold flex items-center gap-1.5 text-indigo-600">
                                        <FileText className="h-4 w-4" />
                                        Academic Transcript PDF
                                    </Label>
                                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                                        <Input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)}
                                            className="cursor-pointer"
                                            disabled={uploadLoading}
                                        />
                                        {transcript && (
                                            <Badge variant="outline" className="border-indigo-600 text-indigo-600 font-semibold shrink-0">
                                                Active
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 font-semibold mt-4"
                                    disabled={uploadLoading}
                                >
                                    {uploadLoading ? (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                            Re-analyzing files...
                                        </>
                                    ) : (
                                        "Save and Parse Updates"
                                    )}
                                </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </main>
    )
}
