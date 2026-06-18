"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { authService, UserSession } from "@/lib/auth-service"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { readStoredPlan, readStoredTranscript, writeStoredPlan, writeStoredTranscript } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
    GraduationCap, 
    Upload, 
    FileText, 
    Loader2, 
    CheckCircle2, 
    User, 
    Lock, 
    FileUp, 
    ArrowRight, 
    ChevronRight,
    ArrowLeft,
    Sparkles,
    AlertCircle,
    Laptop,
    Briefcase,
    Wrench,
    FlaskConical,
    Palette,
    Scale,
    HeartPulse,
    BookOpen,
    Layers,
    Search,
    Building2
} from "lucide-react"

const getCollegeIcon = (slug: string) => {
    switch (slug) {
        case "college-of-information-technology":
            return Laptop
        case "college-of-business-administration":
            return Briefcase
        case "college-of-engineering":
            return Wrench
        case "college-of-science":
            return FlaskConical
        case "college-of-arts":
            return Palette
        case "college-of-law":
            return Scale
        case "college-of-health-and-sport-sciences":
            return HeartPulse
        case "bahrain-teachers-college":
            return BookOpen
        case "college-of-applied-studies":
            return Layers
        default:
            return Building2
    }
}

const getCollegeColor = (slug: string) => {
    switch (slug) {
        case "college-of-information-technology":
            return {
                text: "text-blue-600 dark:text-blue-400",
                bg: "bg-blue-50 dark:bg-blue-950/20",
                border: "border-blue-100 dark:border-blue-900/30 hover:border-blue-500 hover:shadow-blue-500/10",
                badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            }
        case "college-of-business-administration":
            return {
                text: "text-amber-600 dark:text-amber-400",
                bg: "bg-amber-50 dark:bg-amber-950/20",
                border: "border-amber-100 dark:border-amber-900/30 hover:border-amber-500 hover:shadow-amber-500/10",
                badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
            }
        case "college-of-engineering":
            return {
                text: "text-orange-600 dark:text-orange-400",
                bg: "bg-orange-50 dark:bg-orange-950/20",
                border: "border-orange-100 dark:border-orange-900/30 hover:border-orange-500 hover:shadow-orange-500/10",
                badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
            }
        case "college-of-science":
            return {
                text: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-50 dark:bg-emerald-950/20",
                border: "border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-500 hover:shadow-emerald-500/10",
                badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
            }
        case "college-of-arts":
            return {
                text: "text-purple-600 dark:text-purple-400",
                bg: "bg-purple-50 dark:bg-purple-950/20",
                border: "border-purple-100 dark:border-purple-900/30 hover:border-purple-500 hover:shadow-purple-500/10",
                badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
            }
        case "college-of-law":
            return {
                text: "text-rose-600 dark:text-rose-400",
                bg: "bg-rose-50 dark:bg-rose-950/20",
                border: "border-rose-100 dark:border-rose-900/30 hover:border-rose-500 hover:shadow-rose-500/10",
                badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
            }
        case "college-of-health-and-sport-sciences":
            return {
                text: "text-red-600 dark:text-red-400",
                bg: "bg-red-50 dark:bg-red-950/20",
                border: "border-red-100 dark:border-red-900/30 hover:border-red-500 hover:shadow-red-500/10",
                badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            }
        case "bahrain-teachers-college":
            return {
                text: "text-teal-600 dark:text-teal-400",
                bg: "bg-teal-50 dark:bg-teal-950/20",
                border: "border-teal-100 dark:border-teal-900/30 hover:border-teal-500 hover:shadow-teal-500/10",
                badge: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300"
            }
        case "college-of-applied-studies":
            return {
                text: "text-indigo-600 dark:text-indigo-400",
                bg: "bg-indigo-50 dark:bg-indigo-950/20",
                border: "border-indigo-100 dark:border-indigo-900/30 hover:border-indigo-500 hover:shadow-indigo-500/10",
                badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
            }
        default:
            return {
                text: "text-slate-600 dark:text-slate-400",
                bg: "bg-slate-50 dark:bg-slate-950/20",
                border: "border-slate-100 dark:border-slate-800 hover:border-slate-500 hover:shadow-slate-500/10",
                badge: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300"
            }
    }
}

