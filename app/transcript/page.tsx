"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { TranscriptParseResult } from "@/lib/types"
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2, User, GraduationCap, TrendingUp, BookOpen } from "lucide-react"

export default function TranscriptPage() {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<TranscriptParseResult | null>(null)

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

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Transcript Analyzer</h1>
                <p className="text-muted-foreground">
                    Upload your University of Bahrain academic transcript to analyze your academic progress
                </p>
            </div>

            {/* Upload Section */}
            <Card className="p-6 mb-6">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="transcript-upload" className="text-base font-semibold mb-2 block">
                            Upload Transcript PDF
                        </Label>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label
                                    htmlFor="transcript-upload"
                                    className="flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors"
                                >
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        {file ? file.name : "Choose a PDF file (max 10MB)"}
                                    </span>
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
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Analyze
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
                            <Card className="p-4">
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <h2 className="text-lg font-semibold">Transcript Parsed Successfully</h2>
                                </div>
                            </Card>

                            {/* Student Info Card */}
                            <Card className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <User className="h-5 w-5 text-blue-600" />
                                    <h3 className="font-semibold text-base">Student Information</h3>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="flex items-start gap-3">
                                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Student Name</Label>
                                            <p className="font-medium">{result.data.studentName || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Student Number</Label>
                                            <p className="font-medium">{result.data.studentNumber || "N/A"}</p>
                                        </div>
                                    </div>
                                    {result.data.cumulative && (
                                        <div className="flex items-start gap-3">
                                            <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <Label className="text-xs text-muted-foreground">CGPA</Label>
                                                <p className="font-medium text-blue-600 text-lg">{result.data.cumulative.cgpa.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    )}
                                    {result.data.program && (
                                        <div className="flex items-start gap-3 md:col-span-2">
                                            <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Program</Label>
                                                <p className="font-medium">{result.data.program}</p>
                                            </div>
                                        </div>
                                    )}
                                    {result.data.cumulative && (result.data.cumulative.mcgpa ?? 0) > 0 && (
                                        <div className="flex items-start gap-3">
                                            <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Major GPA</Label>
                                                <p className="font-medium text-emerald-600 text-lg">{result.data.cumulative.mcgpa?.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    )}
                                    {result.data.cumulative && (
                                        <div className="flex items-start gap-3">
                                            <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Total Credits</Label>
                                                <p className="font-medium text-lg">{result.data.cumulative.creditsPassed}</p>
                                            </div>
                                        </div>
                                    )}
                                    {result.data.academicAdvisor && (
                                        <div className="flex items-start gap-3">
                                            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Academic Advisor</Label>
                                                <p className="font-medium">{result.data.academicAdvisor}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Semesters */}
                            {result.data.semesters.map((semester, idx) => (
                                <Card key={idx} className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold">{semester.semesterName}</h3>
                                            {semester.program && (
                                                <p className="text-sm text-muted-foreground mt-1">{semester.program}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            {semester.sgpa !== undefined && (
                                                <div className="text-sm">
                                                    <span className="text-muted-foreground">SGPA: </span>
                                                    <span className="font-bold text-blue-600">{semester.sgpa.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {semester.semesterCreditsAttended !== undefined && (
                                                <div className="text-xs text-muted-foreground">
                                                    {semester.semesterCreditsPassed}/{semester.semesterCreditsAttended} credits passed
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Courses Table */}
                                    {semester.courses.length > 0 && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left py-2 px-2">Course Code</th>
                                                        <th className="text-left py-2 px-2">Course Name</th>
                                                        <th className="text-center py-2 px-2">Credits</th>
                                                        <th className="text-center py-2 px-2">Grade</th>
                                                        <th className="text-center py-2 px-2">Status</th>
                                                        <th className="text-center py-2 px-2">Rep</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {semester.courses.map((course, courseIdx) => (
                                                        <tr key={courseIdx} className={`border-b hover:bg-slate-50 dark:hover:bg-slate-900/50 ${
                                                            course.status === "W" ? "bg-red-50 dark:bg-red-950/20" : ""
                                                        }`}>
                                                            <td className="py-2 px-2 font-mono text-xs">{course.courseCode}</td>
                                                            <td className="py-2 px-2">{course.courseName}</td>
                                                            <td className="py-2 px-2 text-center">{course.creditHours}</td>
                                                            <td className="py-2 px-2 text-center">
                                                                <Badge variant={
                                                                    course.grade === "N/A" && course.status === "W" ? "destructive" :
                                                                    course.grade.startsWith("A") ? "default" :
                                                                    course.grade.startsWith("B") ? "secondary" :
                                                                    "outline"
                                                                }>
                                                                    {course.grade}
                                                                </Badge>
                                                            </td>
                                                            <td className="py-2 px-2 text-center">
                                                                {course.status === "W" && (
                                                                    <Badge variant="destructive">W</Badge>
                                                                )}
                                                                {course.repeated && !course.status && (
                                                                    <Badge variant="outline">Repeated</Badge>
                                                                )}
                                                                {!course.status && !course.repeated && "-"}
                                                            </td>
                                                            <td className="py-2 px-2 text-center">
                                                                <span className="font-medium">{course.repeatCount ?? 0}</span>
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

                            {/* Debug Section - Collapsible */}
                            <details className="group">
                                <summary className="cursor-pointer list-none">
                                    <Card className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                🔍 View Raw Text (Debug)
                                            </span>
                                            <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">
                                                ▼
                                            </span>
                                        </div>
                                    </Card>
                                </summary>
                                <Card className="p-4 mt-2">
                                    <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg max-h-96 overflow-y-auto">
                                        <pre className="text-xs whitespace-pre-wrap font-mono">
                                            {result.rawText}
                                        </pre>
                                    </div>
                                </Card>
                            </details>
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
