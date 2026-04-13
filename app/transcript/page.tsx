"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { TranscriptParseResult } from "@/lib/types"
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2, User, GraduationCap, TrendingUp, BookOpen, Award, Calendar, Target, BarChart3, Search, XCircle } from "lucide-react"

// Helper function to get GPA classification
function getGPAClassification(gpa: number): { text: string; className: string } {
    if (gpa >= 3.90) return { text: "First Class Honors", className: "bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700" }
    if (gpa >= 3.70) return { text: "Second Class Honors", className: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700" }
    if (gpa >= 3.50) return { text: "Distinction", className: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700" }
    if (gpa >= 3.00) return { text: "Very Good", className: "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700" }
    if (gpa >= 2.00) return { text: "Good", className: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600" }
    return { text: "", className: "" }
}

// Helper function to calculate statistics
function calculateStats(semesters: any[]) {
    const gradeDistribution: Record<string, number> = {}
    let totalCourses = 0
    let completedCourses = 0
    let withdrawnCourses = 0
    let repeatedCourses = 0
    
    semesters.forEach(semester => {
        semester.courses.forEach((course: any) => {
            totalCourses++
            
            if (course.status === "W") {
                withdrawnCourses++
            } else if (course.grade && course.grade !== "N/A") {
                completedCourses++
                gradeDistribution[course.grade] = (gradeDistribution[course.grade] || 0) + 1
            }
            
            if (course.repeated) {
                repeatedCourses++
            }
        })
    })
    
    // Calculate grade points for distribution
    const gradeOrder = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"]
    const sortedGrades = Object.entries(gradeDistribution)
        .sort(([a], [b]) => {
            const aIndex = gradeOrder.indexOf(a)
            const bIndex = gradeOrder.indexOf(b)
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
        })
    
    const successRate = totalCourses > 0 ? ((completedCourses / totalCourses) * 100).toFixed(1) : "0"
    
    return {
        totalCourses,
        completedCourses,
        withdrawnCourses,
        repeatedCourses,
        totalSemesters: semesters.length,
        gradeDistribution: sortedGrades,
        successRate
    }
}

export default function TranscriptPage() {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<TranscriptParseResult | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [showSuggestions, setShowSuggestions] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            setResult(null) // Clear previous results
        }
    }

    const handleUpload = async () => {
        if (!file) return

        setLoading(true)
        setResult(null)

        try {
            const formData = new FormData()
            formData.append("transcript", file)

            const response = await fetch("/api/transcript", {
                method: "POST",
                body: formData,
            })

            const parseResult: TranscriptParseResult = await response.json()
            setResult(parseResult)
        } catch (error) {
            setResult({
                success: false,
                error: error instanceof Error ? error.message : "Failed to upload transcript"
            })
        } finally {
            setLoading(false)
        }
    }

    // Filter semesters based on search query
    const getFilteredSemesters = (semesters: any[]) => {
        if (!searchQuery.trim()) return semesters
        
        const query = searchQuery.toLowerCase().trim()
        return semesters.map(semester => ({
            ...semester,
            courses: semester.courses.filter((course: any) => 
                course.courseCode.toLowerCase().includes(query) ||
                course.courseName.toLowerCase().includes(query)
            )
        })).filter(semester => semester.courses.length > 0)
    }

    // Get course suggestions based on search query
    const getSuggestions = () => {
        if (!result?.data?.semesters || searchQuery.length < 1) return []
        
        const query = searchQuery.toLowerCase().trim()
        const suggestions: Array<{code: string, name: string}> = []
        const seen = new Set<string>()
        
        result.data.semesters.forEach(semester => {
            semester.courses.forEach((course: any) => {
                const key = course.courseCode
                if (!seen.has(key) && 
                    (course.courseCode.toLowerCase().includes(query) || 
                     course.courseName.toLowerCase().includes(query))) {
                    seen.add(key)
                    suggestions.push({
                        code: course.courseCode,
                        name: course.courseName
                    })
                }
            })
        })
        
        return suggestions.slice(0, 8) // Limit to 8 suggestions
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="mb-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                        <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                </div>
                <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                    Transcript Analyzer
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Upload your University of Bahrain academic transcript to analyze your academic progress and get detailed insights
                </p>
            </div>

            {/* Upload Section */}
            <Card className="p-8 mb-8 border-2 shadow-sm">
                <div className="space-y-6">
                    <div>
                        <Label htmlFor="transcript-upload" className="text-lg font-semibold mb-3 block flex items-center gap-2">
                            <FileText className="h-5 w-5 text-emerald-600" />
                            Upload Transcript PDF
                        </Label>
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                            <div className="flex-1">
                                <label
                                    htmlFor="transcript-upload"
                                    className="flex items-center gap-3 px-6 py-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all duration-200 group"
                                >
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800 transition-colors">
                                        <Upload className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-sm font-medium block">
                                            {file ? file.name : "Choose a PDF file"}
                                        </span>
                                        {!file && (
                                            <span className="text-xs text-muted-foreground">
                                                Maximum file size: 10MB
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        id="transcript-upload"
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <Button
                                onClick={handleUpload}
                                disabled={!file || loading}
                                size="lg"
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md h-full md:h-auto md:min-h-[60px] px-8"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <BarChart3 className="mr-2 h-5 w-5" />
                                        Analyze Transcript
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* File Info */}
                    {file && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </div>
                    )}
                </div>
            </Card>

            {/* Results Section */}
            {result && (
                <div className="space-y-6">
                    {result.success && result.data ? (
                        <>
                            {/* Success Message */}
                            <Card className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-600 rounded-lg shadow-sm">
                                        <CheckCircle2 className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                                            Transcript Analyzed Successfully!
                                        </h2>
                                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                            Your academic data has been processed and is ready for review
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            {/* Student Info Card */}
                            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="p-2 bg-blue-600 rounded-lg">
                                        <User className="h-5 w-5 text-white" />
                                    </div>
                                    <h3 className="font-bold text-lg">Student Information</h3>
                                </div>

                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student Name</Label>
                                        <p className="font-semibold text-base">{result.data.studentName || "N/A"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student Number</Label>
                                        <p className="font-semibold text-base">{result.data.studentNumber || "N/A"}</p>
                                    </div>
                                    {result.data.academicAdvisor && (
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Academic Advisor</Label>
                                            <p className="font-semibold text-base">{result.data.academicAdvisor}</p>
                                        </div>
                                    )}
                                    {result.data.program && (
                                        <div className="space-y-1 md:col-span-2 lg:col-span-3">
                                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Program</Label>
                                            <p className="font-semibold text-base">{result.data.program}</p>
                                        </div>
                                    )}
                                </div>

                                {result.data.cumulative && (() => {
                                    const classification = getGPAClassification(result.data.cumulative.cgpa)
                                    return (
                                    <div className="mt-6 pt-6 border-t border-blue-200 dark:border-blue-800">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-blue-100 dark:border-blue-900 relative">
                                                <Label className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">GPA</Label>
                                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{result.data.cumulative.cgpa.toFixed(2)}</p>
                                                {classification.text && (
                                                    <div className="absolute bottom-3 right-3">
                                                        <Badge className={`text-sm font-semibold px-3 py-1 ${classification.className}`}>
                                                            {classification.text}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                            {(result.data.cumulative.mcgpa ?? 0) > 0 && (
                                                <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900">
                                                    <Label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Major GPA</Label>
                                                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{result.data.cumulative.mcgpa?.toFixed(2)}</p>
                                                </div>
                                            )}
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-purple-100 dark:border-purple-900">
                                                <Label className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Total Credits</Label>
                                                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">{result.data.cumulative.creditsPassed}</p>
                                            </div>
                                        </div>
                                    </div>
                                    )
                                })()}
                            </Card>

                            {/* Academic Statistics */}
                            {result.data.semesters.length > 0 && (() => {
                                const stats = calculateStats(result.data.semesters)
                                
                                return (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <BarChart3 className="h-5 w-5 text-emerald-600" />
                                            <h3 className="text-lg font-semibold">Academic Statistics</h3>
                                        </div>

                                        {/* Quick Stats Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                            <Card className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-200 dark:border-emerald-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-emerald-600 rounded-lg">
                                                        <BookOpen className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.totalCourses}</p>
                                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total Courses</p>
                                                    </div>
                                                </div>
                                            </Card>

                                            <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-600 rounded-lg">
                                                        <Calendar className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.totalSemesters}</p>
                                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Semesters</p>
                                                    </div>
                                                </div>
                                            </Card>

                                            <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-purple-600 rounded-lg">
                                                        <Target className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.successRate}%</p>
                                                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Success Rate</p>
                                                    </div>
                                                </div>
                                            </Card>

                                            <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-amber-600 rounded-lg">
                                                        <Award className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.completedCourses}</p>
                                                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Completed</p>
                                                    </div>
                                                </div>
                                            </Card>

                                            {stats.withdrawnCourses > 0 && (
                                                <Card className="p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200 dark:border-red-800">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-red-600 rounded-lg">
                                                            <XCircle className="h-4 w-4 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.withdrawnCourses}</p>
                                                            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Dropped</p>
                                                        </div>
                                                    </div>
                                                </Card>
                                            )}
                                        </div>

                                        {/* Grade Distribution */}
                                        <Card className="p-6">
                                            <h4 className="font-semibold mb-6 flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                                                Grade Distribution
                                            </h4>
                                            {stats.gradeDistribution.length > 0 ? (
                                                <div className="grid md:grid-cols-2 gap-6">
                                                    {stats.gradeDistribution.map(([grade, count]) => {
                                                        const maxCount = Math.max(...stats.gradeDistribution.map(([, c]) => c as number))
                                                        const percentage = (count as number / maxCount) * 100
                                                        
                                                        return (
                                                            <div key={grade} className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
                                                                            <span className="text-white font-bold text-sm">{grade}</span>
                                                                        </div>
                                                                        <span className="text-sm font-semibold text-muted-foreground">{count} course{count !== 1 ? 's' : ''}</span>
                                                                    </div>
                                                                    <Badge variant="secondary" className="font-bold">{count}</Badge>
                                                                </div>
                                                                <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700 ease-out"
                                                                        style={{ width: `${percentage}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground text-center py-4">No grades recorded yet</p>
                                            )}
                                        </Card>
                                    </div>
                                )
                            })()}

                            {/* Search Input */}
                            <Card className="p-6">
                                <div className="flex items-center gap-3 relative">
                                    <Search className="h-5 w-5 text-muted-foreground" />
                                    <div className="flex-1 relative">
                                        <Input
                                            type="text"
                                            placeholder="Search by course code or name (e.g., 'ACC 112' or 'ACCOUNTING')..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value)
                                                setShowSuggestions(true)
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            className="w-full"
                                        />
                                        
                                        {/* Suggestions Dropdown */}
                                        {showSuggestions && searchQuery && getSuggestions().length > 0 && (
                                            <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-64 overflow-y-auto shadow-lg">
                                                <div className="py-2">
                                                    {getSuggestions().map((suggestion, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                setSearchQuery(suggestion.code)
                                                                setShowSuggestions(false)
                                                            }}
                                                            className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 min-w-[80px]">
                                                                    {suggestion.code}
                                                                </span>
                                                                <span className="text-sm text-muted-foreground truncate">
                                                                    {suggestion.name}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </Card>
                                        )}
                                    </div>
                                    {searchQuery && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSearchQuery("")
                                                setShowSuggestions(false)
                                            }}
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                
                                {searchQuery && getFilteredSemesters(result.data.semesters).length === 0 && (
                                    <div className="mt-4 text-center text-sm text-muted-foreground">
                                        No courses found matching "{searchQuery}"
                                    </div>
                                )}
                            </Card>

                            {/* Semesters */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mt-6">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                    <h3 className="text-lg font-semibold">Semester Details</h3>
                                </div>
                                
                                {getFilteredSemesters(result.data.semesters).map((semester, idx) => (
                                    <Card key={idx} className="p-6 hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300">{semester.semesterName}</h3>
                                                {semester.program && (
                                                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                                        <GraduationCap className="h-3 w-3" />
                                                        {semester.program}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right bg-blue-50 dark:bg-blue-950/30 px-4 py-2 rounded-lg">
                                                {semester.sgpa !== undefined && (
                                                    <div className="text-sm">
                                                        <span className="text-xs text-muted-foreground block">SGPA</span>
                                                        <span className="font-bold text-xl text-blue-600 dark:text-blue-400">{semester.sgpa.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {semester.semesterCreditsAttended !== undefined && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {semester.semesterCreditsPassed}/{semester.semesterCreditsAttended} credits
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    {/* Courses Table */}
                                    {semester.courses.length > 0 && (
                                        <div className="overflow-x-auto rounded-lg border">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-900">
                                                    <tr className="border-b">
                                                        <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Course Code</th>
                                                        <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Course Name</th>
                                                        <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Credits</th>
                                                        <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Grade</th>
                                                        <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Status</th>
                                                        <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Rep</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {semester.courses.map((course: any, courseIdx: number) => (
                                                        <tr key={courseIdx} className={`border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${
                                                            course.status === "W" ? "bg-red-50 dark:bg-red-950/20" : ""
                                                        }`}>
                                                            <td className="py-3 px-4 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">{course.courseCode}</td>
                                                            <td className="py-3 px-4 font-medium">{course.courseName}</td>
                                                            <td className="py-3 px-4 text-center font-semibold">{course.creditHours}</td>
                                                            <td className="py-3 px-4 text-center">
                                                                <Badge variant={
                                                                    course.grade === "N/A" && course.status === "W" ? "destructive" :
                                                                    "outline"
                                                                } className="font-semibold">
                                                                    {course.grade}
                                                                </Badge>
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                                {course.status === "W" && (
                                                                    <Badge variant="destructive">W</Badge>
                                                                )}
                                                                {course.repeated && !course.status && (
                                                                    <Badge variant="outline">Repeated</Badge>
                                                                )}
                                                                {!course.status && !course.repeated && "-"}
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                                <span className="font-semibold text-slate-700 dark:text-slate-300">{course.repeatCount ?? 0}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {semester.courses.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No courses found for this semester
                                        </div>
                                    )}
                                </Card>
                            ))}
                            </div>
                        </>
                    ) : (
                        <Card className="p-6">
                            <div className="flex items-start gap-3 text-red-600 dark:text-red-400">
                                <AlertCircle className="h-5 w-5 mt-0.5" />
                                <div>
                                    <h2 className="text-lg font-semibold mb-1">Error</h2>
                                    <p className="text-sm">{result.error}</p>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* Info Section */}
            {!result && (
                <Card className="p-6 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="space-y-2">
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                                Supported Format
                            </h3>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                This tool is designed for University of Bahrain official transcripts in PDF format.
                                Upload your transcript to extract course information, grades, and GPA data.
                            </p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    )
}