const getCollegeDesc = (slug: string) => {
    switch (slug) {
        case "college-of-information-technology":
            return "Computer Science, Information Systems, Software Engineering, Networks..."
        case "college-of-business-administration":
            return "Management, Marketing, Accounting, Finance, Economics..."
        case "college-of-engineering":
            return "Mechanical, Chemical, Electrical, Civil, Process Engineering..."
        case "college-of-science":
            return "Physics, Chemistry, Biology, Mathematics, Statistics..."
        case "college-of-arts":
            return "English, Arabic, History, Media, Fine Arts, Sociology..."
        case "college-of-law":
            return "Private Law, Public Law, legal studies..."
        case "college-of-health-and-sport-sciences":
            return "Nursing, Allied Health, Pharmacy, Physical Education..."
        case "bahrain-teachers-college":
            return "Teacher training, pedagogy, and primary education..."
        case "college-of-applied-studies":
            return "Associate degrees and technical/applied bachelor programs..."
        default:
            return "University academic departments and curriculum plans."
    }
}

export default function GetStartedPage() {
    const router = useRouter()
    
    // Steps: 1 = Auth, 2 = File Upload
    const [step, setStep] = useState(1)
    const [user, setUser] = useState<UserSession | null>(null)
    
    // Auth Form State
    const [authMode, setAuthMode] = useState<"register" | "login" | "guest">("register")
    const [fullName, setFullName] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [authLoading, setAuthLoading] = useState(false)
    const [authError, setAuthError] = useState("")
    
    // File Upload State
    const [planFile, setPlanFile] = useState<File | null>(null)
    const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
    const [analyzeLoading, setAnalyzeLoading] = useState(false)
    const [analyzeError, setAnalyzeError] = useState("")
    const [statusMessage, setStatusMessage] = useState("")

    // Official Study Plan selection state
    const [planSource, setPlanSource] = useState<"official" | "upload">("official")
    const [colleges, setColleges] = useState<any[]>([])
    const [selectedCollege, setSelectedCollege] = useState("")
    const [selectedProgram, setSelectedProgram] = useState("")
    const [selectedYear, setSelectedYear] = useState("")

    // Wizard sub-step state inside Step 2
    const [wizardStep, setWizardStep] = useState(1)
    const [programSearch, setProgramSearch] = useState("")

    const handlePrevSubStep = () => {
        if (wizardStep === 1) {
            setStep(1)
        } else if (wizardStep === 5 && planSource === "upload") {
            setWizardStep(1)
        } else {
            setWizardStep(prev => prev - 1)
        }
    }

    // Load official plans manifest on component mount
    useEffect(() => {
        async function fetchManifest() {
            try {
                const res = await fetch("/api/plan")
                if (res.ok) {
                    const json = await res.json()
                    if (json && json.success) {
                        setColleges(json.data)
                    }
                }
            } catch (err) {
                console.error("Failed to load official plans manifest:", err)
            }
        }
        fetchManifest()
    }, [])

    const restoreAcademicDataAndRedirect = useCallback(async (currentUser: UserSession) => {
        const storedPlan = readStoredPlan()
        const storedTranscript = readStoredTranscript()

        if (storedPlan && storedTranscript) {
            router.push("/dashboard")
            return true
        }

        if (currentUser.isGuest || !currentUser.id || !isSupabaseConfigured || !supabase) {
            return false
        }

        const client = supabase
        try {
            const { data: profile, error } = await client
                .from("profiles")
                .select("plan_data, transcript_data")
                .eq("id", currentUser.id)
                .single()

            if (error) return false

            const nextPlanData = storedPlan ?? profile?.plan_data ?? null
            const nextTranscriptData = storedTranscript ?? profile?.transcript_data ?? null

            if (nextPlanData) {
                writeStoredPlan(nextPlanData)
            }
            if (nextTranscriptData) {
                writeStoredTranscript(nextTranscriptData)
            }

            if (nextPlanData && nextTranscriptData) {
                router.push("/dashboard")
                return true
            }

            return false
        } catch {
            return false
        }
    }, [router])

    useEffect(() => {
        // If user already logged in, restore session and skip upload step when both files already exist.
        const currentUser = authService.getCurrentUser()
        if (!currentUser) return

        if (currentUser.isGuest) {
            authService.signOut()
            setUser(null)
            return
        }

        setUser(currentUser)

        const restoreExistingData = async () => {
            const redirected = await restoreAcademicDataAndRedirect(currentUser)
            if (!redirected) {
                setStep(2)
            }
        }

        restoreExistingData()
    }, [restoreAcademicDataAndRedirect])

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setAuthError("")
        setAuthLoading(true)

        try {
            if (authMode === "register") {
                if (!fullName.trim() || !username.trim() || !password.trim()) {
                    setAuthError("All fields are required")
                    setAuthLoading(false)
                    return
                }
                const res = await authService.signUp(fullName, username, password)
                if (res.success && res.user) {
                    setUser(res.user)
                    setStep(2)
                } else {
                    setAuthError(res.error || "Signup failed")
                }
            } else if (authMode === "login") {
                if (!username.trim() || !password.trim()) {
                    setAuthError("Username and password are required")
                    setAuthLoading(false)
                    return
                }
                const res = await authService.signIn(username, password)
                if (res.success && res.user) {
                    setUser(res.user)
                    const redirected = await restoreAcademicDataAndRedirect(res.user)
                    if (!redirected) {
                        setStep(2)
                    }
                } else {
                    setAuthError(res.error || "Login failed")
                }
            }
        } catch (err) {
            setAuthError("An unexpected error occurred")
        } finally {
            setAuthLoading(false)
        }
    }

    const handleGuest = async () => {
        setAuthLoading(true)
        const guestSession = await authService.continueAsGuest()
        setUser(guestSession)
        const redirected = await restoreAcademicDataAndRedirect(guestSession)
        if (!redirected) {
            setStep(2)
        }
        setAuthLoading(false)
    }

    const handleAnalyze = async () => {
        setAnalyzeLoading(true)
        setAnalyzeError("")
        
        try {
            let transcriptData = null
            let planData = null

            // 1. Fetch study plan
            if (planSource === "official") {
                if (selectedCollege || selectedProgram || selectedYear) {
                    if (!selectedCollege || !selectedProgram || !selectedYear) {
                        throw new Error("Please complete the official study plan selection (College, Program, and Year).")
                    }
                    setStatusMessage("Fetching official study plan...")
                    const planRes = await fetch(`/api/plan?college=${selectedCollege}&program=${selectedProgram}&year=${selectedYear}`)
                    if (!planRes.ok) {
                        throw new Error("Failed to fetch official study plan")
                    }
                    const planJson = await planRes.json()
                    if (planJson.success) {
                        planData = planJson.data
                    } else {
                        throw new Error(planJson.error || "Failed to load study plan")
                    }
                }
            } else if (planFile) {
                setStatusMessage("Uploading and analyzing study plan...")
                const formData = new FormData()
                formData.append("plan", planFile)

                const planRes = await fetch("/api/plan", {
                    method: "POST",
                    body: formData,
                })

                if (!planRes.ok) {
                    let errorMessage = "Failed to analyze study plan"
                    try {
                        if (planRes.headers.get("content-type")?.includes("application/json")) {
                            const errorJson = await planRes.json()
                            errorMessage = errorJson.error || errorMessage
                        } else {
                            errorMessage = `Server error (${planRes.status}): Unexpected response format`
                        }
                    } catch {
                        errorMessage = `Server error (${planRes.status})`
                    }
                    throw new Error(errorMessage)
                }

                let planJson = await planRes.json()
                if (planJson.success) {
                    planData = planJson.data
                } else {
                    throw new Error(planJson.error || "Study plan parsing failed")
                }
            }

            // 2. Analyze transcript if uploaded
            if (transcriptFile) {
                setStatusMessage("Uploading and analyzing academic transcript...")
                const formData = new FormData()
                formData.append("transcript", transcriptFile)

                // Pass selected plan info for compatibility checking
                if (planSource === "official" && selectedCollege && selectedProgram) {
                    const col = colleges.find(c => c.slug === selectedCollege)
                    const prog = col?.programs.find((p: any) => p.slug === selectedProgram)
                    if (col && prog) {
                        formData.append("planCollege", col.college)
                        formData.append("planProgram", prog.name)
                    }
                } else if (planData) {
                    formData.append("planCollege", planData.college || "")
                    formData.append("planProgram", planData.degreeName || "")
                } else {
                    // Fallback to stored plan info if any
                    const storedPlan = readStoredPlan() as any
                    if (storedPlan) {
                        formData.append("planCollege", storedPlan.college || "")
                        formData.append("planProgram", storedPlan.degreeName || "")
                    }
                }

                const transRes = await fetch("/api/transcript", {
                    method: "POST",
                    body: formData,
                })

                if (!transRes.ok) {
                    let errorMessage = "Failed to analyze transcript"
                    try {
                        if (transRes.headers.get("content-type")?.includes("application/json")) {
                            const errorJson = await transRes.json()
                            errorMessage = errorJson.error || errorMessage
                        } else {
                            errorMessage = `Server error (${transRes.status}): Unexpected response format`
                        }
                    } catch {
                        errorMessage = `Server error (${transRes.status})`
                    }
                    throw new Error(errorMessage)
                }

                let transJson = await transRes.json()
                if (transJson.success) {
                    transcriptData = transJson.data
                } else {
                    throw new Error(transJson.error || "Transcript parsing failed")
                }
            }

            // Save results to local storage
            const nextPlanData = planData ?? readStoredPlan()
            const nextTranscriptData = transcriptData ?? readStoredTranscript()

            if (nextPlanData) writeStoredPlan(nextPlanData)
            if (nextTranscriptData) writeStoredTranscript(nextTranscriptData)

            // Sync to Supabase if logged in
            const currentUser = authService.getCurrentUser()
            if (currentUser && !currentUser.isGuest && currentUser.id && isSupabaseConfigured && supabase) {
                try {
                    await supabase
                        .from('profiles')
                        .update({
                            plan_data: nextPlanData,
                            transcript_data: nextTranscriptData
                        })
                        .eq('id', currentUser.id)
                } catch (err) {
                    console.error("Failed to save data to Supabase:", err)
                }
            }

            setStatusMessage("Finalizing your planner dashboard...")
            router.push("/dashboard")
        } catch (err) {
            setAnalyzeError(err instanceof Error ? err.message : "Analysis failed")
        } finally {
            setAnalyzeLoading(false)
        }
    }

    const handleSignOut = async () => {
        await authService.signOut()
        setUser(null)
        setStep(1)
        setPlanFile(null)
        setTranscriptFile(null)
    }

    const handleSwitchAccount = (mode: "register" | "login") => {
        authService.clearSession()
        setUser(null)
        setStep(1)
        setAuthMode(mode)
        setAuthError("")
        setAnalyzeError("")
    }

    return (
        <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-3 py-6 sm:p-4 bg-gradient-to-br from-indigo-50 via-slate-50 to-emerald-50 dark:from-indigo-950/20 dark:via-slate-950 dark:to-emerald-950/20">
            <div className="w-full max-w-xl">
                {/* Logo and Title */}
                <div className="text-center mb-6 sm:mb-8">
                    <div className="inline-flex p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20 mb-4">
                        <GraduationCap className="h-8 w-8 text-white animate-pulse" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                        Welcome to UniPlanner
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2 px-2">
                        {step === 1 ? "Create your account or continue as guest to start planning" : "Upload your university academic files to get started"}
                    </p>
                </div>

                {/* Progress Indicators */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <span className={`h-2.5 rounded-full transition-all duration-300 ${step === 1 ? "w-10 bg-emerald-600" : "w-2.5 bg-slate-300 dark:bg-slate-700"}`} />
                    <span className={`h-2.5 rounded-full transition-all duration-300 ${step === 2 ? "w-10 bg-emerald-600" : "w-2.5 bg-slate-300 dark:bg-slate-700"}`} />
                </div>

                {/* Wizard Card */}
                <Card className="border-2 shadow-xl bg-card/85 backdrop-blur-md overflow-hidden transition-all duration-300">
                    {step === 1 && (
                        <div>
                            {/* Step 1 Content: Authentication */}
                            <div className="border-b bg-slate-50/50 dark:bg-slate-900/50 flex">
                                <button
                                    onClick={() => { setAuthMode("register"); setAuthError(""); }}
                                    className={`flex-1 px-2 py-4 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                                        authMode === "register"
                                            ? "border-emerald-600 text-emerald-600 bg-white dark:bg-slate-950"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    Create Account
                                </button>
                                <button
                                    onClick={() => { setAuthMode("login"); setAuthError(""); }}
                                    className={`flex-1 px-2 py-4 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                                        authMode === "login"
                                            ? "border-emerald-600 text-emerald-600 bg-white dark:bg-slate-950"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    Sign In
                                </button>
                                <button
                                    onClick={() => { setAuthMode("guest"); setAuthError(""); }}
                                    className={`flex-1 px-2 py-4 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                                        authMode === "guest"
                                            ? "border-emerald-600 text-emerald-600 bg-white dark:bg-slate-950"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    Guest Mode
                                </button>
                            </div>

                            <CardHeader className="pt-6">
                                <CardTitle>
                                    {authMode === "register" && "Create an Account"}
                                    {authMode === "login" && "Sign In to Your Account"}
                                    {authMode === "guest" && "Use as Guest"}
                                </CardTitle>
                                <CardDescription>
                                    {authMode === "register" && "Enter your full name and a username to register with Supabase."}
                                    {authMode === "login" && "Enter your username and password to log in."}
                                    {authMode === "guest" && "Explore all features. Guest data is saved locally in your browser."}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {authError && (
                                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                        <span>{authError}</span>
                                    </div>
                                )}

                                {authMode !== "guest" ? (
                                    <form onSubmit={handleAuth} className="space-y-4">
                                        {authMode === "register" && (
                                            <div className="space-y-1.5">
                                                <Label htmlFor="full-name" className="text-sm font-medium">Full Name</Label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="full-name"
                                                        placeholder="John Doe"
                                                        value={fullName}
                                                        onChange={(e) => setFullName(e.target.value)}
                                                        className="pl-9 h-11"
                                                        disabled={authLoading}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="username"
                                                    placeholder="johndoe"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    className="pl-9 h-11"
                                                    disabled={authLoading}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="password"
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="pl-9 h-11"
                                                    disabled={authLoading}
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all font-semibold mt-6"
                                            disabled={authLoading}
                                        >
                                            {authLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Please wait...
                                                </>
                                            ) : (
                                                <>
                                                    {authMode === "register" ? "Register & Continue" : "Sign In & Continue"}
                                                    <ChevronRight className="ml-2 h-4 w-4" />
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                ) : (
                                    <div className="space-y-6 py-4 text-center">
                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl max-w-sm mx-auto flex items-center gap-3">
                                            <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <p className="text-sm text-emerald-800 dark:text-emerald-300 text-left">
                                                No email, password, or account setup required. Keep your data locally.
                                            </p>
                                        </div>
                                        
                                        <Button
                                            onClick={handleGuest}
                                            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 shadow-md font-semibold text-base"
                                            disabled={authLoading}
                                        >
                                            {authLoading ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <>
                                                    Continue as Guest
                                                    <ArrowRight className="ml-2 h-5 w-5" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            {/* Step 2 Content: Guided Setup Wizard */}
                            <CardHeader className="pt-6 pb-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-1">
                                    <Badge variant="outline" className="border-emerald-600 text-emerald-600 font-bold dark:border-emerald-500 w-fit">
                                        Step 2: Planner Configuration
                                    </Badge>
                                    {user && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1 break-all">
                                            <User className="h-3 w-3 shrink-0" /> {user.fullName} ({user.username})
                                        </span>
                                    )}
                                </div>
                                <CardTitle>
                                    {wizardStep === 1 && "Choose Study Plan Source"}
                                    {wizardStep === 2 && "Select Your College"}
                                    {wizardStep === 3 && "Select Your Major"}
                                    {wizardStep === 4 && "Select Plan Version"}
                                    {wizardStep === 5 && "Upload & Complete Setup"}
                                </CardTitle>
                                <CardDescription>
                                    {wizardStep === 1 && "Decide whether to use our pre-scraped university catalog or upload a custom plan PDF."}
                                    {wizardStep === 2 && "UOB study plans are categorized by college. Select yours below."}
                                    {wizardStep === 3 && "Search and select your academic program from the list."}
                                    {wizardStep === 4 && "Select the catalog/curriculum year that matches your study plan."}
                                    {wizardStep === 5 && "Review your configuration and upload your transcript to build your personalized plan."}
                                </CardDescription>
                            </CardHeader>

                            {/* Wizard Progress / Sub-navigation */}
                            {planSource === "official" && wizardStep > 1 && wizardStep < 5 && (
                                <div className="px-6 py-2.5 flex items-center justify-between border-y bg-slate-50/50 dark:bg-slate-900/50">
                                    <button 
                                        type="button"
                                        onClick={handlePrevSubStep} 
                                        className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                        disabled={analyzeLoading}
                                    >
                                        <ArrowLeft className="h-3 w-3" />
                                        Back
                                    </button>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`h-1.5 w-6 rounded-full transition-all duration-300 ${wizardStep >= 2 ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"}`} />
                                        <span className={`h-1.5 w-6 rounded-full transition-all duration-300 ${wizardStep >= 3 ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"}`} />
                                        <span className={`h-1.5 w-6 rounded-full transition-all duration-300 ${wizardStep >= 4 ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"}`} />
                                        <span className={`h-1.5 w-6 rounded-full transition-all duration-300 ${wizardStep >= 5 ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"}`} />
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Step {wizardStep - 1} of 3</span>
                                </div>
                            )}

                            {wizardStep === 1 && (
                                <CardContent className="p-6 space-y-4 animate-in fade-in duration-300">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPlanSource("official")
                                                setWizardStep(2)
                                            }}
                                            className="group relative text-left p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-950 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 flex flex-col justify-between h-52"
                                        >
                                            <div>
                                                <div className="p-3 w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                                                    <GraduationCap className="h-6 w-6" />
                                                </div>
                                                <h4 className="text-sm sm:text-base font-bold text-foreground mb-1 flex items-center gap-1">
                                                    Official UOB Catalog
                                                    <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                                </h4>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Select your college and program from the official university website scraper catalog.
                                                </p>
                                            </div>
                                            <div>
                                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-none font-semibold">Recommended</Badge>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPlanSource("upload")
                                                setWizardStep(5)
                                            }}
                                            className="group text-left p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-950 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 flex flex-col justify-between h-52"
                                        >
                                            <div>
                                                <div className="p-3 w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                                                    <Upload className="h-6 w-6" />
                                                </div>
                                                <h4 className="text-sm sm:text-base font-bold text-foreground mb-1 flex items-center gap-1">
                                                    Upload Study Plan PDF
                                                    <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                                </h4>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Upload a study plan PDF document directly to extract its semester and course structures automatically.
                                                </p>
                                            </div>
                                            <div>
                                                <Badge variant="outline" className="border-slate-300 text-muted-foreground font-semibold">Manual PDF</Badge>
                                            </div>
                                        </button>
                                    </div>
                                    <div className="pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setStep(1)}
                                            className="w-full h-11 border-slate-200 dark:border-slate-800 font-semibold"
                                        >
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Back to Login / Register
                                        </Button>
                                    </div>
                                </CardContent>
                            )}

                            {wizardStep === 2 && (
                                <CardContent className="p-6 space-y-4 animate-in fade-in duration-300">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                                        {colleges.map((col) => {
                                            const metadata = getCollegeColor(col.slug)
                                            const Icon = getCollegeIcon(col.slug)
                                            const desc = getCollegeDesc(col.slug)
                                            return (
                                                <button
                                                    key={col.slug}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCollege(col.slug)
                                                        setSelectedProgram("")
                                                        setSelectedYear("")
                                                        setWizardStep(3)
                                                    }}
                                                    className={`group text-left p-4 rounded-xl border-2 bg-white dark:bg-slate-950 transition-all duration-300 hover:shadow-md ${metadata.border} flex flex-col justify-between h-36`}
                                                >
                                                    <div className={`p-2 rounded-lg w-fit ${metadata.bg} ${metadata.text} group-hover:scale-110 transition-transform`}>
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                    <div className="mt-2">
                                                        <h4 className="text-xs font-bold text-foreground leading-tight line-clamp-2 mb-1">{col.college}</h4>
                                                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-normal">{desc}</p>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            )}

                            {wizardStep === 3 && (
                                <CardContent className="p-6 space-y-4 animate-in fade-in duration-300">
                                    <div className="text-center mb-1">
                                        <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-200">
                                            {colleges.find(c => c.slug === selectedCollege)?.college}
                                        </Badge>
                                    </div>

                                    {/* Search input */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search majors (e.g. Computer Science, Accounting...)"
                                            value={programSearch}
                                            onChange={(e) => setProgramSearch(e.target.value)}
                                            className="pl-9 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                                        {colleges
                                            .find((c) => c.slug === selectedCollege)
                                            ?.programs.filter((prog: any) => 
                                                prog.name.toLowerCase().includes(programSearch.toLowerCase())
                                            )
                                            .map((prog: any) => (
                                                <button
                                                    key={prog.slug}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedProgram(prog.slug)
                                                        setSelectedYear("")
                                                        setWizardStep(4)
                                                    }}
                                                    className="w-full group text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-white dark:bg-slate-950 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all flex items-center justify-between"
                                                >
                                                    <span className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-emerald-600 transition-colors">
                                                        {prog.name}
                                                    </span>
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                                                </button>
                                            ))}
                                        {colleges
                                            .find((c) => c.slug === selectedCollege)
                                            ?.programs.filter((prog: any) => 
                                                prog.name.toLowerCase().includes(programSearch.toLowerCase())
                                            ).length === 0 && (
                                                <div className="text-center py-8 text-muted-foreground text-sm">
                                                    No majors match your search. Try another query.
                                                </div>
                                            )}
                                    </div>
                                </CardContent>
                            )}

                            {wizardStep === 4 && (
                                <CardContent className="p-6 space-y-4 animate-in fade-in duration-300">
                                    <div className="text-center mb-1">
                                        <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-200">
                                            {colleges.find(c => c.slug === selectedCollege)?.programs.find((p: any) => p.slug === selectedProgram)?.name}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                                        {colleges
                                            .find((c) => c.slug === selectedCollege)
                                            ?.programs.find((p: any) => p.slug === selectedProgram)
                                            ?.years.map((y: string) => (
                                                <button
                                                    key={y}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedYear(y)
                                                        setWizardStep(5)
                                                    }}
                                                    className="py-4 px-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-white dark:bg-slate-950 text-center font-bold text-sm sm:text-base hover:text-emerald-600 transition-all hover:shadow-md duration-200"
                                                >
                                                    {y}
                                                </button>
                                            ))}
                                    </div>
                                </CardContent>
                            )}

                            {wizardStep === 5 && (
                                <CardContent className="p-6 space-y-5 animate-in fade-in duration-300">
                                    {analyzeError && (
                                        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-sm animate-in fade-in duration-200">
                                            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                            <span>{analyzeError}</span>
                                        </div>
                                    )}

                                    {planSource === "official" ? (
                                        // Official Plan Selection Summary
                                        <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-950/10 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-emerald-500 text-white shadow-sm">
                                                    <GraduationCap className="h-5 w-5" />
                                                </div>
                                                <div className="text-left">
                                                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Selected Study Plan</span>
                                                    <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1">
                                                        {colleges.find(c => c.slug === selectedCollege)?.programs.find((p: any) => p.slug === selectedProgram)?.name}
                                                    </h4>
                                                    <span className="text-[10px] text-muted-foreground font-semibold">Catalog Year: {selectedYear}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCollege("")
                                                    setSelectedProgram("")
                                                    setSelectedYear("")
                                                    setWizardStep(2)
                                                }}
                                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline px-2.5 py-1 rounded-md"
                                                disabled={analyzeLoading}
                                            >
                                                Change
                                            </button>
                                        </div>
                                    ) : (
                                        // Manual Study Plan Upload Card
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                                    <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />
                                                    Study Plan PDF
                                                </Label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPlanSource("official")
                                                        setWizardStep(2)
                                                    }}
                                                    className="text-[10px] font-semibold text-indigo-600 hover:underline"
                                                    disabled={analyzeLoading}
                                                >
                                                    Use Official Catalog Instead
                                                </button>
                                            </div>
                                            <label
                                                className={`flex items-center gap-3 px-4 py-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-all ${
                                                    planFile ? "border-emerald-500 bg-emerald-50/10" : "border-slate-200 dark:border-slate-800"
                                                }`}
                                            >
                                                <div className={`p-2 rounded-lg ${planFile ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"}`}>
                                                    <Upload className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <span className="text-sm font-semibold block truncate max-w-[280px]">
                                                        {planFile ? planFile.name : "Select custom study plan PDF"}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground block">
                                                        {planFile ? `${(planFile.size / 1024).toFixed(1)} KB` : "Recommended for custom semester plans"}
                                                    </span>
                                                </div>
                                                {planFile && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={(e) => setPlanFile(e.target.files?.[0] || null)}
                                                    className="hidden"
                                                    disabled={analyzeLoading}
                                                />
                                            </label>
                                        </div>
                                    )}

                                    {/* Transcript Upload Card */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                            <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                            Academic Transcript PDF
                                        </Label>
                                        <label
                                            className={`flex items-center gap-3 px-4 py-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-all ${
                                                transcriptFile ? "border-indigo-500 bg-indigo-50/10" : "border-slate-200 dark:border-slate-800"
                                            }`}
                                        >
                                            <div className={`p-2 rounded-lg ${transcriptFile ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-600" : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"}`}>
                                                <Upload className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <span className="text-sm font-semibold block truncate max-w-[280px]">
                                                    {transcriptFile ? transcriptFile.name : "Select UOB transcript PDF"}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground block">
                                                    {transcriptFile ? `${(transcriptFile.size / 1024).toFixed(1)} KB` : "Required to extract completed grades & current GPA"}
                                                </span>
                                            </div>
                                            {transcriptFile && <CheckCircle2 className="h-5 w-5 text-indigo-600" />}
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)}
                                                className="hidden"
                                                disabled={analyzeLoading}
                                            />
                                        </label>
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={handlePrevSubStep}
                                            className="h-12 border-slate-200 dark:border-slate-800 flex-1 font-semibold text-xs sm:text-sm"
                                            disabled={analyzeLoading}
                                        >
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Back
                                        </Button>
                                        
                                        <Button
                                            onClick={handleAnalyze}
                                            className="h-12 bg-emerald-600 hover:bg-emerald-700 shadow-md font-semibold flex-[2] text-xs sm:text-sm"
                                            disabled={analyzeLoading || (planSource === "upload" && !planFile) || !transcriptFile}
                                        >
                                            {analyzeLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    {statusMessage || "Analyzing files..."}
                                                </>
                                            ) : (
                                                <>
                                                    Generate Dashboard
                                                    <ArrowRight className="ml-2 h-4 w-4" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            )}

                            <CardFooter className="bg-slate-50/50 dark:bg-slate-900/50 pt-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center text-xs text-muted-foreground border-t">
                                <span className="text-center sm:text-left">Logged in as <strong>{user?.fullName}</strong></span>
                                <div className="flex flex-wrap justify-center gap-3 sm:justify-end">
                                    {user?.isGuest && (
                                        <>
                                            <button onClick={() => handleSwitchAccount("login")} className="text-emerald-600 hover:underline font-semibold">
                                                Sign In
                                            </button>
                                            <button onClick={() => handleSwitchAccount("register")} className="text-indigo-600 hover:underline font-semibold">
                                                Create Account
                                            </button>
                                        </>
                                    )}
                                    {!user?.isGuest && (
                                        <button onClick={handleSignOut} className="text-rose-600 hover:underline font-semibold">
                                            Sign Out
                                        </button>
                                    )}
                                </div>
                            </CardFooter>
                        </div>
                    )}
                </Card>
            </div>
        </main>
    )
}
