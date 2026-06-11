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
    AlertCircle
} from "lucide-react"

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

            // 1. Analyze study plan if uploaded
            if (planFile) {
                setStatusMessage("Uploading and analyzing study plan...")
                const formData = new FormData()
                formData.append("plan", planFile)

                const planRes = await fetch("/api/plan", {
                    method: "POST",
                    body: formData,
                })

                if (!planRes.ok) {
                    const errorJson = await planRes.json()
                    throw new Error(errorJson.error || "Failed to analyze study plan")
                }

                const planJson = await planRes.json()
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

                const transRes = await fetch("/api/transcript", {
                    method: "POST",
                    body: formData,
                })

                if (!transRes.ok) {
                    const errorJson = await transRes.json()
                    throw new Error(errorJson.error || "Failed to analyze transcript")
                }

                const transJson = await transRes.json()
                if (transJson.success) {
                    transcriptData = transJson.data
                } else {
                    throw new Error(transJson.error || "Transcript parsing failed")
                }
            }

            // Save results to local storage
            const nextPlanData = planData ?? readStoredPlan()
            const nextTranscriptData = transcriptData ?? readStoredTranscript()

            writeStoredPlan(nextPlanData)
            writeStoredTranscript(nextTranscriptData)

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
                            {/* Step 2 Content: File Uploads */}
                            <CardHeader className="pt-6">
                                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-1">
                                    <Badge variant="outline" className="border-emerald-600 text-emerald-600 font-bold dark:border-emerald-500">
                                        Step 2: Get Started
                                    </Badge>
                                    {user && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1 break-all">
                                            <User className="h-3 w-3" /> {user.fullName} ({user.username})
                                        </span>
                                    )}
                                </div>
                                <CardTitle>Upload Degree & Transcript Files</CardTitle>
                                <CardDescription>
                                    Upload your university study plan and academic transcript. Both are optional, but uploading both unlocks the full comparison dashboard!
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                {analyzeError && (
                                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-sm">
                                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                        <span>{analyzeError}</span>
                                    </div>
                                )}

                                {/* File 1: Study Plan */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold flex items-center gap-2">
                                        <FileUp className="h-4 w-4 text-emerald-600" />
                                        University Study Plan PDF (Optional)
                                    </Label>
                                    <label
                                        className={`flex items-center gap-3 px-4 py-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-all ${
                                            planFile ? "border-emerald-500 bg-emerald-50/10" : "border-slate-300 dark:border-slate-800"
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg ${planFile ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"}`}>
                                            <Upload className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <span className="text-sm font-medium block truncate max-w-[320px]">
                                                {planFile ? planFile.name : "Select degree plan PDF (IT, Business, etc.)"}
                                            </span>
                                            <span className="text-xs text-muted-foreground block">
                                                {planFile ? `${(planFile.size / 1024).toFixed(1)} KB` : "Recommended for custom semester plan tracking"}
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

                                {/* File 2: Academic Transcript */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-indigo-600" />
                                        Academic Transcript PDF (Optional)
                                    </Label>
                                    <label
                                        className={`flex items-center gap-3 px-4 py-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-all ${
                                            transcriptFile ? "border-indigo-500 bg-indigo-50/10" : "border-slate-300 dark:border-slate-800"
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg ${transcriptFile ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-600" : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"}`}>
                                            <Upload className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <span className="text-sm font-medium block truncate max-w-[320px]">
                                                {transcriptFile ? transcriptFile.name : "Select UOB academic transcript PDF"}
                                            </span>
                                            <span className="text-xs text-muted-foreground block">
                                                {transcriptFile ? `${(transcriptFile.size / 1024).toFixed(1)} KB` : "Required to extract completed grades & GPA"}
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
                                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => setStep(1)}
                                        className="h-12 border-slate-300 flex-1 dark:border-slate-800"
                                        disabled={analyzeLoading}
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back to Auth
                                    </Button>
                                    
                                    <Button
                                        onClick={handleAnalyze}
                                        className="h-12 bg-emerald-600 hover:bg-emerald-700 shadow-md font-semibold flex-[2]"
                                        disabled={analyzeLoading}
                                    >
                                        {analyzeLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Analyzing files...
                                            </>
                                        ) : (
                                            <>
                                                Generate Dashboard
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {analyzeLoading && (
                                    <div className="text-center py-2 animate-pulse">
                                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                            {statusMessage}
                                        </p>
                                    </div>
                                )}
                            </CardContent>

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
